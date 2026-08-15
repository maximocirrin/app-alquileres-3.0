/**
 * Vercel Serverless Function: /api/create-session
 * 
 * Inicia una sesión de verificación de identidad (KYC) en Didit.
 * 
 * Requisitos de entorno (Vercel / .env):
 * - DIDIT_API_KEY: Clave API de Didit
 * - DIDIT_WORKFLOW_ID: ID del flujo de trabajo configurado en el Dashboard de Didit
 * - DIDIT_CALLBACK_URL (Opcional): URL a la que Didit redirigirá al usuario tras finalizar
 */

export default async function handler(req, res) {
  // Manejar CORS y Preflight OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    const { userId, callbackUrl, workflowId } = body;

    if (!userId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'El parámetro "userId" es requerido para vincular la sesión de KYC.'
      });
    }

    // 3. Obtener credenciales de variables de entorno
    const apiKey = (process.env.DIDIT_API_KEY || '').trim();
    const activeWorkflowId = (workflowId || (body.isLivenessOnly ? process.env.DIDIT_WORKFLOW_ID_SIGNATURE : null) || process.env.DIDIT_WORKFLOW_ID || '').trim();
    const defaultCallbackUrl = (callbackUrl || process.env.DIDIT_CALLBACK_URL || '').trim();

    if (!apiKey) {
      console.error('[Didit API Error] DIDIT_API_KEY no está configurada en Vercel.');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Falta la configuración de DIDIT_API_KEY en las variables de entorno de Vercel.'
      });
    }

    if (!activeWorkflowId || activeWorkflowId === 'TU_WORKFLOW_ID_DE_DIDIT') {
      console.error('[Didit API Error] DIDIT_WORKFLOW_ID no configurado o tiene valor por defecto.');
      return res.status(400).json({
        error: 'Configuration Error',
        message: 'Debes configurar tu Workflow ID obtenido del Dashboard de Didit en las variables de entorno de Vercel.'
      });
    }

    // 4. Preparar payload para Didit API
    const payload = {
      workflow_id: activeWorkflowId,
      vendor_data: String(userId),
    };

    if (defaultCallbackUrl && defaultCallbackUrl.startsWith('http')) {
      payload.callback_url = defaultCallbackUrl;
      payload.redirect_url = defaultCallbackUrl;
      payload.return_url = defaultCallbackUrl;
      payload.callback = defaultCallbackUrl;
    }

    console.log('[Didit API Request Payload]:', JSON.stringify(payload));

    // 5. Llamada HTTP POST a Didit API (Probando v3 primero, con fallback a v1)
    let response = await fetch('https://verification.didit.me/v3/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    // Fallback a v1 si v3 responde 404
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

    const data = await response.json();

    if (!response.ok) {
      console.error('[Didit API Error Details]:', data);
      const detailStr = typeof data === 'object' 
        ? (data.message || data.detail || data.error || JSON.stringify(data)) 
        : String(data);
        
      return res.status(response.status).json({
        error: 'Didit API Request Failed',
        message: `Didit API Error (Status ${response.status}): ${detailStr}`,
        details: data
      });
    }

    // 6. Extraer la URL de la sesión de Didit (url, session_url, etc.)
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
