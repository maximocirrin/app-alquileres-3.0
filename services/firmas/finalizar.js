import dotenv from 'dotenv';
import { setCorsHeaders, getAuthenticatedUser, sendUnauthorized, sendForbidden, getSupabaseAdmin } from '../../api/_auth.js';
import { mergeFinalContractPdf } from './pdf-generator.js';
dotenv.config();

/**
 * FASE 4: Cierre, Verificación Bilateral, Activación del Contrato y Disponibilidad de Documentos
 */
export default async function finalizarHandler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Intentar validar autenticación
  const { user, profile } = await getAuthenticatedUser(req);

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
      .maybeSingle();

    if (errContrato || !contrato) {
      return res.status(404).json({
        ok: false,
        error: 'Not Found',
        message: 'No se encontró el contrato especificado.'
      });
    }

    // 3. Obtener todas las firmas registradas para este contrato
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

    // Actualizar estado de firmas en el Inventario si corresponde
    try {
      if (inquilinoFirmo || propietarioFirmo) {
        await supabase
          .from('Inventario_Digital')
          .update({
            ...(inquilinoFirmo ? { firmado_inquilino: true } : {}),
            ...(propietarioFirmo ? { firmado_propietario: true } : {})
          })
          .eq('id_contrato', numericContractId);
      }
    } catch (invErr) {
      console.warn('[Warning] Error actualizando firmas en Inventario_Digital:', invErr);
    }

    // 4. Si ambas partes firmaron, activar el Contrato
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

      // --- GENERACIÓN DEL CONTRATO FINAL CONSOLIDADO (WORM) ---
      if (!contrato.hash_final_sha256 && contrato.url_contrato_original_pdf && firmaInquilino?.url_audit_trail_pdf && firmaPropietario?.url_audit_trail_pdf) {
        try {
          // Descargar Original
          const { data: origData } = await supabase.storage.from('contratos_firmados').download(contrato.url_contrato_original_pdf);
          const originalPdfBytes = origData ? Buffer.from(await origData.arrayBuffer()) : null;

          // Descargar Audit Trail Inquilino
          const { data: inqData } = await supabase.storage.from('contratos_firmados').download(firmaInquilino.url_audit_trail_pdf);
          const inquilinoAuditBytes = inqData ? Buffer.from(await inqData.arrayBuffer()) : null;

          // Descargar Audit Trail Propietario
          const { data: propData } = await supabase.storage.from('contratos_firmados').download(firmaPropietario.url_audit_trail_pdf);
          const propietarioAuditBytes = propData ? Buffer.from(await propData.arrayBuffer()) : null;

          if (originalPdfBytes && inquilinoAuditBytes && propietarioAuditBytes) {
            const { finalPdfBytes, finalPdfHash } = await mergeFinalContractPdf({ originalPdfBytes, inquilinoAuditBytes, propietarioAuditBytes });
            
            const finalContractPdfPath = `contrato_${numericContractId}/contrato_final_consolidado.pdf`;
            await supabase.storage.from('contratos_firmados').upload(finalContractPdfPath, finalPdfBytes, { contentType: 'application/pdf', upsert: true });

            await supabase.from('Contrato').update({ hash_final_sha256: finalPdfHash, url_contrato_final_pdf: finalContractPdfPath }).eq('id_contrato', numericContractId);
            
            await supabase.from('Firma_contrato')
              .update({ hash_contrato_sha256: finalPdfHash, url_contrato_final_pdf: finalContractPdfPath })
              .eq('id_contrato', numericContractId);

            contrato.hash_final_sha256 = finalPdfHash;
            contrato.url_contrato_final_pdf = finalContractPdfPath;
          }
        } catch (mergeErr) {
          console.error('[Error fusionando contrato final]:', mergeErr);
        }
      }
    }

    // 5. Generar URLs firmadas de descarga
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
          .createSignedUrl(cleanPath, 60 * 60 * 24 * 7);
        return error ? null : data.signedUrl;
      } catch (e) {
        return null;
      }
    }

    const inqAuditPath = firmaInquilino ? firmaInquilino.url_audit_trail_pdf : null;
    const propAuditPath = firmaPropietario ? firmaPropietario.url_audit_trail_pdf : null;
    const finalContractPath = contrato.url_contrato_final_pdf || null;

    if (contrato.url_contrato_original_pdf) {
      documentosDescarga.contrato_original = await obtenerUrlFirmada('contratos_firmados', contrato.url_contrato_original_pdf);
    }

    if (inqAuditPath) {
      documentosDescarga.audit_trail_inquilino = await obtenerUrlFirmada('contratos_firmados', inqAuditPath);
    }

    if (propAuditPath) {
      documentosDescarga.audit_trail_propietario = await obtenerUrlFirmada('contratos_firmados', propAuditPath);
    }

    if (finalContractPath) {
      documentosDescarga.contrato_final = await obtenerUrlFirmada('contratos_firmados', finalContractPath);
    }

    return res.status(200).json({
      ok: true,
      data: {
        id_contrato: numericContractId,
        contrato_activo: ambasPartesFirmaron,
        estado_general: ambasPartesFirmaron ? 'completado_activo' : 'pendiente_otra_parte',
        hash_original_sha256: contrato.hash_original_sha256 || null,
        hash_final_sha256: contrato.hash_final_sha256 || null,
        resumen_firmas: {
          inquilino: {
            nombre: contrato.Inquilino?.nombre_completo || 'Inquilino',
            firmo: inquilinoFirmo,
            fecha: firmaInquilino?.fecha_firma || null,
            estado: firmaInquilino?.estado_firma || 'pendiente',
            hash_contrato_sha256: firmaInquilino?.hash_contrato_sha256 || null
          },
          propietario: {
            nombre: contrato.Propietario?.nombre_completo || 'Propietario',
            firmo: propietarioFirmo,
            fecha: firmaPropietario?.fecha_firma || null,
            estado: firmaPropietario?.estado_firma || 'pendiente',
            hash_contrato_sha256: firmaPropietario?.hash_contrato_sha256 || null
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
