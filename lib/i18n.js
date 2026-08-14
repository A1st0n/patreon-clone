// ponytail: a dictionary and a lookup. next-intl earns its keep at ~hundreds of
// strings across server components; this app has a nav and a few CTAs. Ceiling:
// no plurals, no dates, no interpolation — swap to next-intl when you need them.
export const LANGS = [
  ['en', 'English'], ['ja', '日本語'], ['es', 'Español'],
  ['fr', 'Français'], ['de', 'Deutsch'], ['ko', '한국어'],
];

const STRINGS = {
  en: {},   // keys fall back to their English text, so en is empty by design
  ja: {
    Home: 'ホーム', Explore: 'さがす', Feed: 'フィード', About: '概要',
    Account: 'アカウント', 'Sign in': 'ログイン', 'Sign up': '新規登録',
    'Sign out': 'ログアウト', Admin: '管理', Studio: 'スタジオ',
    'Become a patron': '支援する', 'Members-only post': '限定投稿',
  },
  es: {
    Home: 'Inicio', Explore: 'Explorar', Feed: 'Publicaciones', About: 'Acerca de',
    Account: 'Cuenta', 'Sign in': 'Iniciar sesión', 'Sign up': 'Registrarse',
    'Sign out': 'Cerrar sesión', Admin: 'Administración', Studio: 'Estudio',
    'Become a patron': 'Hazte mecenas', 'Members-only post': 'Publicación exclusiva',
  },
  fr: {
    Home: 'Accueil', Explore: 'Explorer', Feed: 'Fil', About: 'À propos',
    Account: 'Compte', 'Sign in': 'Se connecter', 'Sign up': "S'inscrire",
    'Sign out': 'Se déconnecter', Admin: 'Admin', Studio: 'Studio',
    'Become a patron': 'Devenir mécène', 'Members-only post': 'Publication réservée',
  },
  de: {
    Home: 'Start', Explore: 'Entdecken', Feed: 'Feed', About: 'Über uns',
    Account: 'Konto', 'Sign in': 'Anmelden', 'Sign up': 'Registrieren',
    'Sign out': 'Abmelden', Admin: 'Verwaltung', Studio: 'Studio',
    'Become a patron': 'Unterstützen', 'Members-only post': 'Nur für Mitglieder',
  },
  ko: {
    Home: '홈', Explore: '탐색', Feed: '피드', About: '소개',
    Account: '계정', 'Sign in': '로그인', 'Sign up': '가입하기',
    'Sign out': '로그아웃', Admin: '관리자', Studio: '스튜디오',
    'Become a patron': '후원하기', 'Members-only post': '멤버 전용 게시물',
  },
};

export const LANG_KEY = 'patronage_lang';

export function loadLang() {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANG_KEY) || 'en';
}

export function applyLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;   // screen readers switch voice on this
}

// t('Home') -> translated, or the English key itself when untranslated.
export const t = (key, lang = loadLang()) => STRINGS[lang]?.[key] || key;
