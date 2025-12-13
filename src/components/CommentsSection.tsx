import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface CommentsSectionProps {
  articleId: string;
}

type CommentStep = "form" | "verification" | "success";

export function CommentsSection({ articleId }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<CommentStep>("form");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    comment: "",
  });
  const [verificationCode, setVerificationCode] = useState("");

  const { data: comments, isLoading } = useQuery({
    queryKey: ["comments", articleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_comments")
        .select("*")
        .eq("article_id", articleId)
        .eq("is_approved", true)
        .eq("is_verified", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.comment.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-comment-verification", {
        body: {
          articleId,
          commenterName: formData.name.trim(),
          commenterEmail: formData.email.trim(),
          commentText: formData.comment.trim(),
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Verification code sent to your email");
      setStep("verification");
    } catch (error: any) {
      console.error("Error sending verification:", error);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-comment", {
        body: {
          email: formData.email.trim(),
          code: verificationCode,
          articleId,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Comment published successfully!");
      setStep("success");
      setFormData({ name: "", email: "", comment: "" });
      setVerificationCode("");
      queryClient.invalidateQueries({ queryKey: ["comments", articleId] });
      
      // Reset to form after 3 seconds
      setTimeout(() => setStep("form"), 3000);
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h3 className="mb-6 flex items-center gap-2 font-serif text-xl font-bold text-foreground">
        <MessageSquare className="h-5 w-5" />
        Comments
      </h3>

      {/* Comment Form */}
      <div className="mb-8 rounded-lg bg-muted/50 p-4">
        {step === "form" && (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={100}
                disabled={isSubmitting}
              />
              <Input
                type="email"
                placeholder="Your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                maxLength={255}
                disabled={isSubmitting}
              />
            </div>
            <Textarea
              placeholder="Write your comment..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
              maxLength={1000}
              disabled={isSubmitting}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Comment
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A verification code will be sent to your email.
            </p>
          </form>
        )}

        {step === "verification" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm text-foreground">
              We've sent a 6-digit verification code to <strong>{formData.email}</strong>. 
              Enter it below to publish your comment.
            </p>
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("form")}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting || verificationCode.length !== 6}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Publish"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The code expires in 20 minutes.
            </p>
          </form>
        )}

        {step === "success" && (
          <div className="py-4 text-center">
            <p className="text-lg font-medium text-primary">Comment published!</p>
            <p className="text-sm text-muted-foreground">Thank you for your contribution.</p>
          </div>
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
      ) : comments && comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-border pb-4 last:border-b-0">
              <div className="mb-2 flex items-center gap-2">
                <span className="font-medium text-foreground">{comment.commenter_name}</span>
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(comment.created_at!)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">{comment.comment_text}</p>
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
