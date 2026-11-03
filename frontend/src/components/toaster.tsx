import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/lib/use-theme";

/**
 * Sonner's Toaster wired into the ReviewX design system. `ReviewPlatform`
 * and the landing page share the same theme state. A mounted Toaster is
 * required for the `toast.*` calls in auth flows to be shown.
 */
export function Toaster() {
  const { theme } = useTheme();

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
