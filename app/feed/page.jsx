'use client';
import { useEffect, useState } from 'react';
import { loadProfile } from '../../lib/profile';

// ponytail: posts live in localStorage so the demo works without live Supabase.
// Ceiling: ~5MB quota and single-device. Upgrade path = a `posts` table +
// Supabase Storage for images, swap load/save for supabase.from('posts').
const KEY = 'patronage_posts';
const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
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

  useEffect(() => {
    setPosts(load());
    const p = loadProfile();
    setName(p.name); setPfp(p.pfp);
  }, []);

  // Storage is finite; surface the failure instead of silently losing the post.
  const save = (next) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setPosts(next);
      setErr('');
    } catch {
      setErr('Storage is full. Delete an older post with media and try again.');
    }
  };
  const update = (id, fn) => save(posts.map((p) => (p.id === id ? fn(p) : p)));

  const MAX_BYTES = 3 * 1024 * 1024; // ponytail: data URLs live in a ~5MB quota
  async function pick(e, set, other) {
    const f = e.target.files?.[0];
    setAttach(false);
    e.target.value = ''; // let the same file be re-picked later
    if (!f) return;
    if (f.size > MAX_BYTES) { setErr('That file is over 3MB. Pick a smaller one.'); return; }
    setErr('');
    if (other) other(null); // only one attachment at a time
    set(await fileToDataUrl(f));
  }

  function addPost(e) {
    e.preventDefault();
    if (!caption.trim() && !image && !video) return; // need text or media
    save([{
      id: crypto.randomUUID(), name: name.trim() || 'Anonymous', pfp,
      caption: caption.trim(), image, video, ts: Date.now(),
      likes: 0, liked: false, reposts: 0, reposted: false, bookmarked: false, comments: [],
    }, ...posts]);
    setCaption(''); setImage(null); setVideo(null);
  }

  const del = (id) => save(posts.filter((p) => p.id !== id));
  const toggleLike = (id) => update(id, (p) => ({ ...p, liked: !p.liked, likes: (p.likes || 0) + (p.liked ? -1 : 1) }));
  const toggleRepost = (id) => update(id, (p) => ({ ...p, reposted: !p.reposted, reposts: (p.reposts || 0) + (p.reposted ? -1 : 1) }));
  const toggleBookmark = (id) => update(id, (p) => ({ ...p, bookmarked: !p.bookmarked }));
  function submitComment(e, id) {
    e.preventDefault();
    if (!reply.trim()) return;
    update(id, (p) => ({ ...p, comments: [...(p.comments || []), { id: crypto.randomUUID(), name, text: reply.trim(), ts: Date.now() }] }));
    setReply('');
  }

  return (
    <div className="wrap">
      <header className="head">
        <h1>Feed</h1>
        <p className="sub">Post updates for your patrons.</p>
      </header>

      <form className="compose" onSubmit={addPost}>
        <div className="row" style={{ marginBottom: 14 }}>
          <label className="pfp-pick" title="Change profile picture">
            <img className="pfp" src={pfp} alt="profile" />
            <input type="file" accept="image/*" hidden onChange={(e) => pick(e, setPfp)} />
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)}
                  placeholder="What's blooming?" rows={3} />
        {image && <img className="preview" src={image} alt="preview" />}
        {video && <video className="preview" src={video} controls />}
        {err && <p className="err">{err}</p>}
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
          <button className="btn" type="submit">Post</button>
        </div>
      </form>

      {posts.length === 0 && <p className="muted" style={{ marginTop: 40 }}>No posts yet. Write your first one.</p>}

      <div className="posts">
        {posts.map((p) => {
          const comments = p.comments || [];
          return (
          <article key={p.id} className="post">
            <div className="post-head">
              <img className="pfp" src={p.pfp} alt={p.name} />
              <div>
                <div className="post-name">{p.name}</div>
                <div className="muted post-date">{new Date(p.ts).toLocaleString()}</div>
              </div>
              <button className="btn-link del" onClick={() => del(p.id)} aria-label="Delete post">Delete</button>
            </div>
            {p.caption && <p className="post-caption">{p.caption}</p>}
            {p.image && <img className="post-img" src={p.image} alt="" />}
            {p.video && <video className="post-img" src={p.video} controls />}

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
          </article>
          );
        })}
      </div>
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
