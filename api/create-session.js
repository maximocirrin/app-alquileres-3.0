import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  consumeRateLimit,
  getAppUrl,
  getAuthenticatedUser,
  getSafeCallbackUrl,
  getSupabaseAdmin,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendRateLimited,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

dotenv.config();

// Vercel must leave bytes available for the signed webhook flow. Express
// already parses JSON and is handled by readJsonBody.
export const config = { api: { bodyParser: false } };

function configuredWorkflow(value) {
  const workflow = String(value || '').trim();
  return workflow && !workflow.startsWith('TU_WORKFLOW') && workflow !== 'YOUR_WORKFLOW_ID' && workflow.length >= 6
    ? workflow
    : null;
}

function tokenDigest(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function parseVendorData(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function isUsableGuarantorToken(value) {
  // Invitation links are bearer credentials. Short, guessable identifiers are
  // deliberately rejected rather than becoming a public KYC oracle.
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,256}$/.test(value);
}

async function createDiditSession(apiKey, payload) {
  const request = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  };

  let response = await fetch('https://verification.didit.me/v3/session/', request);
  if (response.status === 404) response = await fetch('https://api.didit.me/v1/session/', request);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Didit rejected the session request (${response.status}).`);

  const sessionId = data.session_id || data.sessionId || data.id;
  const url = data.url || data.session_url || data.verification_url;
  if (!sessionId || !url) throw new Error('Didit did not return a usable session.');
  return { sessionId: String(sessionId), url: String(url) };
}

/** Create a KYC session for the authenticated subject or an opaque invite. */
export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = await readJsonBody(req);
    const guarantorToken = body.garanteToken || body.token;
    const requestedSignatureFlow = body.flow === 'signature' || body.flow === 'contract_signature' || body.isLivenessOnly === true;
    if (requestedSignatureFlow) {
      return res.status(400).json({
        error: 'Invalid verification flow.',
        message: 'Las firmas contractuales deben iniciarse desde el flujo de firma dedicado.'
      });
    }
    const supabase = getSupabaseAdmin();

    let subject;
    let guarantor = null;

    if (guarantorToken) {
      if (!isUsableGuarantorToken(guarantorToken)) {
        return sendForbidden(res, 'El enlace de verificación no es válido.');
      }

      const { data, error } = await supabase
        .from('Garante')
        .select('id_garante, id_estado_garante, kyc_verificado, token_expires_at, token_used_at')
        .eq('token_hash', tokenDigest(guarantorToken))
        .eq('id_estado_garante', 2)
        .is('token_used_at', null)
        .gt('token_expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !data || data.kyc_verificado) {
        // Do not reveal whether an invitation exists or has already been used.
        return sendForbidden(res, 'El enlace de verificación no es válido o ya no está disponible.');
      }
      guarantor = data;
      subject = { kind: 'guarantor_kyc', guarantorId: Number(data.id_garante) };
    } else {
      const { user, profile, error } = await getAuthenticatedUser(req);
      if (error || !user) return sendUnauthorized(res);
      if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');
      subject = { kind: 'profile_kyc', profileId: Number(profile.id_perfil), userId: user.id };
    }

    const rateSubject = guarantor
      ? `guarantor:${guarantor.id_garante}`
      : `profile:${subject.profileId}`;
    if (!await consumeRateLimit(supabase, 'didit-kyc-session', rateSubject, 5, 60 * 60)) {
      return sendRateLimited(res);
    }

    const apiKey = String(process.env.DIDIT_API_KEY || '').trim();
    const workflow = configuredWorkflow(process.env.DIDIT_WORKFLOW_ID);
    const appUrl = getAppUrl();
    if (!apiKey || !workflow || !appUrl) {
      console.error('[create-session] Missing Didit or canonical app configuration.');
      return res.status(503).json({ error: 'Verification service unavailable.' });
    }

    const vendorData = JSON.stringify({
      ...subject,
      workflowId: workflow,
      requiredChecks: ['document', 'liveness', 'face_match'],
      nonce: crypto.randomUUID()
    });
    const callbackUrl = getSafeCallbackUrl(body.callbackUrl || process.env.DIDIT_CALLBACK_URL);
    const payload = {
      workflow_id: workflow,
      vendor_data: vendorData,
      webhook_url: `${appUrl}/api/webhook`,
      webhook: `${appUrl}/api/webhook`
    };
    if (callbackUrl) {
      payload.callback_url = callbackUrl;
      payload.redirect_url = callbackUrl;
    }

    const session = await createDiditSession(apiKey, payload);

    if (guarantor) {
      const { data: claimed, error } = await supabase
        .from('Garante')
        .update({ id_estado_garante: 3, didit_session_id: session.sessionId, updated_at: new Date().toISOString() })
        .eq('id_garante', guarantor.id_garante)
        .eq('token_hash', tokenDigest(guarantorToken))
        .eq('id_estado_garante', 2)
        .is('token_used_at', null)
        .select('id_garante');
      if (error) throw error;
      if (!Array.isArray(claimed) || claimed.length !== 1) {
        return res.status(409).json({ error: 'Invitation state changed. Please request a new verification link.' });
      }
    }

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.sessionId,
      workflowType: 'passport_full'
    });
  } catch (error) {
    return sendInternalError(res, 'create-session', error);
  }
}

// session-decision binds a remote Didit result to this endpoint's subject;
// it trusts only data fetched from Didit, never values supplied by the caller.
export { parseVendorData };
