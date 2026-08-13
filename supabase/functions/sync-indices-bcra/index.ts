import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular fecha desde hace 3 meses para sincronizaciones incrementales
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const desdeStr = threeMonthsAgo.toISOString().split("T")[0];

    console.log(`[Sync Indices BCRA] Sincronizando desde: ${desdeStr}`);

    // Consultar IPC (27) e ICL (40)
    const [resIpc, resIcl] = await Promise.allSettled([
      fetch(`https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/27?desde=${desdeStr}`, {
        headers: { "Accept": "application/json" }
      }),
      fetch(`https://api.bcra.gob.ar/estadisticas/v4.0/Monetarias/40?desde=${desdeStr}`, {
        headers: { "Accept": "application/json" }
      })
    ]);

    const itemsToUpsert = [];

    // Parsear IPC (id_indice = 1)
    if (resIpc.status === "fulfilled" && resIpc.value.ok) {
      const jsonIpc = await resIpc.value.json();
      const detalleIpc = jsonIpc?.results?.[0]?.detalle || [];
      for (const row of detalleIpc) {
        if (row.fecha && !isNaN(Number(row.valor))) {
          itemsToUpsert.push({
            id_indice: 1,
            fecha_publicacion: row.fecha,
            valor_oficial: Number(row.valor)
          });
        }
      }
    }

    // Parsear ICL (id_indice = 2)
    if (resIcl.status === "fulfilled" && resIcl.value.ok) {
      const jsonIcl = await resIcl.value.json();
      const detalleIcl = jsonIcl?.results?.[0]?.detalle || [];
      for (const row of detalleIcl) {
        if (row.fecha && !isNaN(Number(row.valor))) {
          itemsToUpsert.push({
            id_indice: 2,
            fecha_publicacion: row.fecha,
            valor_oficial: Number(row.valor)
          });
        }
      }
    }

    let insertedCount = 0;

    // Insertar registros evitando duplicados comprobando fecha e id_indice
    for (const item of itemsToUpsert) {
      const { data: existing } = await supabase
        .from("Valor_Indice_Mensual")
        .select("id_valor_indice")
        .eq("id_indice", item.id_indice)
        .eq("fecha_publicacion", item.fecha_publicacion)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from("Valor_Indice_Mensual")
          .insert([item]);
        if (!error) insertedCount++;
      } else {
        // Actualizar si hubo cambio en el valor oficial
        await supabase
          .from("Valor_Indice_Mensual")
          .update({ valor_oficial: item.valor_oficial })
          .eq("id_valor_indice", existing.id_valor_indice);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronización completada. Procesados ${itemsToUpsert.length} registros, ${insertedCount} nuevos insertados.`,
        processed: itemsToUpsert.length,
        newlyInserted: insertedCount,
        executedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[Sync Indices BCRA Error]:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
