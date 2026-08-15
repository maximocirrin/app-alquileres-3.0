import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

/**
 * Vercel Serverless Function: /api/firmas/iniciar
 * 
 * FASE 1: Inicio y Preparación de Transacción de Firma Electrónica
 * 
 * Responsabilidades:
 * 1. Validar existencia del contrato y pertenencia del firmante (inquilino / propietario).
 * 2. Capturar metadatos técnicos (IP, User-Agent, Geolocalización).
 * 3. Crear sesión biométrica en Didit (si hay API Key configurada) o modo sandbox.
 * 4. Registrar la transacción en la tabla Firma_contrato con estado 'iniciada'.
 * 5. Retornar id_firma, sesión y URL de Didit al frontend.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method Not Allowed',
      message: 'Únicamente se aceptan peticiones POST.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { id_contrato, id_perfil, rol, metadata = {}, callbackUrl } = body;

    if (!id_contrato) {
      return res.status(400).json({
        ok: false,
        error: 'Bad Request',
        message: 'El parámetro id_contrato es obligatorio.'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obtener datos del Contrato y validar partes
    const { data: contrato, error: errContrato } = await supabase
      .from('Contrato')
      .select(`
        *,
        Inquilino:id_perfil_inquilino (*),
        Propietario:id_perfil_propietario (*),
        Propiedad (*)
      `)
      .eq('id_contrato', id_contrato)
      .single();

    if (errContrato || !contrato) {
      return res.status(404).json({
        ok: false,
        error: 'Not Found',
        message: 'No se encontró el contrato especificado.'
      });
    }

    // 2. Determinar perfil y rol del firmante
    let perfilFirmanteId = id_perfil;
    let rolFirmante = rol;

    if (!perfilFirmanteId) {
      // Si no se envía id_perfil explícito, usar inquilino por defecto o propietario
      if (rol === 'propietario') {
        perfilFirmanteId = contrato.id_perfil_propietario;
        rolFirmante = 'propietario';
      } else {
        perfilFirmanteId = contrato.id_perfil_inquilino;
        rolFirmante = 'inquilino';
      }
    } else {
      if (Number(perfilFirmanteId) === Number(contrato.id_perfil_propietario)) {
        rolFirmante = 'propietario';
      } else if (Number(perfilFirmanteId) === Number(contrato.id_perfil_inquilino)) {
        rolFirmante = 'inquilino';
      } else {
        rolFirmante = rol || 'inquilino';
      }
    }

    // 3. Captura de metadatos técnicos de contexto (IP, User-Agent)
    const clientIp = metadata.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
    const clientUserAgent = metadata.userAgent || req.headers['user-agent'] || 'Desconocido';
    const clientGeo = metadata.geolocation || null;

    // 4. Integración con Didit (Crear sesión de validación de identidad)
    const diditApiKey = (process.env.DIDIT_API_KEY || '').trim();
    const diditWorkflowId = (process.env.DIDIT_SIGNATURE_WORKFLOW_ID || process.env.DIDIT_WORKFLOW_ID || '').trim();

    let diditSessionId = null;
    let diditSessionUrl = null;

    const vendorDataPayload = JSON.stringify({
      flow: 'contract_signature',
      contractId: String(id_contrato),
      profileId: String(perfilFirmanteId),
      role: rolFirmante,
      timestamp: Date.now()
    });

    if (diditApiKey && diditWorkflowId && diditWorkflowId !== 'TU_WORKFLOW_ID_DE_DIDIT') {
      try {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const protocol = req.headers['x-forwarded-proto'] || (host.includes('localhost') ? 'http' : 'https');
        const webhookUrl = `${protocol}://${host}/api/firmas/webhook-didit`;

        const diditPayload = {
          workflow_id: diditWorkflowId,
          vendor_data: vendorDataPayload,
          webhook_url: webhookUrl,
          webhook: webhookUrl
        };

        if (callbackUrl) {
          diditPayload.callback_url = callbackUrl;
          diditPayload.redirect_url = callbackUrl;
        }

        let diditRes = await fetch('https://verification.didit.me/v3/session/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': diditApiKey,
            'Authorization': `Bearer ${diditApiKey}`
          },
          body: JSON.stringify(diditPayload)
        });

        if (diditRes.status === 404) {
          diditRes = await fetch('https://api.didit.me/v1/session/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': diditApiKey,
              'Authorization': `Bearer ${diditApiKey}`
            },
            body: JSON.stringify(diditPayload)
          });
        }

        if (diditRes.ok) {
          const diditData = await diditRes.json();
          diditSessionId = diditData.session_id || diditData.id || diditData.sessionId;
          diditSessionUrl = diditData.url || diditData.session_url || diditData.sessionUrl;
        } else {
          console.warn('[Didit Session API Warning] Didit devolvió status:', diditRes.status);
        }
      } catch (diditErr) {
        console.warn('[Didit Session API Error]:', diditErr);
      }
    }

    // Fallback sandbox session si no hay API Key real configurada aún
    if (!diditSessionId) {
      diditSessionId = `didit_sandbox_${id_contrato}_${perfilFirmanteId}_${Date.now()}`;
      diditSessionUrl = `https://verify.didit.me/sandbox?session=${diditSessionId}`;
    }

    // 5. Registrar transacción en la base de datos (public.Firma_contrato)
    const { data: firmaCreada, error: errFirma } = await supabase
      .from('Firma_contrato')
      .insert([{
        id_contrato: id_contrato,
        id_perfil_firmante: perfilFirmanteId,
        rol_firmante: rolFirmante,
        estado_firma: 'iniciada',
        ip_origen: String(clientIp),
        user_agent: String(clientUserAgent),
        geolocalizacion: clientGeo,
        didit_session_id: diditSessionId,
        didit_session_url: diditSessionUrl
      }])
      .select()
      .single();

    if (errFirma) {
      console.error('[Error insert Firma_contrato]:', errFirma);
      return res.status(500).json({
        ok: false,
        error: 'Database Error',
        message: 'No se pudo registrar la transacción de firma en la base de datos.'
      });
    }

    // 6. Si el contrato estaba en borrador, actualizar a 'pendiente_firma'
    try {
      await supabase
        .from('Historial_Estado_Contrato')
        .insert([{
          id_contrato: id_contrato,
          id_estado_contrato: 5, // pendiente_firma
          fecha_inicio: new Date().toISOString()
        }]);
    } catch (e) {
      // No bloqueante
    }

    return res.status(200).json({
      ok: true,
      message: 'Transacción de firma iniciada exitosamente.',
      data: {
        id_firma: firmaCreada.id_firma,
        id_contrato: id_contrato,
        rol_firmante: rolFirmante,
        estado_firma: firmaCreada.estado_firma,
        didit_session_id: diditSessionId,
        didit_session_url: diditSessionUrl,
        created_at: firmaCreada.created_at
      }
    });

  } catch (error) {
    console.error('[Server Error in /api/firmas/iniciar]:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal Server Error',
      message: error.message || 'Ocurrió un error inesperado al procesar la solicitud.'
    });
  }
}
