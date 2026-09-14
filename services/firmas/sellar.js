import { contractRevision, uploadImmutable, assertDocumentHash } from './integrity.js';
import { refreshSignature } from './didit.js';
import { generateAuditTrailPdf } from './pdf-generator.js';
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


async function issueTrustedTimestamp(hash) {
  const endpoint = String(process.env.TSA_SERVER_URL || '').trim();
  const apiKey = String(process.env.TSA_SERVER_API_KEY || '').trim();
  let parsed;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('No trusted TSA gateway is configured.');
  }
  if (parsed.protocol !== 'https:' || !apiKey) throw new Error('No trusted TSA gateway is configured.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ hash_algorithm: 'SHA-256', hash })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.timestamp_token || !result?.gen_time || !result?.authority) {
      throw new Error('The TSA gateway did not return a verifiable timestamp.');
    }
    return {
      authority: String(result.authority).slice(0, 240),
      gen_time: String(result.gen_time).slice(0, 64),
      serial_number: String(result.serial_number || '').slice(0, 240),
      // Persist the token for independent verification. Never synthesize one.
      timestamp_token: String(result.timestamp_token).slice(0, 200_000),
      hash_algorithm: 'SHA-256'
    };
  } finally {
    clearTimeout(timer);
  }
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

    const { contract, role, error: contractError } = await getContractForProfile(supabase, signature.id_contrato, profile.id_perfil);
    if (contractError) throw contractError;
    if (!contract || !role) return sendForbidden(res, 'No eres parte de este contrato.');
    if (signature.estado_firma === 'sellada') return res.status(200).json({ ok: true, data: {
      id_firma: signature.id_firma, id_contrato: signature.id_contrato, estado_firma: signature.estado_firma,
      url_audit_trail_pdf: signature.url_audit_trail_pdf
    } });
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

    const audit = await generateAuditTrailPdf({
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

    // This is deliberately a real external dependency. A locally fabricated
    // JSON object is not an RFC 3161 timestamp and must never be presented as one.
    const timestamp = await issueTrustedTimestamp(audit.auditTrailHash);
    const auditPath = `contrato_${contractId}/audit_trail_firma_${signature.id_firma}_${audit.auditTrailHash}.pdf`;
    await uploadImmutable(supabase, auditPath, audit.auditTrailBytes);

    const { data: updated, error: updateError } = await supabase
      .from('Firma_contrato')
      .update({
        estado_firma: 'sellada',
        hash_original_sha256: originalHash,
        hash_audit_trail_sha256: audit.auditTrailHash,
        tsa_sello_tiempo: timestamp,
        url_audit_trail_pdf: auditPath,
        fecha_firma: new Date().toISOString()
      })
      .eq('id_firma', signature.id_firma)
      .eq('estado_firma', 'biometria_aprobada')
      .select('id_firma, id_contrato, estado_firma, hash_original_sha256, hash_audit_trail_sha256, url_audit_trail_pdf, fecha_firma')
      .single();
    if (updateError) throw updateError;

    return res.status(200).json({ ok: true, data: updated });
  } catch (error) {
    if (String(error?.message || '').includes('trusted TSA gateway')) {
      return res.status(503).json({ ok: false, error: 'Trusted timestamp service unavailable.' });
    }
    return sendInternalError(res, 'firmas/sellar', error);
  }
}
