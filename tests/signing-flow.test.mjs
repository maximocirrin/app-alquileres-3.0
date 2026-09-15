import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import crypto from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
process.env.SUPABASE_URL = 'https://signature-flow-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-public';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-private';
process.env.APP_URL = 'https://vivat.com.ar';
process.env.NODE_ENV = 'test';
process.env.DIDIT_API_KEY = 'test-didit';
process.env.DIDIT_WORKFLOW_ID_SIGNATURE = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const pair = crypto.generateKeyPairSync('ed25519');
process.env.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64 = pair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
const { default: preview } = await import('../services/firmas/previsualizar.js');
const { default: start } = await import('../services/firmas/iniciar.js');
const { default: seal } = await import('../services/firmas/sellar.js');
const { default: finalize } = await import('../services/firmas/finalizar.js');
const { CONSENT_VERSION, verifyEvidence } = await import('../services/firmas/evidence.js');
const realFetch = globalThis.fetch;
after(() => { globalThis.fetch = realFetch; });
let sequence = 0;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function fixture() {
  const run = ++sequence;
  const profiles = [1,2,3,4].map(i => ({ id_perfil: i, user_id: `flow-${run}-${i}`, nombre_completo: `Persona ${i}`,
    dni: `${i}2345678`, mail: `persona${i}@example.com` }));
  const contract = { id_contrato: 70, id_propiedad: 10, id_perfil_inquilino: 1, id_perfil_propietario: 2,
    monto_cierre: 450000, fecha_inicio_contrato: '2026-09-01', fecha_fin_contrato: '2028-09-01',
    clausulas_adicionales: { activeClausesList: [{ tag: 'ACUERDO', body: 'Cláusula acordada para esta prueba automatizada.' }] },
    Inquilino: profiles[0], Propietario: profiles[1], Propiedad: { calle: 'Calle de prueba', numero: 10 },
    hash_original_sha256: null, hash_final_sha256: null };
  const guarantee = { id_garante: 9, nombre_completo: profiles[2].nombre_completo, dni: profiles[2].dni,
    email: profiles[2].mail, cuit: '', relacion_inquilino: 'Familiar', id_tipo_garantia: 1 };
  const tables = { Perfil: profiles, Contrato: [contract], Firma_contrato: [], Contrato_Garante: [],
    Historial_Estado_Contrato: [{ id_contrato: 70, id_estado_contrato: 5, fecha_fin: null, fecha_inicio: '2026-09-01' }],
    Pasaporte_habitat: [{ id_pasaporte: 20, id_perfil: 1 }], Garante: [{ ...guarantee, id_pasaporte: 20 }], Inventario_Digital: [] };
  const files = new Map(), sessions = new Map();
  let providerCreates = 0, activations = 0, approvedDni = null;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input), method = options.method || 'GET', headers = new Headers(options.headers);
    if (url.hostname === 'verification.didit.me') {
      if (url.pathname === '/v3/session/' && method === 'POST') {
        providerCreates++; const body = JSON.parse(options.body), id = `session-${run}-${providerCreates}`;
        sessions.set(id, body); return json({ session_id: id, url: `https://verify.didit.me/${id}` });
      }
      const id = url.pathname.split('/')[3], session = sessions.get(id);
      assert.ok(session, 'Didit session must exist');
      const vendor = JSON.parse(session.vendor_data);
      return json({ session_id: id, workflow_id: session.workflow_id, vendor_data: session.vendor_data, status: 'Approved',
        id_verifications: [{ status: 'Approved', document_number: approvedDni || profiles[vendor.profileId-1].dni }],
        liveness_checks: [{ status: 'Approved' }], face_matches: [{ status: 'Approved' }] });
    }
    assert.equal(url.origin, process.env.SUPABASE_URL, 'No real network calls');
    if (url.pathname === '/auth/v1/user') {
      const id = Number(headers.get('authorization').split('-').at(-1));
      const p = profiles[id-1]; return json({ id: p.user_id, aud: 'authenticated', email: p.mail, email_confirmed_at: '2026-01-01' });
    }
    if (url.pathname.startsWith('/storage/v1/object/sign/')) {
      return json({ signedURL: `/object/sign/${url.pathname.split('/sign/')[1]}?token=test` });
    }
    if (url.pathname.startsWith('/storage/v1/object/')) {
      const path = url.pathname.split('contratos_firmados/')[1];
      if (method === 'POST') {
        if (files.has(path)) return json({ message: 'Already exists' }, 409);
        files.set(path, Buffer.from(options.body)); return json({ Key: path });
      }
      assert.ok(files.has(path), `Stored document required: ${path}`);
      return new Response(files.get(path), { headers: { 'Content-Type': 'application/pdf' } });
    }
    if (url.pathname.includes('/rpc/')) {
      const rpc = url.pathname.split('/').at(-1);
      if (rpc === 'consume_api_rate_limit') return json(true);
      if (rpc === 'freeze_contract_guarantors') {
        if (!contract.garantes_fijados_at) {
          contract.garantes_fijados_at = '2026-09-15';
          tables.Contrato_Garante.push({ id_contrato: 70, id_garante: 9, id_perfil: null, email: guarantee.email, datos: guarantee });
        }
        return json(null);
      }
      assert.equal(rpc, 'finalize_signed_contract_state'); activations++;
      tables.Historial_Estado_Contrato[0].id_estado_contrato = 1;
      return json(true);
    }
    const table = url.pathname.split('/').at(-1);
    assert.ok(tables[table], `Unexpected table ${table}`);
    let rows = tables[table].filter(row => [...url.searchParams].every(([key, filter]) => {
      if (['select','order','limit','columns'].includes(key)) return true;
      if (filter.startsWith('eq.')) return String(row[key]) === filter.slice(3);
      if (filter === 'is.null') return row[key] == null;
      if (filter.startsWith('in.(')) return filter.slice(4,-1).split(',').includes(String(row[key]));
      throw new Error(`Unsupported filter ${key}=${filter}`);
    }));
    if (method === 'POST') {
      const inserted = JSON.parse(options.body); rows = (Array.isArray(inserted) ? inserted : [inserted]).map(row => ({
        ...row, id_firma: tables.Firma_contrato.length+1, created_at: new Date().toISOString()
      })); tables[table].push(...rows);
    }
    if (method === 'PATCH') rows.forEach(row => Object.assign(row, JSON.parse(options.body)));
    if (url.searchParams.get('order')?.includes('desc')) rows.reverse();
    if (url.searchParams.has('limit')) rows = rows.slice(0,Number(url.searchParams.get('limit')));
    return json(headers.get('accept')?.includes('vnd.pgrst.object') ? rows[0] || null : rows);
  };
  async function call(handler, who, body, method = 'POST') {
    const req = { method, headers: { origin: 'http://localhost:3000', authorization: `Bearer flow-${run}-${who}` },
      ...(method === 'GET' ? { query: body } : { body }) };
    const res = { statusCode: null, body: null, setHeader() {}, status(code) { this.statusCode=code; return this; }, json(body) { this.body=body; return this; } };
    await handler(req,res); return res;
  }
  async function begin(who) {
    const p = await call(preview,who,{ id_contrato: 70 }); assert.equal(p.statusCode,200,JSON.stringify(p.body));
    const s = await call(start,who,{ id_contrato: 70, documentHash: p.body.data.hash, consentGiven: true, consentVersion: CONSENT_VERSION });
    assert.ok([200,201].includes(s.statusCode),JSON.stringify(s.body)); return s.body.data;
  }
  return { call, begin, tables, files, contract, get providerCreates() { return providerCreates; }, get activations() { return activations; },
    wrongDni(value) { approvedDni = value; } };
}

test('three participants accept one PDF; activation waits for the guarantor; sealed retries preserve evidence', async () => {
  const f = fixture();
  for (const who of [1,2]) {
    const s = await f.begin(who);
    assert.equal((await f.begin(who)).id_firma,s.id_firma,'Retry resumes the same Didit session');
    assert.equal((await f.call(seal,who,{ id_firma: s.id_firma })).statusCode,200);
  }
  const pending = await f.call(finalize,1,{ id_contrato: 70 });
  assert.equal(pending.body.data.contrato_activo,false); assert.equal(pending.body.data.pendientes_garantes,1); assert.equal(f.activations,0);
  const g = await f.begin(3);
  assert.equal(f.tables.Contrato_Garante[0].id_perfil,3);
  assert.equal((await f.call(seal,3,{ id_firma: g.id_firma })).statusCode,200);
  const evidence = structuredClone(f.tables.Firma_contrato[2].tsa_sello_tiempo);
  const count = f.files.size;
  assert.equal((await f.call(seal,3,{ id_firma: g.id_firma })).statusCode,200);
  assert.deepEqual(f.tables.Firma_contrato[2].tsa_sello_tiempo,evidence); assert.equal(f.files.size,count);
  const final = await f.call(finalize,3,{ id_contrato: 70 });
  assert.equal(final.statusCode,200,JSON.stringify(final.body)); assert.equal(final.body.data.contrato_activo,true);
  assert.equal((await PDFDocument.load(f.files.get(f.contract.url_contrato_final_pdf))).getPageCount(),4);
  assert.equal((await f.call(finalize,1,{ id_contrato: 70 })).body.data.contrato_activo,true);
  assert.equal(f.providerCreates,3);
  for (const signature of f.tables.Firma_contrato) assert.equal(verifyEvidence(signature.tsa_sello_tiempo,
    pair.publicKey.export({type:'spki',format:'pem'}), { originalBytes: f.files.get(f.contract.url_contrato_original_pdf), auditBytes: f.files.get(signature.url_audit_trail_pdf) }),true);
});

test('altered original bytes prevent sealing even after Didit approval', async () => {
  const f = fixture(); const s = await f.begin(1);
  f.files.set(f.contract.url_contrato_original_pdf,Buffer.from('tampered'));
  const savedError = console.error; console.error = () => {};
  try { assert.equal((await f.call(seal,1,{id_firma:s.id_firma})).statusCode,500); }
  finally { console.error = savedError; }
  assert.equal(f.tables.Firma_contrato[0].tsa_sello_tiempo,undefined);
  assert.equal(f.activations,0);
});

test('unrelated profiles and incorrect consent cannot create a verification session', async () => {
  const f = fixture();
  assert.equal((await f.call(preview,4,{ id_contrato: 70 })).statusCode,403);
  assert.equal((await f.call(start,1,{ id_contrato: 70, consentGiven: true, consentVersion: 'old' })).statusCode,400);
  assert.equal((await f.call(start,1,{ id_contrato: 70, consentGiven: true, consentVersion: CONSENT_VERSION, documentHash: '0'.repeat(64) })).statusCode,409);
  assert.equal(f.providerCreates,0);
});

test('incorrect Didit identity, another signer and a cancelled contract cannot seal', async () => {
  const f = fixture(); const s = await f.begin(1);
  assert.equal((await f.call(seal,2,{ id_firma: s.id_firma })).statusCode,403);
  f.wrongDni('99999999');
  assert.equal((await f.call(seal,1,{ id_firma: s.id_firma })).statusCode,409);
  f.tables.Historial_Estado_Contrato[0].id_estado_contrato = 3;
  f.wrongDni(null);
  assert.equal((await f.call(seal,1,{ id_firma: s.id_firma })).statusCode,409);
  assert.equal(f.tables.Firma_contrato[0].tsa_sello_tiempo,undefined);
});
