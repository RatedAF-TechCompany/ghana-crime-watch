import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Clock, Zap, Calendar, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type PublishMode = "now" | "auto" | "schedule";

interface PublishResult {
  success: boolean;
  article?: {
    id: string;
    title: string;
    slug: string;
    category: string;
    url: string;
    publishedAt: string;
    isPublished: boolean;
  };
  suggestedTweet?: string;
  numberCount?: number;
  error?: string;
}

export default function QuickPublish() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("now");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Check auth
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ["user-role-quick-publish"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      return roleData?.role || null;
    },
  });

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Please enter article content",
        variant: "destructive",
      });
      return;
    }

    if (publishMode === "schedule" && !scheduledTime) {
      toast({
        title: "Error",
        description: "Please select a scheduled time",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manual-article-submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            content,
            publishMode,
            scheduledTime: publishMode === "schedule" ? scheduledTime : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process article");
      }

      setResult(data);
      toast({
        title: "Success!",
        description: data.article?.isPublished 
          ? "Article published successfully" 
          : `Article scheduled for ${new Date(data.article?.publishedAt).toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setResult({ success: false, error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyTweet = () => {
    if (result?.suggestedTweet) {
      const tweetWithLink = result.suggestedTweet.replace(
        "[LINK]",
        `${window.location.origin}${result.article?.url}`
      );
      navigator.clipboard.writeText(tweetWithLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Tweet copied to clipboard" });
    }
  };

  const resetForm = () => {
    setContent("");
    setResult(null);
    setScheduledTime("");
  };

  if (roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userRole || !["admin", "editor"].includes(userRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Quick Publish</CardTitle>
            <CardDescription>
              Paste article text or URL content. AI will structure it into a proper news article.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!result?.success ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="content">Article Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Paste your article text here (minimum 100 characters)..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={12}
                    className="resize-none font-sans"
                  />
                  <p className="text-xs text-muted-foreground">
                    {content.length} characters
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Publishing Schedule</Label>
                  <ToggleGroup
                    type="single"
                    value={publishMode}
                    onValueChange={(value) => value && setPublishMode(value as PublishMode)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="now" className="gap-2">
                      <Zap className="h-4 w-4" />
                      Now
                    </ToggleGroupItem>
                    <ToggleGroupItem value="auto" className="gap-2">
                      <Clock className="h-4 w-4" />
                      Auto (Peak Time)
                    </ToggleGroupItem>
                    <ToggleGroupItem value="schedule" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Pick Time
                    </ToggleGroupItem>
                  </ToggleGroup>

                  {publishMode === "auto" && (
                    <p className="text-sm text-muted-foreground">
                      AI will schedule for optimal engagement (7am, 9am, 12pm, 3pm, 6pm, or 8pm GMT)
                    </p>
                  )}

                  {publishMode === "schedule" && (
                    <Input
                      type="datetime-local"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  )}
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || content.length < 100}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing with AI...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Process & Publish
                    </>
                  )}
                </Button>

                {result?.error && (
                  <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{result.error}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-primary">
                  <CheckCircle className="h-8 w-8" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {result.article?.isPublished ? "Published!" : "Scheduled!"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {result.article?.isPublished
                        ? "Your article is now live"
                        : `Will publish at ${new Date(result.article?.publishedAt || "").toLocaleString()}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Article Title</Label>
                  <p className="font-serif text-lg font-semibold">
                    {result.article?.title}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(result.article?.url, "_blank")}
                    className="flex-1"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Article
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/articles/${result.article?.id}`)}
                    className="flex-1"
                  >
                    Edit Article
                  </Button>
                </div>

                {result.suggestedTweet && (
                  <div className="space-y-2">
                    <Label>Suggested Tweet</Label>
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="whitespace-pre-wrap text-sm">
                        {result.suggestedTweet.replace(
                          "[LINK]",
                          `${window.location.origin}${result.article?.url}`
                        )}
                      </p>
                    </div>
                    <Button variant="secondary" onClick={copyTweet} className="w-full">
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "Copied!" : "Copy Tweet"}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button onClick={resetForm} className="flex-1">
                    <Zap className="mr-2 h-4 w-4" />
                    Publish Another
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/admin")}
                    className="flex-1"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
