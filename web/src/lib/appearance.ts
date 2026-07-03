// Застосування вигляду (тема / акцент / мова) до <html> + локальне збереження.
// Локальне сховище = джерело правди для МИТТЄВОГО застосування (без миготіння),
// бекенд-налаштування синхронізуються поверх при вході (див. AppearanceSync).

export type Theme = "dark" | "light";
export type Accent = "violet" | "blue" | "green" | "gold" | "magenta";
export type Lang = "uk" | "en";
export type Background =
  | "cosmos"
  | "aurora"
  | "rain"
  | "grid"
  | "fireflies"
  | "off";

const KEYS = {
  theme: "sam.theme",
  accent: "sam.accent",
  lang: "sam.lang",
  background: "sam.background",
} as const;

export const BACKGROUNDS: readonly Background[] = [
  "cosmos",
  "aurora",
  "rain",
  "grid",
  "fireflies",
  "off",
];

export const ACCENTS: { value: Accent; label: string; swatch: string }[] = [
  { value: "violet", label: "Violet", swatch: "#8b5cf6" },
  { value: "blue", label: "Blue", swatch: "#4c8dff" },
  { value: "green", label: "Green", swatch: "#3fce7c" },
  { value: "gold", label: "Gold", swatch: "#f5a623" },
  { value: "magenta", label: "Magenta", swatch: "#ec4899" },
];

const DEFAULTS = { theme: "dark" as Theme, accent: "violet" as Accent, lang: "en" as Lang };

function read<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function getTheme(): Theme {
  return read(KEYS.theme, DEFAULTS.theme, ["dark", "light"]);
}
export function getAccent(): Accent {
  return read(KEYS.accent, DEFAULTS.accent, ["violet", "blue", "green", "gold", "magenta"]);
}
export function getLang(): Lang {
  return read(KEYS.lang, DEFAULTS.lang, ["uk", "en"]);
}
export function getBackground(): Background {
  return read(KEYS.background, "cosmos", BACKGROUNDS);
}

// Чи є ЯВНИЙ локальний вибір користувача (запис у localStorage). Важливо: дефолти
// з initAppearance НЕ пишуться, тож true тут = "користувач сам це обрав на цьому
// пристрої" -> такий вибір має перемагати серверні налаштування (див. AppearanceSync).
export function isStored(kind: keyof typeof KEYS): boolean {
  try {
    return localStorage.getItem(KEYS[kind]) !== null;
  } catch {
    return false;
  }
}

// Події, на які підписуються провайдери/кнопки, щоб реагувати на зміну вигляду.
const LANG_EVENT = "sam:lang-changed";
const THEME_EVENT = "sam:theme-changed";

// persist=false -> лише застосувати до DOM + сповістити, БЕЗ запису в localStorage.
// Так initAppearance застосовує дефолти, не роблячи їх «явним вибором».
export function applyTheme(theme: Theme, persist = true): void {
  const root = document.documentElement;
  // dark — це :root за замовчуванням, тож атрибут ставимо лише для light.
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  if (persist) {
    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch {
      /* ignore */
    }
  }
  // Сповіщаємо підписників (кнопка в TopBar, форма налаштувань), щоб UI
  // всюди відображав актуальну тему — незалежно від того, звідки її змінили.
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

// Перемикає dark <-> light, застосовує миттєво й повертає нову тему.
export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function onThemeChange(cb: (theme: Theme) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Theme>).detail);
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}

export function applyAccent(accent: Accent, persist = true): void {
  const root = document.documentElement;
  // violet — дефолт :root, атрибут потрібен лише для інших.
  if (accent === "violet") root.removeAttribute("data-accent");
  else root.setAttribute("data-accent", accent);
  if (persist) {
    try {
      localStorage.setItem(KEYS.accent, accent);
    } catch {
      /* ignore */
    }
  }
}

export function applyLang(lang: Lang, persist = true): void {
  document.documentElement.setAttribute("lang", lang);
  if (persist) {
    try {
      localStorage.setItem(KEYS.lang, lang);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Lang>).detail);
  window.addEventListener(LANG_EVENT, handler);
  return () => window.removeEventListener(LANG_EVENT, handler);
}

// Фон — жива сцена позаду UI (AmbientBackground підписується на подію).
const BG_EVENT = "sam:background-changed";

export function applyBackground(bg: Background, persist = true): void {
  if (persist) {
    try {
      localStorage.setItem(KEYS.background, bg);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new CustomEvent(BG_EVENT, { detail: bg }));
}

export function onBackgroundChange(cb: (bg: Background) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Background>).detail);
  window.addEventListener(BG_EVENT, handler);
  return () => window.removeEventListener(BG_EVENT, handler);
}

// Викликається один раз до рендера — застосовує збережений вигляд миттєво.
// persist=false: дефолти НЕ пишемо в localStorage, тож пізніше можемо відрізнити
// «користувач явно обрав» (isStored=true) від «просто дефолт».
export function initAppearance(): void {
  applyTheme(getTheme(), false);
  applyAccent(getAccent(), false);
  applyLang(getLang(), false);
  applyBackground(getBackground(), false);
}
