import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface BcraRow {
  fecha: string;
  valor: number | string;
}

async function fetchBcraVariable(idVariable: number, desdeStr: string): Promise<BcraRow[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/${idVariable}${desdeStr ? `?desde=${desdeStr}` : ""}`;
    console.log(`[Sync Indices BCRA] Consultando API BCRA Variable ${idVariable}: ${url}`);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 PropManager-BcraSync/1.0",
      },
    });

    if (!res.ok) {
      console.warn(`[Sync Indices BCRA] Respuesta no OK de BCRA para variable ${idVariable}: ${res.status} ${res.statusText}`);
      return [];
    }

    const json = await res.json();
    if (json && Array.isArray(json.results) && json.results.length > 0) {
      if (Array.isArray(json.results[0].detalle)) {
        return json.results[0].detalle;
      }
      return json.results;
    }
    return [];
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error(`[Sync Indices BCRA] Timeout al consultar variable ${idVariable} del BCRA (15s)`);
    } else {
      console.error(`[Sync Indices BCRA] Error al consultar variable ${idVariable} del BCRA:`, err.message);
    }
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados.");
    }

    // Cliente con Service Role Key para operaciones seguras en la base de datos
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parámetros de rango de fecha opcionales en la URL
    const reqUrl = new URL(req.url);
    const customDesde = reqUrl.searchParams.get("desde");
    const monthsParam = parseInt(reqUrl.searchParams.get("months") || "6", 10);

    let desdeStr = customDesde;
    if (!desdeStr) {
      const now = new Date();
      const monthsAgo = new Date(now.getFullYear(), now.getMonth() - monthsParam, 1);
      desdeStr = monthsAgo.toISOString().split("T")[0];
    }

    console.log(`[Sync Indices BCRA] Iniciando sincronización desde: ${desdeStr}`);

    // Consultar en paralelo IPC (27) e ICL (40) con tolerancia a fallos
    const [rawIpc, rawIcl] = await Promise.all([
      fetchBcraVariable(27, desdeStr),
      fetchBcraVariable(40, desdeStr),
    ]);

    const itemsToUpsert: Array<{
      id_indice: number;
      fecha_publicacion: string;
      valor_oficial: number;
    }> = [];

    // Parsear IPC (id_indice = 1)
    let ipcCount = 0;
    for (const row of rawIpc) {
      const val = Number(row.valor);
      if (row.fecha && !isNaN(val)) {
        itemsToUpsert.push({
          id_indice: 1,
          fecha_publicacion: row.fecha,
          valor_oficial: val,
        });
        ipcCount++;
      }
    }

    // Parsear ICL (id_indice = 2)
    let iclCount = 0;
    for (const row of rawIcl) {
      const val = Number(row.valor);
      if (row.fecha && !isNaN(val)) {
        itemsToUpsert.push({
          id_indice: 2,
          fecha_publicacion: row.fecha,
          valor_oficial: val,
        });
        iclCount++;
      }
    }

    console.log(`[Sync Indices BCRA] Extraídos ${ipcCount} registros de IPC y ${iclCount} de ICL.`);

    let upsertedTotal = 0;

    // Ejecutar UPSERT atómico en lotes (batch de 200) aprovechando la constraint UNIQUE (id_indice, fecha_publicacion)
    if (itemsToUpsert.length > 0) {
      const batchSize = 200;
      for (let i = 0; i < itemsToUpsert.length; i += batchSize) {
        const batch = itemsToUpsert.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from("Valor_Indice_Mensual")
          .upsert(batch, { onConflict: "id_indice,fecha_publicacion" })
          .select("id_valor_indice");

        if (error) {
          console.error(`[Sync Indices BCRA] Error en batch upsert ${i / batchSize + 1}:`, error);
          throw error;
        }

        upsertedTotal += data?.length ?? batch.length;
      }
    }

    const responsePayload = {
      success: true,
      message: `Sincronización BCRA completada exitosamente.`,
      desde: desdeStr,
      totalProcesados: itemsToUpsert.length,
      upserted: upsertedTotal,
      ipcRegistros: ipcCount,
      iclRegistros: iclCount,
      latestIpc: itemsToUpsert.find((r) => r.id_indice === 1) || null,
      latestIcl: itemsToUpsert.find((r) => r.id_indice === 2) || null,
      executedAt: new Date().toISOString(),
    };

    console.log(`[Sync Indices BCRA] Completado exitosamente:`, responsePayload);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("[Sync Indices BCRA Error]:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Error interno al sincronizar índices con BCRA",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
