import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendOriginForbidden, setCorsHeaders } from './api/_auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');

function securityHeaders(req, res, next) {
  const scriptSources = [
    "'self'", "'unsafe-inline'",
    'https://cdn.jsdelivr.net',
    'https://cdnjs.cloudflare.com',
    'https://unpkg.com',
    'https://www.googletagmanager.com',
    'https://*.googletagmanager.com',
    'https://maps.googleapis.com',
    'https://js.hcaptcha.com',
    'https://newassets.hcaptcha.com',
    'https://*.hcaptcha.com'
  ].join(' ');
  const policy = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://js.hcaptcha.com https://newassets.hcaptcha.com",
    "img-src 'self' data: blob: https: https://images.unsplash.com https://api.qrserver.com https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://*.google.com https://*.hcaptcha.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://verification.didit.me https://api.didit.me https://maps.googleapis.com https://*.googleapis.com https://api.bcra.gob.ar https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://www.google.com https://*.google.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com https://api.hcaptcha.com https://api2.hcaptcha.com https://*.hcaptcha.com",
    "frame-src https://didit.me https://*.didit.me https://js.hcaptcha.com https://newassets.hcaptcha.com https://*.hcaptcha.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', policy);
  res.setHeader('Permissions-Policy', 'camera=(self "https://didit.me" "https://*.didit.me"), microphone=(self "https://didit.me" "https://*.didit.me"), geolocation=(self), payment=(), usb=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
}

app.use(securityHeaders);

// Capture exact bytes before parsing so Didit HMAC validation does not verify a
// re-serialized object. All normal API routes still receive parsed JSON.
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); }
}));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

app.use('/api', (req, res, next) => {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

async function dispatch(modulePath, req, res) {
  try {
    const handler = (await import(modulePath)).default;
    return await handler(req, res);
  } catch (error) {
    console.error(`[server] ${modulePath}:`, error);
    if (!res.headersSent) return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// API endpoints. No mock contracts, identities, or signing data are exposed by
// the production server. Each handler performs its own object authorization.
app.get('/api/status', (_req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/google-maps-key', (req, res) => dispatch('./api/google-maps-key.js', req, res));
app.get('/api/supabase-config', (req, res) => dispatch('./api/supabase-config.js', req, res));
app.post('/api/arca-padron', (req, res) => dispatch('./api/arca-padron.js', req, res));
app.post('/api/bcra-deudores', (req, res) => dispatch('./api/bcra-deudores.js', req, res));
app.post('/api/create-session', (req, res) => dispatch('./api/create-session.js', req, res));
app.post('/api/session-decision', (req, res) => dispatch('./api/session-decision.js', req, res));
app.post('/api/webhook', (req, res) => dispatch('./api/webhook.js', req, res));
app.all(['/api/firmas', '/api/firmas/:action'], (req, res) => {
  req.query = req.query || {};
  if (req.params.action) req.query.action = req.params.action;
  return dispatch('./api/firmas.js', req, res);
});
app.all('/api/inventario', (req, res) => dispatch('./api/inventario.js', req, res));
app.post('/api/inventario-upload', (req, res) => dispatch('./api/inventario.js', req, res));
app.post('/api/garante-portal', (req, res) => dispatch('./api/garantes.js', req, res));
app.post('/api/garantes', (req, res) => dispatch('./api/garantes.js', req, res));
app.post('/api/property-media-upload', (req, res) => dispatch('./api/property-media-upload.js', req, res));
app.all(['/api/contracts', '/api/contracts/*'], (req, res) => dispatch('./api/firmas.js', req, res));

const staticOptions = { dotfiles: 'deny', index: false, maxAge: '1h', immutable: false, fallthrough: true };
for (const folder of ['css', 'js', 'img', 'components']) {
  app.use(`/${folder}`, express.static(path.join(__dirname, folder), staticOptions));
}

const rootFiles = new Map([
  ['/favicon.ico', 'favicon.ico'],
  ['/favicon.png', 'favicon.png'],
  ['/og-image.png', 'img/og-vivat.png'],
  ['/og-vivat.png', 'img/og-vivat.png'],
  ['/robots.txt', 'robots.txt'],
  ['/sitemap.xml', 'sitemap.xml']
]);
for (const [route, file] of rootFiles) {
  app.get(route, (_req, res) => res.sendFile(path.join(__dirname, file), { dotfiles: 'deny' }));
}

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html'), { dotfiles: 'deny' }));
app.get('/contract', (_req, res) => res.sendFile(path.join(__dirname, 'contract.html'), { dotfiles: 'deny' }));
app.get(['/contrato', '/contratos'], (_req, res) => res.sendFile(path.join(__dirname, 'contratos.html'), { dotfiles: 'deny' }));
app.get(/^\/[a-z0-9-]+\.html$/i, (req, res, next) => {
  const filename = path.basename(req.path);
  if (!/^[a-z0-9-]+\.html$/i.test(filename)) return next();
  return res.sendFile(path.join(__dirname, filename), { dotfiles: 'deny' }, (error) => {
    if (error && !res.headersSent) next();
  });
});

app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

if (process.env.VERCEL !== '1') {
  app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

export default app;
