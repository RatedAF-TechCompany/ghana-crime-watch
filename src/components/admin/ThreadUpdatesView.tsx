'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';
import { ArrowLeft, ChevronDown, Send, Twitter } from 'lucide-react';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type StoryThread = Tables<'story_threads'>;
type ThreadUpdate = Tables<'thread_updates'>;

export default function ThreadUpdatesView({ threadId }: { threadId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thread, setThread] = useState<StoryThread | null>(null);
  const [updates, setUpdates] = useState<ThreadUpdate[]>([]);
  const [threadArticles, setThreadArticles] = useState<{ id: string; title: string }[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isKeyPoint, setIsKeyPoint] = useState(false);
  const [keyPointLabel, setKeyPointLabel] = useState('');
  const [sourceArticleId, setSourceArticleId] = useState('none');

  useEffect(() => {
    checkAuth();
  }, [threadId]);

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

    fetchAll();
  };

  const fetchAll = async () => {
    const [{ data: threadData, error: threadError }, { data: articlesData }] = await Promise.all([
      supabase.from('story_threads').select('*').eq('id', threadId).single(),
      supabase.from('articles').select('id, title').eq('thread_id', threadId).order('published_at', { ascending: false }),
    ]);

    if (threadError || !threadData) {
      toast({ title: 'Thread not found', variant: 'destructive' });
      router.push('/admin/live-threads');
      return;
    }

    setThread(threadData);
    setThreadArticles(articlesData || []);
    await fetchUpdates();
    setLoading(false);
  };

  const fetchUpdates = async () => {
    const { data, error } = await supabase
      .from('thread_updates')
      .select('*')
      .eq('thread_id', threadId)
      .order('published_at', { ascending: false });

    if (error) {
      toast({ title: 'Error loading updates', description: error.message, variant: 'destructive' });
    } else {
      setUpdates(data || []);
    }
  };

  const triggerTweet = async (_threadUpdateId: string) => {
    toast({
      title: 'Auto-tweet retired',
      description: 'Manual tweeting is disabled. GhanaCrimes AutoPost handles X posting on a 6-hour schedule.',
    });
    fetchUpdates();
  };


  const resetForm = () => {
    setTitle('');
    setBody('');
    setIsKeyPoint(false);
    setKeyPointLabel('');
    setSourceArticleId('none');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (isKeyPoint && !keyPointLabel.trim()) return;

    setSaving(true);
    const payload: TablesInsert<'thread_updates'> = {
      thread_id: threadId,
      title: title.trim(),
      body: body.trim(),
      is_key_point: isKeyPoint,
      key_point_label: isKeyPoint ? keyPointLabel.trim() : null,
      source_article_id: sourceArticleId === 'none' ? null : sourceArticleId,
    };

    const { data: inserted, error } = await supabase
      .from('thread_updates')
      .insert(payload)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error posting update', description: error.message, variant: 'destructive' });
      setSaving(false);
      return;
    }

    toast({ title: 'Update published' });
    resetForm();
    fetchUpdates();
    setSaving(false);

    if (isKeyPoint && inserted) {
      triggerTweet(inserted.id);
    }
  };

  if (loading || !thread) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container max-w-3xl py-8">
      <Button variant="ghost" onClick={() => router.push('/admin/live-threads')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Live Threads
      </Button>

      <h1 className="mb-1 text-3xl font-bold text-primary">{thread.title}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {thread.is_live ? 'Currently live' : thread.live_ended_at ? 'Coverage ended' : 'Not live yet'}
      </p>

      <form onSubmit={handleSubmit} className="mb-8 space-y-4 rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Post an update</h2>

        <div className="space-y-2">
          <Label htmlFor="update-title">Title *</Label>
          <Input id="update-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="update-body">Body *</Label>
          <Textarea id="update-body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="update-source">Source article</Label>
          <Select value={sourceArticleId} onValueChange={setSourceArticleId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {threadArticles.map((article) => (
                <SelectItem key={article.id} value={article.id}>
                  {article.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="key-point" checked={isKeyPoint} onCheckedChange={setIsKeyPoint} />
          <Label htmlFor="key-point" className="cursor-pointer">
            Key point (shown in summary box, tweeted automatically)
          </Label>
        </div>

        {isKeyPoint && (
          <div className="space-y-2">
            <Label htmlFor="key-point-label">Key point summary *</Label>
            <Input
              id="key-point-label"
              value={keyPointLabel}
              onChange={(e) => setKeyPointLabel(e.target.value.slice(0, 120))}
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground">{keyPointLabel.length}/120 characters</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={saving || !title.trim() || !body.trim() || (isKeyPoint && !keyPointLabel.trim())}
        >
          <Send className="mr-2 h-4 w-4" />
          {saving ? 'Publishing...' : 'Publish update'}
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="font-semibold">Posted updates</h2>
        {updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates yet.</p>
        ) : (
          updates.map((update) => {
            const isExpanded = expandedId === update.id;
            return (
              <button
                key={update.id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : update.id)}
                className="w-full rounded-lg border p-4 text-left"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="font-medium">{update.title}</h3>
                  <div className="flex shrink-0 items-center gap-2">
                    {update.is_key_point && <Badge variant="outline">Key point</Badge>}
                    {update.twitter_post?.startsWith('POSTED:') && (
                      <Twitter className="h-4 w-4 text-blue-500" aria-label="Tweeted" />
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{getRelativeTime(update.published_at)}</p>
                {isExpanded && (
                  <p className="mt-3 whitespace-pre-wrap border-t pt-3 text-sm">{update.body}</p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
