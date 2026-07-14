'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Play, RefreshCw, Newspaper, Clock, CheckCircle, XCircle, AlertCircle, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';
import type { Tables } from '@/integrations/supabase/types';

type NewsroomRun = Tables<'newsroom_runs'>;
type NewsroomArticle = Tables<'newsroom_articles'>;

export default function NewsroomView() {
  const router = useRouter();
  const { toast } = useToast();
  const [runs, setRuns] = useState<NewsroomRun[]>([]);
  const [articles, setArticles] = useState<NewsroomArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runThreadMatchCounts, setRunThreadMatchCounts] = useState<Map<string, number>>(new Map());
  const [threadTitles, setThreadTitles] = useState<Map<string, { title: string; thread_slug: string }>>(new Map());

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchArticlesForRun(selectedRunId);
    }
  }, [selectedRunId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const role = roles?.[0]?.role;
    if (!role || !['admin', 'editor'].includes(role)) {
      toast({
        title: 'Access denied',
        description: 'You need admin or editor permissions to access the newsroom',
        variant: 'destructive',
      });
      router.push('/admin');
      return;
    }

    await fetchRuns();
    setLoading(false);
  };

  const fetchRuns = async () => {
    const { data, error } = await supabase
      .from('newsroom_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: 'Error loading runs',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setRuns(data || []);
    if (data && data.length > 0 && !selectedRunId) {
      setSelectedRunId(data[0].id);
    }

    if (data && data.length > 0) {
      const { data: matchedRows } = await supabase
        .from('newsroom_articles')
        .select('run_id')
        .in('run_id', data.map((r) => r.id))
        .not('matched_thread_id', 'is', null);

      const counts = new Map<string, number>();
      (matchedRows || []).forEach((row) => {
        counts.set(row.run_id, (counts.get(row.run_id) || 0) + 1);
      });
      setRunThreadMatchCounts(counts);
    }
  };

  const fetchArticlesForRun = async (runId: string) => {
    const { data, error } = await supabase
      .from('newsroom_articles')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading articles',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setArticles(data || []);

    const threadIds = [...new Set((data || []).map((a) => a.matched_thread_id).filter((id): id is string => !!id))];
    if (threadIds.length > 0) {
      const { data: threads } = await supabase
        .from('story_threads')
        .select('id, title, thread_slug')
        .in('id', threadIds);
      setThreadTitles(new Map((threads || []).map((t) => [t.id, { title: t.title, thread_slug: t.thread_slug }])));
    } else {
      setThreadTitles(new Map());
    }
  };

  const handleRunNewsroom = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      const response = await fetch(`${supabaseUrl}/functions/v1/run-newsroom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
        },
        body: JSON.stringify({ trigger_type: 'manual' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to run newsroom');
      }

      toast({
        title: 'Newsroom scan complete',
        description: `Found ${result.articles_found} news items, created ${result.articles_created} articles`,
      });

      await fetchRuns();
      if (result.run_id) {
        setSelectedRunId(result.run_id);
      }
    } catch (error) {
      toast({
        title: 'Error running newsroom',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'no_news':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'thread_update':
        return <Radio className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline',
      processing: 'secondary',
      duplicate: 'outline',
      no_news: 'outline',
      thread_update: 'default',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-primary">AI Newsroom</h1>
          </div>
          <div className="flex-1" />
          <Button onClick={handleRunNewsroom} disabled={running}>
            {running ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Newsroom
              </>
            )}
          </Button>
        </div>
      </header>

      <div className="container py-6 px-4">
        <div className="grid gap-6 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Runs</CardDescription>
              <CardTitle className="text-2xl">{runs.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Articles Found</CardDescription>
              <CardTitle className="text-2xl">
                {runs.reduce((acc, r) => acc + (r.articles_found || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Articles Created</CardDescription>
              <CardTitle className="text-2xl">
                {runs.reduce((acc, r) => acc + (r.articles_created || 0), 0)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
              <CardTitle className="text-2xl">
                {runs.length > 0
                  ? `${Math.round((runs.filter(r => r.status === 'completed').length / runs.length) * 100)}%`
                  : '0%'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="runs" className="space-y-4">
          <TabsList>
            <TabsTrigger value="runs">Recent Runs</TabsTrigger>
            <TabsTrigger value="articles">Processed Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Newsroom Runs</CardTitle>
                <CardDescription>History of automated news scanning sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Found</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Thread Matches</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No runs yet. Click "Run Newsroom" to start scanning.
                        </TableCell>
                      </TableRow>
                    ) : (
                      runs.map((run) => (
                        <TableRow
                          key={run.id}
                          className={`cursor-pointer ${selectedRunId === run.id ? 'bg-muted' : ''}`}
                          onClick={() => setSelectedRunId(run.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(run.status)}
                              {getStatusBadge(run.status)}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{run.trigger_type}</TableCell>
                          <TableCell>{getRelativeTime(run.started_at)}</TableCell>
                          <TableCell>
                            {run.completed_at
                              ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                              : '—'}
                          </TableCell>
                          <TableCell>{run.articles_found}</TableCell>
                          <TableCell>{run.articles_created}</TableCell>
                          <TableCell>
                            {runThreadMatchCounts.get(run.id) ? (
                              <Badge variant="outline" className="gap-1">
                                <Radio className="h-3 w-3" />
                                {runThreadMatchCounts.get(run.id)}
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-red-500">
                            {run.error_message || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="articles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Processed Articles</CardTitle>
                <CardDescription>
                  {selectedRunId
                    ? `Articles from selected run (${articles.length} items)`
                    : 'Select a run to view processed articles'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Original Headline</TableHead>
                      <TableHead>Generated Article</TableHead>
                      <TableHead>Thread</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          {selectedRunId ? 'No articles in this run' : 'Select a run to view articles'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      articles.map((article) => {
                        const matchedThread = article.matched_thread_id ? threadTitles.get(article.matched_thread_id) : null;
                        return (
                          <TableRow key={article.id}>
                            <TableCell>{getStatusBadge(article.processing_status)}</TableCell>
                            <TableCell>{article.source_name}</TableCell>
                            <TableCell className="max-w-[250px]">
                              <div className="truncate font-medium">{article.original_headline}</div>
                              <div className="truncate text-sm text-muted-foreground">
                                {article.original_summary}
                              </div>
                            </TableCell>
                            <TableCell>
                              {article.generated_article_id ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="p-0 h-auto"
                                  onClick={() => router.push(`/admin/articles/${article.generated_article_id}`)}
                                >
                                  View Article
                                </Button>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="max-w-[180px]">
                              {matchedThread ? (
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto gap-1 p-0"
                                  onClick={() => router.push(`/admin/live-threads/${article.matched_thread_id}`)}
                                >
                                  <Radio className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{matchedThread.title}</span>
                                </Button>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate text-red-500">
                              {article.error_message || '—'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
