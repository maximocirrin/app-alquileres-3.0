import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface BcraRow {
  fecha: string;
  valor: number | string;
}

function secureEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function validDate(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));
}

async function fetchBcraVariable(idVariable: number, desde: string): Promise<BcraRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = new URL(`https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/${idVariable}`);
    url.searchParams.set("desde", desde);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`BCRA returned ${response.status}`);
    const payload = await response.json();
    const rows = Array.isArray(payload?.results?.[0]?.detalle)
      ? payload.results[0].detalle
      : (Array.isArray(payload?.results) ? payload.results : []);
    return rows.filter((row: BcraRow) => validDate(row?.fecha) && Number.isFinite(Number(row?.valor)));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Scheduled, secret-authenticated data synchronization. This endpoint must not
 * be reachable by normal browser sessions: it uses a service key only after
 * authenticating the scheduler-specific secret.
 */
serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", Allow: "POST" }
    });
  }

  const expectedSecret = Deno.env.get("BCRA_SYNC_SECRET") ?? "";
  const receivedSecret = req.headers.get("x-bcra-sync-secret") ?? "";
  if (!secureEqual(receivedSecret, expectedSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey || !expectedSecret) throw new Error("Required server configuration is missing.");

    const requestUrl = new URL(req.url);
    const sinceParameter = requestUrl.searchParams.get("desde");
    const months = Math.min(12, Math.max(1, Number.parseInt(requestUrl.searchParams.get("months") ?? "6", 10) || 6));
    const since = validDate(sinceParameter)
      ? sinceParameter!
      : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - months, 1)).toISOString().slice(0, 10);

    const [ipc, icl] = await Promise.all([fetchBcraVariable(27, since), fetchBcraVariable(40, since)]);
    const rows = [
      ...ipc.map((row) => ({ id_indice: 1, fecha_publicacion: row.fecha, valor_oficial: Number(row.valor) })),
      ...icl.map((row) => ({ id_indice: 2, fecha_publicacion: row.fecha, valor_oficial: Number(row.valor) }))
    ];
    if (!rows.length) throw new Error("BCRA did not return usable index data.");

    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    for (let index = 0; index < rows.length; index += 200) {
      const { error } = await supabase
        .from("Valor_Indice_Mensual")
        .upsert(rows.slice(index, index + 200), { onConflict: "id_indice,fecha_publicacion" });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true, total: rows.length, since }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[sync-indices-bcra]", error);
    return new Response(JSON.stringify({ ok: false, error: "Synchronization failed." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
