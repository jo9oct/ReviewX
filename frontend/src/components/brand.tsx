import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src="/my-icon.png" alt="" className="size-7 rounded object-contain" />
      <span className="text-sm font-semibold text-foreground">ReviewX</span>
    </span>
  );
}
