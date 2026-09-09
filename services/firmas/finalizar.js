import crypto from 'crypto';
import { mergeFinalContractPdf } from './pdf-generator.js';
import {
  getAuthenticatedUser,
  getContractForProfile,
  getSupabaseAdmin,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendUnauthorized,
  setCorsHeaders
} from '../../api/_auth.js';

function isSealed(signature) {
  return signature?.estado_firma === 'sellada' && ['APPROVED', 'SUCCESS', 'PASSED'].includes(String(signature.didit_status || '').toUpperCase());
}

function contractPath(contractId, filename) {
  return `contrato_${contractId}/${filename}`;
}

function isAllowedDocumentPath(path, contractId) {
  return typeof path === 'string' && new RegExp(`^contrato_${contractId}/[A-Za-z0-9._-]+$`).test(path);
}

async function signedUrl(supabase, path, contractId) {
  if (!isAllowedDocumentPath(path, contractId)) return null;
  const { data, error } = await supabase.storage.from('contratos_firmados').createSignedUrl(path, 5 * 60);
  return error ? null : data?.signedUrl || null;
}

async function activateContract(supabase, contractId) {
  const { data: latest, error } = await supabase
    .from('Historial_Estado_Contrato')
    .select('id_historial_contrato, id_estado_contrato')
    .eq('id_contrato', contractId)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (latest?.id_estado_contrato === 1) return;

  if (latest) {
    const { error: closeError } = await supabase
      .from('Historial_Estado_Contrato')
      .update({ fecha_fin: new Date().toISOString() })
      .eq('id_historial_contrato', latest.id_historial_contrato);
    if (closeError) throw closeError;
  }
  const { error: insertError } = await supabase.from('Historial_Estado_Contrato').insert([{
    id_contrato: contractId,
    id_estado_contrato: 1,
    fecha_inicio: new Date().toISOString()
  }]);
  if (insertError) throw insertError;
}

async function generateFinalDocument(supabase, contract, tenantSignature, ownerSignature) {
  const contractId = Number(contract.id_contrato);
  if (contract.hash_final_sha256 && isAllowedDocumentPath(contract.url_contrato_final_pdf, contractId)) {
    return { path: contract.url_contrato_final_pdf, hash: contract.hash_final_sha256 };
  }

  const required = [contract.url_contrato_original_pdf, tenantSignature.url_audit_trail_pdf, ownerSignature.url_audit_trail_pdf];
  if (!required.every((path) => isAllowedDocumentPath(path, contractId))) {
    throw new Error('Required immutable signature documents are unavailable.');
  }
  const buffers = [];
  for (const path of required) {
    const { data, error } = await supabase.storage.from('contratos_firmados').download(path);
    if (error || !data) throw error || new Error('Required immutable signature document is unavailable.');
    buffers.push(Buffer.from(await data.arrayBuffer()));
  }

  const { finalPdfBytes, finalPdfHash } = await mergeFinalContractPdf({
    originalPdfBytes: buffers[0],
    inquilinoAuditBytes: buffers[1],
    propietarioAuditBytes: buffers[2],
    garantesAuditBytes: []
  });
  const calculatedHash = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');
  if (calculatedHash !== finalPdfHash) throw new Error('Final document integrity check failed.');

  const path = contractPath(contractId, 'contrato_final_consolidado.pdf');
  const { error: uploadError } = await supabase.storage.from('contratos_firmados').upload(path, finalPdfBytes, {
    contentType: 'application/pdf',
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase
    .from('Contrato')
    .update({ hash_final_sha256: finalPdfHash, url_contrato_final_pdf: path })
    .eq('id_contrato', contractId)
    .is('hash_final_sha256', null);
  if (updateError) throw updateError;

  await supabase
    .from('Firma_contrato')
    .update({ hash_contrato_sha256: finalPdfHash, url_contrato_final_pdf: path })
    .eq('id_contrato', contractId)
    .in('id_firma', [tenantSignature.id_firma, ownerSignature.id_firma]);

  return { path, hash: finalPdfHash };
}

export default async function finalizarHandler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = req.method === 'POST' ? await readJsonBody(req) : (req.query || {});
    const contractId = parsePositiveInteger(body.id_contrato || body.idContrato);
    if (!contractId) return res.status(400).json({ ok: false, error: 'Invalid contract id.' });

    const supabase = getSupabaseAdmin();
    const { contract: participantContract, role, error: contractError } = await getContractForProfile(supabase, contractId, profile.id_perfil);
    if (contractError) throw contractError;
    if (!participantContract) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (!role) return sendForbidden(res, 'No eres parte de este contrato.');

    const { data: contract, error: detailError } = await supabase
      .from('Contrato')
      .select('id_contrato, hash_original_sha256, url_contrato_original_pdf, hash_final_sha256, url_contrato_final_pdf')
      .eq('id_contrato', contractId)
      .single();
    if (detailError || !contract) throw detailError || new Error('Contract not found.');

    const { data: signatures, error: signaturesError } = await supabase
      .from('Firma_contrato')
      .select('id_firma, id_perfil_firmante, rol_firmante, estado_firma, didit_status, fecha_firma, hash_contrato_sha256, url_audit_trail_pdf')
      .eq('id_contrato', contractId)
      .order('created_at', { ascending: true });
    if (signaturesError) throw signaturesError;

    const tenantSignature = (signatures || []).find((item) => item.rol_firmante === 'inquilino' && isSealed(item));
    const ownerSignature = (signatures || []).find((item) => item.rol_firmante === 'propietario' && isSealed(item));
    const complete = Boolean(tenantSignature && ownerSignature);

    let finalDocument = contract.hash_final_sha256 && isAllowedDocumentPath(contract.url_contrato_final_pdf, contractId)
      ? { path: contract.url_contrato_final_pdf, hash: contract.hash_final_sha256 }
      : null;

    // GET is read-only. A state-changing finalization requires an explicit POST
    // from an authenticated contract participant.
    if (req.method === 'POST' && complete) {
      finalDocument = await generateFinalDocument(supabase, contract, tenantSignature, ownerSignature);
      const { error: inventoryError } = await supabase
        .from('Inventario_Digital')
        .update({ firmado_inquilino: true, firmado_propietario: true })
        .eq('id_contrato', contractId);
      if (inventoryError && inventoryError.code !== 'PGRST116') throw inventoryError;

      const { error: contractUpdateError } = await supabase
        .from('Contrato')
        .update({ fecha_firma_contrato: new Date().toISOString().slice(0, 10) })
        .eq('id_contrato', contractId);
      if (contractUpdateError) throw contractUpdateError;
      await activateContract(supabase, contractId);
    }

    const documents = {
      contrato_original: await signedUrl(supabase, contract.url_contrato_original_pdf, contractId),
      audit_trail_inquilino: tenantSignature ? await signedUrl(supabase, tenantSignature.url_audit_trail_pdf, contractId) : null,
      audit_trail_propietario: ownerSignature ? await signedUrl(supabase, ownerSignature.url_audit_trail_pdf, contractId) : null,
      contrato_final: finalDocument ? await signedUrl(supabase, finalDocument.path, contractId) : null
    };

    return res.status(200).json({
      ok: true,
      data: {
        id_contrato: contractId,
        contrato_activo: complete && Boolean(finalDocument),
        estado_general: complete ? (finalDocument ? 'completado_activo' : 'pendiente_documento_final') : 'pendiente_firmas',
        hash_original_sha256: contract.hash_original_sha256 || null,
        hash_final_sha256: finalDocument?.hash || null,
        resumen_firmas: {
          inquilino: { firmo: Boolean(tenantSignature), fecha: tenantSignature?.fecha_firma || null, estado: tenantSignature?.estado_firma || 'pendiente' },
          propietario: { firmo: Boolean(ownerSignature), fecha: ownerSignature?.fecha_firma || null, estado: ownerSignature?.estado_firma || 'pendiente' }
        },
        documentos: documents
      }
    });
  } catch (error) {
    return sendInternalError(res, 'firmas/finalizar', error);
  }
}
