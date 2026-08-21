/** Light/dark theme management: persisted per-user, OS-aware on first visit. */

export type Theme = "light" | "dark";

const THEME_KEY = "ashare.theme";

export function getStoredTheme(): Theme | null {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

/** OS preference on first visit, otherwise the stored choice. */
export function getInitialTheme(): Theme {
  return (
    getStoredTheme() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}
