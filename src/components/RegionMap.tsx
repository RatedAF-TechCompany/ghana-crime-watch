import Link from 'next/link';

interface Cell { slug: string; name: string; grid: readonly [number, number] | readonly number[]; count: number }

/** Tile map of Ghana's 16 regions, roughly in geographic position. Shade = share of the busiest region. */
export function RegionMap({ cells }: { cells: Cell[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const shade = (n: number) => {
    if (n === 0) return 'bg-muted text-muted-foreground';
    const r = n / max;
    if (r > 0.6) return 'bg-primary text-primary-foreground';
    if (r > 0.25) return 'bg-primary/70 text-primary-foreground';
    if (r > 0.08) return 'bg-primary/40 text-foreground';
    return 'bg-primary/15 text-foreground';
  };
  return (
    <div>
      <div className="grid grid-cols-4 gap-2" style={{ gridTemplateRows: 'repeat(6, minmax(72px, auto))' }}>
        {cells.map((c) => (
          <Link key={c.slug} href={`/regions/${c.slug}`}
            style={{ gridColumn: c.grid[0], gridRow: c.grid[1] }}
            className={`flex flex-col justify-between rounded-sm p-2 font-sans transition-opacity hover:opacity-80 ${shade(c.count)}`}>
            <span className="text-xs font-bold leading-tight">{c.name}</span>
            <span className="text-lg font-bold tabular-nums">{c.count.toLocaleString()}</span>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 font-sans text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary/15" />Fewer</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary/40" /></span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary/70" /></span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary" />More</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-muted" />None</span>
      </div>
    </div>
  );
}
