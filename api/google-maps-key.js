/**
 * Serverless Function: /api/google-maps-key
 * Retorna la clave de API de Google Maps desde Vercel.
 */
export default function handler(req, res) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || '';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return res.status(200).json({ apiKey });
}
