import { cn } from "@/lib/utils";

interface StoryGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StoryGrid({ children, className }: StoryGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
