import { supabase, isConfigured } from './supabase.js';

// Two modes:
//   keys set  -> Supabase Auth is the authority. What's in localStorage is a
//                mirror for rendering only; RLS decides what data you get, so
//                editing the mirror changes labels and nothing else.
//   no keys   -> the localStorage roster below, a view switch for the demo.
export const ROLES = [
  ['admin', 'Admin'], ['creator', 'Creator'], ['paid', 'Patron'], ['unpaid', 'Free member'],
];

// Sign-up hands out 'unpaid' — the only role you get for free. Staff accounts
// can't be self-served, so they're seeded here to keep the demo explorable.
const SEED = [
  { email: 'admin@patronage.demo', role: 'admin' },
  { email: 'creator@patronage.demo', role: 'creator' },
];

const KEY = 'patronage_session';
const USERS = 'patronage_users';
const norm = (e) => (e || '').trim().toLowerCase();
export const findUser = (email, users) => users.find((u) => u.email === norm(email));

export function loadSession() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}

// The roster the admin oversees: seeded staff + everyone who has signed up here.
export function loadUsers() {
  if (typeof window === 'undefined') return [];
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(USERS)) || []; } catch { /* corrupt: start over */ }
  const extra = SEED.filter((s) => !findUser(s.email, saved));
  return [...saved, ...extra];
}

const putUser = (u) => {
  const rest = loadUsers().filter((x) => x.email !== u.email);
  localStorage.setItem(USERS, JSON.stringify([...rest, u]));
};

export async function signUp(email, password) {
  const e = norm(email);
  if (!e.includes('@')) throw new Error('Enter a valid email.');
  if (isConfigured) {
    // The `handle_new_user` trigger writes the profile row with role 'unpaid'.
    const { error } = await supabase.auth.signUp({ email: e, password });
    if (error) throw error;
    return sync();
  }
  if (findUser(e, loadUsers())) throw new Error('That email already has an account. Sign in instead.');
  return start({ email: e, role: 'unpaid' });
}

export async function signIn(email, password) {
  if (isConfigured) {
    const { error } = await supabase.auth.signInWithPassword({ email: norm(email), password });
    if (error) throw error;
    return sync();
  }
  const u = findUser(email, loadUsers());
  if (!u) throw new Error('No account with that email. Sign up first.');
  return start(u);
}

// Pull the authoritative role and highest active tier into the render mirror.
export async function sync() {
  if (!isConfigured) return loadSession();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { localStorage.removeItem(KEY); return null; }
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  // Labels only. Gating is the RLS policy; this rank just picks which "upgrade"
  // copy to show, so a tampered mirror reveals nothing.
  const { data: mem } = await supabase
    .from('memberships').select('status, tiers(rank)').eq('status', 'active');
  const rank = Math.max(0, ...(mem || []).map((m) => m.tiers?.rank || 0));
  return start({ email: user.email, role: data?.role || 'unpaid', rank });
}

// Shared tail of sign-up / sign-in / role change: stamp the roster, hold the session.
function start(u) {
  const s = { email: u.email, role: u.role, rank: u.rank ?? 0, seen: Date.now() };
  putUser(s);
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

// Demo-only shortcuts. With keys set, role and tier both come from the Stripe
// webhook writing the DB server-side — the client cannot promote itself.
export const setRole = (role, rank) =>
  (isConfigured ? loadSession() : start({ ...loadSession(), role, rank }));
export const viewAs = (role) =>
  (isConfigured ? loadSession() : start({ email: `${role}@patronage.demo`, role,
                                          rank: role === 'unpaid' ? 0 : 3 }));

export function signOut() {
  localStorage.removeItem(KEY);
  if (isConfigured) supabase.auth.signOut();
}

// The only three questions the UI ever asks.
export const canPost = (r) => r === 'creator' || r === 'admin';
// Deleted: canSeeLocked(role). With tiers, "paid" no longer answers the
// question — reaches(rank, post.minRank) in lib/tiers does, and the RLS policy
// says the same thing in SQL. One rule, two places, no third opinion.
export const isAdmin = (r) => r === 'admin';
