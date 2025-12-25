import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TiptapEditor } from '@/components/admin/TiptapEditor';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useToast } from '@/hooks/use-toast';
import { CATEGORIES } from '@/lib/categories';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

const DEFAULT_AUTHOR = 'GhanaCrimes Desk';

type ArticleInsert = TablesInsert<'articles'>;

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ArticleInsert>>({
    title: '',
    subtitle: '',
    summary: '',
    body: '',
    category_slug: 'top-stories',
    article_slug: '',
    hero_image: '',
    author_name: '',
    tags: [],
    seo_title: '',
    seo_description: '',
    is_published: false,
  });

  useEffect(() => {
    checkAuth();
    if (id && id !== 'new') {
      fetchArticle();
    }
  }, [id]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const role = roles?.[0]?.role;
    if (!role || !['admin', 'editor', 'contributor'].includes(role)) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const fetchArticle = async () => {
    if (!id || id === 'new') return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast({
        title: 'Error loading article',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/admin');
    } else {
      setFormData(data);
    }
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const generateArticleFields = async () => {
    if (!formData.body) {
      toast({
        title: 'Missing content',
        description: 'Please enter article body first',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-article-fields', {
        body: { body: formData.body },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const { fields } = data;
      setFormData(prev => ({
        ...prev,
        title: fields.title || prev.title,
        subtitle: fields.subtitle || prev.subtitle,
        summary: fields.summary || prev.summary,
        article_slug: fields.slug || prev.article_slug,
        author_name: fields.author || prev.author_name,
        tags: fields.tags || prev.tags,
        seo_description: fields.seo_description || prev.seo_description,
      }));

      toast({
        title: 'Fields generated',
        description: 'Title, subtitle, summary, slug, author, tags, and SEO description generated',
      });
    } catch (error: any) {
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate article fields',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const slug = formData.article_slug || generateSlug(formData.title || '');
      const articleData = {
        ...formData,
        article_slug: slug,
        author_id: user.id,
        // Use custom author name if provided, otherwise use default
        author_name: formData.author_name?.trim() || DEFAULT_AUTHOR,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      let error;
      if (id && id !== 'new') {
        const { error: updateError } = await supabase
          .from('articles')
          .update(articleData as TablesUpdate<'articles'>)
          .eq('id', id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('articles')
          .insert(articleData as ArticleInsert);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Article ${id === 'new' ? 'created' : 'updated'} successfully`,
      });
      navigate('/admin');
    } catch (error: any) {
      toast({
        title: 'Error saving article',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">
            {id === 'new' ? 'Create Article' : 'Edit Article'}
          </h1>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Article'}
          </Button>
        </div>

        <div className="space-y-4 bg-card p-6 rounded-lg border">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary *</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category_slug}
                onValueChange={(value) => setFormData({ ...formData, category_slug: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.slug} value={cat.slug}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author Name</Label>
              <Input
                id="author"
                value={formData.author_name || ''}
                onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                placeholder={DEFAULT_AUTHOR}
              />
              <p className="text-xs text-muted-foreground">Leave empty to use default: {DEFAULT_AUTHOR}</p>
            </div>
          </div>

        <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={generateArticleFields}
              disabled={generating || !formData.body?.replace(/<[^>]*>/g, '').trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Fields'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Article Slug (auto-generated if empty)</Label>
            <Input
              id="slug"
              value={formData.article_slug}
              onChange={(e) => setFormData({ ...formData, article_slug: e.target.value })}
              placeholder={generateSlug(formData.title || '')}
            />
          </div>

          <ImageUpload
            value={formData.hero_image || ''}
            onChange={(url) => setFormData({ ...formData, hero_image: url })}
          />

          <div className="space-y-2">
            <Label>Article Body *</Label>
            <TiptapEditor
              content={formData.body || ''}
              onChange={(content) => setFormData({ ...formData, body: content })}
              placeholder="Write your article content here..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags?.join(', ') || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
              })}
              placeholder="crime, investigation, police"
            />
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">SEO Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seo_title">SEO Title</Label>
                <Input
                  id="seo_title"
                  value={formData.seo_title || ''}
                  onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                  placeholder="Leave empty to use article title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo_description">SEO Description</Label>
                <Textarea
                  id="seo_description"
                  value={formData.seo_description || ''}
                  onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                  rows={2}
                  placeholder="Leave empty to use summary"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
            <Label htmlFor="published" className="cursor-pointer">
              Publish article
            </Label>
          </div>
        </div>
      </form>
    </div>
  );
}