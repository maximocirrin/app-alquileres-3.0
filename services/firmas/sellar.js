import { contractRevision, uploadImmutable, assertDocumentHash } from './integrity.js';
import { refreshSignature } from './didit.js';
import { generateAuditTrailPdf } from './pdf-generator.js';
import { issueEvidence, signingKey, CONSENT_VERSION, sha256 } from './evidence.js';
import { getSigningContract } from './participants.js';
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

function approvedByDidit(signature) {
  return signature?.estado_firma === 'biometria_aprobada' && ['APPROVED', 'SUCCESS', 'PASSED'].includes(String(signature.didit_status || '').toUpperCase());
}



export default async function sellarHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = await readJsonBody(req);
    const signatureId = parsePositiveInteger(body.id_firma || body.idFirma);
    if (!signatureId) return res.status(400).json({ ok: false, error: 'Invalid signature id.' });

    const supabase = getSupabaseAdmin();
    let { data: signature, error: signatureError } = await supabase
      .from('Firma_contrato')
      .select('id_firma, id_contrato, id_perfil_firmante, rol_firmante, estado_firma, didit_status, didit_session_id, didit_scores, ip_origen, user_agent, url_audit_trail_pdf')
      .eq('id_firma', signatureId)
      .maybeSingle();
    if (signatureError) throw signatureError;
    if (!signature) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (Number(signature.id_perfil_firmante) !== Number(profile.id_perfil)) {
      return sendForbidden(res, 'Solo el firmante autenticado puede completar esta firma.');
    }

    const { contract, role, error: contractError } = await getSigningContract(supabase, signature.id_contrato, profile, user);
    if (contractError) throw contractError;
    if (!contract || !role) return sendForbidden(res, 'No eres parte de este contrato.');
    if (signature.estado_firma === 'sellada') return res.status(200).json({ ok: true, data: {
      id_firma: signature.id_firma, id_contrato: signature.id_contrato, estado_firma: signature.estado_firma,
      url_audit_trail_pdf: signature.url_audit_trail_pdf
    } });
    const key = signingKey();
    const { data: history, error: historyError } = await supabase.from('Historial_Estado_Contrato')
      .select('id_estado_contrato').eq('id_contrato', signature.id_contrato).is('fecha_fin', null)
      .order('fecha_inicio', { ascending: false }).limit(1).maybeSingle();
    if (historyError) throw historyError;
    if (Number(history?.id_estado_contrato) !== 5) return res.status(409).json({ ok: false, message: 'El contrato ya no está pendiente de firma.' });
    if (signature.rol_firmante !== role) return sendForbidden(res, 'La participación del firmante cambió.');
    if (signature.didit_scores?.consent_version !== CONSENT_VERSION) return res.status(409).json({ ok: false, message: 'Revisá el consentimiento actualizado e iniciá una nueva firma.' });
    signature = await refreshSignature(supabase, signature);
    if (!approvedByDidit(signature)) {
      return res.status(409).json({ ok: false, error: 'Verification pending.', message: 'La aprobación biométrica aún no fue confirmada por Didit.' });
    }

    const { data: contractDetail, error: detailError } = await supabase
      .from('Contrato')
      .select('*, Inquilino:id_perfil_inquilino(*), Propietario:id_perfil_propietario(*), Propiedad(*)')
      .eq('id_contrato', signature.id_contrato)
      .single();
    if (detailError || !contractDetail) throw detailError || new Error('Contract not found.');
    if (!signature.didit_scores?.contract_revision || signature.didit_scores.contract_revision !== contractRevision(contractDetail)) {
      return res.status(409).json({ ok: false, message: 'Las condiciones cambiaron o esta sesión no registró la versión del contrato. Debe iniciarse una nueva firma.' });
    }

    const { data: signer, error: signerError } = await supabase
      .from('Perfil')
      .select('id_perfil, nombre_completo, dni, mail')
      .eq('id_perfil', profile.id_perfil)
      .eq('user_id', user.id)
      .single();
    if (signerError || !signer) throw signerError || new Error('Signer profile not found.');

    const contractId = Number(signature.id_contrato);
    const originalHash = signature.didit_scores?.document_hash;
    const originalPath = signature.didit_scores?.document_path;
    if (!/^[a-f0-9]{64}$/.test(originalHash || '') ||
        originalPath !== `contrato_${contractId}/contrato_original_${originalHash}.pdf` ||
        contractDetail.hash_original_sha256 !== originalHash ||
        contractDetail.url_contrato_original_pdf !== originalPath) {
      return res.status(409).json({ ok: false, message: 'La firma no está vinculada al PDF aceptado. Revisá el documento e iniciá una nueva firma.' });
    }
    const { data: originalFile, error: originalError } = await supabase.storage.from('contratos_firmados').download(originalPath);
    if (originalError || !originalFile) throw originalError || new Error('Original contract unavailable.');
    assertDocumentHash(Buffer.from(await originalFile.arrayBuffer()), originalHash);

    const recordedAt = new Date().toISOString();
    const audit = await generateAuditTrailPdf({
      recordedAt,
      contractId,
      firmaId: signature.id_firma,
      propiedad: contractDetail.Propiedad || {},
      rol: signature.rol_firmante,
      signerName: signer.nombre_completo || 'Firmante verificado',
      signerDni: signer.dni || 'Verificado por Didit',
      email: signer.mail || '-',
      ip: signature.ip_origen || 'No disponible',
      userAgent: signature.user_agent || 'No disponible',
      diditSessionId: signature.didit_session_id,
      diditScores: signature.didit_scores || {},
      originalPdfHash: originalHash
    });

    const timestamp = issueEvidence({ signature, auditHash: audit.auditTrailHash, originalHash, recordedAt }, key);
    const auditPath = `contrato_${contractId}/audit_trail_firma_${signature.id_firma}_${audit.auditTrailHash}.pdf`;
    await uploadImmutable(supabase, auditPath, audit.auditTrailBytes);
    const evidenceBytes = Buffer.from(JSON.stringify(timestamp));
    const evidencePath = `contrato_${contractId}/evidencia_firma_${signature.id_firma}_${sha256(evidenceBytes)}.json`;
    await uploadImmutable(supabase, evidencePath, evidenceBytes, 'application/json');

    const { data: updated, error: updateError } = await supabase
      .from('Firma_contrato')
      .update({
        estado_firma: 'sellada',
        hash_original_sha256: originalHash,
        hash_audit_trail_sha256: audit.auditTrailHash,
        tsa_sello_tiempo: { ...timestamp, evidence_path: evidencePath },
        url_audit_trail_pdf: auditPath,
        fecha_firma: recordedAt
      })
      .eq('id_firma', signature.id_firma)
      .eq('estado_firma', 'biometria_aprobada')
      .select('id_firma, id_contrato, estado_firma, hash_original_sha256, hash_audit_trail_sha256, url_audit_trail_pdf, fecha_firma')
      .maybeSingle();
    if (updateError) throw updateError;

    if (!updated) {
      const { data: sealed, error } = await supabase.from('Firma_contrato')
        .select('id_firma, id_contrato, estado_firma, hash_original_sha256, hash_audit_trail_sha256, fecha_firma')
        .eq('id_firma', signature.id_firma).single();
      if (error) throw error;
      if (sealed.estado_firma !== 'sellada') return res.status(409).json({ ok: false, message: 'El estado cambió. Consultá la firma nuevamente.' });
      return res.status(200).json({ ok: true, data: sealed });
    }

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    if (error.code === 'EVIDENCE_NOT_CONFIGURED') {
      return res.status(503).json({ ok: false, message: error.message });
    }
    return sendInternalError(res, 'firmas/sellar', error);
  }
}
