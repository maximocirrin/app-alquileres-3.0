import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import fs from 'node:fs';

function inbox() {
  const store = new Map(); let user = { id: 'account-a', email: 'a@example.com' }; let onAuth;
  let rows = [
    { id_notificacion: 'n1', id_perfil_destino: 7, rol_destino: 'OWNER', titulo: 'Pago', leida: false },
    { id_notificacion: 'n2', id_perfil_destino: 7, rol_destino: 'TENANT', titulo: 'Contrato', leida: false },
    { id_notificacion: 'n3', id_perfil_destino: 9, rol_destino: 'OWNER', titulo: 'Privada', leida: false }
  ];
  let updateError = false;
  const client = { auth: {
    getUser: async () => ({ data: { user } }), getSession: async () => ({ data: { session: user ? { user } : null } }),
    onAuthStateChange(callback) { onAuth = callback; }
  }, from(table) {
    const filters = {}; let ids; let mutation;
    return { select() { return this; }, eq(k,v) { filters[k] = v; return this; }, order() { return this; }, limit() { return this; },
      in(k,v) { ids=v; return this; }, update(value) { mutation=value; return this; },
      maybeSingle: async () => ({ data: { id_perfil: user.id === 'account-a' ? 7 : 9 } }),
      then(resolve) {
        if (mutation) {
          if (!updateError) rows = rows.map(n => ids.includes(n.id_notificacion) && n.id_perfil_destino === filters.id_perfil_destino ? { ...n, ...mutation } : n);
          return Promise.resolve({ error: updateError ? Error('offline') : null }).then(resolve);
        }
        assert.equal(table,'Notificacion');
        return Promise.resolve({ data: rows.filter(n => n.id_perfil_destino === filters.id_perfil_destino) }).then(resolve);
      }
    };
  } };
  const storage = { getItem: k => store.get(k) || null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) };
  const window = { supabaseClient: client, location: { search: '?role=OWNER', pathname: '/administrador.html' },
    addEventListener() {}, dispatchEvent() {} };
  const document = { readyState: 'loading', referrer: '', addEventListener() {}, querySelectorAll: () => [] };
  vm.runInNewContext(fs.readFileSync(new URL('../js/notifications.js', import.meta.url),'utf8'), {
    window, document, localStorage: storage, sessionStorage: storage, URLSearchParams, console: { error() {}, warn() {} },
    setTimeout() {}, clearTimeout() {}, setInterval() {}, clearInterval() {}
  });
  const manager = window.NotificationManager;
  manager.updateBadge = () => {}; manager.renderDropdown = () => {};
  return { manager, window, store, setRows: next => { rows=next; }, failUpdates: () => { updateError=true; },
    switchAccount(next) { user=next; onAuth('SIGNED_OUT'); } };
}

test('owner and tenant panels show the same recipient inbox and unread count', async () => {
  const { manager, window } = inbox(); await manager.fetchFromDB();
  assert.equal(manager.getAll().length, 2); assert.equal(manager.getUnreadCount(), 2);
  window.location = { search: '?role=TENANT', pathname: '/tu-alquiler.html' };
  assert.equal(manager.getAll().length, 2); assert.equal(manager.getUnreadCount(), 2);
  await manager.markAllAsRead();
  assert.equal(manager.getUnreadCount(), 0);
  await manager.fetchFromDB(); assert.equal(manager.getUnreadCount(), 0);
});
test('logout clears visible notifications and another account cannot inherit them', async () => {
  const harness = inbox(); await harness.manager.fetchFromDB();
  harness.switchAccount(null); assert.equal(harness.manager.getAll().length, 0);
  harness.switchAccount({ id: 'account-b', email: 'b@example.com' });
  await harness.manager.fetchFromDB();
  assert.deepEqual(Array.from(harness.manager.getAll(), n=>n.id), ['n3']);
});
test('empty server inbox removes stale cached notifications', async () => {
  const harness=inbox(); await harness.manager.fetchFromDB();
  harness.setRows([]); await harness.manager.fetchFromDB(); assert.equal(harness.manager.getAll().length, 0);
});
test('failed read persistence does not falsely clear unread notifications', async () => {
  const harness=inbox(); await harness.manager.fetchFromDB(); harness.failUpdates();
  await harness.manager.markAllAsRead(); assert.equal(harness.manager.getUnreadCount(), 2);
});
