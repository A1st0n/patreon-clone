// Client-side profile store (localStorage). ponytail: same pattern as feed;
// upgrade path = a Supabase `profiles` row keyed by auth user id.
const KEY = 'patronage_profile';
const DEFAULT = { name: 'You', pfp: '/blossom.svg', handle: '@you', bio: '' };

export function loadProfile() {
  if (typeof window === 'undefined') return DEFAULT;
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY)) }; }
  catch { return DEFAULT; }
}

export function saveProfile(p) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
