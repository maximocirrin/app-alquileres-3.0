import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

// All requests in these tests are mocked: no credentials or real sessions.
process.env.SUPABASE_URL = 'https://payment-auth-test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'public-test-key';
process.env.NODE_ENV = 'test';
delete process.env.ALLOWED_ORIGINS;
const { getAuthenticatedUser, getContractForProfile } = await import('../api/_auth.js');
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

const request = (token = 'test-session-token') => ({
  method: 'GET', query: { id_contrato: '62' },
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

test('verified identity resolves only its own profile with the caller token', async () => {
  const user = { id: '00000000-0000-4000-8000-000000000062', aud: 'authenticated' };
  const calls = [];
  globalThis.fetch = async (url, options) => {
    const target = new URL(url);
    calls.push(target);
    assert.equal(new Headers(options.headers).get('authorization'), 'Bearer test-session-token');
    if (target.pathname === '/auth/v1/user') return jsonResponse(user);
    assert.equal(target.pathname, '/rest/v1/Perfil');
    assert.equal(target.searchParams.get('user_id'), `eq.${user.id}`);
    return jsonResponse({ id_perfil: 62, user_id: user.id });
  };
  const auth = await getAuthenticatedUser(request());
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
  await payments(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.error, 'PROFILE_SERVICE_UNAVAILABLE');
});

test('self-assigned contract does not grant either payment role', async () => {
  const contract = {
    id_contrato: 62,
    id_propiedad: 10,
    id_perfil_inquilino: 42,
    id_perfil_propietario: 42
  };
  const query = {
    select(columns) {
      assert.equal(columns, 'id_contrato, id_propiedad, id_perfil_inquilino, id_perfil_propietario');
      return this;
    },
    eq(column, value) {
      assert.equal(column, 'id_contrato');
      assert.equal(value, 62);
      return this;
    },
    async maybeSingle() {
      return { data: contract, error: null };
    }
  };
  const supabase = {
    from(table) {
      assert.equal(table, 'Contrato');
      return query;
    }
  };

  const result = await getContractForProfile(supabase, 62, 42);

  assert.equal(result.contract, contract);
  assert.equal(result.role, null);
  assert.equal(result.error, null);
});
