// Theme: 'light' | 'dark' | 'system'. Applied as data-theme on <html>.
// ponytail: CSS custom properties + one attribute, no theming library.
export const THEME_KEY = 'patronage_theme';

export function loadTheme() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function applyTheme(t) {
  const dark = t === 'dark' ||
    (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, t);
}
