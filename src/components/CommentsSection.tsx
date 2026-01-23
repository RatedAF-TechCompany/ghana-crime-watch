import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, Reply, X } from "lucide-react";

interface CommentsSectionProps {
  articleId: string;
}

interface Comment {
  id: string;
  article_id: string;
  parent_id: string | null;
  commenter_name: string;
  comment_text: string;
  created_at: string;
  is_approved: boolean;
  is_verified: boolean;
}

interface CommentWithReplies extends Comment {
  replies: Comment[];
}

type CommentStep = "idle" | "writing" | "name";
type ReplyStep = "writing" | "name";

export function CommentsSection({ articleId }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<CommentStep>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; step: ReplyStep } | null>(null);
  const [formData, setFormData] = useState({ name: "", comment: "" });
  const [replyData, setReplyData] = useState({ name: "", comment: "" });
  // Honeypot field for spam prevention
  const [honeypot, setHoneypot] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id, article_id, parent_id, commenter_name, comment_text, created_at, is_approved, is_verified")
        .eq("article_id", articleId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
  });

  // Build threaded comment structure
  const buildCommentTree = (comments: Comment[]): CommentWithReplies[] => {
    const topLevel = comments.filter((c) => !c.parent_id);
    const replies = comments.filter((c) => c.parent_id);

    return topLevel.map((comment) => ({
      ...comment,
      replies: replies
        .filter((r) => r.parent_id === comment.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    }));
  };

  const handleProceedToName = (parentId: string | null) => {
    const data = parentId ? replyData : formData;
    
    if (!data.comment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    if (data.comment.trim().length > 1000) {
      toast.error("Comment must be 1,000 characters or less");
      return;
    }

    if (parentId) {
      setReplyingTo({ id: parentId, step: "name" });
    } else {
      setStep("name");
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, parentId: string | null = null) => {
    e.preventDefault();

    const data = parentId ? replyData : formData;

    // Honeypot check
    if (honeypot) {
      toast.success("Comment published!");
      resetForm(parentId);
      return;
    }

    if (!data.name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    if (data.name.trim().length > 40) {
      toast.error("Name must be 40 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("comments").insert({
        article_id: articleId,
        parent_id: parentId,
        commenter_name: data.name.trim(),
        comment_text: data.comment.trim(),
        is_verified: true,
        is_approved: true,
      });

      if (error) throw error;

      toast.success("Comment published!");
      resetForm(parentId);
      queryClient.invalidateQueries({ queryKey: ["comments", articleId] });
    } catch (error: any) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = (parentId: string | null) => {
    if (parentId) {
      setReplyData({ name: "", comment: "" });
      setReplyingTo(null);
    } else {
      setFormData({ name: "", comment: "" });
      setStep("idle");
    }
  };

  const commentTree = comments ? buildCommentTree(comments) : [];

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? "ml-6 border-l-2 border-muted pl-4" : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-medium text-foreground">{comment.commenter_name}</span>
        <span className="text-xs text-muted-foreground">
          {getRelativeTime(comment.created_at)}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-foreground mb-2">{comment.comment_text}</p>
      {!isReply && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, step: "writing" })}
        >
          <Reply className="mr-1 h-3 w-3" />
          Reply
        </Button>
      )}
    </div>
  );

  return (
    <section className="mt-8 border-t border-border pt-6">
      {/* Comments trigger and header - FT style */}
      <div className="mb-6">
        {step === "idle" && (
          <button
            onClick={() => setStep("writing")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {comments && comments.length > 0 
              ? `${commentTree.length} comment${commentTree.length !== 1 ? 's' : ''}`
              : 'Leave a comment'}
          </button>
        )}

        {step === "writing" && (
          <div className="space-y-4 rounded-lg bg-muted/50 p-4">
            <Textarea
              placeholder="Write your comment..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
              maxLength={1000}
              autoFocus
              disabled={isSubmitting}
            />
            {/* Honeypot field - hidden from users */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={{ position: "absolute", left: "-9999px" }}
              tabIndex={-1}
              autoComplete="off"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {formData.comment.length}/1000
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetForm(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => handleProceedToName(null)}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "name" && (
          <form onSubmit={(e) => handleSubmitComment(e, null)} className="space-y-4 rounded-lg bg-muted/50 p-4">
            <div className="rounded-md bg-background p-3 border">
              <p className="text-xs text-muted-foreground mb-1">Your comment:</p>
              <p className="text-sm text-foreground">{formData.comment}</p>
            </div>
            <Input
              placeholder="Your name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={40}
              autoFocus
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep("writing")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post comment"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-16 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : commentTree.length > 0 ? (
        <div className="space-y-6">
          {commentTree.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-4 last:border-b-0">
              <CommentItem comment={comment} />
              
              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="mt-4 space-y-4">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} isReply />
                  ))}
                </div>
              )}

              {/* Reply Form */}
              {replyingTo?.id === comment.id && replyingTo.step === "writing" && (
                <div className="mt-4 ml-6 space-y-3 rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Replying to {comment.commenter_name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Write your reply..."
                    value={replyData.comment}
                    onChange={(e) => setReplyData({ ...replyData, comment: e.target.value })}
                    rows={3}
                    maxLength={1000}
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleProceedToName(comment.id)}>
                      Submit
                    </Button>
                  </div>
                </div>
              )}

              {replyingTo?.id === comment.id && replyingTo.step === "name" && (
                <form
                  onSubmit={(e) => handleSubmitComment(e, comment.id)}
                  className="mt-4 ml-6 space-y-3 rounded-lg bg-muted/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Replying to {comment.commenter_name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setReplyingTo(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="rounded-md bg-background p-2 border text-sm">
                    {replyData.comment}
                  </div>
                  <Input
                    placeholder="Your name (required)"
                    value={replyData.name}
                    onChange={(e) => setReplyData({ ...replyData, name: e.target.value })}
                    maxLength={40}
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo({ id: comment.id, step: "writing" })}
                      disabled={isSubmitting}
                    >
                      Back
                    </Button>
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Publish"
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts!
        </p>
      )}
    </section>
  );
}
