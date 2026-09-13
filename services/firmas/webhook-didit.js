import crypto from 'crypto';
import { evaluateSignatureBiometrics } from '../../api/_didit-kyc.js';
import {
  getRawRequestBody,
  getSupabaseAdmin,
  readJsonBody,
  sendInternalError,
  setCorsHeaders
} from '../../api/_auth.js';

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,200}$/;
const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

function sortObjectKeys(value) {
  if (Array.isArray(value)) return value.map(sortObjectKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = sortObjectKeys(value[key]);
      return result;
    }, {});
  }
  return value;
}

function safeSignatureEqual(expected, received) {
  if (!/^[a-f0-9]{64}$/i.test(received || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}

function verifyDiditSignature(req, body) {
  const secret = String(process.env.DIDIT_SIGNATURE_WEBHOOK_SECRET || process.env.DIDIT_WEBHOOK_SECRET || '').trim();
  if (!secret) return false;
  const timestamp = Number(req.headers['x-timestamp']);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || Number(body?.timestamp) !== timestamp) return false;

  const signatureV2 = String(req.headers['x-signature-v2'] || '').trim();
  if (signatureV2) {
    const canonical = JSON.stringify(sortObjectKeys(body));
    const expectedV2 = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    if (safeSignatureEqual(expectedV2, signatureV2)) return true;
  }

  const raw = getRawRequestBody(req);
  const provided = String(req.headers['x-didit-signature'] || req.headers['x-signature'] || req.headers['webhook-signature'] || '')
    .split(',')[0]
    .replace(/^(sha256|v1)=/i, '')
    .trim();
  if (!raw) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return safeSignatureEqual(expected, provided);
}

function parseVendorData(value) {
  if (value && typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function ocrData(body) {
  const source = body.decision?.document || body.document || body.extracted_data || body.ocr || {};
  const name = String(source.full_name || source.fullName || '').slice(0, 240);
  const dni = String(source.document_number || source.documentNumber || source.id_number || '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 32);
  return { name, dni };
}

async function saveEvidence(supabase, body, contractId, signatureId, suffix) {
  const source = body?.decision?.[suffix] || body?.images?.[suffix] || null;
  if (typeof source !== 'string' || !source.startsWith('data:')) return null;
  const match = source.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) return null;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_EVIDENCE_BYTES) return null;
  const extension = match[1].toLowerCase() === 'image/png' ? 'png' : 'jpg';
  const path = `contrato_${contractId}/firma_${signatureId}_${suffix}.${extension}`;
  const { error } = await supabase.storage.from('boveda_biometrica').upload(path, bytes, {
    contentType: match[1].toLowerCase(),
    upsert: false
  });
  return error ? null : path;
}

/** Didit callback for a contract-signature session. */
export default async function webhookDiditHandler(req, res) {
  // Webhooks are server-to-server and do not need a permissive CORS response.
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req, { maxBytes: 8 * 1024 * 1024 });
    if (!verifyDiditSignature(req, body)) return res.status(401).json({ ok: false, error: 'Invalid webhook signature.' });

    const sessionId = String(body.session_id || body.sessionId || body.id || '');
    if (!SESSION_ID_PATTERN.test(sessionId)) return res.status(400).json({ ok: false, error: 'Invalid session id.' });
    const vendor = parseVendorData(body.vendor_data || body.vendorData);
    const expectedWorkflow = String(process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || '').trim();
    const assessment = evaluateSignatureBiometrics(body, expectedWorkflow);
    const status = assessment.status;

    const supabase = getSupabaseAdmin();
    const { data: signature, error: signatureError } = await supabase
      .from('Firma_contrato')
      .select('id_firma, id_contrato, id_perfil_firmante, rol_firmante, estado_firma, didit_session_id')
      .eq('didit_session_id', sessionId)
      .maybeSingle();
    if (signatureError) throw signatureError;
    if (!signature) return res.status(200).json({ ok: true, ignored: true });

    const matchesVendor = vendor?.kind === 'contract_signature'
      && Number(vendor.contractId) === Number(signature.id_contrato)
      && Number(vendor.profileId) === Number(signature.id_perfil_firmante)
      && String(vendor.role) === String(signature.rol_firmante);
    if (!matchesVendor) return res.status(401).json({ ok: false, error: 'Webhook session binding failed.' });

    if (signature.estado_firma === 'sellada' || signature.estado_firma === 'completada') {
      return res.status(200).json({ ok: true, idempotent: true });
    }

    const approved = status === 'approved';
    const declined = status === 'declined';
    const nextState = approved ? 'biometria_aprobada' : (declined ? 'biometria_rechazada' : 'biometria_pendiente');
    const scores = {
      decision_status: status,
      workflow_id: assessment.workflowId,
      workflow_matches: assessment.workflowMatches,
      liveness_status: assessment.checks.liveness ? 'approved' : 'unverified',
      processed_at: new Date().toISOString()
    };

    let front = null;
    let back = null;
    let selfie = null;
    if (approved) {
      front = await saveEvidence(supabase, body, signature.id_contrato, signature.id_firma, 'front_image');
      back = await saveEvidence(supabase, body, signature.id_contrato, signature.id_firma, 'back_image');
      selfie = await saveEvidence(supabase, body, signature.id_contrato, signature.id_firma, 'selfie_image');
    }

    const update = {
      estado_firma: nextState,
      didit_status: status.toUpperCase() || 'PENDING',
      didit_scores: scores
    };
    if (front) update.url_dni_frente_privado = front;
    if (back) update.url_dni_dorso_privado = back;
    if (selfie) update.url_selfie_privado = selfie;

    const { error: updateError } = await supabase
      .from('Firma_contrato')
      .update(update)
      .eq('id_firma', signature.id_firma)
      .eq('didit_session_id', sessionId)
      .in('estado_firma', ['iniciada', 'biometria_pendiente', 'biometria_aprobada', 'biometria_rechazada']);
    if (updateError) throw updateError;

    if (approved) {
      const ocr = ocrData(body);
      const profileUpdate = { cuenta_verificada: true, fecha_verificacion: new Date().toISOString() };
      if (ocr.name) profileUpdate.nombre_completo = ocr.name;
      if (ocr.dni) profileUpdate.dni = ocr.dni;
      const { error } = await supabase.from('Perfil').update(profileUpdate).eq('id_perfil', signature.id_perfil_firmante);
      if (error) throw error;
    }

    return res.status(200).json({ ok: true, firma_id: signature.id_firma, estado_firma: nextState });
  } catch (error) {
    return sendInternalError(res, 'firmas/webhook-didit', error);
  }
}
