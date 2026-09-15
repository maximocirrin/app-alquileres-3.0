import fs from 'node:fs';
import { verifyEvidence } from '../services/firmas/evidence.js';

const [evidencePath, publicKeyPath, originalPath, auditPath] = process.argv.slice(2);
if (![evidencePath, publicKeyPath, originalPath, auditPath].every(Boolean)) {
  console.error('Uso: node scripts/verify-signature-evidence.mjs evidencia.json clave-publica-confiable.pem original.pdf auditoria.pdf');
  process.exit(2);
}
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const valid = verifyEvidence(evidence, fs.readFileSync(publicKeyPath), {
  originalBytes: fs.readFileSync(originalPath), auditBytes: fs.readFileSync(auditPath)
});
console.log(valid ? 'Firma de Vivat e integridad de archivos verificadas. La fecha es declarada por Vivat; no acredita tiempo independiente.' : 'VERIFICACION FALLIDA: firma, clave o archivos no coinciden.');
process.exitCode = valid ? 0 : 1;
