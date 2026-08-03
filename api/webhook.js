import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

export default async function handler(req, res) {
  // Configuración de cabeceras CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Didit-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'El webhook únicamente acepta peticiones HTTP POST.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    
    const {
      event,
      type,
      session_id,
      vendor_data,
      status,
      decision,
      workflow_id,
      created_at
    } = body;

    const eventType = event || type || 'status.updated';
    const currentStatus = status || (decision ? decision.status : 'Unknown');
    const userId = vendor_data;

    console.log(`[Didit Webhook] Evento: ${eventType} | Usuario: ${userId} | Sesión: ${session_id} | Estado: ${currentStatus}`);

    // Inicializar Supabase Client si las credenciales están presentes
    let supabase = null;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }

    if (supabase && userId) {
      // 1. Obtener el Perfil del usuario
      const { data: perfil } = await supabase
        .from('Perfil')
        .select('id_perfil')
        .eq('user_id', userId)
        .maybeSingle();

      if (perfil) {
        // 2. Obtener el último Pasaporte_habitat
        const { data: pasaporte } = await supabase
          .from('Pasaporte_habitat')
          .select('id_pasaporte')
          .eq('id_perfil', perfil.id_perfil)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pasaporte) {
          // 3. Registrar el intento en Verificacion_kyc
          await supabase
            .from('Verificacion_kyc')
            .insert([{
              id_pasaporte: pasaporte.id_pasaporte,
              proveedor: 'didit',
              session_id: session_id || 'sess_' + Date.now(),
              status: currentStatus,
              payload_raw: body
            }]);

          let nuevoEstadoPasaporte = null;
          let observacionHistorial = '';

          switch (currentStatus.toLowerCase()) {
            case 'approved':
              nuevoEstadoPasaporte = 3; // Activo
              observacionHistorial = 'Verificación biométrica Didit KYC Aprobada exitosamente.';
              // Marcar cuenta como verificada en Perfil
              await supabase
                .from('Perfil')
                .update({ cuenta_verificada: true, fecha_verificacion: new Date().toISOString() })
                .eq('id_perfil', perfil.id_perfil);
              break;

            case 'declined':
            case 'rejected':
              nuevoEstadoPasaporte = 5; // Rechazado
              observacionHistorial = 'Verificación biométrica Didit KYC Rechazada.';
              break;

            case 'in_review':
            case 'pending':
              nuevoEstadoPasaporte = 2; // En Revisión KYC
              observacionHistorial = 'Verificación biométrica Didit KYC en proceso de revisión.';
              break;
          }

          if (nuevoEstadoPasaporte) {
            // Actualizar estado en Pasaporte_habitat
            await supabase
              .from('Pasaporte_habitat')
              .update({ id_estado_pasaporte: nuevoEstadoPasaporte, updated_at: new Date().toISOString() })
              .eq('id_pasaporte', pasaporte.id_pasaporte);

            // Registrar en Historial_estado_pasaporte
            await supabase
              .from('Historial_estado_pasaporte')
              .insert([{
                id_pasaporte: pasaporte.id_pasaporte,
                id_estado_pasaporte: nuevoEstadoPasaporte,
                observacion: observacionHistorial
              }]);
          }
        }
      }
    }

    return res.status(200).json({
      received: true,
      sessionId: session_id,
      userId: userId,
      status: currentStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Serverless Exception] /api/webhook:', error);
    return res.status(500).json({
      error: 'Webhook Handler Error',
      message: error.message || 'Error al procesar el webhook de Didit.'
    });
  }
}
