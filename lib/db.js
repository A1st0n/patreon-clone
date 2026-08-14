import { supabase, isConfigured } from './supabase.js';

// One seam for the feed. With Supabase keys, Postgres + RLS decides what comes
// back — a locked post arrives with `content: null` and the browser never holds
// the bytes. Without keys the original localStorage demo still runs.
// ponytail: likes/comments stay local either way; they need their own tables
// and they are not what the paywall is about.
const KEY = 'patronage_posts';
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
};
const writeLocal = (rows) => localStorage.setItem(KEY, JSON.stringify(rows));

// Same rule as the SQL trigger, for demo mode where there is no trigger.
export const makeTeaser = (caption) => {
  const words = (caption || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return null;
  return words.length <= 20 ? words.join(' ') : words.slice(0, 20).join(' ') + '…';
};

// DB row -> the flat shape the feed already renders.
const flatten = (r) => ({
  id: r.id,
  ts: new Date(r.created_at).getTime(),
  at: r.publish_at ? new Date(r.publish_at).getTime() : null,
  draft: r.draft,
  locked: r.locked,
  minRank: r.min_rank || 1,
  teaser: r.teaser,
  hidden: r.locked && !r.post_content,   // RLS withheld the body
  caption: r.post_content?.caption || '',
  image: r.post_content?.image || null,
  video: r.post_content?.video || null,
  name: r.creators?.name || 'Creator',
  pfp: '/blossom.svg',
});

export async function listPosts() {
  if (!isConfigured) return readLocal();
  const { data, error } = await supabase
    .from('posts')
    .select('*, post_content(*), creators(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(flatten);
}

export async function createPost(p) {
  const teaser = makeTeaser(p.caption);
  if (!isConfigured) { writeLocal([{ ...p, teaser }, ...readLocal()]); return p; }
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase.from('posts').insert({
    author_id: user.id, creator_id: p.creator_id ?? null,
    locked: !!p.locked, min_rank: p.minRank || 1, draft: !!p.draft,
    publish_at: p.at ? new Date(p.at).toISOString() : null,
  }).select().single();
  if (error) throw error;
  // The trigger fills posts.teaser from this insert; don't send one from here.
  const { error: e2 } = await supabase.from('post_content')
    .insert({ post_id: data.id, caption: p.caption, image: p.image, video: p.video });
  if (e2) throw e2;
  if (!p.draft) notifyPatrons(data.id);
  return { ...p, id: data.id };
}

// Fire-and-forget: a failed email must never fail the post.
const notifyPatrons = (postId) =>
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ postId }),
  }).catch(() => {});

export async function updatePost(id, patch) {
  if (!isConfigured) {
    writeLocal(readLocal().map((p) => (p.id === id ? { ...p, ...patch } : p)));
    return;
  }
  const row = {};
  if ('locked' in patch) row.locked = patch.locked;
  if ('minRank' in patch) row.min_rank = patch.minRank;
  if ('draft' in patch) row.draft = patch.draft;
  if ('at' in patch) row.publish_at = patch.at ? new Date(patch.at).toISOString() : null;
  const { error } = await supabase.from('posts').update(row).eq('id', id);
  if (error) throw error;
}

export async function deletePost(id) {
  if (!isConfigured) { writeLocal(readLocal().filter((p) => p.id !== id)); return; }
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) throw error;
}

// Social state is per-device in both modes, merged onto whatever the server sent.
const SOCIAL = 'patronage_social';
export const loadSocial = () => {
  try { return JSON.parse(localStorage.getItem(SOCIAL)) || {}; } catch { return {}; }
};
export const saveSocial = (m) => localStorage.setItem(SOCIAL, JSON.stringify(m));
