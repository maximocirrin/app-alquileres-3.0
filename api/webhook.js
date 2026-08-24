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
      // Caso A: Evento de Firma de Contrato
      if (String(userId).startsWith('ctr_') || String(userId).startsWith('contract_') || (workflow_id && workflow_id === process.env.DIDIT_WORKFLOW_ID_SIGNATURE)) {
        console.log(`[Didit Webhook] Procesando firma de contrato para: ${userId}`);
        // Registrar auditoría de firma si aplica en Supabase
        try {
          await supabase.from('Auditoria_firma_didit').insert([{
            identificador: userId,
            session_id: session_id,
            status: currentStatus,
            workflow_id: workflow_id,
            payload: body,
            created_at: new Date().toISOString()
          }]);
        } catch (auditErr) {
          console.warn('[Didit Webhook] Tabla Auditoria_firma_didit opcional:', auditErr.message);
        }
      } 
      // Caso B: Evento de Pasaporte Hábitat KYC
      else {
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

            // Extraer datos OCR del documento escaneado por Didit
            const ocr = body.extracted_data || body.document || body.ocr || (body.decision && body.decision.document) || {};
            const ocrFirst = ocr.first_name || ocr.firstName || body.first_name || '';
            const ocrLast = ocr.last_name || ocr.lastName || body.last_name || '';
            const ocrFullName = ocr.full_name || ocr.fullName || (ocrFirst && ocrLast ? `${ocrFirst} ${ocrLast}`.trim() : (ocrFirst || ocrLast || null));
            const ocrDni = ocr.document_number || ocr.documentNumber || ocr.id_number || body.document_number || null;
            const ocrDob = ocr.date_of_birth || ocr.dateOfBirth || ocr.dob || ocr.birth_date || ocr.fecha_nacimiento || body.date_of_birth || null;
            
            let ocrAge = null;
            let ocrIsoDob = null;
            if (ocrDob) {
              try {
                let d = null;
                if (ocrDob instanceof Date && !isNaN(ocrDob.getTime())) {
                  d = ocrDob;
                } else if (typeof ocrDob === 'string') {
                  const sDob = ocrDob.trim();
                  if (sDob.includes('/')) {
                    const parts = sDob.split('/');
                    if (parts.length === 3) {
                      if (parts[0].length === 4) d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      else d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    }
                  } else if (sDob.includes('-')) {
                    const parts = sDob.split('-');
                    if (parts.length === 3) {
                      if (parts[0].length === 4) d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                      else d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                    }
                  } else {
                    d = new Date(sDob);
                  }
                }
                if (d && !isNaN(d.getTime())) {
                  const y = d.getFullYear();
                  const m = d.getMonth() + 1;
                  const day = d.getDate();
                  ocrIsoDob = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                  const today = new Date();
                  let age = today.getFullYear() - y;
                  const monthDiff = today.getMonth() - d.getMonth();
                  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
                    age--;
                  }
                  if (age >= 16 && age <= 120) ocrAge = age;
                }
              } catch (eAge) {}
            }
            if (!ocrAge && (ocr.age || ocr.edad || body.age || body.edad)) {
              const explicit = ocr.age || ocr.edad || body.age || body.edad;
              if (!isNaN(Number(explicit))) ocrAge = parseInt(explicit, 10);
            }

            switch (currentStatus.toLowerCase()) {
              case 'approved':
                nuevoEstadoPasaporte = 3; // Activo
                observacionHistorial = 'Verificación biométrica Didit KYC Aprobada exitosamente.';
                // Marcar cuenta como verificada en Perfil y actualizar nombre/DNI/edad de Didit OCR
                const perfilUpdate = { 
                  cuenta_verificada: true, 
                  fecha_verificacion: new Date().toISOString() 
                };
                if (ocrFullName) perfilUpdate.nombre_completo = ocrFullName;
                if (ocrDni) perfilUpdate.dni = ocrDni;
                if (ocrIsoDob) perfilUpdate.fecha_nacimiento = ocrIsoDob;
                if (ocrAge) perfilUpdate.edad = ocrAge;

                await supabase
                  .from('Perfil')
                  .update(perfilUpdate)
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
              // Actualizar estado en Pasaporte_habitat con datos OCR de Didit
              const pasaporteUpdate = { 
                id_estado_pasaporte: nuevoEstadoPasaporte, 
                updated_at: new Date().toISOString() 
              };
              if (ocrFullName) pasaporteUpdate.razon_social = ocrFullName;
              if (ocrDni) pasaporteUpdate.dni = ocrDni;
              if (ocrIsoDob) pasaporteUpdate.fecha_nacimiento = ocrIsoDob;
              if (ocrAge) pasaporteUpdate.edad = ocrAge;

              await supabase
                .from('Pasaporte_habitat')
                .update(pasaporteUpdate)
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
