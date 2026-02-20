import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, ArrowLeft, Shield, AlertTriangle, Filter, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getRelativeTime } from "@/lib/time";

const PLATFORMS = ["All", "Instagram", "X", "TikTok", "Facebook", "WhatsApp", "Telegram", "Website", "Other"];
const STATUSES = ["All", "Pending", "VerifiedScam", "Cleared", "Disputed"];
const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending Review",
  VerifiedScam: "Verified Scam",
  Cleared: "Cleared",
  Disputed: "Disputed",
};
const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  VerifiedScam: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Cleared: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Disputed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};
const PLATFORM_ICONS: Record<string, string> = {
  Instagram: "📸", X: "𝕏", TikTok: "🎵", Facebook: "👥",
  WhatsApp: "💬", Telegram: "✈️", Website: "🌐", Other: "🔗",
};
const SORT_OPTIONS = [
  { value: "recent", label: "Most Recent" },
  { value: "reports", label: "Most Reported" },
  { value: "views", label: "Most Viewed" },
];

export default function FraudWatchSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "All");
  const [status, setStatus] = useState(searchParams.get("status") || "All");
  const [sort, setSort] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string, pf: string, st: string, so: string) => {
    setLoading(true);
    setSearched(true);

    // Log search analytics
    if (q.trim()) {
      supabase.from("fraud_search_analytics").insert({ query: q.trim(), results_count: 0 }).then(() => {});
    }

    let dbQuery = supabase
      .from("fraud_accounts")
      .select("id, platform, account_name, account_handle, account_link, status, reports_count, total_reported_loss, last_reported_at, views_count, created_at");

    // Public can only see non-pending unless they're admin (RLS handles this)
    if (q.trim()) {
      dbQuery = dbQuery.or(
        `account_name.ilike.%${q}%,account_handle.ilike.%${q}%,account_link.ilike.%${q}%`
      );
    }

    if (pf !== "All") dbQuery = dbQuery.eq("platform", pf);
    if (st !== "All") dbQuery = dbQuery.eq("status", st);

    if (so === "reports") dbQuery = dbQuery.order("reports_count", { ascending: false });
    else if (so === "views") dbQuery = dbQuery.order("views_count", { ascending: false });
    else dbQuery = dbQuery.order("last_reported_at", { ascending: false, nullsFirst: false });

    dbQuery = dbQuery.limit(50);

    const { data, error } = await dbQuery;
    setResults(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const pf = searchParams.get("platform") || "All";
    const st = searchParams.get("status") || "All";
    setQuery(q);
    setPlatform(pf);
    setStatus(st);
    doSearch(q, pf, st, sort);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (query.trim()) params.q = query.trim();
    if (platform !== "All") params.platform = platform;
    if (status !== "All") params.status = status;
    setSearchParams(params);
    doSearch(query, platform, status, sort);
  };

  const handleFilterChange = (key: string, value: string) => {
    if (key === "platform") setPlatform(value);
    if (key === "status") setStatus(value);
    if (key === "sort") setSort(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container max-w-4xl mx-auto px-4">
          <Link to="/fraud-watch" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Fraud Watch Home
          </Link>
          <h1 className="font-serif text-2xl font-bold mb-4">Search Suspicious Accounts</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, handle, phone number or link..."
              className="bg-white/10 border-white/20 text-primary-foreground placeholder:text-primary-foreground/50 flex-1 h-11"
            />
            <Button type="submit" variant="secondary" className="h-11 shrink-0">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
        <div className="container max-w-4xl mx-auto px-4 py-2 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            Community-reported data. Always verify independently before sending money.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {(platform !== "All" || status !== "All") && (
              <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 text-xs flex items-center justify-center">
                {[platform !== "All", status !== "All"].filter(Boolean).length}
              </span>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort:</span>
            <Select value={sort} onValueChange={v => { setSort(v); doSearch(query, platform, status, v); }}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4 p-4 bg-muted rounded-lg">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Platform</label>
              <Select value={platform} onValueChange={v => handleFilterChange("platform", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <Select value={status} onValueChange={v => handleFilterChange("status", v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button size="sm" onClick={() => doSearch(query, platform, status, sort)} className="mr-2">Apply Filters</Button>
              <Button size="sm" variant="ghost" onClick={() => {
                setPlatform("All"); setStatus("All");
                doSearch(query, "All", "All", sort);
              }}>Clear</Button>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : !searched ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Search for an account to get started</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
            <p className="text-muted-foreground mb-2">No accounts found</p>
            <p className="text-sm text-muted-foreground mb-6">
              {query ? `No results for "${query}"` : "No accounts match your filters"}
            </p>
            <Link to="/fraud-watch/report">
              <Button size="sm" variant="outline">Report This Account</Button>
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {results.length} account{results.length !== 1 ? "s" : ""} found
              {query && <span> for "<strong>{query}</strong>"</span>}
            </p>
            <div className="space-y-3">
              {results.map((account) => (
                <Link key={account.id} to={`/fraud-watch/account/${account.id}`} className="block">
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5 shrink-0">{PLATFORM_ICONS[account.platform] || "🔗"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-foreground">
                                {account.account_name}
                                {account.account_handle && (
                                  <span className="text-muted-foreground font-normal ml-1.5 text-sm">
                                    @{account.account_handle}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-muted-foreground">{account.platform}</span>
                                {account.account_link && (
                                  <>
                                    <span className="text-xs text-muted-foreground">•</span>
                                    <a
                                      href={account.account_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View Profile ↗
                                    </a>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[account.status] || ""}`}>
                              {STATUS_LABELS[account.status] || account.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              <strong className="text-foreground">{account.reports_count}</strong> report{account.reports_count !== 1 ? "s" : ""}
                            </span>
                            {Number(account.total_reported_loss) > 0 && (
                              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                GHS {Number(account.total_reported_loss).toLocaleString(undefined, { maximumFractionDigits: 0 })} total loss
                              </span>
                            )}
                            {account.last_reported_at && (
                              <span className="text-xs text-muted-foreground">
                                Last reported {getRelativeTime(account.last_reported_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            This is a public reporting tool. GhanaCrimes reviews submissions but cannot guarantee every claim. Always verify sellers and use safe payment methods.
          </p>
        </div>
      </div>
    </div>
  );
}
