import dotenv from 'dotenv';
import { setCorsHeaders, getAuthenticatedUser, sendUnauthorized } from './_auth.js';
dotenv.config();

/**
 * Vercel Serverless Function: /api/create-session
 * Inicia una sesión de verificación de identidad (KYC / Liveness Biometrics) en Didit.
 */

function isConfiguredWorkflowId(wfId) {
  if (!wfId || typeof wfId !== 'string') return false;
  const clean = wfId.trim();
  if (!clean || clean.startsWith('TU_WORKFLOW') || clean.includes('TU_WORKFLOW') || clean === 'YOUR_WORKFLOW_ID') {
    return false;
  }
  return clean.length >= 6;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Únicamente se permiten peticiones HTTP POST.'
    });
  }

  // 1. Validar autenticación
  const { user, profile, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return sendUnauthorized(res, `Autenticación requerida para crear sesión de verificación: ${authError || 'Sesión no válida'}`);
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { callbackUrl, workflowId, isLivenessOnly, flow } = body;

    // Vincular vendor_data al usuario autenticado verificado
    const verifiedUserId = (profile && profile.id_perfil) ? String(profile.id_perfil) : user.id;

    const isSignatureFlow = isLivenessOnly || flow === 'signature' || flow === 'contract_signature';

    const apiKey = (process.env.DIDIT_API_KEY || '').trim();
    const signatureWf = (process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || '').trim();
    const defaultPassportWf = (process.env.DIDIT_WORKFLOW_ID || '').trim();

    const validSignatureWf = isConfiguredWorkflowId(signatureWf) ? signatureWf : null;
    const validPassportWf = isConfiguredWorkflowId(defaultPassportWf) ? defaultPassportWf : null;
    
    let activeWorkflowId = (isConfiguredWorkflowId(workflowId) ? workflowId : null) ||
      (isSignatureFlow ? (validSignatureWf || validPassportWf) : (validPassportWf || validSignatureWf)) ||
      validSignatureWf ||
      validPassportWf ||
      '';
    const defaultCallbackUrl = (callbackUrl || process.env.DIDIT_CALLBACK_URL || '').trim();

    const isApiKeyConfigured = Boolean(apiKey && !apiKey.startsWith('TU_API_KEY') && apiKey.length > 10);
    const isWfConfigured = isConfiguredWorkflowId(activeWorkflowId);

    if (!isApiKeyConfigured || !isWfConfigured) {
      console.warn(`[Didit Create-Session] Configuración incompleta. ApiKey: ${isApiKeyConfigured}, WorkflowId: "${activeWorkflowId}"`);
      return res.status(400).json({
        error: 'Didit Configuration Incomplete',
        message: `No se encontró un Workflow ID válido configurado en DIDIT_WORKFLOW_ID_SIGNATURE o DIDIT_WORKFLOW_ID (${activeWorkflowId || 'Vacío'}).`
      });
    }

    const payload = {
      workflow_id: activeWorkflowId,
      vendor_data: verifiedUserId,
    };

    if (body.portraitImage || body.portrait_image) {
      const raw = body.portraitImage || body.portrait_image;
      payload.portrait_image = typeof raw === 'string' ? raw.replace(/^data:image\/[a-z0-9.+]+;base64,/i, '').trim() : raw;
    }

    if (defaultCallbackUrl && defaultCallbackUrl.startsWith('http') && !defaultCallbackUrl.includes('tu-dominio.vercel.app')) {
      payload.callback = defaultCallbackUrl;
    }

    // Llamada HTTP POST a Didit API (v3)
    let response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok && payload.callback) {
      response = await fetch('https://verification.didit.me/v3/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          workflow_id: activeWorkflowId,
          vendor_data: verifiedUserId
        })
      });
    }

    if (response.status === 404) {
      response = await fetch('https://api.didit.me/v1/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
    }

    let data = await response.json().catch(() => ({}));

    if (!response.ok && (JSON.stringify(data).includes('portrait_image') || JSON.stringify(data).includes('No stored face')) && defaultPassportWf && isConfiguredWorkflowId(defaultPassportWf) && activeWorkflowId !== defaultPassportWf) {
      response = await fetch('https://verification.didit.me/v3/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          workflow_id: defaultPassportWf,
          vendor_data: verifiedUserId
        })
      });
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      const detailStr = typeof data === 'object' 
        ? (data.message || data.detail || data.error || JSON.stringify(data)) 
        : String(data);
        
      return res.status(response.status).json({
        error: 'Didit API Request Failed',
        message: `Didit API Error (Status ${response.status}): ${detailStr}`,
        details: data
      });
    }

    const sessionUrl = data.url || data.session_url || data.verification_url;

    if (!sessionUrl) {
      return res.status(500).json({
        error: 'Didit API Response Missing URL',
        message: 'Didit no devolvió una URL válida de sesión.',
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      url: sessionUrl,
      sessionId: data.session_id || data.id,
      workflowType: isSignatureFlow ? 'liveness_biometrics' : 'passport_full',
      diditResponse: data
    });

  } catch (error) {
    console.error('[Serverless Exception] /api/create-session:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Error inesperado al crear la sesión en Didit.'
    });
  }
}
