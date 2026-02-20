import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle, XCircle, AlertCircle, Trash2, Eye, MessageSquare, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRelativeTime } from "@/lib/time";

const STATUS_LABELS: Record<string, string> = {
  Pending: "Pending Review",
  VerifiedScam: "Verified Scam",
  Cleared: "Cleared",
  Disputed: "Disputed",
};
const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  VerifiedScam: "bg-red-100 text-red-800",
  Cleared: "bg-green-100 text-green-800",
  Disputed: "bg-orange-100 text-orange-800",
};

export default function FraudWatchAdmin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accountReports, setAccountReports] = useState<Record<string, any[]>>({});
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState("All");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const role = roles?.[0]?.role;
    if (!role || !["admin", "editor"].includes(role)) {
      toast({ title: "Access denied", variant: "destructive" });
      navigate("/admin");
      return;
    }
    setUserRole(role);

    const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).single();
    if (profile?.display_name) setAdminName(profile.display_name);

    fetchAccounts();
  };

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from("fraud_accounts")
      .select("*, fraud_reports(count)")
      .order("created_at", { ascending: false });
    if (data) setAccounts(data);
    setLoading(false);
  };

  const fetchReportsForAccount = async (accountId: string) => {
    if (accountReports[accountId]) return;
    const { data } = await supabase
      .from("fraud_reports")
      .select("*")
      .eq("fraud_account_id", accountId)
      .order("created_at", { ascending: false });
    setAccountReports(prev => ({ ...prev, [accountId]: data || [] }));
  };

  const handleExpand = (accountId: string) => {
    if (expandedId === accountId) {
      setExpandedId(null);
    } else {
      setExpandedId(accountId);
      fetchReportsForAccount(accountId);
    }
  };

  const handleStatusChange = async (accountId: string, newStatus: string) => {
    const { error } = await supabase
      .from("fraud_accounts")
      .update({ status: newStatus })
      .eq("id", accountId);

    if (error) {
      toast({ title: "Error updating status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Status updated to ${STATUS_LABELS[newStatus]}` });
      setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, status: newStatus } : a));
    }
  };

  const handleAddNote = async (accountId: string) => {
    const note = noteTexts[accountId]?.trim();
    if (!note) return;

    const { error } = await supabase.from("fraud_admin_notes").insert({
      fraud_account_id: accountId,
      note,
      admin_name: adminName,
    });

    if (error) {
      toast({ title: "Error adding note", variant: "destructive" });
    } else {
      toast({ title: "Note added" });
      setNoteTexts(prev => ({ ...prev, [accountId]: "" }));
    }
  };

  const handleToggleReportPublic = async (reportId: string, currentState: boolean) => {
    const { error } = await supabase
      .from("fraud_reports")
      .update({ is_public: !currentState })
      .eq("id", reportId);

    if (!error) {
      toast({ title: `Report ${!currentState ? "made public" : "hidden"}` });
      // Refresh reports for the expanded account
      if (expandedId) {
        const { data } = await supabase.from("fraud_reports").select("*").eq("fraud_account_id", expandedId).order("created_at", { ascending: false });
        setAccountReports(prev => ({ ...prev, [expandedId]: data || [] }));
      }
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm("Delete this account and all its reports? This cannot be undone.")) return;
    const { error } = await supabase.from("fraud_accounts").delete().eq("id", accountId);
    if (error) {
      toast({ title: "Error deleting", variant: "destructive" });
    } else {
      toast({ title: "Account deleted" });
      setAccounts(prev => prev.filter(a => a.id !== accountId));
    }
  };

  const filteredAccounts = statusFilter === "All" ? accounts : accounts.filter(a => a.status === statusFilter);

  if (loading) return <div className="container py-8">Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-primary">Fraud Watch Moderation</h1>
          <div className="flex-1" />
          <Link to="/fraud-watch" target="_blank">
            <Button variant="outline" size="sm" className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" />
              View Public Page
            </Button>
          </Link>
        </div>
      </header>

      <div className="container py-6 px-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {["All", "Pending", "VerifiedScam", "Cleared"].map(s => {
            const count = s === "All" ? accounts.length : accounts.filter(a => a.status === s).length;
            return (
              <Card key={s} className={`cursor-pointer transition-colors ${statusFilter === s ? "border-primary" : ""}`} onClick={() => setStatusFilter(s)}>
                <CardContent className="pt-4 pb-4 text-center">
                  <div className="font-serif text-2xl font-bold">{count}</div>
                  <p className="text-xs text-muted-foreground">{s === "All" ? "All Accounts" : STATUS_LABELS[s]}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Pending">Pending Review</SelectItem>
              <SelectItem value="VerifiedScam">Verified Scam</SelectItem>
              <SelectItem value="Cleared">Cleared</SelectItem>
              <SelectItem value="Disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Accounts Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Platform</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports</TableHead>
                <TableHead>Total Loss</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No accounts found</TableCell>
                </TableRow>
              ) : filteredAccounts.map((account) => (
                <>
                  <TableRow key={account.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleExpand(account.id)}>
                    <TableCell>
                      {expandedId === account.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{account.account_name}</div>
                      {account.account_handle && <div className="text-xs text-muted-foreground">@{account.account_handle}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{account.platform}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Select value={account.status} onValueChange={v => handleStatusChange(account.id, v)}>
                        <SelectTrigger className="h-7 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending Review</SelectItem>
                          <SelectItem value="VerifiedScam">Verified Scam</SelectItem>
                          <SelectItem value="Cleared">Cleared</SelectItem>
                          <SelectItem value="Disputed">Disputed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">{account.reports_count}</TableCell>
                    <TableCell className="text-sm">
                      {Number(account.total_reported_loss) > 0
                        ? `GHS ${Number(account.total_reported_loss).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getRelativeTime(account.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <a href={`/fraud-watch/account/${account.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </a>
                      {userRole === "admin" && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteAccount(account.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>

                  {expandedId === account.id && (
                    <TableRow key={`${account.id}-expanded`}>
                      <TableCell colSpan={8} className="bg-muted/30 p-0">
                        <div className="p-4 space-y-4">
                          {/* Reports */}
                          <div>
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Reports ({accountReports[account.id]?.length ?? "..."})
                            </h3>
                            {!accountReports[account.id] ? (
                              <p className="text-sm text-muted-foreground">Loading...</p>
                            ) : accountReports[account.id].length === 0 ? (
                              <p className="text-sm text-muted-foreground">No reports yet</p>
                            ) : (
                              <div className="space-y-3">
                                {accountReports[account.id].map((report) => (
                                  <div key={report.id} className="bg-card rounded-lg p-3 border border-border text-sm">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="space-y-0.5">
                                        {report.reporter_name && <span className="font-medium">{report.reporter_name}</span>}
                                        {report.reporter_email && <span className="text-muted-foreground ml-2">{report.reporter_email}</span>}
                                        {report.reporter_phone && <span className="text-muted-foreground ml-2">{report.reporter_phone}</span>}
                                        <div className="text-xs text-muted-foreground">
                                          {report.payment_method}
                                          {report.amount ? ` · ${report.currency} ${Number(report.amount).toLocaleString()}` : ""}
                                          {report.region ? ` · ${report.region}` : ""}
                                          {report.incident_date ? ` · ${report.incident_date}` : ""}
                                          {" · "}{getRelativeTime(report.created_at)}
                                        </div>
                                      </div>
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          size="sm"
                                          variant={report.is_public ? "default" : "outline"}
                                          className="h-6 text-xs"
                                          onClick={() => handleToggleReportPublic(report.id, report.is_public)}
                                        >
                                          {report.is_public ? "Public" : "Make Public"}
                                        </Button>
                                      </div>
                                    </div>
                                    <p className="text-sm">{report.description}</p>
                                    {report.reference_id && (
                                      <p className="text-xs text-muted-foreground mt-1">Ref: {report.reference_id}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Add Note */}
                          <div>
                            <h3 className="text-sm font-semibold mb-2">Add Moderator Note</h3>
                            <div className="flex gap-2">
                              <Textarea
                                value={noteTexts[account.id] || ""}
                                onChange={e => setNoteTexts(prev => ({ ...prev, [account.id]: e.target.value }))}
                                placeholder="Add a note visible to the public..."
                                className="flex-1 min-h-[60px] text-sm"
                              />
                              <Button size="sm" onClick={() => handleAddNote(account.id)} className="shrink-0">
                                Add Note
                              </Button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
