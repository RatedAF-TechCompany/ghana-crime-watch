import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, RefreshCw } from "lucide-react";

interface CommentsSectionProps {
  articleId: string;
}

type CommentStep = "idle" | "writing" | "details" | "verification" | "success";

export function CommentsSection({ articleId }: CommentsSectionProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<CommentStep>("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    comment: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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

  const handlePostComment = () => {
    if (!formData.comment.trim()) {
      toast.error("Please write a comment first");
      return;
    }
    setStep("details");
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

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
      setResendCooldown(60);
    } catch (error: any) {
      console.error("Error sending verification:", error);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);

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

      toast.success("New verification code sent");
      setResendCooldown(60);
      setVerificationCode("");
    } catch (error: any) {
      console.error("Error resending verification:", error);
      toast.error("Failed to resend code. Please try again.");
    } finally {
      setIsResending(false);
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
      
      setTimeout(() => setStep("idle"), 3000);
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      setStep("writing");
    }
  };

  const resetForm = () => {
    setStep("idle");
    setFormData({ name: "", email: "", comment: "" });
    setVerificationCode("");
  };

  const isDialogOpen = step === "details" || step === "verification" || step === "success";

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h3 className="mb-6 flex items-center gap-2 font-serif text-xl font-bold text-foreground">
        <MessageSquare className="h-5 w-5" />
        Comments
      </h3>

      {/* Comment Area */}
      <div className="mb-8">
        {step === "idle" && (
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setStep("writing")}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Leave a comment...
          </Button>
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
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetForm}
              >
                Cancel
              </Button>
              <Button onClick={handlePostComment}>
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details & Verification Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent className="sm:max-w-md">
          {step === "details" && (
            <>
              <DialogHeader>
                <DialogTitle>Verify your identity</DialogTitle>
                <DialogDescription>
                  Enter your name and email to receive a verification code.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitDetails} className="space-y-4">
                <Input
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  maxLength={100}
                  disabled={isSubmitting}
                  autoFocus
                />
                <Input
                  type="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  maxLength={255}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    disabled={isSubmitting}
                  >
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Code"
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {step === "verification" && (
            <>
              <DialogHeader>
                <DialogTitle>Enter verification code</DialogTitle>
                <DialogDescription>
                  We've sent a 6-digit code to <strong>{formData.email}</strong>. The code expires in 20 minutes.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  disabled={isSubmitting}
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || isResending}
                    className="text-xs"
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Sending...
                      </>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      <>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Resend code
                      </>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("details")}
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
                </div>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="py-6 text-center">
              <p className="text-lg font-medium text-primary">Comment published!</p>
              <p className="text-sm text-muted-foreground">Thank you for your contribution.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
