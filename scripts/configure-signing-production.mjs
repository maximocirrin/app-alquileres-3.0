import fs from 'node:fs';
import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
const linked = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
if (linked.projectId !== process.argv[2]) throw new Error('Pass the linked project ID explicitly.');
const local = { ...dotenv.parse(fs.readFileSync('.env')), ...dotenv.parse(fs.readFileSync('.env.signing.local')) };
const origin = new URL(process.argv[3]).origin;
if (!origin.startsWith('https://')) throw new Error('Production requires HTTPS.');
const settings = {
  SIGNATURE_EVIDENCE_PRIVATE_KEY_B64: local.SIGNATURE_EVIDENCE_PRIVATE_KEY_B64,
  SIGNATURE_EVIDENCE_ARCHIVED_PUBLIC_KEYS: local.SIGNATURE_EVIDENCE_ARCHIVED_PUBLIC_KEYS || '[]',
  DIDIT_API_KEY: local.DIDIT_API_KEY,
  DIDIT_WORKFLOW_ID_SIGNATURE: local.DIDIT_WORKFLOW_ID_SIGNATURE,
  DIDIT_SIGNATURE_WEBHOOK_SECRET: local.DIDIT_SIGNATURE_WEBHOOK_SECRET,
  APP_URL: origin
};
for (const [name,value] of Object.entries(settings)) {
  if (!value || /[\r\n]/.test(value)) throw new Error(`Invalid configuration: ${name}`);
  // Only fixed variable names enter the command; values travel through stdin.
  const child = spawnSync('cmd.exe', ['/d','/s','/c', `npx --yes vercel env add ${name} production --sensitive --force --yes`], {
    input: value, encoding: 'utf8', windowsHide: true, timeout: 60000
  });
  console.log(JSON.stringify({ name, configured: child.status === 0 }));
  if (child.status !== 0) throw new Error(`Could not configure ${name}; no secret output was printed.`);
}
