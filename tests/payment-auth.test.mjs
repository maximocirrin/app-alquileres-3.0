import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

// All requests in these tests are mocked: no credentials or real sessions.
process.env.SUPABASE_URL = 'https://payment-auth-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'public-test-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
process.env.NODE_ENV = 'test';
delete process.env.ALLOWED_ORIGINS;
const { getAuthenticatedUser } = await import('../api/_auth.js');
const { default: payments } = await import('../api/pagos.js');
const realFetch = globalThis.fetch;
const realConsoleError = console.error;
const realConsoleWarn = console.warn;

beforeEach(() => {
  globalThis.fetch = async () => { throw new Error('Unexpected network request'); };
  console.error = () => {};
  console.warn = () => {};
});
after(() => {
  globalThis.fetch = realFetch;
  console.error = realConsoleError;
  console.warn = realConsoleWarn;
});

const request = (token = 'test-session-token', query = { id_contrato: '62' }) => ({
  method: 'GET', query,
  headers: { origin: 'http://127.0.0.1:5500', ...(token ? { authorization: `Bearer ${token}` } : {}) }
});
const response = () => ({
  statusCode: null, headers: {}, body: null,
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; }
});
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

test('missing bearer is rejected without contacting Supabase', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls += 1; throw new Error('Should not fetch'); };
  const res = response();
  await payments(request(null), res);
  assert.equal(res.statusCode, 401);
  assert.equal(calls, 0);
});

test('invalid JWT remains unauthorized', async () => {
  globalThis.fetch = async () => jsonResponse({ code: 'bad_jwt', message: 'Invalid JWT' }, 401);
  const res = response();
  await payments(request(), res);
  assert.equal(res.statusCode, 401);
});

test('blocked transport is service unavailable, not an expired session', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed', { cause: { code: 'EACCES' } }); };
  const res = response();
  await payments(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'AUTH_SERVICE_UNAVAILABLE');
  assert.equal(res.headers['Retry-After'], '10');
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:5500');
  assert.doesNotMatch(res.body.message, /iniciar sesión/);
});

test('upstream Auth outage is service unavailable', async () => {
  globalThis.fetch = async () => jsonResponse({ message: 'Unavailable' }, 503);
  const res = response();
  await payments(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'AUTH_SERVICE_UNAVAILABLE');
});

test('verified identity resolves only its own profile with the server client', async () => {
  const user = { id: '00000000-0000-4000-8000-000000000062', aud: 'authenticated' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const target = new URL(url);
    calls.push(target);
    if (target.pathname === '/auth/v1/user') {
      assert.equal(new Headers(options.headers).get('authorization'), 'Bearer verified-session-token');
      return jsonResponse(user);
    }
    assert.equal(target.pathname, '/rest/v1/Perfil');
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer service-role-test-key');
    assert.equal(target.searchParams.get('user_id'), `eq.${user.id}`);
    return jsonResponse({ id_perfil: 62, user_id: user.id });
  };
  const auth = await getAuthenticatedUser(request('verified-session-token'));
  assert.equal(auth.error, null);
  assert.equal(auth.user.id, user.id);
  assert.equal(auth.profile.id_perfil, 62);
  assert.equal(calls.length, 2);
});

test('profile lookup outage does not become a login failure', async () => {
  globalThis.fetch = async (url) => new URL(url).pathname === '/auth/v1/user'
    ? jsonResponse({ id: '00000000-0000-4000-8000-000000000062', aud: 'authenticated' })
    : jsonResponse({ message: 'Database unavailable' }, 503);
  const res = response();
  await payments(request('profile-outage-session-token'), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'PROFILE_SERVICE_UNAVAILABLE');
});

test('owner contracts and payments are returned in one authorized bundle', async () => {
  const user = { id: '00000000-0000-4000-8000-000000000014', aud: 'authenticated' };
  globalThis.fetch = async (url) => {
    const target = new URL(url);
    if (target.pathname === '/auth/v1/user') return jsonResponse(user);
    if (target.pathname === '/rest/v1/Perfil') return jsonResponse({ id_perfil: 14, user_id: user.id });
    if (target.pathname === '/rest/v1/rpc/consume_api_rate_limit') return jsonResponse(true);
    if (target.pathname === '/rest/v1/Contrato') {
      assert.equal(target.searchParams.get('id_perfil_propietario'), 'eq.14');
      return jsonResponse([{ id_contrato: 62, id_perfil_propietario: 14, id_perfil_inquilino: 6 }]);
    }
    if (target.pathname === '/rest/v1/Pago') {
      return jsonResponse([{ id_pago: 9, id_contrato: 62, monto: 450000, periodo: 'Septiembre 2026' }]);
    }
    if (target.pathname === '/rest/v1/Solicitud_pago') {
      return jsonResponse([{ id_solicitud_pago: 4, id_pago: 9, estado: 'pendiente_revision' }]);
    }
    throw new Error(`Unexpected request: ${target.pathname}`);
  };

  const res = response();
  await payments(request('owner-bundle-session-token', { action: 'owner-contracts' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.contracts.length, 1);
  assert.equal(res.body.data.paymentsByContract['62'][0].solicitud.estado, 'pendiente_revision');
});
