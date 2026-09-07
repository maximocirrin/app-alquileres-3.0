import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lat, lon, address } = await req.json();

    if (!lat || !lon || !address) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: lat, lon, address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const walkScoreApiKey = Deno.env.get("WALK_SCORE_API_KEY");

    if (!walkScoreApiKey) {
      return new Response(
        JSON.stringify({ error: "WALK_SCORE_API_KEY not configured in Edge Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call Walk Score API (which includes transit and bike scores if requested)
    // Walk Score API expects lat, lon, address and wsapikey
    const url = new URL("https://api.walkscore.com/score");
    url.searchParams.append("format", "json");
    url.searchParams.append("address", address);
    url.searchParams.append("lat", lat.toString());
    url.searchParams.append("lon", lon.toString());
    url.searchParams.append("transit", "1");
    url.searchParams.append("bike", "1");
    url.searchParams.append("wsapikey", walkScoreApiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 1) {
       console.error("Walk Score API Error:", data);
       return new Response(
        JSON.stringify({ error: "Error calling Walk Score API", details: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const scores = {
      walk_score: data.walkscore || 0,
      transit_score: data.transit?.score || 0,
      bike_score: data.bike?.score || 0,
      description: data.description || ""
    };

    return new Response(
      JSON.stringify({ data: scores }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge Function Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
