import fs from 'node:fs';
import { generateOriginalContractPdf, generateAuditTrailPdf, mergeFinalContractPdf } from '../services/firmas/pdf-generator.js';
import { CONSENT_VERSION, CONSENT_TEXT, sha256 } from '../services/firmas/evidence.js';
const original = await generateOriginalContractPdf({ contractId: 1,
  contrato: { created_at: '2026-09-15T10:00:00Z', fecha_inicio_contrato: '2026-10-01', monto_cierre: 100000,
    clausulas_adicionales: { activeClausesList: [{ tag: 'PRUEBA AUTOMATIZADA', body: 'Documento sintético utilizado exclusivamente para comprobar la presentación del PDF.' }] } },
  inquilino: { nombre_completo: 'Inquilino de prueba', dni: '11111111', mail: 'inquilino@example.com' },
  propietario: { nombre_completo: 'Propietario de prueba', dni: '22222222', mail: 'propietario@example.com' } });
const audit = await generateAuditTrailPdf({ contractId: 1, firmaId: 1, rol: 'garante',
  signerName: 'Persona de prueba con un nombre compuesto de longitud considerable', signerDni: '33333333',
  email: 'cuenta.de.prueba.para.verificar.la.presentacion@example.com',
  diditSessionId: 'session-synthetic-preview-12345678901234567890', originalPdfHash: sha256(original),
  recordedAt: '2026-09-15T10:01:00Z', diditScores: { consent_version: CONSENT_VERSION, consent_text: CONSENT_TEXT,
    consent_at: '2026-09-15T10:00:00Z', document_status: 'approved', face_match_status: 'approved', liveness_status: 'approved' } });
const merged = await mergeFinalContractPdf({ originalPdfBytes: original, inquilinoAuditBytes: audit.auditTrailBytes });
fs.mkdirSync('tmp/pdfs', { recursive: true });
fs.writeFileSync('tmp/pdfs/signing-qa.pdf', merged.finalPdfBytes);
console.log('tmp/pdfs/signing-qa.pdf');
