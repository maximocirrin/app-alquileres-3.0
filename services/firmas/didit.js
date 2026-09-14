import { evaluateFullKyc } from '../../api/_didit-kyc.js';

export function signatureWorkflow() {
  return String(process.env.DIDIT_WORKFLOW_ID_SIGNATURE || process.env.DIDIT_SIGNATURE_WORKFLOW_ID || '').trim();
}

export function parseVendorData(value) {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return null; }
}

export function matchesSignature(remote, signature) {
  const vendor = parseVendorData(remote.vendor_data ?? remote.decision?.vendor_data);
  return vendor?.kind === 'contract_signature'
    && Number(vendor.contractId) === Number(signature.id_contrato)
    && Number(vendor.profileId) === Number(signature.id_perfil_firmante)
    && vendor.role === signature.rol_firmante;
}

export async function diditRequest(path, options = {}) {
  const key = String(process.env.DIDIT_API_KEY || '').trim();
  if (!key) throw new Error('Didit is not configured.');
  const response = await fetch(`https://verification.didit.me/v3/${path}`, {
    ...options, signal: AbortSignal.timeout(12000), redirect: 'error',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key }
  });
  if (!response.ok) throw new Error(`Didit request failed (${response.status}).`);
  return response.json();
}

// Both polling and webhooks retrieve the authoritative decision. Webhook order
// cannot regress a newer result, and browser messages cannot approve a signature.
export async function refreshSignature(supabase, signature) {
  if (signature.didit_status === 'SUPERSEDED') return signature;
  if (['sellada', 'completada'].includes(signature.estado_firma)) return signature;
  if (!/^[A-Za-z0-9_-]{6,200}$/.test(signature.didit_session_id || '')) return signature;
  const remote = await diditRequest(`session/${encodeURIComponent(signature.didit_session_id)}/decision/`);
  if (!matchesSignature(remote, signature)) throw new Error('Didit signature binding mismatch.');
  const assessment = evaluateFullKyc(remote, signatureWorkflow());
  const { data: signer, error } = await supabase.from('Perfil').select('dni')
    .eq('id_perfil', signature.id_perfil_firmante).single();
  if (error) throw error;
  const documentNumber = value => String(value || '').toUpperCase().replace(/[.\s-]/g, '');
  const documents = remote.id_verifications || remote.decision?.id_verifications || [];
  const identityMatches = Boolean(documentNumber(signer.dni)) && documents.some(d => documentNumber(d.document_number) === documentNumber(signer.dni));
  const status = assessment.status === 'approved' && !identityMatches ? 'review_required' : assessment.status;
  const update = {
    estado_firma: status === 'approved' ? 'biometria_aprobada' : status === 'declined' ? 'biometria_rechazada' : 'biometria_pendiente',
    didit_status: status.toUpperCase(),
    didit_scores: { ...signature.didit_scores, decision_status: status, workflow_id: assessment.workflowId,
      workflow_matches: assessment.workflowMatches, identity_matches: identityMatches,
      document_status: assessment.checks.document ? 'approved' : 'unverified',
      face_match_status: assessment.checks.faceMatch ? 'approved' : 'unverified',
      liveness_status: assessment.checks.liveness ? 'approved' : 'unverified', processed_at: new Date().toISOString() }
  };
  const { data, error: updateError } = await supabase.from('Firma_contrato').update(update)
    .eq('id_firma', signature.id_firma).eq('didit_session_id', signature.didit_session_id)
    .eq('estado_firma', signature.estado_firma).select('*').maybeSingle();
  if (updateError) throw updateError;
  return data || signature;
}
