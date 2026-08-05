import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { participant_id, cuit_cuil, full_name } = body;

    if (!participant_id) {
      return NextResponse.json(
        { success: false, error: 'Bad Request', message: 'El campo "participant_id" es requerido.' },
        { status: 400 }
      );
    }

    const scraperUrl = process.env.MENDOZA_SCRAPER_URL || 'https://habitat-ws.onrender.com/scrape-mendoza';
    const scraperApiKey = process.env.SCRAPER_SECRET_KEY || 'e9c1f8a4b3d7e2c0f6a5b9d1e3c7f0a4b8c2d6e0f3a5b9c1d7e4f8a0b2c6d9e1';

    // Inicializar cliente de Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let hasLegalIssues = false;
    let hasEvictionHistory = false;
    let summaryData: Record<string, any> = {};
    let isPendingReview = false;

    // Timeout de 15 segundos para dar margen al arranque de Render (free tier cold starts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(scraperUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': scraperApiKey,
        },
        body: JSON.stringify({
          cuit_cuil: cuit_cuil || '',
          full_name: full_name || '',
          participant_id: participant_id,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const scraperRes = await response.json();
        hasLegalIssues = Boolean(scraperRes.has_legal_issues || scraperRes.has_issues);
        hasEvictionHistory = Boolean(scraperRes.has_eviction_history || scraperRes.has_eviction);
        summaryData = {
          status: 'completed',
          total_causes: scraperRes.total_causes || 0,
          eviction_causes_count: scraperRes.eviction_causes_count || (hasEvictionHistory ? 1 : 0),
          details: scraperRes.details || scraperRes.results || [],
          scraped_at: new Date().toISOString(),
        };
      } else {
        const errorText = await response.text().catch(() => '');
        console.warn(`[Mendoza Scraper Error] HTTP ${response.status}: ${errorText}`);
        isPendingReview = true;
        summaryData = {
          status: 'pending_manual_review',
          error: `Scraper HTTP ${response.status}`,
          scraped_at: new Date().toISOString(),
        };
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(`[Mendoza Scraper Exception]: ${fetchErr?.message || fetchErr}`);
      isPendingReview = true;
      summaryData = {
        status: 'pending_manual_review',
        error: fetchErr?.name === 'AbortError' ? 'Microservicio Render Timeout' : (fetchErr?.message || 'Error de conexión'),
        scraped_at: new Date().toISOString(),
      };
    }

    // Persistir o actualizar en la tabla legal_records de Supabase
    const { data: existingRecord } = await supabase
      .from('legal_records')
      .select('id')
      .eq('participant_id', participant_id)
      .maybeSingle();

    let savedRecord = null;
    let saveError = null;

    if (existingRecord) {
      const { data, error } = await supabase
        .from('legal_records')
        .update({
          has_legal_issues: hasLegalIssues,
          has_eviction_history: hasEvictionHistory,
          summary: summaryData,
          checked_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id)
        .select()
        .single();
      savedRecord = data;
      saveError = error;
    } else {
      const { data, error } = await supabase
        .from('legal_records')
        .insert([{
          participant_id: participant_id,
          has_legal_issues: hasLegalIssues,
          has_eviction_history: hasEvictionHistory,
          summary: summaryData,
          checked_at: new Date().toISOString(),
        }])
        .select()
        .single();
      savedRecord = data;
      saveError = error;
    }

    if (saveError) {
      console.error('[Supabase legal_records save error]:', saveError);
    }

    return NextResponse.json({
      success: true,
      status: isPendingReview ? 'pending_manual_review' : 'completed',
      data: savedRecord || {
        participant_id,
        has_legal_issues: hasLegalIssues,
        has_eviction_history: hasEvictionHistory,
        summary: summaryData,
        checked_at: new Date().toISOString(),
      },
      message: isPendingReview
        ? 'El análisis de antecedentes judiciales está en revisión manual pendiente.'
        : 'Verificación de antecedentes judiciales procesada con éxito.',
    });
  } catch (err: any) {
    console.error('[API Handler Error /verify-legal]:', err);
    // En caso de fallo o timeout, responder sin romper la respuesta del usuario (pending_manual_review)
    return NextResponse.json(
      {
        success: true,
        status: 'pending_manual_review',
        message: 'No se pudo completar el escaneo inmediato. Registrado para revisión manual.',
        error: err?.message || 'Internal error',
      },
      { status: 200 }
    );
  }
}
