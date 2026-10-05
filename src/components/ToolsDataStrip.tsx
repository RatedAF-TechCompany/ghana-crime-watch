import Link from 'next/link';
import { BarChart3, BookOpen, Map, Scale, Shield, Tags } from 'lucide-react';

const TOOLS = [
  { label: 'Crime map', href: '/map', icon: Map },
  { label: 'Statistics', href: '/statistics', icon: BarChart3 },
  { label: 'Courts', href: '/courts', icon: Scale },
  { label: 'Safety', href: '/safety', icon: Shield },
  { label: 'Explainers', href: '/explainers', icon: BookOpen },
  { label: 'Topic hubs', href: '/topics/armed-robbery', icon: Tags },
] as const;

export function ToolsDataStrip() {
  return (
    <section aria-labelledby="tools-data-heading" className="border-y border-pale-rule py-5">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="tools-data-heading" className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
          Tools &amp; data
        </h2>
        <span className="font-sans text-xs text-muted-foreground">Explore GhanaCrimes coverage</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-6">
        {TOOLS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-20 items-center gap-3 bg-card px-3 py-4 text-foreground hover:text-primary"
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />
            <span className="font-sans text-sm font-semibold leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}