import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Generate once; never replace a key that protects existing evidence.
const target = path.resolve('.env.signing.local');
if (fs.existsSync(target)) throw new Error('Ya existe .env.signing.local. Se conserva la clave actual.');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
const encoded = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
fs.writeFileSync(target, `SIGNATURE_EVIDENCE_PRIVATE_KEY_B64=${encoded}\n`, { flag: 'wx', mode: 0o600 });
const fingerprint = crypto.createHash('sha256').update(publicKey.export({ type: 'spki', format: 'der' })).digest('hex');
const publicPath = path.resolve(`signature-public-key-${fingerprint}.pem`);
fs.writeFileSync(publicPath, publicKey.export({ type: 'spki', format: 'pem' }), { flag: 'wx' });
console.log(JSON.stringify({ secretFile: target, publicKeyFile: publicPath, keyId: fingerprint }));
