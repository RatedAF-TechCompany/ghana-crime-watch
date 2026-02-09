import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Megaphone } from "lucide-react";

interface AdSetting {
  key: string;
  label: string;
  enabled: boolean;
}

export function AdSettingsPanel() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value, label")
      .in("key", ["ad_calabashe", "ad_whatsapp_cta"]);

    if (error) {
      toast({ title: "Error loading ad settings", description: error.message, variant: "destructive" });
      return;
    }

    setSettings(
      (data || []).map((row) => ({
        key: row.key,
        label: row.label || row.key,
        enabled: row.value === true,
      }))
    );
    setLoading(false);
  };

  const handleToggle = async (key: string, newValue: boolean) => {
    // Optimistic update
    setSettings((prev) =>
      prev.map((s) => (s.key === key ? { ...s, enabled: newValue } : s))
    );

    const { error } = await supabase
      .from("site_settings")
      .update({ value: newValue })
      .eq("key", key);

    if (error) {
      toast({ title: "Error updating setting", description: error.message, variant: "destructive" });
      // Revert
      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, enabled: !newValue } : s))
      );
    } else {
      toast({ title: `${key === "ad_calabashe" ? "Calabashe Ad" : "WhatsApp CTA"} ${newValue ? "enabled" : "disabled"}` });
    }
  };

  if (loading) return null;

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="mb-4 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Advertisement Controls</h3>
      </div>
      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.key} className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{setting.label}</p>
              <p className="text-xs text-muted-foreground">
                {setting.enabled ? "Currently showing on site" : "Currently hidden from site"}
              </p>
            </div>
            <Switch
              checked={setting.enabled}
              onCheckedChange={(checked) => handleToggle(setting.key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
