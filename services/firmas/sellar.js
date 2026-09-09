import crypto from 'crypto';
import { generateAuditTrailPdf, generateOriginalContractPdf } from './pdf-generator.js';
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

function isSafeContractObjectPath(value, contractId) {
  return value === `contrato_${contractId}/contrato_original.pdf`;
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
    const { data: signature, error: signatureError } = await supabase
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
    if (!approvedByDidit(signature)) {
      return res.status(409).json({ ok: false, error: 'Verification pending.', message: 'La aprobación biométrica aún no fue confirmada por Didit.' });
    }

    const { data: contractDetail, error: detailError } = await supabase
      .from('Contrato')
      .select('*, Inquilino:id_perfil_inquilino(*), Propietario:id_perfil_propietario(*), Propiedad(*)')
      .eq('id_contrato', signature.id_contrato)
      .single();
    if (detailError || !contractDetail) throw detailError || new Error('Contract not found.');

    const { data: signer, error: signerError } = await supabase
      .from('Perfil')
      .select('id_perfil, nombre_completo, dni, mail')
      .eq('id_perfil', profile.id_perfil)
      .eq('user_id', user.id)
      .single();
    if (signerError || !signer) throw signerError || new Error('Signer profile not found.');

    const contractId = Number(signature.id_contrato);
    const originalPath = `contrato_${contractId}/contrato_original.pdf`;
    let originalBytes;
    let originalHash = contractDetail.hash_original_sha256 || null;

    if (isSafeContractObjectPath(contractDetail.url_contrato_original_pdf, contractId)) {
      const { data, error } = await supabase.storage.from('contratos_firmados').download(originalPath);
      if (error || !data) throw error || new Error('Original contract file is unavailable.');
      originalBytes = Buffer.from(await data.arrayBuffer());
      originalHash = crypto.createHash('sha256').update(originalBytes).digest('hex');
      if (contractDetail.hash_original_sha256 && originalHash !== contractDetail.hash_original_sha256) {
        throw new Error('Original contract integrity check failed.');
      }
    } else {
      const { data: inventory } = await supabase
        .from('Inventario_Digital')
        .select('*, items:Detalle_Inventario_Item(*, Item:id_item(nombre), Estado_item:id_estado_item(nombre))')
        .eq('id_contrato', contractId)
        .maybeSingle();

      const { data: passports } = await supabase
        .from('Pasaporte_vivat')
        .select('id_pasaporte')
        .eq('id_perfil', contractDetail.id_perfil_inquilino);
      const passportIds = (passports || []).map((item) => item.id_pasaporte).filter(Boolean);
      const { data: guarantors } = passportIds.length > 0
        ? await supabase.from('Garante').select('*').in('id_pasaporte', passportIds)
        : { data: [] };

      originalBytes = await generateOriginalContractPdf({
        contractId,
        contrato: contractDetail,
        propiedad: contractDetail.Propiedad || {},
        inquilino: contractDetail.Inquilino || {},
        propietario: contractDetail.Propietario || {},
        garantes: guarantors || [],
        inventario: inventory || null
      });
      originalHash = crypto.createHash('sha256').update(originalBytes).digest('hex');
      const { error: uploadError } = await supabase.storage.from('contratos_firmados').upload(originalPath, originalBytes, {
        contentType: 'application/pdf',
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase
        .from('Contrato')
        .update({ hash_original_sha256: originalHash, url_contrato_original_pdf: originalPath })
        .eq('id_contrato', contractId)
        .is('hash_original_sha256', null);
      if (updateError) throw updateError;
    }

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
    const auditPath = `contrato_${contractId}/audit_trail_firma_${signature.id_firma}.pdf`;
    const { error: auditUploadError } = await supabase.storage.from('contratos_firmados').upload(auditPath, audit.auditTrailBytes, {
      contentType: 'application/pdf',
      upsert: false
    });
    if (auditUploadError) throw auditUploadError;

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
