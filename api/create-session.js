import crypto from 'crypto';
import dotenv from 'dotenv';
import {
  getAppUrl,
  getAuthenticatedUser,
  getSafeCallbackUrl,
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

// Vercel must leave bytes available for the signed webhook flow. Express
// already parses JSON and is handled by readJsonBody.
export const config = { api: { bodyParser: false } };

function configuredWorkflow(value) {
  const workflow = String(value || '').trim();
  return workflow && !workflow.startsWith('TU_WORKFLOW') && workflow !== 'YOUR_WORKFLOW_ID' && workflow.length >= 6
    ? workflow
    : null;
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
    const isSignatureFlow = body.flow === 'signature' || body.flow === 'contract_signature' || body.isLivenessOnly === true;
    const supabase = getSupabaseAdmin();

    let subject;
    let guarantor = null;

    if (guarantorToken) {
      if (!isUsableGuarantorToken(guarantorToken)) {
        return sendForbidden(res, 'El enlace de verificación no es válido.');
      }

      const { data, error } = await supabase
        .from('Garante')
        .select('id_garante, token_invitacion, id_estado_garante, kyc_verificado')
        .eq('token_invitacion', guarantorToken)
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

    const apiKey = String(process.env.DIDIT_API_KEY || '').trim();
    const workflow = configuredWorkflow(
      isSignatureFlow
        ? (process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID)
        : process.env.DIDIT_WORKFLOW_ID
    );
    const appUrl = getAppUrl();
    if (!apiKey || !workflow || !appUrl) {
      console.error('[create-session] Missing Didit or canonical app configuration.');
      return res.status(503).json({ error: 'Verification service unavailable.' });
    }

    const vendorData = JSON.stringify({ ...subject, nonce: crypto.randomUUID() });
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
      const { error } = await supabase
        .from('Garante')
        .update({ id_estado_garante: 3, didit_session_id: session.sessionId, updated_at: new Date().toISOString() })
        .eq('id_garante', guarantor.id_garante)
        .eq('token_invitacion', guarantorToken);
      if (error) throw error;
    }

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.sessionId,
      workflowType: isSignatureFlow ? 'liveness_biometrics' : 'passport_full'
    });
  } catch (error) {
    return sendInternalError(res, 'create-session', error);
  }
}

// session-decision binds a remote Didit result to this endpoint's subject;
// it trusts only data fetched from Didit, never values supplied by the caller.
export { parseVendorData };
