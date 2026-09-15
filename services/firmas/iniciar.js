import crypto from 'crypto';
import { diditRequest } from './didit.js';
import { signingKey, CONSENT_TEXT, CONSENT_VERSION } from './evidence.js';
import { getSigningContract, bindGuarantor } from './participants.js';
import { prepareContractDocument, assertReviewedDocument, persistAcceptedDocument } from './documento.js';
import { readContractForSigning, contractRevision } from './integrity.js';
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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workflow) ? workflow : null;
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
  const data = await diditRequest('session/', options);

  const sessionId = data.session_id || data.sessionId || data.id;
  const url = data.url || data.session_url || data.verification_url;
  const parsedUrl = new URL(url);
  if (!/^[A-Za-z0-9_-]{6,200}$/.test(sessionId || '') || parsedUrl.protocol !== 'https:' ||
    !(parsedUrl.hostname === 'didit.me' || parsedUrl.hostname.endsWith('.didit.me'))) {
    throw new Error('Didit did not return a usable signature session.');
  }
  return { sessionId: String(sessionId), url: String(url) };
}

/** Starts a signature session; role and signer identity are always server-derived. */
export default async function iniciarHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
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
    if (body.consentGiven !== true || body.consentVersion !== CONSENT_VERSION) {
      return res.status(400).json({ ok: false, error: 'Legal consent is required before signing.' });
    }

    const supabase = getSupabaseAdmin();
    const { contract, role, guarantor, error: contractError } = await getSigningContract(supabase, contractId, profile, user);
    if (contractError) throw contractError;
    if (!contract) return res.status(404).json({ ok: false, error: 'Not Found' });
    if (!role) return sendForbidden(res, 'No eres parte de este contrato.');
    let contractDetail = await readContractForSigning(supabase, contractId);
    if (!await consumeRateLimit(supabase, 'didit-signature-session', `${profile.id_perfil}:${contractId}`, 5, 60 * 60)) {
      return sendRateLimited(res);
    }

    const apiKey = String(process.env.DIDIT_API_KEY || '').trim();
    const workflow = configuredWorkflow(process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID);
    const appUrl = getAppUrl();
    signingKey();
    if (!apiKey || !workflow || !appUrl) {
      console.error('[firmas/iniciar] Missing Didit or canonical app configuration.');
      return res.status(503).json({ ok: false, error: 'Signature service unavailable.', message: 'Falta configurar el servicio de verificación de identidad.' });
    }

    // A user may not create arbitrary parallel sessions to race a later webhook.
    const { data: existing, error: existingError } = await supabase
      .from('Firma_contrato')
      .select('id_firma, id_contrato, rol_firmante, estado_firma, didit_session_id, didit_session_url, didit_scores, created_at')
      .eq('id_contrato', contractId)
      .eq('id_perfil_firmante', profile.id_perfil)
      .in('estado_firma', ['iniciada', 'biometria_pendiente', 'biometria_aprobada', 'sellada', 'completada'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.didit_scores?.document_hash && existing.didit_scores?.contract_revision === contractRevision(contractDetail) &&
          existing.didit_scores.document_hash !== body.documentHash && !['sellada', 'completada'].includes(existing.estado_firma)) {
        return res.status(409).json({ ok: false, message: 'Esta sesión corresponde a otro PDF. Revisá el documento aceptado antes de continuar.' });
      }
      if (['sellada','completada'].includes(existing.estado_firma) ||
          (existing.didit_scores?.contract_revision === contractRevision(contractDetail) &&
           existing.didit_scores?.document_hash === body.documentHash && existing.didit_scores?.consent_version === CONSENT_VERSION)) {
        const { didit_scores, ...publicSignature } = existing;
        return res.status(200).json({ ok: true, data: publicSignature, resumed: true });
      }
      const { error } = await supabase.from('Firma_contrato').update({ estado_firma: 'biometria_rechazada', didit_status: 'SUPERSEDED' })
        .eq('id_firma', existing.id_firma).eq('estado_firma', existing.estado_firma);
      if (error) throw error;
    }

    const { data: history, error: historyError } = await supabase.from('Historial_Estado_Contrato')
      .select('id_estado_contrato').eq('id_contrato', contractId).is('fecha_fin', null)
      .order('fecha_inicio', { ascending: false }).limit(1).maybeSingle();
    if (historyError) throw historyError;
    if (Number(history?.id_estado_contrato) !== 5) {
      return res.status(409).json({ ok: false, message: 'El contrato no está pendiente de firma.' });
    }
    const { data: parties, error: partiesError } = await supabase.from('Perfil')
      .select('id_perfil, nombre_completo, dni, mail').in('id_perfil', [contract.id_perfil_inquilino, contract.id_perfil_propietario]);
    if (partiesError) throw partiesError;
    if (parties?.length !== 2 || parties.some(p => !p.nombre_completo?.trim() || !p.dni?.trim() || !p.mail?.trim())) {
      return res.status(422).json({ ok: false, message: 'Completá nombre, DNI y email de ambas partes antes de firmar.' });
    }

    if (guarantor) await bindGuarantor(supabase, guarantor, profile);
    const { error: freezeError } = await supabase.rpc('freeze_contract_guarantors', { p_contract_id: contractId });
    if (freezeError) throw freezeError;
    contractDetail = await readContractForSigning(supabase, contractId);
    const document = await prepareContractDocument(supabase, contractDetail);
    assertReviewedDocument(document, body.documentHash);
    await persistAcceptedDocument(supabase, contractId, document);
    const callbackUrl = getSafeCallbackUrl(body.callbackUrl);
    const vendorData = JSON.stringify({
      kind: 'contract_signature',
      contractId,
      profileId: Number(profile.id_perfil),
      role,
      workflowId: workflow,
      requiredChecks: ['document', 'liveness', 'faceMatch'],
      documentHash: document.hash
    });
    const payload = { workflow_id: workflow, vendor_data: vendorData, callback_method: 'both', language: 'es' };
    if (callbackUrl) {
      payload.callback = callbackUrl;
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
        didit_scores: { consent_given: true, consent_at: new Date().toISOString(), consent_version: CONSENT_VERSION, consent_text: CONSENT_TEXT, expected_dni: guarantor?.datos.dni || profile.dni, contract_revision: document.revision, document_hash: document.hash, document_path: document.path },
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
    if (error.code === 'EVIDENCE_NOT_CONFIGURED') return res.status(503).json({ ok: false, message: error.message });
    if (error.code === 'P0001') return res.status(409).json({ ok: false, message: error.message });
    if (error.code === 'DOCUMENT_CHANGED') return res.status(409).json({ ok: false, message: error.message });
    if (error.code === 'CONTRACT_INCOMPLETE') return res.status(422).json({ ok: false, message: error.message });
    if (error.code === '23505') return res.status(409).json({ ok: false, message: 'Otra solicitud ya inició esta firma. Volvé a intentarlo para retomarla.' });
    return sendInternalError(res, 'firmas/iniciar', error);
  }
}
