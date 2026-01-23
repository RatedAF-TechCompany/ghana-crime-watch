import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive list of Ghanaian cities and towns
const GHANAIAN_CITIES = [
  // Greater Accra
  { name: "Accra", region: "Greater Accra", aliases: ["accra central", "central accra"] },
  { name: "Tema", region: "Greater Accra", aliases: ["tema metropolis", "tema new town"] },
  { name: "Madina", region: "Greater Accra", aliases: [] },
  { name: "Ashaiman", region: "Greater Accra", aliases: ["ashiaman"] },
  { name: "Teshie", region: "Greater Accra", aliases: ["teshie nungua"] },
  { name: "Nungua", region: "Greater Accra", aliases: [] },
  { name: "Dansoman", region: "Greater Accra", aliases: [] },
  { name: "Lapaz", region: "Greater Accra", aliases: ["la paz"] },
  { name: "Achimota", region: "Greater Accra", aliases: [] },
  { name: "Kaneshie", region: "Greater Accra", aliases: [] },
  { name: "Osu", region: "Greater Accra", aliases: [] },
  { name: "Labadi", region: "Greater Accra", aliases: ["la"] },
  { name: "Adenta", region: "Greater Accra", aliases: ["adentan"] },
  { name: "Dodowa", region: "Greater Accra", aliases: [] },
  { name: "Kpone", region: "Greater Accra", aliases: [] },
  { name: "Prampram", region: "Greater Accra", aliases: [] },
  { name: "Ablekuma", region: "Greater Accra", aliases: [] },
  { name: "Korle Bu", region: "Greater Accra", aliases: ["korle-bu"] },
  { name: "Circle", region: "Greater Accra", aliases: ["kwame nkrumah circle"] },
  { name: "Spintex", region: "Greater Accra", aliases: ["spintex road"] },
  { name: "East Legon", region: "Greater Accra", aliases: ["east legon hills"] },
  { name: "Sakumono", region: "Greater Accra", aliases: [] },
  
  // Ashanti
  { name: "Kumasi", region: "Ashanti", aliases: ["kumasi metropolis", "garden city"] },
  { name: "Obuasi", region: "Ashanti", aliases: [] },
  { name: "Ejisu", region: "Ashanti", aliases: ["ejisu-juaben"] },
  { name: "Bekwai", region: "Ashanti", aliases: [] },
  { name: "Konongo", region: "Ashanti", aliases: [] },
  { name: "Mampong", region: "Ashanti", aliases: ["mampong ashanti"] },
  { name: "Adum", region: "Ashanti", aliases: [] },
  { name: "Kejetia", region: "Ashanti", aliases: [] },
  { name: "Suame", region: "Ashanti", aliases: ["suame magazine"] },
  { name: "Asokwa", region: "Ashanti", aliases: [] },
  { name: "Ejura", region: "Ashanti", aliases: [] },
  { name: "Agogo", region: "Ashanti", aliases: [] },
  { name: "Manhyia", region: "Ashanti", aliases: [] },
  { name: "Abuakwa", region: "Ashanti", aliases: [] },
  
  // Central
  { name: "Cape Coast", region: "Central", aliases: ["cape-coast"] },
  { name: "Kasoa", region: "Central", aliases: ["buduburam", "kasoa new market"] },
  { name: "Winneba", region: "Central", aliases: [] },
  { name: "Elmina", region: "Central", aliases: [] },
  { name: "Agona Swedru", region: "Central", aliases: ["swedru", "agona"] },
  { name: "Mankessim", region: "Central", aliases: [] },
  { name: "Saltpond", region: "Central", aliases: [] },
  { name: "Dunkwa", region: "Central", aliases: ["dunkwa-on-offin"] },
  { name: "Assin Fosu", region: "Central", aliases: ["assin foso"] },
  { name: "Apam", region: "Central", aliases: [] },
  
  // Western
  { name: "Takoradi", region: "Western", aliases: ["sekondi-takoradi"] },
  { name: "Sekondi", region: "Western", aliases: [] },
  { name: "Tarkwa", region: "Western", aliases: [] },
  { name: "Axim", region: "Western", aliases: [] },
  { name: "Elubo", region: "Western", aliases: [] },
  { name: "Prestea", region: "Western", aliases: [] },
  { name: "Bogoso", region: "Western", aliases: [] },
  { name: "Half Assini", region: "Western", aliases: [] },
  
  // Eastern
  { name: "Koforidua", region: "Eastern", aliases: [] },
  { name: "Nsawam", region: "Eastern", aliases: ["nsawam adoagyiri"] },
  { name: "Suhum", region: "Eastern", aliases: [] },
  { name: "Nkawkaw", region: "Eastern", aliases: ["nkawkaw"] },
  { name: "Akropong", region: "Eastern", aliases: [] },
  { name: "Somanya", region: "Eastern", aliases: [] },
  { name: "Akim Oda", region: "Eastern", aliases: ["oda"] },
  { name: "Aburi", region: "Eastern", aliases: [] },
  { name: "Kibi", region: "Eastern", aliases: [] },
  { name: "Asamankese", region: "Eastern", aliases: [] },
  { name: "Kade", region: "Eastern", aliases: [] },
  { name: "Akosombo", region: "Eastern", aliases: [] },
  { name: "Donkorkrom", region: "Eastern", aliases: [] },
  
  // Volta
  { name: "Ho", region: "Volta", aliases: [] },
  { name: "Hohoe", region: "Volta", aliases: [] },
  { name: "Aflao", region: "Volta", aliases: [] },
  { name: "Keta", region: "Volta", aliases: [] },
  { name: "Kpando", region: "Volta", aliases: [] },
  { name: "Sogakope", region: "Volta", aliases: [] },
  { name: "Akatsi", region: "Volta", aliases: [] },
  { name: "Denu", region: "Volta", aliases: [] },
  
  // Northern
  { name: "Tamale", region: "Northern", aliases: [] },
  { name: "Yendi", region: "Northern", aliases: [] },
  { name: "Salaga", region: "Northern", aliases: [] },
  { name: "Damongo", region: "Northern", aliases: [] },
  { name: "Bimbilla", region: "Northern", aliases: [] },
  
  // Upper East
  { name: "Bolgatanga", region: "Upper East", aliases: ["bolga"] },
  { name: "Navrongo", region: "Upper East", aliases: [] },
  { name: "Bawku", region: "Upper East", aliases: [] },
  { name: "Zebilla", region: "Upper East", aliases: [] },
  
  // Upper West
  { name: "Wa", region: "Upper West", aliases: [] },
  { name: "Lawra", region: "Upper West", aliases: [] },
  { name: "Tumu", region: "Upper West", aliases: [] },
  { name: "Nandom", region: "Upper West", aliases: [] },
  
  // Bono
  { name: "Sunyani", region: "Bono", aliases: [] },
  { name: "Berekum", region: "Bono", aliases: [] },
  { name: "Dormaa Ahenkro", region: "Bono", aliases: ["dormaa"] },
  { name: "Wenchi", region: "Bono", aliases: [] },
  
  // Bono East
  { name: "Techiman", region: "Bono East", aliases: [] },
  { name: "Kintampo", region: "Bono East", aliases: [] },
  { name: "Nkoranza", region: "Bono East", aliases: [] },
  { name: "Atebubu", region: "Bono East", aliases: [] },
  
  // Ahafo
  { name: "Goaso", region: "Ahafo", aliases: [] },
  { name: "Duayaw Nkwanta", region: "Ahafo", aliases: [] },
  { name: "Bechem", region: "Ahafo", aliases: [] },
  
  // Oti
  { name: "Dambai", region: "Oti", aliases: [] },
  { name: "Jasikan", region: "Oti", aliases: [] },
  { name: "Nkwanta", region: "Oti", aliases: [] },
  
  // Savannah
  { name: "Bole", region: "Savannah", aliases: [] },
  { name: "Sawla", region: "Savannah", aliases: [] },
  
  // North East
  { name: "Nalerigu", region: "North East", aliases: [] },
  { name: "Gambaga", region: "North East", aliases: [] },
  { name: "Walewale", region: "North East", aliases: [] },
  
  // Western North
  { name: "Sefwi Wiawso", region: "Western North", aliases: ["wiawso"] },
  { name: "Bibiani", region: "Western North", aliases: [] },
  { name: "Enchi", region: "Western North", aliases: [] },
];

function extractCitiesFromText(text: string): Map<string, { name: string; region: string }> {
  const foundCities = new Map<string, { name: string; region: string }>();
  const lowerText = text.toLowerCase();

  for (const city of GHANAIAN_CITIES) {
    // Check main city name (word boundary match)
    const mainPattern = new RegExp(`\\b${city.name.toLowerCase()}\\b`, 'i');
    if (mainPattern.test(lowerText)) {
      foundCities.set(city.name, { name: city.name, region: city.region });
      continue;
    }

    // Check aliases
    for (const alias of city.aliases) {
      const aliasPattern = new RegExp(`\\b${alias.toLowerCase()}\\b`, 'i');
      if (aliasPattern.test(lowerText)) {
        foundCities.set(city.name, { name: city.name, region: city.region });
        break;
      }
    }
  }

  return foundCities;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { article_id, title, body } = await req.json();

    if (!article_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: article_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracting cities from article: ${article_id}`);

    // Combine title and body for extraction
    const fullText = `${title} ${body}`;
    const cities = extractCitiesFromText(fullText);

    console.log(`Found ${cities.size} cities:`, Array.from(cities.keys()));

    if (cities.size === 0) {
      return new Response(
        JSON.stringify({ success: true, cities_found: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update crime counts for each city
    const now = new Date().toISOString();
    
    for (const [cityName, cityInfo] of cities) {
      // First try to update existing city
      const { data: existingCity, error: selectError } = await supabase
        .from('city_crime_stats')
        .select('id, crime_count')
        .eq('city_name', cityName)
        .single();

      if (existingCity) {
        // Update existing city
        const { error: updateError } = await supabase
          .from('city_crime_stats')
          .update({
            crime_count: existingCity.crime_count + 1,
            last_incident_at: now,
          })
          .eq('id', existingCity.id);

        if (updateError) {
          console.error(`Error updating ${cityName}:`, updateError);
        } else {
          console.log(`Updated ${cityName}: ${existingCity.crime_count + 1} incidents`);
        }
      } else {
        // Insert new city
        const { error: insertError } = await supabase
          .from('city_crime_stats')
          .insert({
            city_name: cityName,
            region: cityInfo.region,
            crime_count: 1,
            last_incident_at: now,
          });

        if (insertError) {
          console.error(`Error inserting ${cityName}:`, insertError);
        } else {
          console.log(`Added new city ${cityName} with 1 incident`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cities_found: cities.size,
        cities: Array.from(cities.keys()),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting cities:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
