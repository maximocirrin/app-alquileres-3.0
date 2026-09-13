import crypto from 'crypto';
import {
  consumeRateLimit,
  getAppUrl,
  getAuthenticatedUser,
  getClientIp,
  getContractForProfile,
  getSafeCallbackUrl,
  getSupabaseAdmin,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendRateLimited,
  sendUnauthorized,
  setCorsHeaders
} from '../../api/_auth.js';

function configuredWorkflow(value) {
  const workflow = String(value || '').trim();
  return workflow && !workflow.startsWith('TU_WORKFLOW') && workflow.length >= 6 ? workflow : null;
}

async function createDiditSignatureSession(apiKey, payload) {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  };
  let response = await fetch('https://verification.didit.me/v3/session/', options);
  if (response.status === 404) response = await fetch('https://api.didit.me/v1/session/', options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data?.message || data?.error || JSON.stringify(data);
    throw new Error(`Didit rejected the signature session (${response.status}): ${errorMsg}`);
  }

  const sessionId = data.session_id || data.sessionId || data.id;
  const url = data.url || data.session_url || data.verification_url;
  if (!sessionId || !url) throw new Error('Didit did not return a usable signature session.');
  return { sessionId: String(sessionId), url: String(url) };
}

/** Starts a signature session; role and signer identity are always server-derived. */
export default async function iniciarHandler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res);
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = await readJsonBody(req);
    const contractId = parsePositiveInteger(body.id_contrato || body.idContrato);
    if (!contractId) return res.status(400).json({ ok: false, error: 'Invalid contract id.' });
    if (body.consentGiven !== true) {
      return res.status(400).json({ ok: false, error: 'Legal consent is required before signing.' });
    }

    const supabase = getSupabaseAdmin();
    const { contract, role, error: contractError } = await getContractForProfile(supabase, contractId, profile.id_perfil);
    if (contractError) throw contractError;
    if (!contract) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (!role) return sendForbidden(res, 'No eres parte de este contrato.');
    if (!await consumeRateLimit(supabase, 'didit-signature-session', `${profile.id_perfil}:${contractId}`, 5, 60 * 60)) {
      return sendRateLimited(res);
    }

    const apiKey = String(process.env.DIDIT_API_KEY || '').trim();
    const workflow = configuredWorkflow(process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID);
    const appUrl = getAppUrl();
    if (!apiKey || !workflow || !appUrl) {
      console.error('[firmas/iniciar] Missing Didit or canonical app configuration.');
      return res.status(503).json({ ok: false, error: 'Signature service unavailable.' });
    }

    // A user may not create arbitrary parallel sessions to race a later webhook.
    const { data: existing, error: existingError } = await supabase
      .from('Firma_contrato')
      .select('id_firma, estado_firma, didit_session_id')
      .eq('id_contrato', contractId)
      .eq('id_perfil_firmante', profile.id_perfil)
      .in('estado_firma', ['iniciada', 'biometria_pendiente', 'biometria_aprobada'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      return res.status(409).json({
        ok: false,
        error: 'Signature already in progress.',
        message: 'Ya existe una firma pendiente para este contrato. Espere a que finalice o solicite asistencia.'
      });
    }

    const callbackUrl = getSafeCallbackUrl(body.callbackUrl);
    const vendorData = JSON.stringify({
      kind: 'contract_signature',
      contractId,
      profileId: Number(profile.id_perfil),
      role,
      workflowId: workflow,
      requiredChecks: ['liveness'],
      nonce: crypto.randomUUID()
    });
    const webhookUrl = `${appUrl}/api/firmas/webhook-didit`;
    const payload = { workflow_id: workflow, vendor_data: vendorData, webhook_url: webhookUrl, webhook: webhookUrl };
    if (callbackUrl) {
      payload.callback_url = callbackUrl;
      payload.redirect_url = callbackUrl;
    }

    const didit = await createDiditSignatureSession(apiKey, payload);
    const { data: signature, error: insertError } = await supabase
      .from('Firma_contrato')
      .insert([{
        id_contrato: contract.id_contrato,
        id_perfil_firmante: Number(profile.id_perfil),
        rol_firmante: role,
        estado_firma: 'iniciada',
        didit_status: 'PENDING',
        didit_session_id: didit.sessionId,
        didit_session_url: didit.url,
        ip_origen: getClientIp(req).slice(0, 128),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 512)
      }])
      .select('id_firma, id_contrato, rol_firmante, estado_firma, didit_session_id, didit_session_url, created_at')
      .single();
    if (insertError) throw insertError;

    return res.status(201).json({
      ok: true,
      data: {
        id_firma: signature.id_firma,
        id_contrato: signature.id_contrato,
        rol_firmante: signature.rol_firmante,
        estado_firma: signature.estado_firma,
        didit_session_id: signature.didit_session_id,
        didit_session_url: signature.didit_session_url,
        created_at: signature.created_at
      }
    });
  } catch (error) {
    return sendInternalError(res, 'firmas/iniciar', error);
  }
}
