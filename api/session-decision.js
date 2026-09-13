import dotenv from 'dotenv';
import crypto from 'crypto';
import { parseVendorData } from './create-session.js';
import { evaluateFullKyc } from './_didit-kyc.js';
import {
  getAuthenticatedUser,
  getSupabaseAdmin,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

dotenv.config();

export const config = { api: { bodyParser: false } };

const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{6,200}$/;
const INVITATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;

function tokenDigest(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function findDeep(value, keys, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 8) return null;
  for (const key of keys) {
    if (value[key] !== undefined && value[key] !== null && value[key] !== '') return value[key];
  }
  for (const child of Object.values(value)) {
    const found = findDeep(child, keys, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

function normalizeDate(value) {
  if (typeof value !== 'string' || value.length > 32) return null;
  const clean = value.trim();
  const match = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/) || clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!match) return null;
  const year = match[1].length === 4 ? Number(match[1]) : Number(match[3]);
  const month = Number(match[2]);
  const day = match[1].length === 4 ? Number(match[3]) : Number(match[1]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  const age = new Date().getUTCFullYear() - year;
  if (age < 16 || age > 120) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildDocument(remote) {
  const decision = remote.decision || remote;
  const document = decision.document || remote.document || decision.extracted_data || {};
  const firstName = String(findDeep(document, ['first_name', 'firstName', 'given_names', 'name']) || '').slice(0, 120);
  const lastName = String(findDeep(document, ['last_name', 'lastName', 'surnames', 'surname']) || '').slice(0, 120);
  const fullName = String(findDeep(document, ['full_name', 'fullName']) || `${firstName} ${lastName}`.trim()).slice(0, 240);
  const dni = String(findDeep(document, ['document_number', 'documentNumber', 'id_number', 'dni', 'personal_number']) || '')
    .replace(/[^0-9A-Za-z-]/g, '')
    .slice(0, 32);
  const birthDate = normalizeDate(findDeep(document, ['date_of_birth', 'dateOfBirth', 'birth_date', 'dob', 'fecha_nacimiento']));
  const age = birthDate ? Math.floor((Date.now() - Date.parse(`${birthDate}T00:00:00Z`)) / 31_557_600_000) : null;

  return { firstName, lastName, fullName, documentNumber: dni, dni, dateOfBirth: birthDate, age };
}

async function fetchDiditResult(apiKey, sessionId) {
  const headers = { 'x-api-key': apiKey, Authorization: `Bearer ${apiKey}` };
  const decisionResponse = await fetch(`https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/decision/`, { headers });
  const decision = decisionResponse.ok ? await decisionResponse.json().catch(() => null) : null;
  const sessionResponse = await fetch(`https://verification.didit.me/v3/session/${encodeURIComponent(sessionId)}/`, { headers });
  const session = sessionResponse.ok ? await sessionResponse.json().catch(() => null) : null;

  if (!decision && !session) throw new Error('Didit did not return a session result.');
  return { ...(session || {}), ...(decision || {}), decision: decision?.decision || decision || session?.decision };
}

function vendorDataFrom(remote) {
  return parseVendorData(
    findDeep(remote, ['vendor_data', 'vendorData']) ||
    findDeep(remote?.decision, ['vendor_data', 'vendorData'])
  );
}

async function recordKyc(supabase, values) {
  // Store only minimum evidence needed for traceability; raw document images
  // belong in the restricted provider vault, never in a broadly readable row.
  const { error } = await supabase.from('Verificacion_kyc').insert(values);
  if (error) throw error;
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req);
    const sessionId = String(body.session_id || body.sessionId || '');
    if (!SESSION_ID_PATTERN.test(sessionId)) return res.status(400).json({ error: 'Invalid session id.' });

    const supabase = getSupabaseAdmin();
    const guarantorToken = body.garanteToken || body.token;
    let guarantor = null;
    let profile = null;
    let user = null;

    if (guarantorToken) {
      if (typeof guarantorToken !== 'string' || !INVITATION_TOKEN_PATTERN.test(guarantorToken)) {
        return sendForbidden(res, 'El enlace de verificación no es válido.');
      }
      const { data, error } = await supabase
        .from('Garante')
        .select('id_garante, id_pasaporte, didit_session_id, id_estado_garante, kyc_verificado, token_expires_at, token_used_at')
        .eq('token_hash', tokenDigest(guarantorToken))
        .eq('didit_session_id', sessionId)
        .eq('id_estado_garante', 3)
        .is('token_used_at', null)
        .gt('token_expires_at', new Date().toISOString())
        .maybeSingle();
      if (error || !data) return sendForbidden(res, 'El enlace de verificación no es válido.');
      guarantor = data;
    } else {
      const auth = await getAuthenticatedUser(req);
      user = auth.user;
      profile = auth.profile;
      if (auth.error || !user) return sendUnauthorized(res);
      if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');
    }

    const apiKey = String(process.env.DIDIT_API_KEY || '').trim();
    if (!apiKey) return res.status(503).json({ error: 'Verification service unavailable.' });

    const remote = await fetchDiditResult(apiKey, sessionId);
    const vendor = vendorDataFrom(remote);
    const expected = guarantor
      ? vendor?.kind === 'guarantor_kyc' && Number(vendor.guarantorId) === Number(guarantor.id_garante)
      : vendor?.kind === 'profile_kyc' && Number(vendor.profileId) === Number(profile.id_perfil) && String(vendor.userId) === String(user.id);
    if (!expected) return sendForbidden(res, 'La sesión no pertenece al sujeto autenticado.');

    const expectedWorkflow = String(process.env.DIDIT_WORKFLOW_ID || '').trim();
    const assessment = evaluateFullKyc(remote, expectedWorkflow);
    const status = assessment.status.toUpperCase();
    if (assessment.status === 'pending') {
      return res.status(200).json({ success: true, sessionId, status, isPending: true });
    }

    const document = buildDocument(remote);
    const evidence = {
      status,
      workflowId: assessment.workflowId,
      workflowMatches: assessment.workflowMatches,
      checks: assessment.checks,
      document: {
        fullName: document.fullName || null,
        documentNumber: document.documentNumber || null,
        dateOfBirth: document.dateOfBirth || null
      },
      processedAt: new Date().toISOString()
    };

    if (guarantor) {
      const update = {
        didit_session_id: sessionId,
        kyc_verificado: assessment.status === 'approved',
        id_estado_garante: assessment.status === 'approved' ? 4 : (assessment.status === 'declined' ? 7 : 3),
        updated_at: new Date().toISOString()
      };
      if (assessment.status === 'approved' && document.fullName) update.nombre_completo = document.fullName;
      if (assessment.status === 'approved' && document.dni) update.dni = document.dni;
      if (assessment.status === 'declined') update.motivo_rechazo = 'La verificación de identidad fue rechazada por el proveedor.';

      const { error } = await supabase
        .from('Garante')
        .update(update)
        .eq('id_garante', guarantor.id_garante)
        .eq('didit_session_id', sessionId)
        .eq('id_estado_garante', 3)
        .is('token_used_at', null);
      if (error) throw error;

      await recordKyc(supabase, [{
        id_garante: guarantor.id_garante,
        id_pasaporte: guarantor.id_pasaporte || null,
        proveedor: 'didit',
        session_id: sessionId,
        status: status.toLowerCase(),
        payload_raw: evidence
      }]);
    } else if (assessment.status === 'approved') {
      const profileUpdate = { cuenta_verificada: true, fecha_verificacion: new Date().toISOString() };
      if (document.fullName) profileUpdate.nombre_completo = document.fullName;
      if (document.dni) profileUpdate.dni = document.dni;
      if (document.dateOfBirth) profileUpdate.fecha_nacimiento = document.dateOfBirth;
      if (document.age) profileUpdate.edad = document.age;

      const { error: profileError } = await supabase
        .from('Perfil')
        .update(profileUpdate)
        .eq('id_perfil', profile.id_perfil)
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      const { data: passport, error: passportError } = await supabase
        .from('Pasaporte_vivat')
        .select('id_pasaporte')
        .eq('id_perfil', profile.id_perfil)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (passportError) throw passportError;

      if (passport) {
        const passportUpdate = { id_estado_pasaporte: 3, updated_at: new Date().toISOString() };
        if (document.fullName) passportUpdate.razon_social = document.fullName;
        if (document.dni) passportUpdate.dni = document.dni;
        if (document.dateOfBirth) passportUpdate.fecha_nacimiento = document.dateOfBirth;
        if (document.age) passportUpdate.edad = document.age;
        const { error } = await supabase.from('Pasaporte_vivat').update(passportUpdate).eq('id_pasaporte', passport.id_pasaporte);
        if (error) throw error;

        await recordKyc(supabase, [{
          id_pasaporte: passport.id_pasaporte,
          proveedor: 'didit',
          session_id: sessionId,
          status: 'approved',
          payload_raw: evidence
        }]);
      }
    }

    return res.status(200).json({
      success: true,
      sessionId,
      status,
      document: assessment.status === 'approved' ? document : null,
      checks: assessment.checks
    });
  } catch (error) {
    return sendInternalError(res, 'session-decision', error);
  }
}
