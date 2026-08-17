import dotenv from 'dotenv';
dotenv.config();

/**
 * Vercel Serverless Function: /api/create-session
 * 
 * Inicia una sesión de verificación de identidad (KYC / Liveness Biometrics) en Didit.
 * 
 * Requisitos de entorno (Vercel / .env):
 * - DIDIT_API_KEY: Clave API de Didit
 * - DIDIT_WORKFLOW_ID_SIGNATURE / DIDIT_SIGNATURE_WORKFLOW_ID: ID del flujo de Solo Biometría (Liveness Check)
 * - DIDIT_WORKFLOW_ID: ID del flujo de Pasaporte / Onboarding (DNI + Biometría)
 * - DIDIT_CALLBACK_URL (Opcional): URL a la que Didit redirigirá al usuario tras finalizar
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
  // Manejar CORS y Preflight OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Didit-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar método HTTP (Únicamente acepta POST)
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Únicamente se permiten peticiones HTTP POST.'
    });
  }

  try {
    // 2. Extraer parámetros del body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { userId, callbackUrl, workflowId, isLivenessOnly, flow } = body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El parámetro "userId" es requerido para vincular la sesión de Didit.'
      });
    }

    const isSignatureFlow = isLivenessOnly || flow === 'signature' || flow === 'contract_signature';

    // 3. Obtener credenciales de variables de entorno
    const apiKey = (process.env.DIDIT_API_KEY || '').trim();
    const signatureWf = (process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || '').trim();
    const defaultPassportWf = (process.env.DIDIT_WORKFLOW_ID || '').trim();

    // Seleccionar workflow apropiado según si es firma biométrica o pasaporte completo
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

    // 4. Preparar payload para Didit API (Estricto según Didit v3)
    const vendorData = typeof userId === 'object' ? JSON.stringify(userId) : String(userId);
    const payload = {
      workflow_id: activeWorkflowId,
      vendor_data: vendorData,
    };

    if (body.portraitImage || body.portrait_image) {
      const raw = body.portraitImage || body.portrait_image;
      payload.portrait_image = typeof raw === 'string' ? raw.replace(/^data:image\/[a-z0-9.+]+;base64,/i, '').trim() : raw;
    }

    // Solo incluir callback si es una URL válida y no es placeholder
    if (defaultCallbackUrl && defaultCallbackUrl.startsWith('http') && !defaultCallbackUrl.includes('tu-dominio.vercel.app')) {
      payload.callback = defaultCallbackUrl;
    }

    console.log('[Didit API Request Payload]:', JSON.stringify({ ...payload, isSignatureFlow }));

    // 5. Llamada HTTP POST a Didit API (v3)
    let response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Si falló por callback o estructura en v3, reintentar con payload mínimo (workflow_id + vendor_data)
    if (!response.ok && payload.callback) {
      console.log('[Didit API] Reintentando sesión Didit v3 con payload mínimo...');
      response = await fetch('https://verification.didit.me/v3/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          workflow_id: activeWorkflowId,
          vendor_data: vendorData
        })
      });
    }

    // Fallback a v1 si responde 404
    if (response.status === 404) {
      console.log('[Didit API] Fallback a endpoint v1...');
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

    // Si Didit indica que no hay rostro previo guardado (ej: Propietario o Corredor nuevo que nunca hizo KYC),
    // hacer fallback automático al Workflow de Verificación Inicial (DNI + Biometría)
    if (!response.ok && (JSON.stringify(data).includes('portrait_image') || JSON.stringify(data).includes('No stored face')) && defaultPassportWf && isConfiguredWorkflowId(defaultPassportWf) && activeWorkflowId !== defaultPassportWf) {
      console.log(`[Didit API] Firmante sin verificación previa registrada. Redirigiendo automáticamente a Workflow de Onboarding Inicial (${defaultPassportWf})...`);
      response = await fetch('https://verification.didit.me/v3/session/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          workflow_id: defaultPassportWf,
          vendor_data: vendorData
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

    // 6. Extraer la URL de la sesión de Didit
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
