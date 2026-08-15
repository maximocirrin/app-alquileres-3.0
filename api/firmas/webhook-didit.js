import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

/**
 * Vercel Serverless Function: /api/firmas/webhook-didit
 * 
 * FASE 2: Validación Biométrica y Bóveda Segura de Evidencias
 * 
 * Responsabilidades:
 * 1. Recibir la notificación Server-to-Server de Didit al finalizar la prueba biométrica.
 * 2. Extraer scores de Face Match, Liveness y OCR de DNI.
 * 3. Descargar y almacenar de forma segura las fotos en el bucket privado 'boveda_biometrica'.
 * 4. Actualizar la tabla Firma_contrato con el estado 'biometria_aprobada' o 'biometria_rechazada'.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Didit-Signature, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed',
      message: 'Este webhook únicamente acepta peticiones POST.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    console.log('[Didit Signature Webhook Received]:', JSON.stringify(body));

    const {
      event,
      type,
      session_id,
      sessionId,
      id,
      vendor_data,
      status,
      decision,
      features
    } = body;

    const currentSessionId = session_id || sessionId || id;
    const eventType = event || type || 'verification.completed';
    const rawStatus = (status || decision?.status || 'Unknown').toString().toLowerCase();

    const isApproved = rawStatus === 'approved' || rawStatus === 'success' || rawStatus === 'passed';
    const isDeclined = rawStatus === 'declined' || rawStatus === 'rejected' || rawStatus === 'failed';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Parsear vendor_data para obtener contrato y perfil si aplica
    let parsedVendorData = {};
    if (vendor_data) {
      try {
        parsedVendorData = typeof vendor_data === 'string' ? JSON.parse(vendor_data) : vendor_data;
      } catch (e) {
        parsedVendorData = { raw: vendor_data };
      }
    }

    // 2. Buscar la transacción en Firma_contrato
    let query = supabase.from('Firma_contrato').select('*');
    if (currentSessionId) {
      query = query.eq('didit_session_id', currentSessionId);
    } else if (parsedVendorData.contractId && parsedVendorData.profileId) {
      query = query
        .eq('id_contrato', Number(parsedVendorData.contractId))
        .eq('id_perfil_firmante', Number(parsedVendorData.profileId))
        .order('created_at', { ascending: false });
    }

    const { data: firmas, error: errFirma } = await query.limit(1);

    if (errFirma || !firmas || firmas.length === 0) {
      console.warn('[Didit Webhook] No se encontró Firma_contrato para sesión:', currentSessionId);
      // Responder 200 a Didit para evitar reintentos innecesarios si no es de firma
      return res.status(200).json({
        ok: true,
        message: 'Evento recibido pero no vinculado a una firma de contrato activa.'
      });
    }

    const firma = firmas[0];
    const contractId = firma.id_contrato;
    const firmaId = firma.id_firma;

    // 3. Extraer Scores y detalles de verificación
    const diditScores = {
      raw_status: rawStatus,
      event_type: eventType,
      decision_status: decision?.status || rawStatus,
      face_match_score: decision?.face_match?.score || decision?.biometrics?.face_match_score || features?.face_match?.score || null,
      face_match_result: decision?.face_match?.result || (isApproved ? 'matched' : 'not_matched'),
      liveness_status: decision?.liveness?.status || features?.liveness?.status || (isApproved ? 'passed' : 'failed'),
      document_type: decision?.document?.type || features?.document?.type || 'ARG_DNI',
      ocr_document_number: decision?.document?.document_number || features?.document?.document_number || null,
      ocr_full_name: decision?.document?.full_name || features?.document?.full_name || null,
      processed_at: new Date().toISOString()
    };

    // 4. Procesamiento de Fotos en la Bóveda Privada (boveda_biometrica)
    let urlDniFrente = firma.url_dni_frente_privado;
    let urlDniDorso = firma.url_dni_dorso_privado;
    let urlSelfie = firma.url_selfie_privado;

    const apiKey = (process.env.DIDIT_API_KEY || '').trim();

    // Helper para descargar imagen externa y subirla al bucket privado de Supabase
    async function guardarEnBoveda(imageUrlOrBase64, filenameSuffix) {
      if (!imageUrlOrBase64) return null;
      try {
        let buffer = null;
        let contentType = 'image/jpeg';

        if (imageUrlOrBase64.startsWith('data:')) {
          const parts = imageUrlOrBase64.split(';base64,');
          contentType = parts[0].split(':')[1] || 'image/jpeg';
          buffer = Buffer.from(parts[1], 'base64');
        } else if (imageUrlOrBase64.startsWith('http')) {
          const imgRes = await fetch(imageUrlOrBase64, {
            headers: apiKey ? { 'Authorization': `Bearer ${apiKey}`, 'x-api-key': apiKey } : {}
          });
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          }
        }

        if (buffer) {
          const filePath = `contrato_${contractId}/firma_${firmaId}_${filenameSuffix}.jpg`;
          const { error: uploadErr } = await supabase.storage
            .from('boveda_biometrica')
            .upload(filePath, buffer, {
              contentType: contentType,
              upsert: true
            });

          if (!uploadErr) {
            return filePath;
          } else {
            console.error('[Error subiendo a boveda_biometrica]:', uploadErr);
          }
        }
      } catch (err) {
        console.warn(`[Error procesando imagen ${filenameSuffix}]:`, err);
      }
      return null;
    }

    // Extraer URLs de imágenes provistas por Didit en el payload o features
    const rawFrontImg = decision?.document?.front_image || features?.document?.front_image || body?.images?.front;
    const rawBackImg = decision?.document?.back_image || features?.document?.back_image || body?.images?.back;
    const rawSelfieImg = decision?.liveness?.selfie_image || features?.liveness?.selfie_image || body?.images?.selfie;

    if (rawFrontImg) urlDniFrente = await guardarEnBoveda(rawFrontImg, 'dni_frente');
    if (rawBackImg) urlDniDorso = await guardarEnBoveda(rawBackImg, 'dni_dorso');
    if (rawSelfieImg) urlSelfie = await guardarEnBoveda(rawSelfieImg, 'selfie');

    // 5. Determinar nuevo estado de la firma
    const nuevoEstadoFirma = isApproved ? 'biometria_aprobada' : (isDeclined ? 'biometria_rechazada' : 'biometria_pendiente');

    // 6. Actualizar Firma_contrato en la base de datos
    const { error: updateErr } = await supabase
      .from('Firma_contrato')
      .update({
        estado_firma: nuevoEstadoFirma,
        didit_status: rawStatus.toUpperCase(),
        didit_scores: diditScores,
        url_dni_frente_privado: urlDniFrente || `boveda_biometrica/contrato_${contractId}/firma_${firmaId}_dni_frente.ref`,
        url_dni_dorso_privado: urlDniDorso || `boveda_biometrica/contrato_${contractId}/firma_${firmaId}_dni_dorso.ref`,
        url_selfie_privado: urlSelfie || `boveda_biometrica/contrato_${contractId}/firma_${firmaId}_selfie.ref`
      })
      .eq('id_firma', firmaId);

    if (updateErr) {
      console.error('[Error actualizando Firma_contrato en Webhook]:', updateErr);
      return res.status(500).json({ ok: false, error: 'Database update error' });
    }

    console.log(`[Didit Signature Webhook Success] Firma ID ${firmaId} actualizada a: ${nuevoEstadoFirma}`);

    return res.status(200).json({
      ok: true,
      message: `Firma ID ${firmaId} actualizada exitosamente a ${nuevoEstadoFirma}.`,
      firma_id: firmaId,
      estado_firma: nuevoEstadoFirma
    });

  } catch (error) {
    console.error('[Server Error in /api/firmas/webhook-didit]:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
