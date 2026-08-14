'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { loadProfile } from '../../lib/profile';
import { loadSession, setRole, canPost } from '../../lib/session';
import { listPosts, createPost, updatePost, deletePost, loadSocial, saveSocial } from '../../lib/db';
import { isConfigured } from '../../lib/supabase';
import { TIERS, tierName, reaches } from '../../lib/tiers';

// Posts come from lib/db: Postgres + RLS when configured, localStorage otherwise.
// ponytail: images still travel as data URLs. Ceiling — a few MB per row and a
// slow feed; upgrade path = Supabase Storage and keep only the object path here.
// ms -> value a <input type="datetime-local"> accepts, in local time.
const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fileToDataUrl = (file) =>
  new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState('You');
  const [pfp, setPfp] = useState('/blossom.svg');
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [attach, setAttach] = useState(false); // attach menu open
  const [err, setErr] = useState('');
  const [open, setOpen] = useState(null);   // which post's comments are expanded
  const [reply, setReply] = useState('');
  const [when, setWhen] = useState('');     // datetime-local for scheduled posts
  const [trim, setTrim] = useState(null);   // {start,end} seconds for video
  const [editImg, setEditImg] = useState(false);
  const [locked, setLocked] = useState(false); // members-only post
  const [minRank, setMinRank] = useState(1);   // lowest tier that may read it
  const [role, setRoleState] = useState(null);
  const [rank, setRank] = useState(0);         // this account's tier
  const [preview, setPreview] = useState(null); // creator/admin previewing a tier

  // Server is the source of truth for posts; likes/comments ride along locally.
  const refresh = async () => {
    try {
      const social = loadSocial();
      setPosts((await listPosts()).map((p) => ({ ...p, ...(social[p.id] || {}) })));
      setErr('');
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => {
    refresh();
    const p = loadProfile();
    setName(p.name); setPfp(p.pfp);
    const s = loadSession();
    setRoleState(s?.role); setRank(s?.rank || 0);
  }, []);

  // Optimistic write for the local-only social bits.
  const update = (id, fn) => {
    const next = posts.map((p) => (p.id === id ? fn(p) : p));
    setPosts(next);
    const hit = next.find((p) => p.id === id);
    saveSocial({ ...loadSocial(), [id]: {
      liked: hit.liked, likes: hit.likes, reposted: hit.reposted,
      reposts: hit.reposts, bookmarked: hit.bookmarked, comments: hit.comments,
    } });
  };

  // Storage is finite in demo mode; surface it instead of losing the post.
  const write = async (fn) => {
    try { await fn(); await refresh(); }
    catch (e) {
      setErr(e.name === 'QuotaExceededError'
        ? 'Storage is full. Delete an older post with media and try again.'
        : e.message);
    }
  };

  const MAX_BYTES = 3 * 1024 * 1024; // ponytail: data URLs live in a ~5MB quota
  async function pick(e, set, other) {
    const f = e.target.files?.[0];
    setAttach(false);
    e.target.value = ''; // let the same file be re-picked later
    if (!f) return;
    if (f.size > MAX_BYTES) { setErr('That file is over 3MB. Pick a smaller one.'); return; }
    setErr('');
    if (other) other(null); // only one attachment at a time
    setTrim(null); setEditImg(false);
    set(await fileToDataUrl(f));
  }

  // ponytail: a draft is just a post with draft:true, same list, same storage.
  // A scheduled post is a draft with `at` set; the tick below publishes it.
  function addPost(e, draft = false, at = null) {
    e.preventDefault();
    if (!caption.trim() && !image && !video) return; // need text or media
    write(() => createPost({
      id: crypto.randomUUID(), name: name.trim() || 'Anonymous', pfp,
      caption: caption.trim(), image, video, trim, ts: Date.now(), draft, at,
      locked, minRank: locked ? minRank : 1,
      likes: 0, liked: false, reposts: 0, reposted: false, bookmarked: false, comments: [],
    }));
    setCaption(''); setImage(null); setVideo(null); setWhen(''); setTrim(null); setEditImg(false);
  }

  function schedule(e) {
    const t = new Date(when).getTime();
    if (!when || Number.isNaN(t)) { e.preventDefault(); setErr('Pick a date and time first.'); return; }
    if (t <= Date.now()) { e.preventDefault(); setErr('Pick a time in the future.'); return; }
    addPost(e, true, t);
  }

  // ponytail: publishes only while this tab is open — it's a browser timer, not a
  // cron. Ceiling: close the tab and it fires on next visit instead of on time.
  // Upgrade path = a `publish_at` column + a server cron / Supabase scheduled function.
  useEffect(() => {
    const isDue = (p) => p.draft && p.at && p.at <= Date.now();
    const tick = () => {
      const due = posts.filter(isDue);
      if (due.length) write(() => Promise.all(due.map((p) => updatePost(p.id, { draft: false, at: null }))));
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [posts]);

  const publish = (id) => write(() => updatePost(id, { draft: false, at: null }));
  // Editing pulls the draft back into the composer; saving again makes a new one.
  function editDraft(p) {
    setCaption(p.caption); setImage(p.image); setVideo(p.video); setTrim(p.trim || null);
    setWhen(p.at ? toInput(p.at) : '');
    write(() => deletePost(p.id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const del = (id) => write(() => deletePost(id));
  const toggleLike = (id) => update(id, (p) => ({ ...p, liked: !p.liked, likes: (p.likes || 0) + (p.liked ? -1 : 1) }));
  const toggleRepost = (id) => update(id, (p) => ({ ...p, reposted: !p.reposted, reposts: (p.reposts || 0) + (p.reposted ? -1 : 1) }));
  const toggleBookmark = (id) => update(id, (p) => ({ ...p, bookmarked: !p.bookmarked }));
  function submitComment(e, id) {
    e.preventDefault();
    if (!reply.trim()) return;
    update(id, (p) => ({ ...p, comments: [...(p.comments || []), { id: crypto.randomUUID(), name, text: reply.trim(), ts: Date.now() }] }));
    setReply('');
  }

  const drafts = posts.filter((p) => p.draft);
  const feed = posts.filter((p) => !p.draft);

  return (
    <div className="wrap">
      <header className="head">
        <h1>Feed</h1>
        <p className="sub">Post updates for your patrons.</p>
      </header>

      {/* Same control for creators and admins: see the feed as each tier does,
          so nobody ships a post locked to the wrong one. */}
      {canPost(role) && (
        <div className="row preview-bar">
          <span className="muted">Preview as</span>
          {[['Me', null], ['Free', 0], ...TIERS.map((t) => [t.name, t.rank])].map(([label, r]) => (
            <button key={label} type="button"
                    className={'chip' + (preview === r ? ' on' : '')}
                    aria-pressed={preview === r}
                    onClick={() => setPreview(r)}>{label}</button>
          ))}
        </div>
      )}

      {canPost(role) ? (
      <form className="compose" onSubmit={addPost}>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="pfp-pick" title="Change profile picture">
            <img className="pfp" src={pfp} alt="profile" />
            <input type="file" accept="image/*" hidden onChange={(e) => pick(e, setPfp)} />
          </label>
          {/* placeholders are not labels: they vanish on type and screen
              readers may skip them, so every field carries an aria-label */}
          <input value={name} onChange={(e) => setName(e.target.value)}
                 placeholder="Your name" aria-label="Your name" />
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's blooming?" aria-label="Post text" rows={3} />
        {image && <>
          <img className="preview" src={image} alt="preview" />
          <button className="btn-link" type="button" style={{ marginTop: 10 }}
                  onClick={() => setEditImg(true)}>Edit image</button>
          {editImg && <ImageEditor src={image} onCancel={() => setEditImg(false)}
                                   onDone={(next) => { setImage(next); setEditImg(false); }} />}
        </>}
        {video && <TrimBar src={video} trim={trim} setTrim={setTrim} />}
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 14 }}>
          <div className="attach-wrap">
            <button className="btn" type="button" onClick={() => setAttach(!attach)}>Add media</button>
            {attach && (
              <>
                <div className="attach-backdrop" onClick={() => setAttach(false)} />
                <div className="attach-menu">
                  {/* capture= opens the camera directly on phones */}
                  <label className="attach-item">
                    <IconCamera /> Take a photo
                    <input type="file" accept="image/*" capture="environment" hidden
                           onChange={(e) => pick(e, setImage, setVideo)} />
                  </label>
                  <label className="attach-item">
                    <IconImage /> Photo from files
                    <input type="file" accept="image/*" hidden
                           onChange={(e) => pick(e, setImage, setVideo)} />
                  </label>
                  <label className="attach-item">
                    <IconVideo /> Video from files
                    <input type="file" accept="video/*" hidden
                           onChange={(e) => pick(e, setVideo, setImage)} />
                  </label>
                  <div className="attach-sep" />
                  {/* ponytail: real Drive/Dropbox pickers need OAuth + their SDKs.
                      Until keys exist these open the service so you can download,
                      then attach with "Photo from files". */}
                  <a className="attach-item" href="https://drive.google.com" target="_blank"
                     rel="noreferrer" onClick={() => setAttach(false)}>
                    <IconDrive /> Google Drive
                  </a>
                  <a className="attach-item" href="https://www.dropbox.com" target="_blank"
                     rel="noreferrer" onClick={() => setAttach(false)}>
                    <IconBox /> Dropbox
                  </a>
                </div>
              </>
            )}
          </div>
          {/* ponytail: native datetime-local, no date-picker dependency */}
          <input type="datetime-local" value={when} min={toInput(Date.now())}
                 onChange={(e) => setWhen(e.target.value)} style={{ width: 'auto', margin: 0 }} />
          <button className="btn-link" type="button" onClick={schedule}>Schedule</button>
          <button className="btn-link" type="button" onClick={(e) => addPost(e, true)}>Save draft</button>
          <label className="btn-link" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)}
                   style={{ width: 'auto', margin: 0 }} />
            Members only
          </label>
          {locked && (
            <label className="btn-link" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              Minimum tier
              <select value={minRank} onChange={(e) => setMinRank(+e.target.value)}
                      aria-label="Minimum tier for this post">
                {TIERS.map((t) => <option key={t.rank} value={t.rank}>{t.name}</option>)}
              </select>
            </label>
          )}
          <button className="btn" type="submit">Post</button>
        </div>
      </form>
      ) : (
        <div className="card" style={{ textAlign: 'center' }}>
          <p className="muted">
            {role ? 'Only creators can post here.' : 'Join to like, comment and unlock posts.'}
          </p>
          {!role && <Link className="btn" href="/signup">Sign up free</Link>}
        </div>
      )}

      {canPost(role) && drafts.length > 0 && (
        <div className="posts">
          <h2 className="sub" style={{ marginTop: 40 }}>Drafts</h2>
          {drafts.map((p) => (
            <article key={p.id} className="post">
              <div className="post-head">
                <div>
                  <div className="post-name">{p.at ? 'Scheduled' : 'Draft'}</div>
                  <div className="muted post-date">
                    {p.at ? `Posts ${new Date(p.at).toLocaleString()}` : `Saved ${new Date(p.ts).toLocaleString()}`}
                  </div>
                </div>
                <button className="btn-link del" onClick={() => del(p.id)}>Delete</button>
              </div>
              {p.caption && <p className="post-caption">{p.caption}</p>}
              {p.image && <img className="post-img" src={p.image} alt={p.caption ? `Image: ${p.caption}` : "Image attached to this post"} />}
              {p.video && <Clip className="post-img" src={p.video} trim={p.trim} />}
              <div className="row" style={{ marginTop: 16 }}>
                <button className="btn-link" onClick={() => editDraft(p)}>Edit</button>
                <button className="btn" onClick={() => publish(p.id)}>Publish</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {feed.length === 0 && <p className="muted" style={{ marginTop: 40 }}>No posts yet. Write your first one.</p>}

      <div className="posts">
        {feed.map((p) => {
          const comments = p.comments || [];
          // Preview beats everything: a creator checking "what does a Supporter
          // see" must be shown the lock even though the server sent them the body.
          const hidden = preview !== null
            ? p.locked && !reaches(preview, p.minRank)
            // Configured: the body never arrived. Demo: decide from role + tier.
            // Authors and admins always see it; everyone else needs the rank.
            // Being "paid" is no longer enough — a Supporter cannot read Studio.
            : p.hidden ?? (p.locked && !canPost(role) && !reaches(rank, p.minRank));
          return (
          <article key={p.id} className="post">
            <div className="post-head">
              <img className="pfp" src={p.pfp} alt={p.name} />
              <div>
                <div className="post-name">{p.name}</div>
                <div className="muted post-date">{new Date(p.ts).toLocaleString()}</div>
              </div>
              {canPost(role) &&
                <button className="btn-link del" onClick={() => del(p.id)} aria-label="Delete post">Delete</button>}
            </div>
            {hidden ? (
              <div className="locked">
                {/* the teaser is public metadata, so this is safe to show */}
                {p.teaser && <p className="teaser">“{p.teaser}”</p>}
                <p>🔒 {tierName(p.minRank)} and up</p>
                {!role
                  ? <Link className="btn" href="/signup">Join free, then back them</Link>
                  : isConfigured
                    ? <Link className="btn" href="/">Back this creator</Link>
                    : <button className="btn"
                              onClick={() => { setRole('paid', p.minRank); setRoleState('paid'); setRank(p.minRank); }}>
                        Become a {tierName(p.minRank)}
                      </button>}
              </div>
            ) : <>
            {p.caption && <p className="post-caption">{p.caption}</p>}
            {p.image && <img className="post-img" src={p.image} alt={p.caption ? `Image: ${p.caption}` : "Image attached to this post"} />}
            {p.video && <Clip className="post-img" src={p.video} trim={p.trim} />}

            <div className="actions">
              <button className="act" onClick={() => setOpen(open === p.id ? null : p.id)} aria-label="Comment">
                <IconComment /> {comments.length || ''}
              </button>
              <button className={'act repost' + (p.reposted ? ' on' : '')} onClick={() => toggleRepost(p.id)} aria-label="Repost">
                <IconRepost /> {p.reposts || ''}
              </button>
              <button className={'act like' + (p.liked ? ' on' : '')} onClick={() => toggleLike(p.id)} aria-label="Like">
                <IconHeart filled={p.liked} /> {p.likes || ''}
              </button>
              <button className={'act bm' + (p.bookmarked ? ' on' : '')} onClick={() => toggleBookmark(p.id)} aria-label="Bookmark">
                <IconBookmark filled={p.bookmarked} />
              </button>
            </div>

            {open === p.id && (
              <div className="comments">
                {comments.map((c) => (
                  <div key={c.id} className="comment"><span className="post-name">{c.name}</span> {c.text}</div>
                ))}
                <form className="comment-form" onSubmit={(e) => submitComment(e, p.id)}>
                  <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Post your reply" />
                  <button className="btn" type="submit">Reply</button>
                </form>
              </div>
            )}
            </>}
          </article>
          );
        })}
      </div>
    </div>
  );
}

// ponytail: iOS-markup-shaped editor. Everything on the image is one `items`
// list (text / sticker / stroke) in z-order, baked with canvas at Done.
// Nothing hand-rolled that the platform gives free: contentEditable for text
// entry, SVG polylines for ink, pointer events for drag and pinch.
const FILTERS = [
  ['None', 'none'],
  ['B&W', 'grayscale(1) contrast(1.1)'],
  ['Warm', 'saturate(1.3) sepia(0.25)'],
  ['Cool', 'saturate(1.1) hue-rotate(-15deg) brightness(1.05)'],
  ['Fade', 'contrast(0.85) brightness(1.1) saturate(0.8)'],
  ['Punch', 'contrast(1.25) saturate(1.4)'],
];
const STICKERS = ['\u{1F338}', '\u{1F496}', '✨', '\u{1F525}', '\u{1F602}', '\u{1F44F}', '\u{1F389}', '\u{1F33F}'];
const INKS = ['#ffffff', '#111111', '#f0416f', '#ffd60a', '#1d9e75'];
const FONTS = [['Sans', 'sans-serif'], ['Serif', 'serif'], ['Mono', 'monospace'], ['Script', 'cursive']];
const PEN = 0.008;        // stroke width as a fraction of the frame width
const TEXT_SIZE = 0.06;
const STICKER_SIZE = 0.12;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function ImageEditor({ src: src0, onDone, onCancel }) {
  const img = useRef(null);
  const wrap = useRef(null);
  const drawing = useRef(null);   // id of the stroke being drawn
  const cropFrom = useRef(null);  // crop drag origin
  const held = useRef(null);      // id of the widget being dragged
  const ptrs = useRef(new Map()); // live pointers on a widget, for pinch
  const gest = useRef(null);      // pinch baseline
  const [src, setSrc] = useState(src0);
  const [tool, setTool] = useState('move');   // move | crop | draw | erase
  const [items, setItems] = useState([]);     // {id, kind, ...} in z-order
  const [past, setPast] = useState([]);       // undo stack of whole item lists
  const [sel, setSel] = useState(null);
  const [filter, setFilter] = useState('none');
  const [ink, setInk] = useState('#ffffff');
  const [box, setBox] = useState(null);       // crop rect in displayed px

  // ponytail: undo = snapshot the list before each gesture, 20 deep. Covers
  // widgets and ink, not crop/filter/rotate (those have their own reset/toggle).
  const snap = () => setPast((p) => [...p.slice(-19), items]);
  function undo() {
    if (!past.length) return;
    setItems(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setSel(null);
  }

  const pct = (e) => {
    const r = wrap.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };
  const px = (e) => {
    const r = wrap.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const patch = (id, o) => setItems((xs) => xs.map((i) => (i.id === id ? { ...i, ...o } : i)));

  // Object eraser, like iOS: touching a thing removes the whole thing.
  // ponytail: hit-tests stroke vertices, not segments — a fat radius covers the
  // gaps a fast swipe leaves. Point-to-segment distance if that ever feels off.
  const near = (a, b, r) => Math.hypot(a.x - b.x, a.y - b.y) < r;
  const erase = (p) => setItems((xs) => xs.filter((i) =>
    i.kind === 'stroke' ? !i.pts.some((q) => near(q, p, 5)) : !near(i, p, 7)));

  function down(e) {
    const p = pct(e), q = px(e);
    wrap.current.setPointerCapture(e.pointerId);
    setSel(null);
    if (tool === 'crop') { cropFrom.current = q; setBox(null); }
    else if (tool === 'draw') {
      const id = crypto.randomUUID();
      snap();
      drawing.current = id;
      setItems((xs) => [...xs, { id, kind: 'stroke', color: ink, w: PEN, pts: [p] }]);
    } else if (tool === 'erase') { snap(); erase(p); }
  }
  function move(e) {
    if (tool === 'crop' && cropFrom.current) {
      const q = px(e), s = cropFrom.current;
      setBox({ x: Math.min(s.x, q.x), y: Math.min(s.y, q.y), w: Math.abs(q.x - s.x), h: Math.abs(q.y - s.y) });
    } else if (tool === 'draw' && drawing.current) {
      const p = pct(e), id = drawing.current;
      setItems((xs) => xs.map((i) => (i.id === id ? { ...i, pts: [...i.pts, p] } : i)));
    } else if (tool === 'erase' && e.buttons) erase(pct(e));
  }
  const up = () => { cropFrom.current = null; drawing.current = null; held.current = null; };

  function grab(e, id) {                 // drag/pinch a widget (move tool), or erase it
    if (tool === 'erase') { snap(); setItems((xs) => xs.filter((i) => i.id !== id)); return; }
    if (tool !== 'move') return;
    e.stopPropagation();
    setSel(id);
    e.currentTarget.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {       // second finger down: start pinch/twist
      const [a, b] = [...ptrs.current.values()];
      const it = items.find((i) => i.id === id) || {};
      gest.current = {
        id, d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x),
        s: it.s ?? 1, r: it.r ?? 0,
      };
      held.current = null;
    } else { snap(); held.current = id; }
  }
  function dragWidget(e) {
    if (ptrs.current.has(e.pointerId)) ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current;
    if (g && ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      patch(g.id, { s: clamp(g.s * (d / g.d), 0.2, 6), r: g.r + ((ang - g.ang) * 180) / Math.PI });
      return;
    }
    if (!held.current) return;
    e.stopPropagation();
    patch(held.current, pct(e));
  }
  function release(e) {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) gest.current = null;
    held.current = null;
  }
  // Trackpad pinch arrives as ctrl+wheel, so one handler covers mouse and pad.
  function wheel(e, i) {
    if (tool !== 'move') return;
    if (e.shiftKey) patch(i.id, { r: (i.r ?? 0) + e.deltaY * 0.5 });
    else patch(i.id, { s: clamp((i.s ?? 1) * (1 - e.deltaY * 0.002), 0.2, 6) });
  }

  const add = (o) => { snap(); setItems((xs) => [...xs, { id: crypto.randomUUID(), x: 50, y: 50, s: 1, r: 0, ...o }]); };
  const addText = () => add({ kind: 'text', text: 'Double-click to edit', color: '#ffffff', font: 'sans-serif' });

  // Rotating re-encodes the source so crop math stays in plain unrotated pixels.
  function rotate() {
    const el = img.current;
    const cv = document.createElement('canvas');
    cv.width = el.naturalHeight; cv.height = el.naturalWidth;
    const c = cv.getContext('2d');
    c.translate(cv.width / 2, cv.height / 2);
    c.rotate(Math.PI / 2);
    c.drawImage(el, -el.naturalWidth / 2, -el.naturalHeight / 2);
    setSrc(cv.toDataURL('image/jpeg', 0.92));
    setBox(null);
  }

  function done() {
    const el = img.current;
    const k = el.naturalWidth / el.clientWidth;      // displayed px -> source px
    const dispW = el.clientWidth, dispH = el.clientHeight;
    const c = box && box.w > 8 && box.h > 8
      ? { x: box.x, y: box.y, w: box.w, h: box.h }
      : { x: 0, y: 0, w: dispW, h: dispH };          // all in displayed px
    const cv = document.createElement('canvas');
    cv.width = Math.round(c.w * k); cv.height = Math.round(c.h * k);
    const ctx = cv.getContext('2d');
    if ('filter' in ctx) ctx.filter = filter;        // ponytail: no filter support = plain image, not a crash
    ctx.drawImage(el, c.x * k, c.y * k, c.w * k, c.h * k, 0, 0, cv.width, cv.height);
    if ('filter' in ctx) ctx.filter = 'none';

    const FW = dispW * k;                            // full frame width in source px
    const toX = (x) => ((x / 100) * dispW - c.x) * k;
    const toY = (y) => ((y / 100) * dispH - c.y) * k;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const i of items) {
      if (i.kind === 'stroke') {
        ctx.beginPath();
        ctx.strokeStyle = i.color; ctx.lineWidth = i.w * FW;
        i.pts.forEach((q, n) => (n ? ctx.lineTo(toX(q.x), toY(q.y)) : ctx.moveTo(toX(q.x), toY(q.y))));
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(toX(i.x), toY(i.y));
      if (i.r) ctx.rotate((i.r * Math.PI) / 180);
      const scale = i.s ?? 1;
      if (i.kind === 'sticker') {
        ctx.font = `${FW * STICKER_SIZE * scale}px sans-serif`;
        ctx.fillText(i.ch, 0, 0);
      } else {
        const lines = i.text.split('\n').filter((l) => l.trim());
        const size = Math.max(14, FW * TEXT_SIZE * scale), lh = size * 1.25;
        ctx.font = `600 ${size}px ${i.font || 'sans-serif'}`;
        ctx.lineWidth = size / 8; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.fillStyle = i.color || '#fff';
        lines.forEach((line, n) => {
          const y = (n - (lines.length - 1) / 2) * lh;
          ctx.strokeText(line, 0, y);                // outline keeps it readable on any photo
          ctx.fillText(line, 0, y);
        });
      }
      ctx.restore();
    }
    onDone(cv.toDataURL('image/jpeg', 0.85));         // jpeg: data URLs share a ~5MB quota
  }

  const strokes = items.filter((i) => i.kind === 'stroke');
  const picked = items.find((i) => i.id === sel);
  return (
    <div className="modal" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="sheet">
        <div className="row sheet-head">
          <button className="btn-link" type="button" onClick={onCancel}>Cancel</button>
          <strong>Markup</strong>
          <button className="btn" type="button" onClick={done}>Done</button>
        </div>

        <div ref={wrap} className={'crop-wrap preview tool-' + tool}
             onPointerDown={down} onPointerMove={move} onPointerUp={up}>
          <img ref={img} src={src} alt="edit" draggable={false}
               style={{ width: '100%', display: 'block', borderRadius: 'inherit', filter }} />
          <svg className="ink" viewBox="0 0 100 100" preserveAspectRatio="none">
            {strokes.map((i) => (
              <polyline key={i.id} points={i.pts.map((q) => `${q.x},${q.y}`).join(' ')}
                        fill="none" stroke={i.color} vectorEffect="non-scaling-stroke"
                        style={{ strokeWidth: `${i.w * 100}cqw` }} />
            ))}
          </svg>
          {box && <div className="crop-box" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
          {items.filter((i) => i.kind !== 'stroke').map((i) => (
            <div key={i.id}
                 className={'ov' + (i.kind === 'sticker' ? ' ov-sticker' : '') + (sel === i.id ? ' sel' : '')}
                 style={{
                   left: i.x + '%', top: i.y + '%',
                   transform: `translate(-50%, -50%) rotate(${i.r || 0}deg) scale(${i.s ?? 1})`,
                   color: i.kind === 'text' ? i.color : undefined,
                   fontFamily: i.kind === 'text' ? i.font : undefined,
                 }}
                 onPointerDown={(e) => grab(e, i.id)} onPointerMove={dragWidget}
                 onPointerUp={release} onPointerCancel={release} onWheel={(e) => wheel(e, i)}
                 contentEditable={i.kind === 'text' && tool === 'move'} suppressContentEditableWarning
                 onBlur={(e) => patch(i.id, { text: e.currentTarget.innerText })}>
              {i.kind === 'sticker' ? i.ch : i.text}
            </div>
          ))}
        </div>

        <div className="row tools">
          {['move', 'crop', 'draw', 'erase'].map((t) => (
            <button key={t} type="button" className={'chip' + (tool === t ? ' on' : '')}
                    onClick={() => setTool(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
          <button type="button" className="chip" onClick={addText}>+ Text</button>
          <button type="button" className="chip" onClick={rotate}>Rotate</button>
          <button type="button" className="chip" onClick={undo} disabled={!past.length}>Undo</button>
          {box && <button type="button" className="chip" onClick={() => setBox(null)}>Reset crop</button>}
        </div>
        <p className="muted hint">
          {tool === 'move' && 'Drag to place. Pinch or scroll a widget to resize, shift-scroll to rotate. Double-click text to retype.'}
          {tool === 'crop' && 'Drag across the image to crop.'}
          {tool === 'draw' && 'Draw on the image. Pick an ink colour below.'}
          {tool === 'erase' && 'Tap or swipe over ink, text or stickers to delete them.'}
        </p>

        {(tool === 'draw' || picked) && (
          <div className="row" style={{ gap: 8 }}>
            {INKS.map((c) => {
              const on = picked ? picked.color === c : ink === c;
              return (
                <button key={c} type="button" className={'ink-chip' + (on ? ' on' : '')} style={{ background: c }}
                        aria-label={'Colour ' + c}
                        onClick={() => (picked ? (snap(), patch(picked.id, { color: c })) : setInk(c))} />
              );
            })}
            {picked?.kind === 'text' && FONTS.map(([label, f]) => (
              <button key={f} type="button" className={'chip' + (picked.font === f ? ' on' : '')}
                      style={{ fontFamily: f }}
                      onClick={() => { snap(); patch(picked.id, { font: f }); }}>{label}</button>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          {STICKERS.map((ch) => (
            <button key={ch} type="button" className="chip" onClick={() => add({ kind: 'sticker', ch })}>{ch}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          {FILTERS.map(([label, css]) => (
            <button key={label} type="button" className={'chip' + (filter === css ? ' on' : '')}
                    onClick={() => setFilter(css)}>{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ponytail: trim is stored as start/end and enforced on playback — no re-encode,
// so no ffmpeg.wasm (~30MB). Ceiling: the file still holds the full clip; a
// download would be untrimmed. Upgrade path = server-side ffmpeg on upload.
function Clip({ src, trim, ...rest }) {
  const v = useRef(null);
  const { start = 0, end } = trim || {};
  useEffect(() => { if (v.current) v.current.currentTime = start; }, [start, src]);
  return (
    <video ref={v} src={src} controls {...rest}
      onLoadedMetadata={(e) => { e.target.currentTime = start; }}
      onTimeUpdate={(e) => {
        if (end && e.target.currentTime >= end) { e.target.pause(); e.target.currentTime = start; }
        else if (e.target.currentTime < start - 0.3) e.target.currentTime = start;
      }} />
  );
}

function TrimBar({ src, trim, setTrim }) {
  const [dur, setDur] = useState(0);
  const { start = 0, end = 0 } = trim || {};
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  return (
    <div className="trim">
      <video className="preview" src={src} controls
             onLoadedMetadata={(e) => {
               const d = e.target.duration;
               if (Number.isFinite(d) && !dur) { setDur(d); setTrim({ start: 0, end: d }); }
             }} />
      {dur > 0 && (
        <>
          <label>Start {fmt(start)}</label>
          <input type="range" min={0} max={dur} step={0.1} value={start}
                 onChange={(e) => setTrim({ start: Math.min(+e.target.value, end - 0.5), end })} />
          <label>End {fmt(end)}</label>
          <input type="range" min={0} max={dur} step={0.1} value={end}
                 onChange={(e) => setTrim({ start, end: Math.max(+e.target.value, start + 0.5) })} />
        </>
      )}
    </div>
  );
}

const IconCamera = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);
const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 7l-7 5 7 5z" /><rect x="1" y="5" width="15" height="14" rx="2" />
  </svg>
);
const IconDrive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2h8l6 11h-8z" /><path d="M2 19l4-7h12l-4 7z" /><path d="M8 2L2 13l4 6" />
  </svg>
);
const IconBox = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8L6.5 4.5 1 8l5.5 3.5z" /><path d="M12 8l5.5-3.5L23 8l-5.5 3.5z" />
    <path d="M1 15l5.5 3.5L12 15l-5.5-3.5z" /><path d="M12 15l5.5 3.5L23 15l-5.5-3.5z" />
  </svg>
);
const IconComment = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 20l1.9-4.5a8.38 8.38 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z" />
  </svg>
);
const IconRepost = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const IconHeart = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);
const IconBookmark = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);
