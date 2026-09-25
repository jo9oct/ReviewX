import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-7 place-items-center rounded bg-primary text-primary-foreground">
        <Code2 className="size-4" />
      </span>
      <span className="text-sm font-semibold text-foreground">ReviewX</span>
    </span>
  );
}
