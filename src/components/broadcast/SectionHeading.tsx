import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeadingProps {
  title: string;
  moreHref?: string;
  moreLabel?: string;
}

export function SectionHeading({ title, moreHref, moreLabel = "See all" }: SectionHeadingProps) {
  return (
    <div className="mb-5 mt-2 flex items-end justify-between section-rule pt-3">
      <h2 className="section-heading">{title}</h2>
      {moreHref && (
        <Link
          to={moreHref}
          className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary hover:opacity-80"
        >
          {moreLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}
