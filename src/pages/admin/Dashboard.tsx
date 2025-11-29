import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';
import type { Tables } from '@/integrations/supabase/types';

type Article = Tables<'articles'>;

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchArticles();
  }, []);

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
      return;
    }
    setUserRole(role);
  };

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading articles',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return;

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting article',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Article deleted',
        description: 'The article has been deleted successfully',
      });
      fetchArticles();
    }
  };

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Article Management</h1>
          <p className="text-muted-foreground mt-1">Create and manage crime reports</p>
        </div>
        <Button onClick={() => navigate('/admin/articles/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell className="capitalize">{article.category_slug.replace(/-/g, ' ')}</TableCell>
                <TableCell>
                  <Badge variant={article.is_published ? 'default' : 'secondary'}>
                    {article.is_published ? 'Published' : 'Draft'}
                  </Badge>
                </TableCell>
                <TableCell>{getRelativeTime(article.updated_at)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/admin/articles/${article.id}`)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {(userRole === 'admin' || userRole === 'editor') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(article.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}