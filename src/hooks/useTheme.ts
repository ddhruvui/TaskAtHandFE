import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

/* Also read by the inline script in index.html, which applies the saved
   choice before first paint so a pinned theme never flashes the OS one. */
export const THEME_STORAGE_KEY = "tah-theme";

const ORDER: ThemePreference[] = ["system", "light", "dark"];

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Pin the colour scheme via <html data-theme>, or clear it to follow the OS. */
export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

/**
 * The colour-scheme preference: follow the OS (default), or pin light/dark.
 * A per-browser convenience only — stored in localStorage, never on the
 * backend, and a storage failure just falls back to "system".
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemePreference>(readStored);

  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* private mode / blocked storage: the choice just won't persist */
    }
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length]);
  }, []);

  return { theme, setTheme, cycleTheme };
}
