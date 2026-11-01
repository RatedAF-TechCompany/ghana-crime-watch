import Link from 'next/link';

/** Plain-link filter row (works without JavaScript and is cacheable at the edge). */
export function FilterChips({ label, options, active }: { label: string; options: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="mt-4">
      <p className="mb-2 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Link key={o.key || 'all'} href={o.href} rel="nofollow" aria-current={o.key === active ? 'true' : undefined}
            className={`rounded-full border px-3 py-1 font-sans text-xs font-semibold ${o.key === active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:border-primary'}`}>
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
