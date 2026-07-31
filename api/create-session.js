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
    const apiKey = process.env.DIDIT_API_KEY;
    const activeWorkflowId = workflowId || process.env.DIDIT_WORKFLOW_ID;
    const defaultCallbackUrl = callbackUrl || process.env.DIDIT_CALLBACK_URL;

    if (!apiKey) {
      console.error('[Didit API Error] DIDIT_API_KEY no está configurada.');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Falta la configuración del API Key de Didit en el servidor.'
      });
    }

    if (!activeWorkflowId) {
      console.error('[Didit API Error] DIDIT_WORKFLOW_ID no está configurada.');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Falta la configuración del Workflow ID de Didit en el servidor.'
      });
    }

    // 4. Preparar payload para Didit API
    const payload = {
      workflow_id: activeWorkflowId,
      vendor_data: String(userId),
    };

    if (defaultCallbackUrl) {
      payload.callback_url = defaultCallbackUrl;
    }

    // 5. Llamada HTTP POST a Didit API (https://api.didit.me/v1/session/)
    const response = await fetch('https://api.didit.me/v1/session/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Didit API Error Details]:', data);
      return res.status(response.status).json({
        error: 'Didit API Request Failed',
        details: data
      });
    }

    // 6. Retornar la respuesta JSON con la URL de la sesión
    const sessionUrl = data.url || data.session_url;

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
