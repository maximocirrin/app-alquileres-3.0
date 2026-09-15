import 'dotenv/config';
import fs from 'node:fs';
import dotenv from 'dotenv';
const url = new URL('/api/firmas/webhook-didit', process.argv[2] || process.env.APP_URL).href;
if (new URL(url).protocol !== 'https:') throw new Error('A canonical HTTPS APP_URL is required.');
const base = 'https://verification.didit.me/v3/webhook/destinations/';
async function call(path = '', options = {}) {
  const response = await fetch(base + path, { ...options, headers: {
    'x-api-key': process.env.DIDIT_API_KEY, 'Content-Type': 'application/json'
  }, signal: AbortSignal.timeout(15000), redirect: 'error' });
  if (!response.ok) throw new Error(`Didit destination request failed: ${response.status}`);
  return response.json();
}
const list = await call();
const rows = Array.isArray(list) ? list : list.results;
if (!Array.isArray(rows)) throw new Error('Invalid destination list.');
let destination = rows.find(d => d.url === url);
if (destination) destination = await call(`${destination.uuid}/`);
else destination = await call('', { method: 'POST', body: JSON.stringify({
  label: 'Vivat contract signatures', url, enabled: false, webhook_version: 'v3',
  subscribed_events: ['status.updated', 'data.updated']
}) });
if (!destination.secret_shared_key) throw new Error('Didit returned no destination secret.');
if (process.argv.includes('--enable')) {
  destination = await call(`${destination.uuid}/`, { method: 'PATCH', body: JSON.stringify({
    enabled: true, webhook_version: 'v3', subscribed_events: ['status.updated','data.updated']
  }) });
  if (!destination.secret_shared_key || !destination.enabled) throw new Error('Webhook enablement was not confirmed.');
}
// Keep secrets out of logs, Git and deployment source uploads.
const file = '.env.signing.local';
const settings = dotenv.parse(fs.readFileSync(file));
settings.DIDIT_SIGNATURE_WEBHOOK_SECRET = destination.secret_shared_key;
settings.DIDIT_SIGNATURE_WEBHOOK_DESTINATION_ID = destination.uuid;
fs.writeFileSync(file, Object.entries(settings).map(([k,v]) => `${k}=${JSON.stringify(v)}`).join('\n')+'\n', { mode: 0o600 });
console.log(JSON.stringify({ id: destination.uuid, url: destination.url, enabled: destination.enabled,
  secret_saved: true, note: 'Enable only after the production deployment has this secret.' }));
