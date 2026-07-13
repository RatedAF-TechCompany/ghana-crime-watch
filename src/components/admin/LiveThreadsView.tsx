'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';
import { ArrowLeft, Plus, Radio, Square, Settings2 } from 'lucide-react';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type StoryThread = Tables<'story_threads'>;

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export default function LiveThreadsView() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [threads, setThreads] = useState<StoryThread[]>([]);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

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
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
      router.push('/');
      return;
    }

    fetchThreads();
  };

  const fetchThreads = async () => {
    const { data, error } = await supabase
      .from('story_threads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading threads', description: error.message, variant: 'destructive' });
    } else {
      setThreads(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    const payload: TablesInsert<'story_threads'> = {
      title: title.trim(),
      thread_slug: (slug.trim() || generateSlug(title)),
      summary: summary.trim() || null,
    };

    const { error } = await supabase.from('story_threads').insert(payload);

    if (error) {
      toast({ title: 'Error creating thread', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Thread created' });
      setTitle('');
      setSlug('');
      setSummary('');
      fetchThreads();
    }
    setSaving(false);
  };

  const handleMarkLive = async (thread: StoryThread) => {
    const { error } = await supabase
      .from('story_threads')
      .update({ is_live: true, live_started_at: new Date().toISOString(), live_ended_at: null })
      .eq('id', thread.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Marked as developing story' });
      fetchThreads();
    }
  };

  const handleEndLive = async (thread: StoryThread) => {
    if (!confirm('End live coverage for this story? The live page stays online as an archive.')) return;

    const { error } = await supabase
      .from('story_threads')
      .update({ is_live: false, live_ended_at: new Date().toISOString() })
      .eq('id', thread.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Live coverage ended' });
      fetchThreads();
    }
  };

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container max-w-5xl py-8">
      <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <h1 className="mb-6 text-3xl font-bold text-primary">Live Threads</h1>

      <form onSubmit={handleCreate} className="mb-8 space-y-4 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">New Thread</h2>
        <div className="space-y-2">
          <Label htmlFor="thread-title">Title *</Label>
          <Input
            id="thread-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thread-slug">Slug (auto-generated if empty)</Label>
          <Input
            id="thread-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder={generateSlug(title)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="thread-summary">Summary</Label>
          <Textarea
            id="thread-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={2}
          />
        </div>
        <Button type="submit" disabled={saving || !title.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          {saving ? 'Creating...' : 'Create Thread'}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {threads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No threads yet
                </TableCell>
              </TableRow>
            ) : (
              threads.map((thread) => (
                <TableRow key={thread.id}>
                  <TableCell className="max-w-[240px] truncate font-medium">{thread.title}</TableCell>
                  <TableCell>
                    {thread.is_live ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <Radio className="h-3 w-3" />
                        Live
                      </Badge>
                    ) : thread.live_ended_at ? (
                      <Badge variant="secondary">Ended</Badge>
                    ) : (
                      <Badge variant="outline">Not live</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getRelativeTime(thread.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!thread.is_live ? (
                      <Button size="sm" variant="ghost" onClick={() => handleMarkLive(thread)}>
                        <Radio className="mr-1 h-4 w-4" />
                        Mark as developing story
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEndLive(thread)}>
                        <Square className="mr-1 h-4 w-4" />
                        End live coverage
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/admin/live-threads/${thread.id}`)}
                    >
                      <Settings2 className="mr-1 h-4 w-4" />
                      Manage updates
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
