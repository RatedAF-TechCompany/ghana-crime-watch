import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Upload, X, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const PLATFORMS = ["Instagram", "X", "TikTok", "Facebook", "WhatsApp", "Telegram", "Website", "Other"];
const PAYMENT_METHODS = ["Mobile Money", "Bank Transfer", "Card", "Cash", "Other"];
const CURRENCIES = ["GHS", "USD", "GBP"];
const GHANA_REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central", "Volta",
  "Northern", "Upper East", "Upper West", "Brong-Ahafo", "Ahafo",
  "Bono East", "Oti", "Savannah", "North East", "Western North",
  "Outside Ghana",
];

export default function FraudWatchReport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    platform: "",
    accountName: "",
    accountHandle: "",
    accountLink: "",
    paymentMethod: "",
    amount: "",
    currency: "GHS",
    incidentDate: "",
    region: "",
    description: "",
    consent: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.platform) newErrors.platform = "Platform is required";
    if (!form.accountName.trim()) newErrors.accountName = "Account name is required";
    if (!form.paymentMethod) newErrors.paymentMethod = "Payment method is required";
    if (!form.incidentDate) newErrors.incidentDate = "Date of incident is required";
    if (!form.description.trim()) newErrors.description = "Description is required";
    if (form.description.trim().length < 20) newErrors.description = "Please provide more detail (min 20 characters)";
    if (form.description.length > 1200) newErrors.description = "Description must be under 1200 characters";
    if (!form.consent) newErrors.consent = "You must confirm the report is accurate";
    if (form.reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.reporterEmail)) {
      newErrors.reporterEmail = "Invalid email address";
    }
    if (form.amount && isNaN(Number(form.amount))) newErrors.amount = "Amount must be a number";
    return newErrors;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: `${f.name} is too large`, description: "Max 10MB per file", variant: "destructive" });
        return false;
      }
      return true;
    });
    const combined = [...uploadedFiles, ...valid].slice(0, 5);
    setUploadedFiles(combined);
  };

  const removeFile = (idx: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadFiles = async (): Promise<string[]> => {
    if (uploadedFiles.length === 0) return [];
    setUploading(true);
    const urls: string[] = [];
    for (const file of uploadedFiles) {
      const ext = file.name.split(".").pop();
      const path = `fraud-evidence/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("article-images").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("article-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    setUploading(false);
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      // Check for duplicate account (same platform + account_name or account_handle)
      const normalizedName = form.accountName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const { data: existing } = await supabase
        .from("fraud_accounts")
        .select("id")
        .eq("platform", form.platform)
        .ilike("account_name", form.accountName.trim())
        .maybeSingle();

      let fraudAccountId: string;

      if (existing) {
        fraudAccountId = existing.id;
      } else {
        // Check by link
        let byLink = null;
        if (form.accountLink.trim()) {
          const { data } = await supabase
            .from("fraud_accounts")
            .select("id")
            .eq("account_link", form.accountLink.trim())
            .maybeSingle();
          byLink = data;
        }

        if (byLink) {
          fraudAccountId = byLink.id;
        } else {
          // Create new fraud account record (Pending)
          const { data: newAccount, error: accountError } = await supabase
            .from("fraud_accounts")
            .insert({
              platform: form.platform,
              account_name: form.accountName.trim(),
              account_handle: form.accountHandle.trim() || null,
              account_link: form.accountLink.trim() || null,
              status: "Pending",
            })
            .select("id")
            .single();

          if (accountError) throw accountError;
          fraudAccountId = newAccount.id;
        }
      }

      // Upload evidence files
      const evidenceUrls = await uploadFiles();

      // Generate reference ID
      const refId = `GCF-${Date.now().toString(36).toUpperCase().slice(-6)}`;

      // Insert report
      const { error: reportError } = await supabase
        .from("fraud_reports")
        .insert({
          fraud_account_id: fraudAccountId,
          reporter_name: form.reporterName.trim() || null,
          reporter_email: form.reporterEmail.trim() || null,
          reporter_phone: form.reporterPhone.trim() || null,
          payment_method: form.paymentMethod,
          amount: form.amount ? Number(form.amount) : null,
          currency: form.currency,
          incident_date: form.incidentDate,
          region: form.region || null,
          description: form.description.trim(),
          evidence_files: evidenceUrls,
          reference_id: refId,
          is_public: false,
        });

      if (reportError) throw reportError;

      setReferenceId(refId);
      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-2xl mx-auto px-4 py-12">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="font-serif text-2xl font-bold text-foreground mb-2">Report Submitted</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for helping protect others. Our team will review your submission shortly.
              </p>
              <div className="bg-muted rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground mb-1">Your Reference ID</p>
                <p className="font-mono text-lg font-bold text-primary">{referenceId}</p>
                <p className="text-xs text-muted-foreground mt-1">Keep this for your records</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/fraud-watch">
                  <Button variant="outline">Back to Fraud Watch</Button>
                </Link>
                <Link to="/fraud-watch/search">
                  <Button>Search More Accounts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container max-w-2xl mx-auto px-4">
          <Link to="/fraud-watch" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground text-sm mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Fraud Watch
          </Link>
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7" />
            <div>
              <h1 className="font-serif text-2xl font-bold">Report a Fraud Account</h1>
              <p className="text-primary-foreground/70 text-sm mt-0.5">Help protect others from online scammers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            False reports may be removed. Please only report accounts you genuinely believe are fraudulent.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Reporter Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Your Details <span className="text-muted-foreground font-normal text-sm">(Optional)</span></CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reporterName">Your Name</Label>
                <Input id="reporterName" value={form.reporterName} onChange={e => setForm(f => ({ ...f, reporterName: e.target.value }))} placeholder="Optional" className="mt-1" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reporterEmail">Email Address</Label>
                  <Input id="reporterEmail" type="email" value={form.reporterEmail} onChange={e => setForm(f => ({ ...f, reporterEmail: e.target.value }))} placeholder="Optional" className="mt-1" />
                  {errors.reporterEmail && <p className="text-destructive text-xs mt-1">{errors.reporterEmail}</p>}
                </div>
                <div>
                  <Label htmlFor="reporterPhone">Phone Number</Label>
                  <Input id="reporterPhone" value={form.reporterPhone} onChange={e => setForm(f => ({ ...f, reporterPhone: e.target.value }))} placeholder="Optional" className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Suspicious Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform <span className="text-destructive">*</span></Label>
                <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.platform && <p className="text-destructive text-xs mt-1">{errors.platform}</p>}
              </div>
              <div>
                <Label htmlFor="accountName">Account Name <span className="text-destructive">*</span></Label>
                <Input id="accountName" value={form.accountName} onChange={e => setForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. GH Fashion Store" className="mt-1" />
                {errors.accountName && <p className="text-destructive text-xs mt-1">{errors.accountName}</p>}
              </div>
              <div>
                <Label htmlFor="accountHandle">Username / Handle</Label>
                <Input id="accountHandle" value={form.accountHandle} onChange={e => setForm(f => ({ ...f, accountHandle: e.target.value }))} placeholder="e.g. @ghfashionstore (Optional)" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="accountLink">Account Link / URL</Label>
                <Input id="accountLink" value={form.accountLink} onChange={e => setForm(f => ({ ...f, accountLink: e.target.value }))} placeholder="https://instagram.com/... (Optional)" className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {/* Incident Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Incident Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Payment Method Used <span className="text-destructive">*</span></Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="How did you pay?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.paymentMethod && <p className="text-destructive text-xs mt-1">{errors.paymentMethod}</p>}
              </div>
              <div>
                <Label>Amount Lost</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00 (Optional)"
                    className="flex-1"
                  />
                </div>
                {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount}</p>}
              </div>
              <div>
                <Label htmlFor="incidentDate">Date of Incident <span className="text-destructive">*</span></Label>
                <Input
                  id="incidentDate"
                  type="date"
                  value={form.incidentDate}
                  max={format(new Date(), "yyyy-MM-dd")}
                  onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))}
                  className="mt-1"
                />
                {errors.incidentDate && <p className="text-destructive text-xs mt-1">{errors.incidentDate}</p>}
              </div>
              <div>
                <Label>Region in Ghana</Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select region (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {GHANA_REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">What Happened <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what happened, how you were contacted, what was promised, and what actually occurred..."
                  className="mt-1 min-h-[140px]"
                  maxLength={1200}
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-destructive text-xs">{errors.description}</p>
                  ) : (
                    <span />
                  )}
                  <p className="text-xs text-muted-foreground">{form.description.length}/1200</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evidence Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Evidence <span className="text-muted-foreground font-normal text-sm">(Optional)</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-1">Upload screenshots, receipts or documents</p>
                <p className="text-xs text-muted-foreground mb-3">Images or PDFs, max 10MB each, up to 5 files</p>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span>Choose Files</span>
                  </Button>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-muted rounded px-3 py-2">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeFile(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consent */}
          <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
            <input
              type="checkbox"
              id="consent"
              checked={form.consent}
              onChange={e => setForm(f => ({ ...f, consent: e.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <label htmlFor="consent" className="text-sm text-foreground cursor-pointer">
              I confirm this report is true to the best of my knowledge and I understand that false reports may be removed.
              <span className="text-destructive ml-1">*</span>
            </label>
          </div>
          {errors.consent && <p className="text-destructive text-xs -mt-4">{errors.consent}</p>}

          <Button type="submit" disabled={submitting || uploading} className="w-full h-12 text-base gap-2">
            {submitting || uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {uploading ? "Uploading files..." : "Submitting..."}
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Report Account
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            This is a public reporting tool. GhanaCrimes reviews submissions but cannot guarantee every claim.
          </p>
        </form>
      </div>
    </div>
  );
}
