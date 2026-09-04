import crypto from 'crypto';
import { getSupabaseAdmin } from './_auth.js';

const DIDIT_WEBHOOK_SECRET = process.env.DIDIT_WEBHOOK_SECRET || '';

// Validar firma HMAC de Didit
function verifyDiditSignature(req, rawPayload) {
  if (!DIDIT_WEBHOOK_SECRET) {
    console.warn('[Didit Webhook] DIDIT_WEBHOOK_SECRET no configurada. Configure la variable en Vercel para seguridad total.');
    return process.env.NODE_ENV !== 'production';
  }
  const signature = req.headers['x-didit-signature'] || req.headers['x-signature'] || req.headers['webhook-signature'];
  if (!signature) return false;

  try {
    const stringBody = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);
    const expected = crypto.createHmac('sha256', DIDIT_WEBHOOK_SECRET).update(stringBody).digest('hex');
    const signatureClean = String(signature).replace(/^sha256=/, '').trim();

    if (signatureClean.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signatureClean, 'utf8'), Buffer.from(expected, 'utf8'));
  } catch (e) {
    return false;
  }
}

export default async function handler(req, res) {
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

    // Validación de firma criptográfica
    if (!verifyDiditSignature(req, req.body)) {
      console.warn('[Didit Webhook] Firma HMAC no válida o ausente.');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma de autenticación de webhook inválida.'
      });
    }

    const {
      event,
      type,
      session_id,
      vendor_data,
      status,
      decision,
      workflow_id
    } = body;

    const eventType = event || type || 'status.updated';
    const currentStatus = status || (decision ? decision.status : 'Unknown');
    const userId = vendor_data;

    console.log(`[Didit Webhook] Evento: ${eventType} | Usuario: ${userId} | Sesión: ${session_id} | Estado: ${currentStatus}`);

    const supabase = getSupabaseAdmin();

    if (supabase && userId) {
      // Caso A: Evento de Firma de Contrato
      if (String(userId).startsWith('ctr_') || String(userId).startsWith('contract_') || (workflow_id && workflow_id === process.env.DIDIT_WORKFLOW_ID_SIGNATURE)) {
        console.log(`[Didit Webhook] Procesando firma de contrato para: ${userId}`);
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
      // Caso B: Evento de Garante KYC (vendor_data: 'garante_123')
      else if (String(userId).startsWith('garante_')) {
        const idGarante = Number(String(userId).replace('garante_', ''));
        console.log(`[Didit Webhook] Procesando KYC para Garante ID: ${idGarante}`);

        const { data: garante } = await supabase
          .from('Garante')
          .select('*')
          .eq('id_garante', idGarante)
          .maybeSingle();

        if (garante) {
          const ocr = body.extracted_data || body.document || body.ocr || (body.decision && body.decision.document) || {};
          const ocrFirst = ocr.first_name || ocr.firstName || body.first_name || '';
          const ocrLast = ocr.last_name || ocr.lastName || body.last_name || '';
          const ocrFullName = ocr.full_name || ocr.fullName || (ocrFirst && ocrLast ? `${ocrFirst} ${ocrLast}`.trim() : (ocrFirst || ocrLast || null));
          const ocrDni = ocr.document_number || ocr.documentNumber || ocr.id_number || body.document_number || null;

          const isApproved = currentStatus.toLowerCase() === 'approved' || currentStatus.toLowerCase() === 'success';
          const isDeclined = currentStatus.toLowerCase() === 'declined' || currentStatus.toLowerCase() === 'failed' || currentStatus.toLowerCase() === 'rejected';

          const updateGarante = {
            kyc_verificado: isApproved,
            didit_session_id: session_id,
            updated_at: new Date().toISOString()
          };

          if (ocrFullName) updateGarante.nombre_completo = ocrFullName;
          if (ocrDni) updateGarante.dni = ocrDni;

          if (isApproved) {
            if (garante.id_estado_garante < 4) {
              updateGarante.id_estado_garante = 4; // Documentación Subida / KYC Aprobado
            }

            // Generar o vincular Pasaporte Vivat para el Garante
            if (!garante.id_pasaporte_garante) {
              const passCode = 'HBT-GAR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000) + '-X9';
              const now = new Date();
              const exp = new Date(now.getTime() + (60 * 24 * 60 * 60 * 1000));

              let profileIdToUse = garante.id_perfil;
              if (!profileIdToUse) {
                const { data: tenantPass } = await supabase
                  .from('Pasaporte_vivat')
                  .select('id_perfil')
                  .eq('id_pasaporte', garante.id_pasaporte)
                  .maybeSingle();
                profileIdToUse = tenantPass?.id_perfil || 1;
              }

              const { data: newPass } = await supabase
                .from('Pasaporte_vivat')
                .insert([{
                  id_perfil: profileIdToUse,
                  id_estado_pasaporte: 3, // Activo
                  codigo_pasaporte: passCode,
                  monto_pagado: 0.00,
                  fecha_emision: now.toISOString(),
                  fecha_vencimiento: exp.toISOString(),
                  dni: ocrDni || garante.dni,
                  razon_social: ocrFullName || garante.nombre_completo,
                  condicion_fiscal: 'Garante Verificado',
                  situacion_crediticia: 'Situación 1 (Normal)',
                  antecedentes_legales: true
                }])
                .select()
                .single();

              if (newPass) {
                updateGarante.id_pasaporte_garante = newPass.id_pasaporte;
              }
            }
          } else if (isDeclined) {
            updateGarante.id_estado_garante = 7; // Rechazado
            updateGarante.motivo_rechazo = 'Verificación biométrica Didit KYC rechazada.';
          }

          await supabase.from('Garante').update(updateGarante).eq('id_garante', idGarante);

          // Registrar en Verificacion_kyc
          await supabase.from('Verificacion_kyc').insert([{
            id_garante: idGarante,
            id_pasaporte: garante.id_pasaporte_garante || garante.id_pasaporte,
            proveedor: 'didit',
            session_id: session_id || 'sess_' + Date.now(),
            status: currentStatus,
            payload_raw: body
          }]);
        }
      }
      // Caso C: Evento de Pasaporte Vivat KYC (Inquilino)
      else {
        // Buscar perfil por id_perfil (numérico) o por user_id (UUID)
        let perfilQuery = supabase.from('Perfil').select('id_perfil');
        if (!isNaN(Number(userId)) && Number(userId) > 0) {
          perfilQuery = perfilQuery.eq('id_perfil', Number(userId));
        } else {
          perfilQuery = perfilQuery.eq('user_id', String(userId));
        }
        
        const { data: perfil } = await perfilQuery.maybeSingle();

        if (perfil) {
          const { data: pasaporte } = await supabase
            .from('Pasaporte_vivat')
            .select('id_pasaporte')
            .eq('id_perfil', perfil.id_perfil)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (pasaporte) {
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
              const pasaporteUpdate = { 
                id_estado_pasaporte: nuevoEstadoPasaporte, 
                updated_at: new Date().toISOString() 
              };
              if (ocrFullName) pasaporteUpdate.razon_social = ocrFullName;
              if (ocrDni) pasaporteUpdate.dni = ocrDni;
              if (ocrIsoDob) pasaporteUpdate.fecha_nacimiento = ocrIsoDob;
              if (ocrAge) pasaporteUpdate.edad = ocrAge;

              await supabase
                .from('Pasaporte_vivat')
                .update(pasaporteUpdate)
                .eq('id_pasaporte', pasaporte.id_pasaporte);

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
