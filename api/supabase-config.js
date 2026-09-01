/**
 * Serverless Function: /api/supabase-config
 * Retorna la configuración pública de Supabase desde las variables de entorno de Vercel.
 */
export default function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://djhwqttaiggjaxmswggr.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  return res.status(200).json({
    url: supabaseUrl,
    key: supabaseAnonKey
  });
}
