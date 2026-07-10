'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';

type PostedArticle = {
  id: string;
  article_url: string;
  article_title: string;
  post_text: string;
  posted_to_x: boolean;
  x_post_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  posted_at: string | null;
};

type RunLog = {
  id: string;
  run_time: string;
  status: string;
  selected_article_url: string | null;
  message: string | null;
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'posted') return 'default';
  if (s === 'preview') return 'secondary';
  if (s === 'error') return 'destructive';
  return 'outline';
};

export default function AutopostView() {
  const router = useRouter();
  const { toast } = useToast();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostedArticle[]>([]);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const isAdmin = (roles || []).some(r => r.role === 'admin');
      if (!isAdmin) { router.push('/'); return; }
      setAuthorized(true);
    })();
  }, [router]);

  const fetchAll = useCallback(async () => {
    const postsRes = await supabase
      .from('posted_articles').select('*').order('created_at', { ascending: false }).limit(50);
    const logsRes = await supabase
      .from('run_logs').select('*').order('run_time', { ascending: false }).limit(20);
    const settingRes = await supabase
      .from('site_settings').select('value').eq('key', 'auto_post_enabled').maybeSingle();
    setPosts((postsRes.data as PostedArticle[]) || []);
    setLogs((logsRes.data as RunLog[]) || []);
    setEnabled(((settingRes.data?.value as string) ?? 'true') !== 'false');
  }, []);

  useEffect(() => {
    if (!authorized) return;
    fetchAll();
    const t = setInterval(fetchAll, 15000);
    return () => clearInterval(t);
  }, [authorized, fetchAll]);

  const toggleEnabled = async (next: boolean) => {
    setEnabled(next);
    const { error } = await supabase
      .from('site_settings')
      .update({ value: next ? 'true' : 'false' })
      .eq('key', 'auto_post_enabled');
    if (error) {
      toast({ title: 'Failed to update toggle', description: error.message, variant: 'destructive' });
      setEnabled(!next);
    } else {
      toast({ title: `AutoPost ${next ? 'enabled' : 'disabled'}` });
    }
  };

  const run = async (mode: 'manual' | 'preview') => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghanacrimes-autopost', {
        body: { mode },
      });
      if (error) throw error;
      const status = (data as { status?: string })?.status ?? 'done';
      toast({ title: `Run complete: ${status}` });
      fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'Run failed', description: msg, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  if (!authorized) return null;

  const latestLog = logs[0];
  const latestPost = posts[0];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <header className="border-b border-border pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">GhanaCrimes</p>
        <h1 className="font-serif text-4xl font-semibold">AutoPost</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Every six hours, the system scans the newsroom for the newest qualifying crime story and drafts a single social post for X. Preview any run without posting; disable the toggle to pause posting entirely.
        </p>
      </header>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-serif">Controls</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Last run {latestLog ? getRelativeTime(latestLog.run_time) : 'never'} · Status{' '}
              <Badge variant={latestLog ? statusVariant(latestLog.status) : 'outline'}>{latestLog?.status ?? 'idle'}</Badge>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">AUTO_POST_ENABLED</span>
            <Switch checked={enabled} onCheckedChange={toggleEnabled} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => run('manual')} disabled={running}>
            {running ? 'Running...' : 'Run Now'}
          </Button>
          <Button variant="outline" onClick={() => run('preview')} disabled={running}>
            Preview Only
          </Button>
        </CardContent>
      </Card>

      {latestPost && (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-xl">Latest selected article</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <span className="font-medium">{latestPost.article_title}</span>
            </div>
            <a
              href={latestPost.article_url}
              target="_blank" rel="noreferrer"
              className="block text-xs text-primary underline break-all"
            >
              {latestPost.article_url}
            </a>
            <pre className="whitespace-pre-wrap rounded border border-border bg-muted/40 p-4 font-serif text-sm leading-relaxed">
{latestPost.post_text}
            </pre>
            <div className="flex flex-wrap gap-3 items-center text-xs text-muted-foreground">
              <Badge variant={statusVariant(latestPost.status)}>{latestPost.status}</Badge>
              {latestPost.x_post_id && (
                <a
                  href={`https://x.com/i/status/${latestPost.x_post_id}`}
                  target="_blank" rel="noreferrer"
                  className="underline"
                >View on X</a>
              )}
              <span>{getRelativeTime(latestPost.created_at)}</span>
              {latestPost.error_message && <span className="text-destructive">{latestPost.error_message}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Previous posts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Post</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs whitespace-nowrap">{getRelativeTime(p.created_at)}</TableCell>
                  <TableCell className="max-w-xs">
                    <a href={p.article_url} target="_blank" rel="noreferrer" className="text-sm underline">
                      {p.article_title}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{p.post_text}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    {p.x_post_id && (
                      <a
                        href={`https://x.com/i/status/${p.x_post_id}`}
                        target="_blank" rel="noreferrer"
                        className="block text-xs underline mt-1"
                      >on X</a>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">No posts yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-serif text-xl">Run log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs whitespace-nowrap">{getRelativeTime(l.run_time)}</TableCell>
                  <TableCell><Badge variant={statusVariant(l.status)}>{l.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.message}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No runs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
