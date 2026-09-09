import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function allowedOrigins() {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : ["https://vivat.com.ar", "https://www.vivat.com.ar"]);
}

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  if (!origin || !allowedOrigins().has(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin"
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

/** Authenticated proxy for the paid Walk Score key. */
serve(async (req) => {
  const corsHeaders = cors(req);
  if (req.headers.get("Origin") && !corsHeaders) return json({ error: "Forbidden" }, 403);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders ?? {} });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405, { ...(corsHeaders ?? {}), Allow: "POST" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const authorization = req.headers.get("Authorization") ?? "";
    if (!supabaseUrl || !anonKey || !/^Bearer\s+\S+$/i.test(authorization)) return json({ error: "Unauthorized" }, 401, corsHeaders ?? {});

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authorization } }
    });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: "Unauthorized" }, 401, corsHeaders ?? {});

    const input = await req.json();
    const lat = Number(input?.lat);
    const lon = Number(input?.lon);
    const address = typeof input?.address === "string" ? input.address.trim().slice(0, 300) : "";
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180 || !address) {
      return json({ error: "Invalid location." }, 400, corsHeaders ?? {});
    }

    const apiKey = Deno.env.get("WALK_SCORE_API_KEY") ?? "";
    if (!apiKey) throw new Error("Walk Score is not configured.");
    const url = new URL("https://api.walkscore.com/score");
    url.searchParams.set("format", "json");
    url.searchParams.set("address", address);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("transit", "1");
    url.searchParams.set("bike", "1");
    url.searchParams.set("wsapikey", apiKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.status !== 1) return json({ error: "Location score unavailable." }, 502, corsHeaders ?? {});

    return json({
      data: {
        walk_score: Number(data.walkscore) || 0,
        transit_score: Number(data.transit?.score) || 0,
        bike_score: Number(data.bike?.score) || 0,
        description: typeof data.description === "string" ? data.description.slice(0, 500) : ""
      }
    }, 200, corsHeaders ?? {});
  } catch (error) {
    console.error("[get-walk-score]", error);
    return json({ error: "Internal Server Error" }, 500, corsHeaders ?? {});
  }
});
