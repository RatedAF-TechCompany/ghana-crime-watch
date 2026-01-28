import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: email.toLowerCase().trim() });

      if (error) {
        if (error.code === "23505") {
          toast.info("You're already subscribed!");
        } else {
          throw error;
        }
      } else {
        toast.success("Welcome! You'll receive our daily crime digest.");
        setEmail("");
      }
    } catch (error) {
      console.error("Newsletter signup error:", error);
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold">Daily Crime Digest</h3>
          <p className="text-sm text-muted-foreground">
            Top stories delivered every morning
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          disabled={isLoading}
          required
        />
        <Button type="submit" disabled={isLoading} className="shrink-0">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        Free daily newsletter. Unsubscribe anytime.
      </p>
    </div>
  );
}
