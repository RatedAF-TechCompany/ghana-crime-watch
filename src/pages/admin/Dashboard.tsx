import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, ArrowLeft, Users, FileText, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRelativeTime } from '@/lib/time';
import type { Tables, Database } from '@/integrations/supabase/types';

type Article = Tables<'articles'>;
type UserRole = Tables<'user_roles'>;
type Comment = Tables<'comments'>;
type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRole {
  user_id: string;
  role: AppRole;
  created_at: string;
  display_name: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [articles, setArticles] = useState<Article[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [comments, setComments] = useState<(Comment & { article_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('articles');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userRole) {
      if (activeTab === 'articles') fetchArticles();
      if (activeTab === 'users' && userRole === 'admin') fetchUsers();
      if (activeTab === 'comments') fetchComments();
    }
  }, [activeTab, userRole]);

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
    setLoading(false);
  };

  const fetchArticles = async () => {
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
  };

  const fetchUsers = async () => {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role, created_at')
      .order('created_at', { ascending: false });

    if (rolesError) {
      toast({
        title: 'Error loading users',
        description: rolesError.message,
        variant: 'destructive',
      });
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name');

    const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
    
    const usersWithProfiles = roles?.map(r => ({
      ...r,
      display_name: profileMap.get(r.user_id) || null,
    })) || [];

    setUsers(usersWithProfiles);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error loading comments',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    // Fetch article titles
    const articleIds = [...new Set(data?.map(c => c.article_id) || [])];
    const { data: articleData } = await supabase
      .from('articles')
      .select('id, title')
      .in('id', articleIds);

    const articleMap = new Map(articleData?.map(a => [a.id, a.title]) || []);
    
    const commentsWithTitles = data?.map(c => ({
      ...c,
      article_title: articleMap.get(c.article_id),
    })) || [];

    setComments(commentsWithTitles);
  };

  const handleDeleteArticle = async (id: string) => {
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
      toast({ title: 'Article deleted' });
      fetchArticles();
    }
  };

  const handleUpdateRole = async (userId: string, newRole: AppRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('user_id', userId);

    if (error) {
      toast({
        title: 'Error updating role',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Role updated' });
      fetchUsers();
    }
  };

  const handleToggleCommentApproval = async (commentId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: !currentStatus })
      .eq('id', commentId);

    if (error) {
      toast({
        title: 'Error updating comment',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: `Comment ${!currentStatus ? 'approved' : 'hidden'}` });
      fetchComments();
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error deleting comment',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Comment deleted' });
      fetchComments();
    }
  };

  if (loading) {
    return <div className="container py-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Admin Dashboard</h1>
        </div>
      </header>

      <div className="container py-6 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="articles" className="gap-2">
              <FileText className="h-4 w-4" />
              Articles
            </TabsTrigger>
            {userRole === 'admin' && (
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            )}
            {(userRole === 'admin' || userRole === 'editor') && (
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Comments
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="articles" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground">Manage crime reports and articles</p>
              <Button onClick={() => navigate('/admin/articles/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Article
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
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
                  {articles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No articles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    articles.map((article) => (
                      <TableRow key={article.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {article.title}
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {article.category_slug.replace(/-/g, ' ')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={article.is_published ? 'default' : 'secondary'}>
                            {article.is_published ? 'Published' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getRelativeTime(article.updated_at)}
                        </TableCell>
                        <TableCell className="text-right">
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
                              onClick={() => handleDeleteArticle(article.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {userRole === 'admin' && (
            <TabsContent value="users" className="space-y-4">
              <p className="text-muted-foreground">Manage user roles and permissions</p>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-mono text-xs max-w-[120px] truncate">
                            {user.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{user.display_name || '—'}</TableCell>
                          <TableCell>
                            <Select
                              value={user.role}
                              onValueChange={(value: AppRole) => handleUpdateRole(user.user_id, value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="contributor">Contributor</SelectItem>
                                <SelectItem value="reader">Reader</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getRelativeTime(user.created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {(userRole === 'admin' || userRole === 'editor') && (
            <TabsContent value="comments" className="space-y-4">
              <p className="text-muted-foreground">Moderate user comments</p>
              
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Commenter</TableHead>
                      <TableHead>Comment</TableHead>
                      <TableHead>Article</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No comments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      comments.map((comment) => (
                        <TableRow key={comment.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{comment.commenter_name}</p>
                              <p className="text-xs text-muted-foreground">{comment.commenter_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {comment.comment_text}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm">
                            {comment.article_title || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={comment.is_approved ? 'default' : 'secondary'}>
                              {comment.is_approved ? 'Approved' : 'Hidden'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getRelativeTime(comment.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleCommentApproval(comment.id, comment.is_approved)}
                            >
                              {comment.is_approved ? 'Hide' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}