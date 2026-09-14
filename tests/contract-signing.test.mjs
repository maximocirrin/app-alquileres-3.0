import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { evaluateFullKyc } from '../api/_didit-kyc.js';
import { matchesSignature, refreshSignature } from '../services/firmas/didit.js';
import { verifyDiditSignature } from '../services/firmas/webhook-didit.js';
import { contractRevision, assertDocumentHash, uploadImmutable } from '../services/firmas/integrity.js';
import { getContractParties } from '../services/firmas/partes.js';
import { prepareContractDocument, assertReviewedDocument, persistAcceptedDocument } from '../services/firmas/documento.js';
import { generateOriginalContractPdf, generateAuditTrailPdf, mergeFinalContractPdf } from '../services/firmas/pdf-generator.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });
const workflow = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const signature = { id_firma: 8, id_contrato: 3, id_perfil_firmante: 7, rol_firmante: 'inquilino',
  estado_firma: 'iniciada', didit_session_id: 'session-123', didit_scores: { consent_version: 'v1', contract_revision: 'revision' } };
function decision() { return { session_id: 'session-123', workflow_id: workflow, status: 'Approved',
  vendor_data: JSON.stringify({ kind: 'contract_signature', contractId: 3, profileId: 7, role: 'inquilino' }),
  id_verifications: [{ status: 'Approved', document_number: '12.345.678' }],
  liveness_checks: [{ status: 'Approved' }], face_matches: [{ status: 'Approved' }] }; }

test('signature requires document, liveness, face match and the configured workflow', () => {
  assert.equal(evaluateFullKyc(decision(), workflow).status, 'approved');
  for (const key of ['id_verifications','liveness_checks','face_matches']) {
    const incomplete = decision(); delete incomplete[key];
    assert.equal(evaluateFullKyc(incomplete, workflow).status, 'review_required');
  }
  assert.equal(evaluateFullKyc(decision(), 'another-workflow').status, 'review_required');
});
test('review, rejection and expired sessions are never approval', () => {
  for (const status of ['Declined','Abandoned','Expired']) assert.equal(evaluateFullKyc({ ...decision(), status }, workflow).status, 'declined');
  assert.equal(evaluateFullKyc({ ...decision(), status: 'In Review' }, workflow).status, 'review_required');
});
test('a valid session for a different contract, signer or role cannot be reused', () => {
  assert.equal(matchesSignature(decision(), signature), true);
  for (const patch of [{ id_contrato: 4 }, { id_perfil_firmante: 9 }, { rol_firmante: 'propietario' }]) {
    assert.equal(matchesSignature(decision(), { ...signature, ...patch }), false);
  }
});

function dbForDecision(dni) {
  let written;
  return { get written() { return written; }, from(table) {
    const query = { select() { return this; }, eq() { return this; },
      update(value) { written = value; return this; },
      single: async () => ({ data: { dni } }), maybeSingle: async () => ({ data: { ...signature, ...written } }) };
    assert.ok(['Perfil','Firma_contrato'].includes(table)); return query;
  } };
}
test('server polling validates DNI and preserves consent evidence', async () => {
  process.env.DIDIT_API_KEY = 'test-only'; process.env.DIDIT_WORKFLOW_ID_SIGNATURE = workflow;
  globalThis.fetch = async () => new Response(JSON.stringify(decision()));
  const db = dbForDecision('12345678');
  const result = await refreshSignature(db, signature);
  assert.equal(result.estado_firma, 'biometria_aprobada');
  assert.equal(db.written.didit_scores.contract_revision, 'revision');
  assert.equal(db.written.didit_scores.identity_matches, true);
  const mismatch = dbForDecision('87654321');
  await refreshSignature(mismatch, signature);
  assert.equal(mismatch.written.didit_status, 'REVIEW_REQUIRED');
  globalThis.fetch = async () => new Response(JSON.stringify({ ...decision(),
    id_verifications: [{ status: 'Approved', document_number: 'AB12345678' }] }));
  const otherDocument = dbForDecision('12345678');
  await refreshSignature(otherDocument, signature);
  assert.equal(otherDocument.written.didit_status, 'REVIEW_REQUIRED');
});
test('a provider outage cannot approve or mutate a signature', async () => {
  globalThis.fetch = async () => new Response('{}', { status: 503 });
  const db = dbForDecision('12345678');
  await assert.rejects(refreshSignature(db, signature), /503/);
  assert.equal(db.written, undefined);
});
test('late callbacks do not modify sealed or superseded signatures', async () => {
  globalThis.fetch = async () => { throw Error('Should not call Didit'); };
  for (const patch of [{ estado_firma: 'sellada' }, { didit_status: 'SUPERSEDED' }]) {
    const immutable = { ...signature, ...patch };
    assert.equal(await refreshSignature({}, immutable), immutable);
  }
});
test('webhook HMAC rejects tampering and replay outside the timestamp window', () => {
  process.env.DIDIT_SIGNATURE_WEBHOOK_SECRET = 'test-secret';
  const timestamp = Math.floor(Date.now()/1000);
  const body = { session_id: 'session-123', timestamp };
  const raw = Buffer.from(JSON.stringify(body));
  const digest = crypto.createHmac('sha256','test-secret').update(raw).digest('hex');
  const req = { rawBody: raw, headers: { 'x-timestamp': String(timestamp), 'x-signature': digest } };
  assert.equal(verifyDiditSignature(req, body), true);
  assert.equal(verifyDiditSignature({ ...req, rawBody: Buffer.from('{}') }, body), false);
  assert.equal(verifyDiditSignature({ ...req, headers: { ...req.headers, 'x-timestamp': String(timestamp-600) } }, body), false);
});
test('contract revision binds agreed terms and ignores JSON key order and storage metadata', () => {
  const a = { monto_cierre: 10, clausulas_adicionales: { b: 2, a: 1 } };
  assert.equal(contractRevision(a), contractRevision({ ...a, url_contrato_original_pdf: 'object.pdf', clausulas_adicionales: { a: 1, b: 2 } }));
  assert.notEqual(contractRevision(a), contractRevision({ ...a, monto_cierre: 11 }));
  assert.notEqual(contractRevision(a), contractRevision({ ...a, Propietario: { dni: '12345678' } }));
});
test('immutable documents reject altered bytes and recover identical upload retries', async () => {
  const bytes = Buffer.from('signed document');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  assertDocumentHash(bytes, hash);
  assert.throws(() => assertDocumentHash(Buffer.from('altered'), hash));
  const storage = { upload: async () => ({ error: Error('Already exists') }), download: async () => ({ data: new Blob([bytes]) }) };
  await uploadImmutable({ storage: { from: () => storage } }, 'immutable.pdf', bytes);
  await assert.rejects(uploadImmutable({ storage: { from: () => storage } }, 'immutable.pdf', Buffer.from('different')), /integrity/);
});
test('contract identities query only contracts of the authenticated participant', async () => {
  let filter;
  const db = { from(table) { return { select() { return this; },
    or(value) { filter = value; return Promise.resolve({ data: [{ id_contrato: 1, id_perfil_inquilino: 7, id_perfil_propietario: 9 }] }); },
    in(_key, ids) { assert.deepEqual(ids, [7,9]); return Promise.resolve({ data: [{ id_perfil: 7, nombre_completo: 'Tenant' }, { id_perfil: 9, nombre_completo: 'Owner' }] }); }
  }; } };
  const [result] = await getContractParties(db, 7);
  assert.equal(filter, 'id_perfil_inquilino.eq.7,id_perfil_propietario.eq.7');
  assert.equal(result.owner.nombre_completo, 'Owner');
});
test('PDF generation requires saved clauses and preserves original plus every audit page', async () => {
  const params = { contractId: 1, contrato: { monto_cierre: 123456, fecha_inicio_contrato: '2026-09-01',
    clausulas_adicionales: { activeClausesList: [{ tag: 'ACUERDO', body: 'Texto acordado por ambas partes.' }] } },
    propietario: { nombre_completo: 'Ana', dni: '11111111', mail: 'ana@example.com' },
    inquilino: { nombre_completo: 'Bruno', dni: '22222222', mail: 'bruno@example.com' } };
  const original = await generateOriginalContractPdf(params);
  assert.deepEqual(original, await generateOriginalContractPdf(params));
  const audit = await generateAuditTrailPdf({ contractId: 1, firmaId: 3, diditSessionId: 'session-real',
    originalPdfHash: crypto.createHash('sha256').update(original).digest('hex'), diditScores: { liveness_status: 'approved' } });
  const merged = await mergeFinalContractPdf({ originalPdfBytes: original, inquilinoAuditBytes: audit.auditTrailBytes,
    propietarioAuditBytes: audit.auditTrailBytes, garantesAuditBytes: [audit.auditTrailBytes] });
  assert.equal((await PDFDocument.load(merged.finalPdfBytes)).getPageCount(), 4);
  assertDocumentHash(merged.finalPdfBytes, merged.finalPdfHash);
  await assert.rejects(generateOriginalContractPdf({ ...params, contrato: { monto_cierre: 123, fecha_inicio_contrato: '2026-09-01' } }), /clauses/);
  await assert.rejects(generateOriginalContractPdf({ ...params, contrato: { ...params.contrato, monto_cierre: 0 } }), /rent/);
});

test('preview does not write a contract; consent rejects a missing or changed PDF hash', async () => {
  const db = { from(table) {
    assert.ok(['Inventario_Digital', 'Pasaporte_vivat'].includes(table));
    return { select() { return this; }, eq() { return this; },
      maybeSingle: async () => ({ data: null }),
      then(resolve) { resolve({ data: [] }); } };
  } };
  const contract = { id_contrato: 1, id_perfil_inquilino: 2, monto_cierre: 100,
    fecha_inicio_contrato: '2026-09-01', clausulas_adicionales: {
      activeClausesList: [{ tag: 'ACUERDO', body: 'Condiciones originales.' }] } };
  const reviewed = await prepareContractDocument(db, contract);
  assertReviewedDocument(reviewed, reviewed.hash);
  assert.throws(() => assertReviewedDocument(reviewed, undefined), /no fue revisado/);
  const changed = await prepareContractDocument(db, { ...contract, clausulas_adicionales: {
    activeClausesList: [{ tag: 'ACUERDO', body: 'Condiciones cambiadas.' }] } });
  assert.notEqual(changed.path, reviewed.path);
  assert.throws(() => assertReviewedDocument(changed, reviewed.hash), /cambió/);
});

test('a concurrent or historical accepted document cannot be overwritten by another preview', async () => {
  const bytes = Buffer.from('reviewed PDF');
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const document = { bytes, hash, path: `contrato_1/contrato_original_${hash}.pdf` };
  let stored = { hash_original_sha256: hash, url_contrato_original_pdf: document.path };
  const db = { storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    from() { return { update() { return this; }, eq() { return this; },
      is(key, value) { assert.equal(key, 'hash_original_sha256'); assert.equal(value, null); return Promise.resolve({ error: null }); },
      select() { return this; }, single: async () => ({ data: stored }) }; } };
  await persistAcceptedDocument(db, 1, document);
  stored = { ...stored, hash_original_sha256: '0'.repeat(64) };
  await assert.rejects(persistAcceptedDocument(db, 1, document), /otra versión/);
});
