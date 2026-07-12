'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';

// Words that commonly indicate out-of-scope entertainment / lifestyle stories
const OUT_OF_SCOPE_PATTERNS = [
  'Nsoromma', 'finale', 'singer', 'judges', 'season', 'talent show',
  'reality show', 'music video', 'album', 'concert', 'award', 'red carpet',
  'celebrity', 'showbiz', 'gospel artist', 'rapper', 'actress', 'actor',
];

interface Stats {
  scraped: number;
  accepted: number;
  rejected_out_of_scope: number;
  rejected_duplicate: number;
}

interface FlaggedArticle {
  id: string;
  title: string;
  category_slug: string;
  article_slug: string;
  is_published: boolean;
  published_at: string | null;
  matched: string;
}

export default function ScopeReviewView() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ scraped: 0, accepted: 0, rejected_out_of_scope: 0, rejected_duplicate: 0 });
  const [flagged, setFlagged] = useState<FlaggedArticle[]>([]);

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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Stats
    const [scrapedRes, acceptedRes, oosRes, dupRes] = await Promise.all([
      supabase.from('newsroom_articles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
      supabase.from('newsroom_articles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo).eq('processing_status', 'completed'),
      supabase.from('rejected_items').select('*', { count: 'exact', head: true }).gte('rejected_at', sevenDaysAgo).in('reason', ['out_of_scope', 'classifier_error']),
      supabase.from('rejected_items').select('*', { count: 'exact', head: true }).gte('rejected_at', sevenDaysAgo).eq('reason', 'duplicate'),
    ]);
    setStats({
      scraped: scrapedRes.count || 0,
      accepted: acceptedRes.count || 0,
      rejected_out_of_scope: oosRes.count || 0,
      rejected_duplicate: dupRes.count || 0,
    });

    // Flagged published articles — case-insensitive OR match on out-of-scope patterns
    const orFilter = OUT_OF_SCOPE_PATTERNS.map(p => `title.ilike.%${p}%`).join(',');
    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, category_slug, article_slug, is_published, published_at')
      .eq('is_published', true)
      .or(orFilter)
      .order('published_at', { ascending: false })
      .limit(100);

    const withMatch: FlaggedArticle[] = (articles || []).map(a => {
      const lc = a.title.toLowerCase();
      const hit = OUT_OF_SCOPE_PATTERNS.find(p => lc.includes(p.toLowerCase())) || '';
      return { ...a, matched: hit };
    });
    setFlagged(withMatch);
  };

  const handleUnpublish = async (id: string) => {
    if (!confirm('Move this article back to draft? It will not be deleted.')) return;
    const { error } = await supabase.from('articles').update({ is_published: false }).eq('id', id);
    if (error) {
      toast({ title: 'Unpublish failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Article unpublished (set to draft)' });
      setFlagged(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleKeep = (id: string) => {
    setFlagged(prev => prev.filter(a => a.id !== id));
  };

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-primary">Scope Review</h1>
          </div>
        </div>
      </header>

      <div className="container py-6 px-4 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">Ingestion (last 7 days)</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Scraped</CardDescription><CardTitle className="text-2xl">{stats.scraped}</CardTitle></CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Accepted</CardDescription><CardTitle className="text-2xl">{stats.accepted}</CardTitle></CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Rejected out-of-scope</CardDescription><CardTitle className="text-2xl">{stats.rejected_out_of_scope}</CardTitle></CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Rejected duplicate</CardDescription><CardTitle className="text-2xl">{stats.rejected_duplicate}</CardTitle></CardHeader>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review published out-of-scope</CardTitle>
            <CardDescription>
              Published articles whose title matches entertainment / lifestyle patterns. Unpublish moves them to draft — never deletes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flagged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No flagged articles.
                    </TableCell>
                  </TableRow>
                ) : (
                  flagged.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium max-w-[320px] truncate">{a.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.matched}</TableCell>
                      <TableCell className="text-sm capitalize">{a.category_slug.replace(/-/g, ' ')}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.published_at ? getRelativeTime(a.published_at) : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleKeep(a.id)}>Keep</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUnpublish(a.id)}>Unpublish</Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
