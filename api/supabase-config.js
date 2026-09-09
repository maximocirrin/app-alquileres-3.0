import { sendOriginForbidden, setCorsHeaders } from './_auth.js';

// Supabase publishable/anon keys are intentionally client-visible. Service-role
// credentials are never read here or shipped to the browser.
export default function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const url = String(process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co').trim();
  const key = String(process.env.SUPABASE_ANON_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (!url || !key) return res.status(503).json({ error: 'Public application configuration unavailable.' });
  return res.status(200).json({ url, key });
}
