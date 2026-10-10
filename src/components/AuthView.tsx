'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email too long");
const authSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password too long"),
});
const NEUTRAL = "If that address has an account, a link has been sent";

export default function AuthView() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const v = authSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      if (error) {
        toast.error(error.message.includes("Invalid login credentials") ? "Invalid email or password" : error.message);
        return;
      }
      toast.success("Logged in successfully");
      router.push("/");
    } catch (error) {
      toast.error(error instanceof z.ZodError ? error.errors[0].message : "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendLink = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLinkLoading(true);
    try {
      // shouldCreateUser: false — existing accounts only; errors are not revealed.
      await supabase.auth.signInWithOtp({
        email: parsed.data,
        options: { shouldCreateUser: false, emailRedirectTo: "https://www.ghanacrimes.com/admin/review" },
      });
    } catch { /* neutral */ }
    toast.success(NEUTRAL);
    setLinkLoading(false);
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Log In</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required maxLength={255} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} maxLength={100} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Loading..." : "Log In"}
            </Button>
          </form>
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={sendLink} disabled={linkLoading}>
            {linkLoading ? "Sending..." : "Email me a sign-in link"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
