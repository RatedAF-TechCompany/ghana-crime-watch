import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, MapPin, AlertTriangle } from "lucide-react";

interface CityCrimeStat {
  id: string;
  city_name: string;
  region: string | null;
  crime_count: number;
  last_incident_at: string | null;
}

export function CrimeDashboard() {
  const [stats, setStats] = useState<CityCrimeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCrimes, setTotalCrimes] = useState(0);
  const [highlightedCity, setHighlightedCity] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('city_crime_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'city_crime_stats'
        },
        (payload) => {
          console.log('Crime stats updated:', payload);
          // Highlight the updated city briefly
          if (payload.new && 'city_name' in payload.new) {
            setHighlightedCity(payload.new.city_name as string);
            setTimeout(() => setHighlightedCity(null), 3000);
          }
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('city_crime_stats')
      .select('*')
      .gt('crime_count', 0)
      .order('crime_count', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching crime stats:', error);
      return;
    }

    setStats(data || []);
    setTotalCrimes(data?.reduce((sum, city) => sum + city.crime_count, 0) || 0);
    setLoading(false);
  };

  const getBarWidth = (count: number) => {
    const maxCount = stats[0]?.crime_count || 1;
    return Math.max((count / maxCount) * 100, 8);
  };

  const formatTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="bg-background border border-border rounded-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (stats.length === 0) {
    return null; // Don't show dashboard if no data
  }

  return (
    <div className="bg-background border border-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-primary-foreground" />
          <h2 className="text-sm font-bold text-primary-foreground tracking-wide uppercase">
            Crime Hotspots
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-primary-foreground/80">
          <span className="text-xs font-medium">LIVE</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
          </span>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total incidents tracked</span>
          <span className="font-bold text-foreground">{totalCrimes.toLocaleString()}</span>
        </div>
      </div>

      {/* City Rankings */}
      <div className="p-4 space-y-3">
        {stats.map((city, index) => (
          <div
            key={city.id}
            className={`relative transition-all duration-500 ${
              highlightedCity === city.city_name
                ? 'bg-primary/10 -mx-2 px-2 py-1 rounded'
                : ''
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Rank */}
              <div className="flex-shrink-0 w-5">
                <span
                  className={`text-sm font-bold ${
                    index === 0
                      ? 'text-primary'
                      : index < 3
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </span>
              </div>

              {/* City Info */}
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="font-semibold text-sm text-foreground truncate">
                    {city.city_name}
                  </span>
                  {city.region && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      • {city.region}
                    </span>
                  )}
                </div>

                {/* Bar */}
                <div className="mt-1.5 h-2 bg-muted rounded-sm overflow-hidden">
                  <div
                    className={`h-full rounded-sm transition-all duration-700 ease-out ${
                      index === 0
                        ? 'bg-primary'
                        : index < 3
                        ? 'bg-primary/70'
                        : 'bg-primary/50'
                    } ${highlightedCity === city.city_name ? 'animate-pulse' : ''}`}
                    style={{ width: `${getBarWidth(city.crime_count)}%` }}
                  />
                </div>
              </div>

              {/* Count */}
              <div className="flex-shrink-0 text-right">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-foreground">
                    {city.crime_count}
                  </span>
                  {index === 0 && (
                    <TrendingUp className="h-3 w-3 text-primary" />
                  )}
                </div>
                {city.last_incident_at && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatTimeAgo(city.last_incident_at)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/20">
        <p className="text-[10px] text-muted-foreground text-center">
          Data sourced from published crime reports • Updates in real-time
        </p>
      </div>
    </div>
  );
}
