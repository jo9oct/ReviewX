import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "./constants";

export type Theme = "dark" | "light";

/**
 * Standalone theme hook for the landing page (and any page outside the
 * authenticated dashboard Zustand store).
 *
 * - Reads the initial value from localStorage, falling back to
 *   prefers-color-scheme if nothing is stored.
 * - Applies / removes the `light` class on <html> on every change.
 * - Writes the choice back to localStorage so it persists.
 * - The Zustand dashboard store (review-store.ts) uses the same
 *   STORAGE_KEYS.THEME key, so both surfaces stay in sync via storage.
 */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => {
    // SSR guard — default to dark on the server.
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === "light" || stored === "dark") return stored;
    // No stored preference — defer to OS.
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Sync the <html> class and localStorage whenever theme changes.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    // Keep color-scheme in sync for browser chrome (scrollbars, inputs, etc.)
    root.style.colorScheme = theme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // Private browsing — localStorage may be unavailable; ignore silently.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
