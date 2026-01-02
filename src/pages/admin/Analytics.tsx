import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Eye, FileText, MessageSquare, Users, TrendingUp, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ArticleStats {
  title: string;
  views: number;
  category: string;
}

interface CategoryStats {
  name: string;
  count: number;
}

interface DailyStats {
  date: string;
  articles: number;
  comments: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#8884d8', '#82ca9d', '#ffc658'];

export default function Analytics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [totalComments, setTotalComments] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [topArticles, setTopArticles] = useState<ArticleStats[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      navigate('/auth');
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (rolesError) {
      console.error('Roles fetch error:', rolesError);
      toast({
        title: 'Error checking permissions',
        description: 'Could not verify admin access',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (roles?.role !== 'admin') {
      toast({
        title: 'Access denied',
        description: 'Only administrators can access analytics',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    await fetchAllStats();
    setLoading(false);
  };

  const fetchAllStats = async () => {
    // Fetch articles with view counts
    const { data: articles } = await supabase
      .from('articles')
      .select('title, view_count, category_slug, created_at')
      .order('view_count', { ascending: false });

    if (articles) {
      // Total views
      const views = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);
      setTotalViews(views);
      setTotalArticles(articles.length);

      // Top 10 articles by views
      setTopArticles(
        articles.slice(0, 10).map(a => ({
          title: a.title.length > 30 ? a.title.slice(0, 30) + '...' : a.title,
          views: a.view_count || 0,
          category: a.category_slug,
        }))
      );

      // Category distribution
      const catCounts: Record<string, number> = {};
      articles.forEach(a => {
        const cat = a.category_slug.replace(/-/g, ' ');
        catCounts[cat] = (catCounts[cat] || 0) + 1;
      });
      setCategoryStats(
        Object.entries(catCounts).map(([name, count]) => ({ name, count }))
      );

      // Daily stats (last 14 days)
      const last14Days: Record<string, { articles: number; comments: number }> = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        last14Days[key] = { articles: 0, comments: 0 };
      }

      articles.forEach(a => {
        const date = a.created_at.split('T')[0];
        if (last14Days[date]) {
          last14Days[date].articles++;
        }
      });

      // Fetch comments
      const { data: comments } = await supabase
        .from('comments')
        .select('created_at');

      if (comments) {
        setTotalComments(comments.length);
        comments.forEach(c => {
          const date = c.created_at.split('T')[0];
          if (last14Days[date]) {
            last14Days[date].comments++;
          }
        });
      }

      setDailyStats(
        Object.entries(last14Days).map(([date, stats]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          articles: stats.articles,
          comments: stats.comments,
        }))
      );
    }

    // Fetch users count
    const { data: users } = await supabase
      .from('user_roles')
      .select('user_id');

    if (users) {
      setTotalUsers(users.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-primary">Site Analytics</h1>
        </div>
      </header>

      <div className="container py-6 px-4 space-y-6">
        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All-time article views</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Articles</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalArticles}</div>
              <p className="text-xs text-muted-foreground">Published & drafts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comments</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalComments}</div>
              <p className="text-xs text-muted-foreground">Total comments</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered users</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Activity (Last 14 Days)
            </CardTitle>
            <CardDescription>New articles and comments over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="articles" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                  <Line type="monotone" dataKey="comments" stroke="hsl(var(--secondary))" strokeWidth={2} dot={{ fill: 'hsl(var(--secondary))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Articles by Views
              </CardTitle>
              <CardDescription>Most viewed content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topArticles} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs fill-muted-foreground" />
                    <YAxis dataKey="title" type="category" width={120} className="text-xs fill-muted-foreground" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Articles by Category</CardTitle>
              <CardDescription>Content distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {categoryStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
