import { getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";

const CATEGORY_TONES: Record<string, string> = {
  "violent-crime": "bg-primary text-primary-foreground",
  "property-crime": "bg-info-blue text-primary-foreground",
  cybercrime: "bg-dark-panel text-primary-foreground",
  "fraud-scams": "bg-secondary text-secondary-foreground",
  "drug-offences": "bg-muted text-foreground",
  "court-cases": "bg-card text-foreground",
};

export function ArticleImageFallback({
  categorySlug,
  title,
  className,
}: {
  categorySlug: string;
  title: string;
  className?: string;
}) {
  return (
    <div
      aria-label={`${getCategoryLabel(categorySlug)}: ${title}`}
      className={cn(
        "flex h-full w-full flex-col justify-between border border-border p-4 text-left",
        CATEGORY_TONES[categorySlug] || "bg-muted text-foreground",
        className,
      )}
    >
      <span className="font-sans text-[11px] font-bold uppercase tracking-widest opacity-80">
        {getCategoryLabel(categorySlug)}
      </span>
      <span className="line-clamp-4 font-headline text-lg font-bold leading-tight">{title}</span>
      <span className="font-sans text-[11px] font-semibold uppercase tracking-widest opacity-80">GhanaCrimes</span>
    </div>
  );
}