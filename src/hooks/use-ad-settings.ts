import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdSettings {
  ad_calabashe: boolean;
  ad_whatsapp_cta: boolean;
}

export function useAdSettings(): AdSettings {
  const { data } = useQuery({
    queryKey: ["site-settings", "ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["ad_calabashe", "ad_whatsapp_cta"]);

      if (error) throw error;
      const map: Record<string, boolean> = {};
      data?.forEach((row) => {
        map[row.key] = row.value === true;
      });
      return map as unknown as AdSettings;
    },
    staleTime: 60_000, // cache for 1 min
  });

  return {
    ad_calabashe: data?.ad_calabashe ?? false,
    ad_whatsapp_cta: data?.ad_whatsapp_cta ?? false,
  };
}
