import { cn } from "@/lib/utils";

type BadgeVariant = "breaking" | "live" | "exclusive" | "duration";

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function NewsBadge({ variant, children, className }: BadgeProps) {
  const base = "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide";

  const styles: Record<BadgeVariant, string> = {
    breaking: "bg-[hsl(var(--breaking-yellow))] text-black",
    live: "bg-[hsl(var(--live-red))] text-white",
    exclusive: "bg-black text-white",
    duration: "bg-white text-black shadow-sm",
  };

  return (
    <span className={cn(base, styles[variant], className)}>
      {variant === "live" && (
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
      )}
      {children}
    </span>
  );
}
