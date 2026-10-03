import { useEffect, useState } from "react";
import { Toaster as SonnerToaster } from "sonner";

/**
 * Sonner's Toaster wired into the ReviewX design system. `ReviewPlatform`
 * toggles a `light` class on <html>, so a small observer keeps the toast theme
 * in sync. A mounted Toaster is required for the `toast.*` calls in the auth
 * flows (validation errors, reset confirmations) to actually be shown.
 */
export function Toaster() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("light") ? "light" : "dark");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <SonnerToaster
      theme={theme}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "panel text-xs text-foreground shadow-lg",
          title: "text-xs font-medium",
          description: "text-[11px] text-muted-foreground",
          error: "severity-critical",
          success: "text-success",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "border border-border bg-surface text-muted-foreground",
        },
      }}
    />
  );
}
