import crypto from 'crypto';
import {
  getRawRequestBody,
  getSupabaseAdmin,
  mocksAreAllowed,
  readJsonBody,
  sendInternalError,
  setCorsHeaders
} from './_auth.js';

export const config = { api: { bodyParser: false } };

function verifyDiditSignature(req) {
  const secret = String(process.env.DIDIT_WEBHOOK_SECRET || '').trim();
  if (!secret) return mocksAreAllowed() && process.env.ALLOW_INSECURE_WEBHOOKS === 'true';
  const raw = getRawRequestBody(req);
  const header = String(req.headers['x-didit-signature'] || req.headers['x-signature'] || req.headers['webhook-signature'] || '')
    .split(',')[0]
    .replace(/^(sha256|v1)=/i, '')
    .trim();
  if (!raw || !/^[a-f0-9]{64}$/i.test(header)) return false;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(header, 'hex'), Buffer.from(expected, 'hex'));
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

function currentStatus(body) {
  const status = String(body.status || body.decision?.status || '').toLowerCase();
  if (['approved', 'success', 'passed'].includes(status)) return 'approved';
  if (['declined', 'rejected', 'failed'].includes(status)) return 'declined';
  return 'pending';
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
    if (!verifyDiditSignature(req)) return res.status(401).json({ error: 'Invalid webhook signature.' });

    const sessionId = String(body.session_id || body.sessionId || body.id || '');
    if (!/^[A-Za-z0-9_-]{6,200}$/.test(sessionId)) return res.status(400).json({ error: 'Invalid session id.' });
    const vendor = parseVendorData(body.vendor_data || body.vendorData);
    if (!vendor || !['profile_kyc', 'guarantor_kyc'].includes(vendor.kind)) {
      return res.status(200).json({ received: true, ignored: true });
    }

    const status = currentStatus(body);
    const document = documentData(body);
    const evidence = { status, document: { fullName: document.fullName || null, dni: document.dni || null }, processedAt: new Date().toISOString() };
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
      const { error: updateError } = await supabase.from('Garante').update(update).eq('id_garante', guarantorId).eq('didit_session_id', sessionId);
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
