import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeadingProps {
  title: string;
  moreHref?: string;
  moreLabel?: string;
}

export function SectionHeading({ title, moreHref, moreLabel = "More" }: SectionHeadingProps) {
  return (
    <div className="mb-5 mt-2 flex items-end justify-between border-t-[3px] border-foreground pt-3">
      <h2 className="section-heading">{title}</h2>
      {moreHref && (
        <Link
          to={moreHref}
          className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-foreground hover:text-primary"
        >
          {moreLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
