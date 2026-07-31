/**
 * Vercel Serverless Function: /api/webhook
 * 
 * Recibe las notificaciones HTTP POST enviadas por Didit al completar,
 * aprobar, rechazar o actualizar una verificación de identidad (KYC).
 */

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Didit-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar método HTTP (Únicamente acepta POST)
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'El webhook únicamente acepta peticiones HTTP POST.'
    });
  }

  try {
    // 2. Extraer datos del evento enviado por Didit
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    // Didit suele enviar status / decision, session_id, vendor_data (userId)
    const {
      session_id,
      vendor_data,
      status,
      decision,
      workflow_id,
      created_at
    } = body;

    const currentStatus = status || (decision ? decision.status : 'Unknown');
    const userId = vendor_data;

    console.log(`[Didit Webhook] Evento recibido para Usuario: ${userId} | Sesión: ${session_id} | Estado: ${currentStatus}`);
    console.log('[Didit Webhook Payload Completo]:', JSON.stringify(body, null, 2));

    // 3. Lógica según el estado del KYC (Approved, Declined, In Review, etc.)
    switch (currentStatus.toLowerCase()) {
      case 'approved':
        console.log(`✅ KYC Aprobado para el usuario: ${userId}`);
        // TODO: Aquí puedes actualizar la base de datos (Ej: Supabase) indicando verificado = true
        break;

      case 'declined':
      case 'rejected':
        console.log(`❌ KYC Rechazado para el usuario: ${userId}`);
        // TODO: Actualizar estado de verificación como rechazado
        break;

      case 'in_review':
      case 'pending':
        console.log(`⏳ KYC En Revisión para el usuario: ${userId}`);
        break;

      default:
        console.log(`ℹ️ Estado no mapeado (${currentStatus}) para usuario: ${userId}`);
        break;
    }

    // 4. Responder con HTTP 200 OK para confirmar la recepción exitosa a Didit
    return res.status(200).json({
      received: true,
      sessionId: session_id,
      userId: userId,
      status: currentStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Serverless Exception] /api/webhook:', error);
    // En webhooks, responder con 200 o 500 según corresponda. Retornamos 500 si hubo error al procesar.
    return res.status(500).json({
      error: 'Webhook Handler Error',
      message: error.message || 'Error al procesar el webhook de Didit.'
    });
  }
}
