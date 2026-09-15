import assert from 'node:assert/strict';
import { test } from 'node:test';
import crypto from 'node:crypto';
import { issueEvidence, verifyEvidence, sha256, signingKey, CONSENT_VERSION, CONSENT_TEXT } from '../services/firmas/evidence.js';
import { canAccessGuarantee, bindGuarantor, getSigningContract, contractGuarantors } from '../services/firmas/participants.js';

const pair = crypto.generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' });
const originalBytes = Buffer.from('original accepted PDF'), auditBytes = Buffer.from('audit PDF');
const signature = { id_firma: 1, id_contrato: 2, id_perfil_firmante: 3, rol_firmante: 'garante', didit_session_id: 'didit-session',
  didit_scores: { consent_at: '2026-09-15T10:00:00.000Z', consent_version: CONSENT_VERSION, consent_text: CONSENT_TEXT } };
const create = () => issueEvidence({ signature, auditHash: sha256(auditBytes), originalHash: sha256(originalBytes), recordedAt: '2026-09-15T10:01:00.000Z' }, pair.privateKey);
test('Vivat evidence verifies original and audit bytes using a pinned public key', () => {
  const evidence = create();
  assert.equal(verifyEvidence(evidence, publicKey, { originalBytes, auditBytes }), true);
  assert.equal(evidence.payload.independent_timestamp, false);
  assert.equal(evidence.payload.consent.text, CONSENT_TEXT);
});
test('changing dates, signer, contract, files or signing key invalidates evidence', () => {
  for (const key of ['recorded_at', 'signer_profile_id', 'contract_id', 'didit_session_id']) {
    const evidence = create(); evidence.payload[key] = 'altered';
    assert.equal(verifyEvidence(evidence, publicKey), false);
  }
  for (const part of ['originalBytes', 'auditBytes']) {
    assert.equal(verifyEvidence(create(), publicKey, { originalBytes, auditBytes, [part]: Buffer.from('tampered') }), false);
  }
  const other = crypto.generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' });
  assert.equal(verifyEvidence(create(), other), false);
  const replaced = create(); replaced.public_key_pem = other;
  assert.equal(verifyEvidence(replaced, other), false);
});
test('missing or invalid configured key blocks evidence instead of synthesizing it', () => {
  const saved = process.env.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64;
  try { delete process.env.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64; assert.throws(signingKey, { code: 'EVIDENCE_NOT_CONFIGURED' }); }
  finally { if (saved) process.env.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64 = saved; }
});
test('guarantor access uses the bound profile or the verified Auth email, never editable profile mail', () => {
  const profile = { id_perfil: 3, mail: 'invited@example.com' };
  const invitation = { email: 'invited@example.com', id_perfil: null };
  assert.equal(canAccessGuarantee(invitation, profile, { email: 'other@example.com', email_confirmed_at: 'date' }), false);
  assert.equal(canAccessGuarantee(invitation, profile, { email: invitation.email }), false);
  assert.equal(canAccessGuarantee(invitation, profile, { email: invitation.email, email_confirmed_at: 'date' }), true);
  assert.equal(canAccessGuarantee({ ...invitation, id_perfil: 4 }, profile, { email: invitation.email, email_confirmed_at: 'date' }), false);
});
test('a mismatched document cannot claim a guarantor invitation', async () => {
  await assert.rejects(bindGuarantor({}, { datos: { dni: '11111111' } }, { dni: '22222222' }), { code: 'CONTRACT_INCOMPLETE' });
});
test('frozen guarantees are read from the contract, not the changing passport', async () => {
  const db = { from(table) { assert.equal(table, 'Contrato_Garante'); return {
    select() { return this; }, eq(_key, id) { assert.equal(id, 2); return this; },
    order: async () => ({ data: [{ datos: { dni: '123', nombre_completo: 'Original' } }] })
  }; } };
  assert.deepEqual(await contractGuarantors(db, { id_contrato: 2, garantes_fijados_at: 'date' }), [{ dni: '123', nombre_completo: 'Original' }]);
});
test('guarantor access does not change the shared payment authorization helper', async () => {
  const db = { from(table) { return { select() { return this; }, eq() { return this; },
    maybeSingle: async () => ({ data: { id_contrato: 2, id_perfil_inquilino: 5, id_perfil_propietario: 6 } }),
    then(resolve) { assert.equal(table, 'Contrato_Garante'); resolve({ data: [{ id_perfil: 3 }] }); }
  }; } };
  const access = await getSigningContract(db, 2, { id_perfil: 3 }, {});
  assert.equal(access.role, 'garante');
});
