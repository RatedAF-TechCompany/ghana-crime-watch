'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Landing page for password-reset / invite links: the link signs the user in, then they choose a password.
export default function ResetPasswordView() {
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) setReady(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 10) { toast.error("Use at least 10 characters"); return; }
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    document.cookie = 'gc_session=1; Path=/; Max-Age=7776000; SameSite=Lax; Secure';
    toast.success("Password saved");
    router.replace("/admin");
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set your password</CardTitle>
          <CardDescription>{ready ? "Choose a new password for your GhanaCrimes account." : "Open this page from the link in your email. If the link expired, request a new one on the log-in page."}</CardDescription>
        </CardHeader>
        {ready && (
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={10} maxLength={100} required /></div>
              <div className="space-y-2"><Label htmlFor="pw2">Repeat password</Label><Input id="pw2" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={10} maxLength={100} required /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving..." : "Save password"}</Button>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
