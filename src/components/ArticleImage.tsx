import { getCategoryLabel } from "@/lib/categories";
import { cn } from "@/lib/utils";

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
      aria-hidden="true"
      className={cn(
        "flex h-full w-full flex-col justify-end bg-[#141414] p-4 text-left",
        className,
      )}
    >
      <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ffef00]">
        {getCategoryLabel(categorySlug)}
      </span>
      <span className="sr-only">{title}</span>
    </div>
  );
}
