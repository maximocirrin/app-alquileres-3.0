import crypto from 'crypto';
import { evaluateFullKyc } from './_didit-kyc.js';
import {
  getRawRequestBody,
  getSupabaseAdmin,
  readJsonBody,
  sendInternalError,
  setCorsHeaders
} from './_auth.js';

export const config = { api: { bodyParser: false } };

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
  const secret = String(process.env.DIDIT_WEBHOOK_SECRET || '').trim();
  if (!secret) return false;
  const timestamp = Number(req.headers['x-timestamp']);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300 || Number(body?.timestamp) !== timestamp) {
    return false;
  }

  const signatureV2 = String(req.headers['x-signature-v2'] || '').trim();
  if (signatureV2) {
    const canonical = JSON.stringify(sortObjectKeys(body));
    const expectedV2 = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
    if (safeSignatureEqual(expectedV2, signatureV2)) return true;
  }

  const raw = getRawRequestBody(req);
  const header = String(req.headers['x-didit-signature'] || req.headers['x-signature'] || req.headers['webhook-signature'] || '')
    .split(',')[0]
    .replace(/^(sha256|v1)=/i, '')
    .trim();
  if (!raw) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return safeSignatureEqual(expected, header);
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

function documentData(body) {
  const source = body.decision?.document || body.document || body.extracted_data || body.ocr || {};
  return {
    fullName: String(source.full_name || source.fullName || '').slice(0, 240),
    dni: String(source.document_number || source.documentNumber || source.id_number || '').replace(/[^0-9A-Za-z-]/g, '').slice(0, 32)
  };
}

async function recordKyc(supabase, values) {
  const { data: existing, error: lookupError } = await supabase
    .from('Verificacion_kyc')
    .select('session_id')
    .eq('session_id', values.session_id)
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;
  const { error } = await supabase.from('Verificacion_kyc').insert([values]);
  if (error) throw error;
}

/** Authenticated Didit callback for regular KYC and guarantor KYC. */
export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req, { maxBytes: 8 * 1024 * 1024 });
    if (!verifyDiditSignature(req, body)) return res.status(401).json({ error: 'Invalid webhook signature.' });

    const sessionId = String(body.session_id || body.sessionId || body.id || '');
    if (!/^[A-Za-z0-9_-]{6,200}$/.test(sessionId)) return res.status(400).json({ error: 'Invalid session id.' });
    const vendor = parseVendorData(body.vendor_data || body.vendorData);
    if (!vendor || !['profile_kyc', 'guarantor_kyc'].includes(vendor.kind)) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const expectedWorkflow = String(process.env.DIDIT_WORKFLOW_ID || '').trim();
    const assessment = evaluateFullKyc(body, expectedWorkflow);
    const status = assessment.status;
    const document = documentData(body);
    const evidence = {
      status,
      workflowId: assessment.workflowId,
      workflowMatches: assessment.workflowMatches,
      checks: assessment.checks,
      document: { fullName: document.fullName || null, dni: document.dni || null },
      processedAt: new Date().toISOString()
    };
    const supabase = getSupabaseAdmin();

    if (vendor.kind === 'guarantor_kyc') {
      const guarantorId = Number(vendor.guarantorId);
      if (!Number.isSafeInteger(guarantorId) || guarantorId <= 0) return res.status(400).json({ error: 'Invalid webhook subject.' });
      const { data: guarantor, error } = await supabase
        .from('Garante')
        .select('id_garante, id_pasaporte, didit_session_id')
        .eq('id_garante', guarantorId)
        .eq('didit_session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!guarantor) return res.status(200).json({ received: true, ignored: true });

      const update = { kyc_verificado: status === 'approved', id_estado_garante: status === 'approved' ? 4 : (status === 'declined' ? 7 : 3), updated_at: new Date().toISOString() };
      if (status === 'approved' && document.fullName) update.nombre_completo = document.fullName;
      if (status === 'approved' && document.dni) update.dni = document.dni;
      if (status === 'declined') update.motivo_rechazo = 'La verificación de identidad fue rechazada por el proveedor.';
      const { error: updateError } = await supabase
        .from('Garante')
        .update(update)
        .eq('id_garante', guarantorId)
        .eq('didit_session_id', sessionId)
        .eq('id_estado_garante', 3)
        .is('token_used_at', null);
      if (updateError) throw updateError;
      await recordKyc(supabase, { id_garante: guarantorId, id_pasaporte: guarantor.id_pasaporte || null, proveedor: 'didit', session_id: sessionId, status, payload_raw: evidence });
    } else {
      const profileId = Number(vendor.profileId);
      if (!Number.isSafeInteger(profileId) || profileId <= 0 || !vendor.userId) return res.status(400).json({ error: 'Invalid webhook subject.' });
      const { data: profile, error } = await supabase
        .from('Perfil')
        .select('id_perfil, user_id')
        .eq('id_perfil', profileId)
        .eq('user_id', String(vendor.userId))
        .maybeSingle();
      if (error) throw error;
      if (!profile) return res.status(200).json({ received: true, ignored: true });

      if (status === 'approved') {
        const update = { cuenta_verificada: true, fecha_verificacion: new Date().toISOString() };
        if (document.fullName) update.nombre_completo = document.fullName;
        if (document.dni) update.dni = document.dni;
        const { error: profileError } = await supabase.from('Perfil').update(update).eq('id_perfil', profile.id_perfil).eq('user_id', profile.user_id);
        if (profileError) throw profileError;
      }

      const { data: passport, error: passportError } = await supabase
        .from('Pasaporte_vivat')
        .select('id_pasaporte')
        .eq('id_perfil', profile.id_perfil)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (passportError) throw passportError;
      if (passport) await recordKyc(supabase, { id_pasaporte: passport.id_pasaporte, proveedor: 'didit', session_id: sessionId, status, payload_raw: evidence });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return sendInternalError(res, 'webhook', error);
  }
}
