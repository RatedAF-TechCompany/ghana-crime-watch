import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Shield, Search, AlertTriangle, TrendingUp, Users, DollarSign, ExternalLink, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { getRelativeTime } from "@/lib/time";

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸",
  X: "𝕏",
  TikTok: "🎵",
  Facebook: "👥",
  WhatsApp: "💬",
  Telegram: "✈️",
  Website: "🌐",
  Other: "🔗",
};

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  VerifiedScam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Cleared: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending Review",
  VerifiedScam: "Verified Scam",
  Cleared: "Cleared",
  Disputed: "Disputed",
};

export default function FraudWatchHome() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({ accounts: 0, reports: 0, totalLoss: 0 });
  const [latestScams, setLatestScams] = useState<any[]>([]);
  const [topSearched, setTopSearched] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const [accountsRes, latestRes, topViewedRes] = await Promise.all([
      supabase.from("fraud_accounts").select("id, total_reported_loss, reports_count").neq("status", "Pending"),
      supabase
        .from("fraud_accounts")
        .select("id, account_name, account_handle, platform, status, reports_count, total_reported_loss, last_reported_at")
        .eq("status", "VerifiedScam")
        .order("last_reported_at", { ascending: false })
        .limit(6),
      supabase
        .from("fraud_accounts")
        .select("id, account_name, account_handle, platform, status, views_count, reports_count")
        .neq("status", "Pending")
        .order("views_count", { ascending: false })
        .limit(10),
    ]);

    if (accountsRes.data) {
      const totalLoss = accountsRes.data.reduce((sum, a) => sum + (Number(a.total_reported_loss) || 0), 0);
      const totalReports = accountsRes.data.reduce((sum, a) => sum + (Number(a.reports_count) || 0), 0);
      setStats({ accounts: accountsRes.data.length, reports: totalReports, totalLoss });
    }
    if (latestRes.data) setLatestScams(latestRes.data);
    if (topViewedRes.data) setTopSearched(topViewedRes.data);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/fraud-watch/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground">
        <div className="container max-w-5xl mx-auto px-4 py-12 md:py-16">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold">Fraud Watch</h1>
          </div>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl">
            One place to check and report suspicious online seller accounts in Ghana. Protect yourself before sending money.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by account name, handle, phone number or link..."
              className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 flex-1 h-12 text-base"
            />
            <Button type="submit" variant="secondary" size="lg" className="shrink-0 h-12">
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-3 mt-4">
            <Link to="/fraud-watch/search">
              <Button variant="outline" size="sm" className="border-white/30 text-primary-foreground hover:bg-white/10">
                <Search className="h-4 w-4 mr-2" />
                Browse All Accounts
              </Button>
            </Link>
            <Link to="/fraud-watch/report">
              <Button variant="outline" size="sm" className="border-white/30 text-primary-foreground hover:bg-white/10">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Report a Fraud Account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="container max-w-5xl mx-auto px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <strong>Community Reported:</strong> Reports are submitted by the public. Always verify independently before making payments.
          </p>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-center mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                {loading ? "—" : stats.accounts.toLocaleString()}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Suspicious Accounts</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-center mb-2">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                {loading ? "—" : stats.reports.toLocaleString()}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Total Reports</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <div className="flex justify-center mb-2">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="font-serif text-2xl md:text-3xl font-bold text-foreground">
                {loading ? "—" : `GHS ${stats.totalLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Total Reported Loss</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-5 gap-6">
          {/* Latest Verified Scams */}
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
              <h2 className="font-serif text-xl font-bold text-foreground">Latest Verified Scams</h2>
              <Link to="/fraud-watch/search?status=VerifiedScam" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : latestScams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No verified scams yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestScams.map((account) => (
                  <Link key={account.id} to={`/fraud-watch/account/${account.id}`} className="block">
                    <Card className="hover:border-primary transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">{PLATFORM_ICONS[account.platform] || "🔗"}</span>
                            <div>
                              <div className="font-semibold text-foreground line-clamp-1">
                                {account.account_name}
                                {account.account_handle && (
                                  <span className="text-muted-foreground font-normal ml-1 text-sm">
                                    @{account.account_handle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">{account.platform}</span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {account.reports_count} report{account.reports_count !== 1 ? "s" : ""}
                                </span>
                                {account.total_reported_loss > 0 && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                      GHS {Number(account.total_reported_loss).toLocaleString(undefined, { maximumFractionDigits: 0 })} lost
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[account.status]}`}>
                            {STATUS_LABELS[account.status]}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top 10 Most Viewed */}
          <div className="md:col-span-2">
            <div className="border-b-2 border-primary pb-2 mb-4">
              <h2 className="font-serif text-xl font-bold text-foreground">Most Searched</h2>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                ))}
              </div>
            ) : topSearched.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No data yet</p>
            ) : (
              <ol className="space-y-2">
                {topSearched.map((account, idx) => (
                  <li key={account.id}>
                    <Link
                      to={`/fraud-watch/account/${account.id}`}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors group"
                    >
                      <span className="text-sm font-bold text-muted-foreground w-5 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-lg shrink-0">{PLATFORM_ICONS[account.platform] || "🔗"}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate text-foreground group-hover:text-primary">
                          {account.account_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {account.reports_count} report{account.reports_count !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ml-auto shrink-0 ${STATUS_COLORS[account.status]}`}>
                        {STATUS_LABELS[account.status]?.split(" ")[0]}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-6 pt-4 border-t border-border">
              <Link to="/fraud-watch/report">
                <Button className="w-full gap-2" variant="default">
                  <AlertTriangle className="h-4 w-4" />
                  Report a Suspicious Account
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
            <strong>Disclaimer:</strong> This is a public reporting tool. GhanaCrimes reviews submissions but cannot guarantee every claim. Always verify sellers and use safe payment methods.
          </p>
        </div>
      </div>
    </div>
  );
}
