import { useCallback } from "react";
import { create } from "zustand";
import { STORAGE_KEYS } from "./constants";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

function readThemePreference(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // Theme still follows the system preference when browser storage is unavailable.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const root = document.documentElement;
  if (root.classList.contains("light")) return "light";
  if (root.classList.contains("dark")) return "dark";
  return readThemePreference();
}

function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  const isLight = theme === "light";
  root.classList.toggle("light", isLight);
  root.classList.toggle("dark", !isLight);
  root.style.colorScheme = theme;

  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.warn("Unable to persist the theme preference.", error);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    if (theme === get().theme) return;
    applyTheme(theme);
    set({ theme });
  },
}));

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useCallback(() => {
    const currentTheme = useThemeStore.getState().theme;
    useThemeStore.getState().setTheme(currentTheme === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggle };
}
