import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, MapPin, AlertTriangle, Scale } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CityCrimeStat {
  id: string;
  city_name: string;
  region: string | null;
  crime_count: number;
  last_incident_at: string | null;
}

interface CrimeTypeStat {
  id: string;
  crime_type: string;
  display_name: string;
  crime_count: number;
  last_incident_at: string | null;
}

export function CrimeDashboard() {
  const [cityStats, setCityStats] = useState<CityCrimeStat[]>([]);
  const [crimeTypeStats, setCrimeTypeStats] = useState<CrimeTypeStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCrimes, setTotalCrimes] = useState(0);
  const [highlightedCity, setHighlightedCity] = useState<string | null>(null);
  const [highlightedType, setHighlightedType] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime updates for city stats
    const cityChannel = supabase
      .channel('city_crime_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'city_crime_stats'
        },
        (payload) => {
          console.log('City crime stats updated:', payload);
          if (payload.new && 'city_name' in payload.new) {
            setHighlightedCity(payload.new.city_name as string);
            setTimeout(() => setHighlightedCity(null), 3000);
          }
          fetchStats();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for crime type stats
    const typeChannel = supabase
      .channel('crime_type_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'crime_type_stats'
        },
        (payload) => {
          console.log('Crime type stats updated:', payload);
          if (payload.new && 'crime_type' in payload.new) {
            setHighlightedType(payload.new.crime_type as string);
            setTimeout(() => setHighlightedType(null), 3000);
          }
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(cityChannel);
      supabase.removeChannel(typeChannel);
    };
  }, []);

  const fetchStats = async () => {
    // Fetch city stats
    const { data: cityData, error: cityError } = await supabase
      .from('city_crime_stats')
      .select('*')
      .gt('crime_count', 0)
      .order('crime_count', { ascending: false })
      .limit(10);

    if (cityError) {
      console.error('Error fetching city crime stats:', cityError);
    } else {
      setCityStats(cityData || []);
      setTotalCrimes(cityData?.reduce((sum, city) => sum + city.crime_count, 0) || 0);
    }

    // Fetch crime type stats
    const { data: typeData, error: typeError } = await supabase
      .from('crime_type_stats')
      .select('*')
      .gt('crime_count', 0)
      .order('crime_count', { ascending: false })
      .limit(10);

    if (typeError) {
      console.error('Error fetching crime type stats:', typeError);
    } else {
      setCrimeTypeStats(typeData || []);
    }

    setLoading(false);
  };

  const getBarWidth = (count: number, maxCount: number) => {
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
      <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
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

  if (cityStats.length === 0 && crimeTypeStats.length === 0) {
    return null;
  }

  const maxCityCount = cityStats[0]?.crime_count || 1;
  const maxTypeCount = crimeTypeStats[0]?.crime_count || 1;
  const totalTypeCrimes = crimeTypeStats.reduce((sum, type) => sum + type.crime_count, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card transition-colors hover:border-primary/50">
      {/* Header */}
      <div className="border-b-2 border-primary bg-primary px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary-foreground" />
            <h2 className="font-serif text-sm font-bold text-primary-foreground uppercase tracking-wide sm:text-base">
              Crime Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-1.5 text-primary-foreground/80">
            <span className="text-xs font-medium">LIVE</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="w-full rounded-none border-b border-border bg-muted/30 p-0 h-auto">
          <TabsTrigger 
            value="locations" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-medium"
          >
            <MapPin className="h-3 w-3 mr-1.5" />
            Hotspots
          </TabsTrigger>
          <TabsTrigger 
            value="types" 
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-2.5 text-xs font-medium"
          >
            <Scale className="h-3 w-3 mr-1.5" />
            Crime Types
          </TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-0">
          {/* Stats Summary */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 sm:px-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Total incidents tracked</span>
              <span className="font-bold text-foreground">{totalCrimes.toLocaleString()}</span>
            </div>
          </div>

          {/* City Rankings */}
          <div className="p-4 space-y-3 sm:p-5">
            {cityStats.map((city, index) => (
              <div
                key={city.id}
                className={`relative transition-all duration-500 ${
                  highlightedCity === city.city_name
                    ? 'bg-primary/10 -mx-2 px-2 py-1 rounded-lg'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-5">
                    <span
                      className={`font-serif text-sm font-bold ${
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
                        style={{ width: `${getBarWidth(city.crime_count, maxCityCount)}%` }}
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
        </TabsContent>

        {/* Crime Types Tab */}
        <TabsContent value="types" className="mt-0">
          {/* Stats Summary */}
          <div className="px-4 py-2.5 border-b border-border bg-muted/20 sm:px-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Crimes by category</span>
              <span className="font-bold text-foreground">{totalTypeCrimes.toLocaleString()}</span>
            </div>
          </div>

          {/* Crime Type Rankings */}
          <div className="p-4 space-y-3 sm:p-5">
            {crimeTypeStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No crime type data yet
              </p>
            ) : (
              crimeTypeStats.map((crimeType, index) => (
                <div
                  key={crimeType.id}
                  className={`relative transition-all duration-500 ${
                    highlightedType === crimeType.crime_type
                      ? 'bg-primary/10 -mx-2 px-2 py-1 rounded-lg'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-5">
                      <span
                        className={`font-serif text-sm font-bold ${
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

                    {/* Crime Type Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Scale className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {crimeType.display_name}
                        </span>
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
                          } ${highlightedType === crimeType.crime_type ? 'animate-pulse' : ''}`}
                          style={{ width: `${getBarWidth(crimeType.crime_count, maxTypeCount)}%` }}
                        />
                      </div>
                    </div>

                    {/* Count */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-foreground">
                          {crimeType.crime_count}
                        </span>
                        {index === 0 && (
                          <TrendingUp className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      {crimeType.last_incident_at && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeAgo(crimeType.last_incident_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/20 sm:px-5">
        <p className="text-[10px] text-muted-foreground text-center">
          Data sourced from published crime reports • Updates in real-time
        </p>
      </div>
    </div>
  );
}
