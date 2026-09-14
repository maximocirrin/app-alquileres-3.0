import crypto from 'node:crypto';
import { generateOriginalContractPdf } from './pdf-generator.js';
import { contractRevision, uploadImmutable } from './integrity.js';
import { isSafeStoragePath } from '../../api/_auth.js';

// Preview and consent use the same renderer and immutable, content-addressed file.
// Merely previewing a document never changes the contract or creates a signature.
export async function prepareContractDocument(supabase, contract) {
  const id = Number(contract.id_contrato);
  const { data: inventory, error: inventoryError } = await supabase.from('Inventario_Digital')
    .select('*, items:Detalle_Inventario_Item(*, Item:id_item(nombre), Estado_item:id_estado_item(nombre))')
    .eq('id_contrato', id).maybeSingle();
  if (inventoryError) throw inventoryError;
  let hydratedInventory = null;
  if (inventory) {
    const items = await Promise.all([...(inventory.items || [])].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))).map(async item => {
      const urls = await Promise.all((item.fotos_urls || []).map(async path => {
        if (!isSafeStoragePath(path, id)) throw new Error('Invalid inventory evidence path.');
        const { data, error } = await supabase.storage.from('contratos_firmados').createSignedUrl(path, 300);
        if (error || !data?.signedUrl) throw error || new Error('Inventory evidence unavailable.');
        return data.signedUrl;
      }));
      return { ...item, fotos_urls: urls };
    }));
    hydratedInventory = { ...inventory, items };
  }
  const { data: passports, error: passportError } = await supabase.from('Pasaporte_vivat')
    .select('id_pasaporte').eq('id_perfil', contract.id_perfil_inquilino);
  if (passportError) throw passportError;
  const ids = (passports || []).map(p => p.id_pasaporte);
  const { data: guarantors, error: guarantorError } = ids.length
    ? await supabase.from('Garante').select('*').in('id_pasaporte', ids).order('id_garante')
    : { data: [] };
  if (guarantorError) throw guarantorError;
  const bytes = await generateOriginalContractPdf({ contractId: id, contrato: contract,
    propiedad: contract.Propiedad || {}, inquilino: contract.Inquilino || {},
    propietario: contract.Propietario || {}, garantes: guarantors || [], inventario: hydratedInventory });
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  const path = `contrato_${id}/contrato_original_${hash}.pdf`;
  return { bytes, hash, path, revision: contractRevision(contract) };
}

export function assertReviewedDocument(document, reviewedHash) {
  if (!/^[a-f0-9]{64}$/.test(reviewedHash || '') || document.hash !== reviewedHash) {
    const error = new Error('El documento cambió o no fue revisado. Abrí el PDF actualizado y aceptalo nuevamente.');
    error.code = 'DOCUMENT_CHANGED';
    throw error;
  }
}

export async function persistAcceptedDocument(supabase, id, document) {
  await uploadImmutable(supabase, document.path, document.bytes);
  const { error } = await supabase.from('Contrato').update({
    hash_original_sha256: document.hash, url_contrato_original_pdf: document.path
  }).eq('id_contrato', id).is('hash_original_sha256', null);
  if (error) throw error;
  const { data, error: readError } = await supabase.from('Contrato')
    .select('hash_original_sha256, url_contrato_original_pdf').eq('id_contrato', id).single();
  if (readError) throw readError;
  if (data.hash_original_sha256 !== document.hash || data.url_contrato_original_pdf !== document.path) {
    const conflict = new Error('El contrato ya tiene otra versión documental aceptada. Debe revisarse antes de continuar.');
    conflict.code = 'DOCUMENT_CHANGED';
    throw conflict;
  }
}
