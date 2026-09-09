import { sendOriginForbidden, setCorsHeaders } from './_auth.js';

/** Browser Maps keys are public by design; restrict them in Google Cloud to approved referrers and APIs. */
export default function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

  const apiKey = String(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (!apiKey) return res.status(503).json({ error: 'Maps service unavailable.' });
  return res.status(200).json({ apiKey });
}
