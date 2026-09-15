import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
const origin = new URL(process.argv[2]).origin;
const settings = dotenv.parse(fs.readFileSync('.env.signing.local'));
const expectedId = crypto.createHash('sha256').update(crypto.createPublicKey(crypto.createPrivateKey({
  key: Buffer.from(settings.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64,'base64'), type: 'pkcs8', format: 'der'
})).export({ type:'spki', format:'der' })).digest('hex');
async function check(path, expected, options = {}) {
  let response;
  if (process.argv[3]) {
    const args = [process.argv[3], 'curl', path, '--deployment', origin, '--', '--silent', '--include', '--request', options.method || 'GET'];
    for (const [name,value] of Object.entries(options.headers || {})) args.push('--header',`${name}: ${value}`);
    if (options.body) args.push('--data-binary','@-');
    const child = spawnSync(process.execPath,args,{ input: options.body, encoding:'utf8',windowsHide:true,timeout:45000,maxBuffer:2*1024*1024 });
    if (child.status !== 0) throw new Error(`Vercel authenticated request failed for ${path}`);
    const raw = child.stdout.slice(child.stdout.search(/HTTP\/\S+ \d{3}/));
    const boundary = raw.indexOf('\r\n\r\n');
    const lines = raw.slice(0,boundary).split('\r\n');
    const status = Number(lines.shift().split(' ')[1]);
    const headers = Object.fromEntries(lines.map(line => { const split=line.indexOf(':'); return [line.slice(0,split).toLowerCase(),line.slice(split+1).trim()]; }));
    response = new Response(raw.slice(boundary+4),{status,headers});
  } else response = await fetch(origin+path, { ...options, redirect:'error', signal:AbortSignal.timeout(20000) });
  if (!(Array.isArray(expected) ? expected : [expected]).includes(response.status)) {
    const body = await response.clone().text();
    console.log(JSON.stringify({path,contentType:response.headers.get('content-type'),length:body.length,
      html:/<!doctype html/i.test(body),title:body.match(/<title>([^<]{0,100})<\/title>/i)?.[1],
      private_key_present:body.includes(settings.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64),
      webhook_secret_present:body.includes(settings.DIDIT_SIGNATURE_WEBHOOK_SECRET)}));
    throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  }
  console.log(`${path}: ${response.status}`); return response;
}
if (!process.argv.includes('--webhook-only')) {
const page = await check('/firmar.html',200);
if (!(await page.text()).includes('js/signing-page.js')) throw new Error('Wrong signature page.');
if (!/frame-src[^;]+supabase/.test(page.headers.get('content-security-policy') || '')) throw new Error('Preview blocked by CSP.');
const keys = await (await check('/api/firmas/claves',200)).json();
if (!keys.data.keys.some(key => key.id===expectedId)) throw new Error('Deployed evidence key differs from the provisioned key.');
for (const action of ['evidencias','partes','estado','finalizar']) await check(`/api/firmas/${action}`,401);
for (const action of ['previsualizar','iniciar','sellar']) await check(`/api/firmas/${action}`,401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
const home = await (await check('/',200)).text();
for (const path of ['/.env.signing.local','/.env.local','/scripts/configure-signing-production.mjs']) {
  const response = await check(path,[200,404]);
  if (response.status === 200 && await response.text() !== home) throw new Error(`Private path must return only the public fallback: ${path}`);
}
}
const timestamp = Math.floor(Date.now()/1000);
const body = JSON.stringify({ session_id: 'nonexistent-deployment-check', timestamp, webhook_type:'status.updated' });
const signature = crypto.createHmac('sha256',settings.DIDIT_SIGNATURE_WEBHOOK_SECRET).update(body).digest('hex');
const canonicalBody = JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(body)).sort(([a],[b])=>a.localeCompare(b))));
const signatureV2 = crypto.createHmac('sha256',settings.DIDIT_SIGNATURE_WEBHOOK_SECRET).update(canonicalBody).digest('hex');
const headers = { 'Content-Type':'application/json','x-timestamp':String(timestamp),'x-signature':signature,'x-signature-v2':signatureV2 };
const webhook = await (await check('/api/firmas/webhook-didit',200,{method:'POST',headers,body})).json();
if (!webhook.ignored) throw new Error('Synthetic session must be ignored.');
await check('/api/firmas/webhook-didit',401,{method:'POST',headers:{...headers,'x-signature':'0'.repeat(64),'x-signature-v2':'0'.repeat(64)},body});
console.log('Deployment controls verified; no real identity verification or contract was created.');
