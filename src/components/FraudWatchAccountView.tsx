'use client';
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, ExternalLink, Share2, Flag, Clock, DollarSign, FileText, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  VerifiedScam: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  Cleared: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  Disputed: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300",
};
const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending Review",
  VerifiedScam: "Verified Scam",
  Cleared: "Cleared",
  Disputed: "Disputed",
};
const STATUS_DESCRIPTIONS: Record<string, string> = {
  Pending: "This account has been reported and is awaiting review by our team.",
  VerifiedScam: "Our team has reviewed multiple reports and confirmed this account as a scam.",
  Cleared: "This account was investigated and found to be legitimate.",
  Disputed: "Reports about this account are under dispute. Exercise caution.",
};
const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸", X: "𝕏", TikTok: "🎵", Facebook: "👥",
  WhatsApp: "💬", Telegram: "✈️", Website: "🌐", Other: "🔗",
};

export default function FraudWatchAccountView({ accountId }: { accountId: string }) {
  const { toast } = useToast();
  const [account, setAccount] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (accountId) fetchAccountData(accountId);
  }, [accountId]);

  const fetchAccountData = async (id: string) => {
    // Increment view count
    supabase.rpc("increment_fraud_account_views", { account_id: id }).then(() => {});

    const [accountRes, reportsRes, notesRes] = await Promise.all([
      supabase.from("fraud_accounts").select("*").eq("id", id).single(),
      supabase.from("fraud_reports").select("payment_method, amount, currency, incident_date, region, description, created_at, evidence_files").eq("fraud_account_id", id).eq("is_public", true).order("created_at", { ascending: false }),
      supabase.from("fraud_admin_notes").select("note, admin_name, created_at").eq("fraud_account_id", id).order("created_at", { ascending: false }),
    ]);

    if (accountRes.error || !accountRes.data) {
      setNotFound(true);
    } else {
      setAccount(accountRes.data);
      setReports(reportsRes.data || []);
      setAdminNotes(notesRes.data || []);
    }
    setLoading(false);
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `Fraud Report: ${account?.account_name}`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  // Compute aggregated stats from public reports
  const totalLoss = reports.reduce((sum: number, r) => {
    if (!r.amount) return sum;
    const amt = Number(r.amount);
    return sum + (r.currency === "GHS" ? amt : amt * 15);
  }, 0);
  const paymentMethods = reports.reduce((acc: Record<string, number>, r) => {
    acc[r.payment_method] = (acc[r.payment_method] || 0) + 1;
    return acc;
  }, {});
  const topPaymentMethod = Object.entries(paymentMethods).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-3xl mx-auto px-4 py-12">
          <div className="space-y-4">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="font-serif text-xl font-bold mb-2">Account Not Found</h2>
          <p className="text-muted-foreground mb-4">This record may have been removed or doesn't exist.</p>
          <Link href="/fraud-watch/search"><Button>Search Accounts</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container max-w-3xl mx-auto px-4">
          <Link href="/fraud-watch/search" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="text-4xl mt-1">{PLATFORM_ICONS[account.platform] || "🔗"}</span>
              <div>
                <h1 className="font-serif text-2xl font-bold">{account.account_name}</h1>
                {account.account_handle && (
                  <p className="text-primary-foreground/70 text-sm">@{account.account_handle}</p>
                )}
                <p className="text-primary-foreground/60 text-sm mt-1">{account.platform}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleShare} className="border-white/30 text-primary-foreground hover:bg-white/10">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`border-b py-3 ${STATUS_COLORS[account.status] || ""}`}>
        <div className="container max-w-3xl mx-auto px-4 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-sm">{STATUS_LABELS[account.status] || account.status}</span>
            <span className="text-sm ml-2">{STATUS_DESCRIPTIONS[account.status]}</span>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Account Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Platform</span>
                <p className="font-medium mt-0.5">{account.platform}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Account Name</span>
                <p className="font-medium mt-0.5">{account.account_name}</p>
              </div>
              {account.account_handle && (
                <div>
                  <span className="text-muted-foreground">Handle</span>
                  <p className="font-medium mt-0.5">@{account.account_handle}</p>
                </div>
              )}
              {account.account_link && (
                <div>
                  <span className="text-muted-foreground">Profile Link</span>
                  <a
                    href={account.account_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-0.5 font-medium"
                  >
                    View Profile <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">First Reported</span>
                <p className="font-medium mt-0.5">{getRelativeTime(account.created_at)}</p>
              </div>
              {account.last_reported_at && (
                <div>
                  <span className="text-muted-foreground">Last Reported</span>
                  <p className="font-medium mt-0.5">{getRelativeTime(account.last_reported_at)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aggregated Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="font-serif text-2xl font-bold">{account.reports_count}</div>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="font-serif text-lg font-bold">
                {Number(account.total_reported_loss) > 0
                  ? `GHS ${Number(account.total_reported_loss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Reported Loss</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="font-serif text-base font-bold line-clamp-1">{topPaymentMethod || "—"}</div>
              <p className="text-xs text-muted-foreground">Common Payment</p>
            </CardContent>
          </Card>
        </div>

        {/* Moderator Notes */}
        {adminNotes.length > 0 && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Moderator Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {adminNotes.map((note, i) => (
                <div key={i} className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-foreground">{note.note}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {note.admin_name || "GhanaCrimes Team"} · {getRelativeTime(note.created_at)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Report Timeline */}
        {reports.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Report Timeline ({reports.length} public report{reports.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.map((report, idx) => (
                  <div key={idx} className="border-l-2 border-border pl-4 pb-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {report.payment_method}
                        {report.amount && ` · ${report.currency} ${Number(report.amount).toLocaleString()}`}
                        {report.region && ` · ${report.region}`}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{getRelativeTime(report.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground">{report.description}</p>
                    {report.evidence_files && report.evidence_files.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {report.evidence_files.map((url: string, ei: number) => (
                          url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                            <a key={ei} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="Evidence" className="h-16 w-16 object-cover rounded border border-border hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <a key={ei} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                              <FileText className="h-3 w-3" /> Document {ei + 1}
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/fraud-watch/report?account=${account.account_name}&platform=${account.platform}&handle=${account.account_handle || ""}`} className="flex-1">
            <Button variant="destructive" className="w-full gap-2">
              <Flag className="h-4 w-4" />
              Report This Account
            </Button>
          </Link>
          <Button variant="outline" onClick={handleShare} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            This is a public reporting tool. GhanaCrimes reviews submissions but cannot guarantee every claim. Always verify sellers and use safe payment methods.
          </p>
        </div>
      </div>
    </div>
  );
}
