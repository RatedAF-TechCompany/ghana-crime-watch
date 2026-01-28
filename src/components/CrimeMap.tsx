import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Ghana regions with approximate center coordinates for visualization
const REGION_COORDS: Record<string, { x: number; y: number }> = {
  "Greater Accra": { x: 75, y: 85 },
  "Ashanti": { x: 45, y: 55 },
  "Western": { x: 20, y: 70 },
  "Central": { x: 55, y: 85 },
  "Eastern": { x: 65, y: 60 },
  "Volta": { x: 85, y: 55 },
  "Northern": { x: 50, y: 25 },
  "Upper East": { x: 70, y: 10 },
  "Upper West": { x: 30, y: 10 },
  "Brong Ahafo": { x: 40, y: 40 },
  "Bono East": { x: 55, y: 35 },
  "Ahafo": { x: 35, y: 45 },
  "Savannah": { x: 35, y: 25 },
  "North East": { x: 65, y: 15 },
  "Oti": { x: 80, y: 40 },
  "Western North": { x: 25, y: 55 },
};

export function CrimeMap() {
  const { data: cityStats, isLoading } = useQuery({
    queryKey: ["crime-map-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_crime_stats")
        .select("*")
        .gt("crime_count", 0)
        .order("crime_count", { ascending: false })
        .limit(15);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="aspect-square w-full" />
      </div>
    );
  }

  if (!cityStats || cityStats.length === 0) {
    return null;
  }

  // Get max count for scaling
  const maxCount = Math.max(...cityStats.map((s) => s.crime_count));

  // Group cities by region
  const regionData = cityStats.reduce((acc, city) => {
    const region = city.region || "Unknown";
    if (!acc[region]) {
      acc[region] = { count: 0, cities: [] };
    }
    acc[region].count += city.crime_count;
    acc[region].cities.push(city);
    return acc;
  }, {} as Record<string, { count: number; cities: typeof cityStats }>);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-serif text-lg font-bold text-foreground">
        Crime Hotspots Map
      </h3>

      {/* Simplified Map Visualization */}
      <div className="relative aspect-[4/5] w-full rounded-lg bg-muted/50 overflow-hidden">
        {/* Ghana outline approximation */}
        <div className="absolute inset-2 rounded-lg border-2 border-dashed border-border">
          {/* Region markers */}
          {Object.entries(regionData).map(([region, data]) => {
            const coords = REGION_COORDS[region];
            if (!coords) return null;

            const intensity = data.count / maxCount;
            const size = 16 + intensity * 24;

            return (
              <div
                key={region}
                className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{
                  left: `${coords.x}%`,
                  top: `${coords.y}%`,
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full bg-primary/20 transition-transform hover:scale-110"
                  style={{
                    width: size,
                    height: size,
                  }}
                >
                  <MapPin
                    className="text-primary"
                    style={{
                      width: size * 0.6,
                      height: size * 0.6,
                    }}
                  />
                </div>
                
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="rounded-lg bg-foreground px-3 py-2 text-xs text-background shadow-lg whitespace-nowrap">
                    <p className="font-bold">{region}</p>
                    <p>{data.count} incidents</p>
                    <p className="text-muted-foreground">
                      {data.cities.map((c) => c.city_name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-2 right-2 rounded-lg bg-card/90 p-2 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-primary/30" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-primary/60" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-5 w-5 rounded-full bg-primary" />
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Cities List */}
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground">Top Hotspots</h4>
        {cityStats.slice(0, 5).map((city, index) => (
          <div
            key={city.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </span>
              <span className="font-medium">{city.city_name}</span>
            </div>
            <span className="text-muted-foreground">
              {city.crime_count} incidents
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
