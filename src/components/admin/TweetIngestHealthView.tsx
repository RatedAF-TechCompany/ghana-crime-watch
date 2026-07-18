'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';

interface Row {
  tweet_id: string;
  author_username: string | null;
  tweet_text: string | null;
  processing_status: string;
  attempts: number | null;
  last_error: string | null;
  last_attempt_at: string | null;
  created_at: string;
}

interface Counts {
  pending: number;
  dead_letter: number;
  failed: number;
  published: number;
}

export default function TweetIngestHealthView() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({ pending: 0, dead_letter: 0, failed: 0, published: 0 });
  const [deadRows, setDeadRows] = useState<Row[]>([]);
  const [failingRows, setFailingRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const role = roles?.[0]?.role;
      if (!role || !['admin', 'editor'].includes(role)) {
        toast({ title: 'Access denied', variant: 'destructive' });
        router.push('/admin');
        return;
      }
      await loadAll();
      setLoading(false);
    })();
  }, []);

  const loadAll = async () => {
    const statuses = ['pending', 'dead_letter', 'failed', 'published'];
    const next: Counts = { pending: 0, dead_letter: 0, failed: 0, published: 0 };
    await Promise.all(statuses.map(async (s) => {
      const { count } = await supabase
        .from('processed_tweets')
        .select('tweet_id', { count: 'exact', head: true })
        .eq('processing_status', s);
      (next as any)[s] = count || 0;
    }));
    setCounts(next);

    const { data: dead } = await supabase
      .from('processed_tweets')
      .select('tweet_id, author_username, tweet_text, processing_status, attempts, last_error, last_attempt_at, created_at')
      .eq('processing_status', 'dead_letter')
      .order('last_attempt_at', { ascending: false, nullsFirst: false })
      .limit(50);
    setDeadRows((dead as any) || []);

    const { data: failing } = await supabase
      .from('processed_tweets')
      .select('tweet_id, author_username, tweet_text, processing_status, attempts, last_error, last_attempt_at, created_at')
      .eq('processing_status', 'pending')
      .gte('attempts', 1)
      .order('attempts', { ascending: false })
      .limit(50);
    setFailingRows((failing as any) || []);
  };

  const requeue = async (tweetId: string) => {
    const { error } = await supabase
      .from('processed_tweets')
      .update({ processing_status: 'pending', attempts: 0, last_error: null, last_attempt_at: null })
      .eq('tweet_id', tweetId);
    if (error) { toast({ title: 'Requeue failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Requeued', description: 'Item will be retried on the next cron run.' });
    await loadAll();
  };

  if (loading) return <div className="p-8">Loading…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-4 py-4 px-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <h1 className="text-xl font-semibold">Tweet Ingest Health</h1>
          <Button variant="outline" size="sm" className="ml-auto" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </header>

      <div className="container py-6 px-4 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['pending', 'dead_letter', 'failed', 'published'] as const).map((k) => (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardDescription className="capitalize">{k.replace('_', ' ')}</CardDescription>
                <CardTitle className="text-3xl">{counts[k]}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dead-lettered ({deadRows.length})</CardTitle>
            <CardDescription>Items that failed 3 attempts. Fix the underlying issue, then requeue.</CardDescription>
          </CardHeader>
          <CardContent>
            {deadRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing dead-lettered. Nice.</p>
            ) : (
              <RowsTable rows={deadRows} onRequeue={requeue} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currently retrying ({failingRows.length})</CardTitle>
            <CardDescription>Pending items that have failed at least once. Backoff = attempts × 30 min.</CardDescription>
          </CardHeader>
          <CardContent>
            {failingRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items currently in backoff.</p>
            ) : (
              <RowsTable rows={failingRows} onRequeue={requeue} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RowsTable({ rows, onRequeue }: { rows: Row[]; onRequeue: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead className="min-w-[280px]">Tweet</TableHead>
            <TableHead>Attempts</TableHead>
            <TableHead>Last attempt</TableHead>
            <TableHead className="min-w-[240px]">Last error</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.tweet_id}>
              <TableCell className="text-xs">@{r.author_username}</TableCell>
              <TableCell className="text-xs">{(r.tweet_text || '').slice(0, 160)}{(r.tweet_text?.length || 0) > 160 ? '…' : ''}</TableCell>
              <TableCell><Badge variant={((r.attempts || 0) >= 3) ? 'destructive' : 'secondary'}>{r.attempts || 0}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.last_attempt_at ? getRelativeTime(r.last_attempt_at) : '—'}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate">{r.last_error || '—'}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" onClick={() => onRequeue(r.tweet_id)}>
                  <RotateCcw className="h-3 w-3 mr-1" /> Requeue
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
