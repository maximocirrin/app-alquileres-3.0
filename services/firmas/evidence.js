import crypto from 'node:crypto';

export const EVIDENCE_NOTICE = 'Registro de evidencia emitido y firmado por Vivat. La hora proviene del servidor de Vivat; no constituye un sello de tiempo independiente ni una certificación de una autoridad licenciada.';
export const CONSENT_VERSION = 'contract-signature-v3-vivat';
export const CONSENT_TEXT = 'Acepto el PDF completo y sus anexos. Consiento la firma electrónica y una nueva verificación de documento y rostro con Didit. Acepto el registro de evidencia firmado por Vivat, cuya fecha proviene de su servidor y no de una autoridad de sellado de tiempo independiente.';

export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
const bytes = payload => Buffer.from(JSON.stringify(canonical(payload)), 'utf8');
export const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
export function publicKeyId(key) { return sha256(crypto.createPublicKey(key).export({ type: 'spki', format: 'der' })); }

export function signingKey() {
  try {
    const key = crypto.createPrivateKey({ key: Buffer.from(process.env.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64 || '', 'base64'), type: 'pkcs8', format: 'der' });
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('Unsupported signing key.');
    return key;
  } catch {
    const error = new Error('Falta configurar la clave privada del registro de evidencia de Vivat.');
    error.code = 'EVIDENCE_NOT_CONFIGURED';
    throw error;
  }
}

export function publicEvidenceKeys() {
  const current = crypto.createPublicKey(signingKey()).export({ type: 'spki', format: 'pem' });
  const archived = JSON.parse(process.env.SIGNATURE_EVIDENCE_ARCHIVED_PUBLIC_KEYS || '[]');
  if (!Array.isArray(archived)) throw new Error('Invalid archived key configuration.');
  return [...new Set([current, ...archived])].map(pem => ({
    id: sha256(crypto.createPublicKey(pem).export({ type: 'spki', format: 'der' })), pem
  }));
}

export function verifyStoredEvidence(evidence, documents) {
  const trusted = publicEvidenceKeys().find(k => k.id === evidence?.key_id);
  return Boolean(trusted && verifyEvidence(evidence, trusted.pem, documents));
}

export function issueEvidence({ signature, auditHash, originalHash, recordedAt }, privateKey = signingKey()) {
  if (![auditHash, originalHash].every(h => /^[a-f0-9]{64}$/.test(h || '')) || !Number.isFinite(Date.parse(recordedAt))) throw new Error('Invalid evidence input.');
  const keyId = publicKeyId(privateKey);
  const payload = {
    type: 'vivat.server-evidence.v1', issuer: 'Vivat', independent_timestamp: false,
    time_source: 'Vivat server clock', recorded_at: recordedAt,
    contract_id: Number(signature.id_contrato), signature_id: Number(signature.id_firma),
    signer_profile_id: Number(signature.id_perfil_firmante), role: signature.rol_firmante,
    didit_session_id: signature.didit_session_id, consent: {
      version: signature.didit_scores.consent_version, text: signature.didit_scores.consent_text,
      accepted_at: signature.didit_scores.consent_at
    }, original_sha256: originalHash, audit_sha256: auditHash, key_id: keyId, notice: EVIDENCE_NOTICE
  };
  return { algorithm: 'Ed25519', key_id: keyId, payload,
    signature: crypto.sign(null, bytes(payload), privateKey).toString('base64'),
    public_key_pem: crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) };
}

// Callers must supply an independently retained public key. A key embedded in
// an untrusted evidence file is not a trust anchor.
export function verifyEvidence(evidence, trustedPublicKey, { originalBytes, auditBytes } = {}) {
  try {
    if (evidence.algorithm !== 'Ed25519' || evidence.payload?.type !== 'vivat.server-evidence.v1' ||
        evidence.payload.independent_timestamp !== false) return false;
    const key = crypto.createPublicKey(trustedPublicKey);
    const id = sha256(key.export({ type: 'spki', format: 'der' }));
    if (id !== evidence.key_id || evidence.payload.key_id !== id) return false;
    if (originalBytes && sha256(originalBytes) !== evidence.payload.original_sha256) return false;
    if (auditBytes && sha256(auditBytes) !== evidence.payload.audit_sha256) return false;
    return crypto.verify(null, bytes(evidence.payload), key, Buffer.from(evidence.signature, 'base64'));
  } catch { return false; }
}
