import dotenv from 'dotenv';
// import removed as generation is now fully handled in sellar.js
import { setCorsHeaders, getAuthenticatedUser, sendUnauthorized, sendForbidden, getSupabaseAdmin } from '../../api/_auth.js';
dotenv.config();

/**
 * FASE 4: Cierre, Verificación Bilateral, Activación del Contrato y Disponibilidad de Documentos
 */
export default async function finalizarHandler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Validar autenticación
  const { user, profile, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return sendUnauthorized(res, `Autenticación requerida para finalizar/consultar el contrato: ${authError || 'Sesión no válida'}`);
  }

  try {
    const isGet = req.method === 'GET';
    const params = isGet ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}));
    let idContrato = params.id_contrato || params.idContrato;

    if (!idContrato) {
      return res.status(400).json({
        ok: false,
        error: 'Bad Request',
        message: 'El parámetro id_contrato es obligatorio.'
      });
    }

    let numericContractId = Number(idContrato);
    if (isNaN(numericContractId)) {
      const parsed = parseInt(String(idContrato).replace(/\D/g, ''), 10);
      numericContractId = !isNaN(parsed) && parsed > 0 ? parsed : null;
    }

    if (!numericContractId) {
      return res.status(400).json({ ok: false, error: 'ID de contrato inválido.' });
    }

    const supabase = getSupabaseAdmin();

    // 2. Obtener el Contrato con sus partes
    const { data: contrato, error: errContrato } = await supabase
      .from('Contrato')
      .select(`
        *,
        Inquilino:id_perfil_inquilino (*),
        Propietario:id_perfil_propietario (*),
        Propiedad (*)
      `)
      .eq('id_contrato', numericContractId)
      .single();

    if (errContrato || !contrato) {
      return res.status(404).json({
        ok: false,
        error: 'Not Found',
        message: 'No se encontró el contrato especificado.'
      });
    }

    // 3. Validar que el usuario autenticado sea parte del contrato
    const userProfileId = profile ? profile.id_perfil : null;
    const isOwner = userProfileId && Number(userProfileId) === Number(contrato.id_perfil_propietario);
    const isTenant = userProfileId && Number(userProfileId) === Number(contrato.id_perfil_inquilino);

    if (!isOwner && !isTenant) {
      return sendForbidden(res, 'No tienes autorización para acceder a los documentos de este contrato.');
    }

    // 4. Obtener todas las firmas registradas para este contrato
    const { data: firmas, error: errFirmas } = await supabase
      .from('Firma_contrato')
      .select('*')
      .eq('id_contrato', numericContractId)
      .order('created_at', { ascending: true });

    if (errFirmas) {
      return res.status(500).json({
        ok: false,
        error: 'Database Error',
        message: 'Error al consultar las firmas del contrato.'
      });
    }

    const firmaInquilino = (firmas || []).find(f => 
      ['inquilino', 'tenant', 'TENANT', 'INQUILINO'].includes(f.rol_firmante) && 
      (f.estado_firma === 'sellada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED' || f.didit_status === 'Approved')
    );

    const firmaPropietario = (firmas || []).find(f => 
      ['propietario', 'owner', 'OWNER', 'PROPIETARIO'].includes(f.rol_firmante) && 
      (f.estado_firma === 'sellada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED' || f.didit_status === 'Approved')
    );

    const inquilinoFirmo = !!firmaInquilino;
    const propietarioFirmo = !!firmaPropietario;
    const ambasPartesFirmaron = inquilinoFirmo && propietarioFirmo;

    const fechaHoyArgentina = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    });

    // 5. Si ambas partes firmaron, activar el Contrato
    if (ambasPartesFirmaron) {
      await supabase
        .from('Firma_contrato')
        .update({ estado_firma: 'completada' })
        .eq('id_contrato', numericContractId)
        .in('estado_firma', ['sellada', 'biometria_aprobada', 'iniciada']);

      await supabase
        .from('Contrato')
        .update({ fecha_firma_contrato: fechaHoyArgentina })
        .eq('id_contrato', numericContractId);

      try {
        const { data: ultimoHistorial } = await supabase
          .from('Historial_Estado_Contrato')
          .select('*')
          .eq('id_contrato', numericContractId)
          .order('fecha_inicio', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!ultimoHistorial || ultimoHistorial.id_estado_contrato !== 1) { // 1 = activo
          if (ultimoHistorial) {
            await supabase
              .from('Historial_Estado_Contrato')
              .update({ fecha_fin: new Date().toISOString() })
              .eq('id_historial_contrato', ultimoHistorial.id_historial_contrato);
          }

          await supabase
            .from('Historial_Estado_Contrato')
            .insert([{
              id_contrato: numericContractId,
              id_estado_contrato: 1,
              fecha_inicio: new Date().toISOString()
            }]);
        }
      } catch (histErr) {
        console.warn('[Warning actualizando historial de contrato]:', histErr);
      }
    }

    // 6. El contrato PDF fue generado y almacenado durante la fase de sellado en sellar.js

    // 7. Generar URLs firmadas de descarga (vigencia reducida a 24 horas por seguridad)
    const documentosDescarga = {};

    async function obtenerUrlFirmada(bucket, ruta) {
      if (!ruta) return null;
      let cleanPath = ruta;
      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        const parts = cleanPath.split('/contratos_firmados/');
        if (parts.length > 1) {
          cleanPath = parts[1];
        } else {
          return cleanPath;
        }
      }
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(cleanPath, 60 * 60 * 24); // 24 horas
        return error ? null : data.signedUrl;
      } catch (e) {
        return null;
      }
    }

    const inqContractPath = firmaInquilino ? firmaInquilino.url_contrato_final_pdf : null;
    const propContractPath = firmaPropietario ? firmaPropietario.url_contrato_final_pdf : null;

    if (inqContractPath) {
      documentosDescarga.contrato_inquilino = await obtenerUrlFirmada('contratos_firmados', inqContractPath);
    }

    if (propContractPath) {
      documentosDescarga.contrato_propietario = await obtenerUrlFirmada('contratos_firmados', propContractPath);
    }

    return res.status(200).json({
      ok: true,
      data: {
        id_contrato: numericContractId,
        contrato_activo: ambasPartesFirmaron,
        estado_general: ambasPartesFirmaron ? 'completado_activo' : 'pendiente_otra_parte',
        resumen_firmas: {
          inquilino: {
            nombre: contrato.Inquilino?.nombre_completo || 'Inquilino',
            firmo: inquilinoFirmo,
            fecha: firmaInquilino?.fecha_firma || null,
            estado: firmaInquilino?.estado_firma || 'pendiente'
          },
          propietario: {
            nombre: contrato.Propietario?.nombre_completo || 'Propietario',
            firmo: propietarioFirmo,
            fecha: firmaPropietario?.fecha_firma || null,
            estado: firmaPropietario?.estado_firma || 'pendiente'
          }
        },
        documentos: documentosDescarga,
        mensaje: ambasPartesFirmaron
          ? '¡Contrato perfeccionado y activado exitosamente! Todos los certificados legales están disponibles para descarga.'
          : (inquilinoFirmo
              ? 'Firma del inquilino completada y sellada. Esperando firma del propietario para activar el contrato.'
              : 'Firma del propietario completada y sellada. Esperando firma del inquilino para activar el contrato.')
      }
    });

  } catch (error) {
    console.error('[Server Error in services/firmas/finalizar]:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
