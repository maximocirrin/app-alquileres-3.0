import 'dotenv/config';
const base = 'https://verification.didit.me/v3/';
const key = process.env.DIDIT_API_KEY;
if (!key) throw new Error('DIDIT_API_KEY is not configured.');
for (const path of ['workflows/', 'webhook/destinations/']) {
  const response = await fetch(base + path, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) { console.log(JSON.stringify({ resource: path, status: response.status })); continue; }
  const payload = await response.json();
  const rows = Array.isArray(payload) ? payload : payload.results || payload.data || [];
  console.log(JSON.stringify({ resource: path, fields: Object.keys(payload), entries: rows.map(r => ({
    id: r.uuid || r.id || r.workflow_id, name: r.name || r.label, url: r.url,
    status: r.status, published: r.is_published, enabled: r.enabled,
    features: r.features, webhook_version: r.webhook_version, subscribed_events: r.subscribed_events,
    signing_workflow: [r.uuid, r.id, r.workflow_id].includes(process.env.DIDIT_WORKFLOW_ID_SIGNATURE)
  })) }));
}
