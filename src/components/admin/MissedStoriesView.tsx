'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatGhanaDate, formatGhanaTime } from '@/lib/article-meta';

const VIEWS: Record<string, { label: string; statuses: string[] }> = {
  missing: { label: 'Not on site', statuses: ['discovery', 'new', 'error'] },
  rejected: { label: 'Rejected (check for false rejections)', statuses: ['rejected'] },
};

/** Items collected in the last 48h that have not become an article or an Update on one. */
export default function MissedStoriesView() {
  const [view, setView] = useState<keyof typeof VIEWS>('missing');
  const { data, isLoading, error } = useQuery({
    queryKey: ['missed-stories', view],
    queryFn: async () => {
      const since = new Date(Date.now() - 48 * 3600_000).toISOString();
      const { data, error } = await supabase
        .from('raw_items')
        .select('id, title, url, status, reason, fetched_at, published_at, sources(name, type)')
        .in('status', VIEWS[view].statuses)
        .is('article_id', null)
        .gte('fetched_at', since)
        .order('fetched_at', { ascending: false })
        .limit(300);
      if (error) throw error;
      return data as any[];
    },
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <a href="/admin" className="text-sm text-primary underline">Back to dashboard</a>
      <h1 className="mt-3 font-serif text-2xl font-bold">Missed stories (last 48 hours)</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Collected items that are not yet on the site as an article or an update. Discovery-only items are never published on their own;
        they wait until a primary source reports the same story.
      </p>
      <div className="my-4 flex gap-2">
        {Object.entries(VIEWS).map(([k, v]) => (
          <Button key={k} size="sm" variant={view === k ? 'default' : 'outline'} onClick={() => setView(k as keyof typeof VIEWS)}>{v.label}</Button>
        ))}
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {error && <p className="text-sm text-destructive">Could not load items.</p>}
      {data && data.length === 0 && <p className="text-sm text-muted-foreground">Nothing missed in the last 48 hours.</p>}
      {data && data.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Headline</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-md">
                  <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="font-medium hover:text-primary">{r.title}</a>
                </TableCell>
                <TableCell className="text-sm">{r.sources?.name}{r.sources?.type === 'discovery' ? ' (discovery)' : ''}</TableCell>
                <TableCell className="text-xs">
                  <span className="font-semibold">{r.status}</span>
                  {r.reason && <div className="text-muted-foreground">{r.reason}</div>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">{formatGhanaDate(r.fetched_at)}, {formatGhanaTime(r.fetched_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
