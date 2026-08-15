import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

/**
 * Vercel Serverless Function: /api/firmas/finalizar
 * 
 * FASE 4: Cierre, Verificación Bilateral, Activación del Contrato y Disponibilidad
 * 
 * Responsabilidades:
 * 1. Verificar si ambas partes (Inquilino y Propietario) completaron y sellaron su firma.
 * 2. Si ambas partes firmaron, activar el Contrato ('activo') y estampar fecha_firma_contrato.
 * 3. Marcar las firmas como 'completada'.
 * 4. Generar URLs firmadas seguras (con vigencia de 7 días) para descargar el Contrato y los Audit Trails.
 * 5. Devolver al frontend el estado consolidado de la operación.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const isGet = req.method === 'GET';
    const params = isGet ? req.query : (typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}));
    const idContrato = params.id_contrato || params.idContrato;

    if (!idContrato) {
      return res.status(400).json({
        ok: false,
        error: 'Bad Request',
        message: 'El parámetro id_contrato es obligatorio.'
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Obtener el Contrato con sus partes
    const { data: contrato, error: errContrato } = await supabase
      .from('Contrato')
      .select(`
        *,
        Inquilino:id_perfil_inquilino (*),
        Propietario:id_perfil_propietario (*),
        Propiedad (*)
      `)
      .eq('id_contrato', Number(idContrato))
      .single();

    if (errContrato || !contrato) {
      return res.status(404).json({
        ok: false,
        error: 'Not Found',
        message: 'No se encontró el contrato especificado.'
      });
    }

    // 2. Obtener todas las firmas registradas para este contrato
    const { data: firmas, error: errFirmas } = await supabase
      .from('Firma_contrato')
      .select('*')
      .eq('id_contrato', Number(idContrato))
      .order('created_at', { ascending: true });

    if (errFirmas) {
      return res.status(500).json({
        ok: false,
        error: 'Database Error',
        message: 'Error al consultar las firmas del contrato.'
      });
    }

    const firmaInquilino = (firmas || []).find(f => f.rol_firmante === 'inquilino' && (f.estado_firma === 'sellada' || f.estado_firma === 'completada'));
    const firmaPropietario = (firmas || []).find(f => f.rol_firmante === 'propietario' && (f.estado_firma === 'sellada' || f.estado_firma === 'completada'));

    const inquilinoFirmo = !!firmaInquilino;
    const propietarioFirmo = !!firmaPropietario;
    const ambasPartesFirmaron = inquilinoFirmo && propietarioFirmo;

    const fechaHoyArgentina = new Date().toLocaleDateString('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires'
    }); // Formato YYYY-MM-DD

    // 3. Si ambas partes firmaron, activar el Contrato
    if (ambasPartesFirmaron) {
      // Marcar firmas como 'completada'
      await supabase
        .from('Firma_contrato')
        .update({ estado_firma: 'completada' })
        .eq('id_contrato', Number(idContrato))
        .in('estado_firma', ['sellada', 'biometria_aprobada']);

      // Actualizar fecha_firma_contrato en Contrato
      await supabase
        .from('Contrato')
        .update({ fecha_firma_contrato: fechaHoyArgentina })
        .eq('id_contrato', Number(idContrato));

      // Registrar estado 'activo' en Historial_Estado_Contrato si aún no está activo
      try {
        const { data: ultimoHistorial } = await supabase
          .from('Historial_Estado_Contrato')
          .select('*')
          .eq('id_contrato', Number(idContrato))
          .order('fecha_inicio', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!ultimoHistorial || ultimoHistorial.id_estado_contrato !== 1) { // 1 = activo
          // Cerrar fecha_fin del estado anterior
          if (ultimoHistorial) {
            await supabase
              .from('Historial_Estado_Contrato')
              .update({ fecha_fin: new Date().toISOString() })
              .eq('id_historial_contrato', ultimoHistorial.id_historial_contrato);
          }

          // Insertar nuevo estado activo
          await supabase
            .from('Historial_Estado_Contrato')
            .insert([{
              id_contrato: Number(idContrato),
              id_estado_contrato: 1, // activo
              fecha_inicio: new Date().toISOString()
            }]);
        }
      } catch (histErr) {
        console.warn('[Warning actualizando historial de contrato]:', histErr);
      }
    }

    // 4. Generar URLs firmadas de descarga para los documentos
    const documentosDescarga = {};

    // Helper para generar URL firmada de Supabase Storage con validez de 7 días
    async function obtenerUrlFirmada(bucket, ruta) {
      if (!ruta) return null;
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(ruta, 60 * 60 * 24 * 7); // 7 días en segundos
        return error ? null : data.signedUrl;
      } catch (e) {
        return null;
      }
    }

    if (firmaInquilino && firmaInquilino.url_audit_trail_pdf) {
      documentosDescarga.audit_trail_inquilino = await obtenerUrlFirmada('contratos_firmados', firmaInquilino.url_audit_trail_pdf);
    }

    if (firmaPropietario && firmaPropietario.url_audit_trail_pdf) {
      documentosDescarga.audit_trail_propietario = await obtenerUrlFirmada('contratos_firmados', firmaPropietario.url_audit_trail_pdf);
    }

    // Contrato PDF (si existe en almacenamiento)
    const rutaContratoPdf = `contrato_${idContrato}/contrato_definitivo.pdf`;
    documentosDescarga.contrato_pdf = await obtenerUrlFirmada('contratos_firmados', rutaContratoPdf);

    return res.status(200).json({
      ok: true,
      data: {
        id_contrato: Number(idContrato),
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
    console.error('[Server Error in /api/firmas/finalizar]:', error);
    return res.status(500).json({
      ok: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
}
