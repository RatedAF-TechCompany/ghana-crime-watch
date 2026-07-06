import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface EditorialSectionHeadingProps {
  title: string;
  moreHref?: string;
  align?: "left" | "center";
  variant?: "red-serif" | "centre-serif" | "hatched";
}

/**
 * Editorial section heading matching Spectator style.
 * - red-serif: small red serif label with tiny red circular arrow
 * - centre-serif: large centred black serif title
 * - hatched: adds a diagonal hatch rule above the centre serif title
 */
export function EditorialSectionHeading({
  title,
  moreHref,
  align = "left",
  variant = "red-serif",
}: EditorialSectionHeadingProps) {
  if (variant === "hatched" || variant === "centre-serif") {
    return (
      <div className="mb-8">
        {variant === "hatched" && <div className="hatched-rule mb-6" />}
        <h2 className="section-title-serif text-center">{title}</h2>
      </div>
    );
  }

  return (
    <div
      className={`mb-4 flex items-center gap-3 ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      <h3 className="section-heading">{title}</h3>
      {moreHref && (
        <Link
          href={moreHref}
          aria-label={`More from ${title}`}
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-foreground"
        >
          <ArrowUpRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}
