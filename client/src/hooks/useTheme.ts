import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "spotify-table:theme";
const DEFAULT: Theme = "dark";

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "dark" || saved === "light") return saved;
    // Respect OS preference on first visit
    if (window.matchMedia("(prefers-color-scheme: light)").matches)
      return "light";
  } catch {
    /* localStorage unavailable */
  }
  return DEFAULT;
}

/**
 * Persists theme to localStorage and applies it as a data-theme
 * attribute on <html> so all CSS variables flip instantly.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply to <html> on mount and every change
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
