import { cn } from "@/lib/utils";

export function LiveDevelopingPill({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground",
        className
      )}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground" />
      Developing
    </span>
  );
}
