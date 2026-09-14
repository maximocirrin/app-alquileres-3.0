import crypto from 'node:crypto';

export function contractRevision(contract) {
  const fields = ['id_contrato','id_propiedad','id_perfil_inquilino','id_perfil_propietario',
    'id_tipo_garantia','id_Indice','id_moneda','fecha_inicio_contrato','fecha_fin_contrato',
    'monto_cierre','monto_deposito','periodo_aumento_meses','dia_vencimiento_mensual',
    'tasa_punitoria_diaria','alias_cbu','clausulas_adicionales'];
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k,canonical(value[k])]));
    return value;
  }
  const snapshot = Object.fromEntries(fields.map(k => [k, contract[k] ?? null]));
  // Names, documents and the property address also form part of the instrument.
  for (const role of ['Inquilino', 'Propietario']) {
    snapshot[role] = Object.fromEntries(['nombre_completo', 'dni', 'mail'].map(k => [k, contract[role]?.[k] ?? null]));
  }
  snapshot.Propiedad = Object.fromEntries(['calle', 'numero', 'piso_dpto'].map(k => [k, contract.Propiedad?.[k] ?? null]));
  return crypto.createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('hex');
}

export async function readContractForSigning(supabase, id) {
  const { data, error } = await supabase.from('Contrato')
    .select('*, Inquilino:id_perfil_inquilino(nombre_completo, dni, mail), Propietario:id_perfil_propietario(nombre_completo, dni, mail), Propiedad(calle, numero, piso_dpto)')
    .eq('id_contrato', id).single();
  if (error) throw error;
  let clauses = data.clausulas_adicionales?.activeClausesList;
  if (typeof clauses === 'string') clauses = JSON.parse(clauses);
  if (!Array.isArray(clauses) || !clauses.length || clauses.some(c => !c?.tag || !c?.body) ||
      !data.fecha_inicio_contrato || !data.fecha_fin_contrato || data.fecha_inicio_contrato >= data.fecha_fin_contrato ||
      !Number.isFinite(Number(data.monto_cierre)) || Number(data.monto_cierre) <= 0) {
    const error = new Error('Guardá las cláusulas, fechas e importe acordados antes de iniciar la firma.');
    error.code = 'CONTRACT_INCOMPLETE'; throw error;
  }
  return data;
}

export function assertDocumentHash(bytes, expected) {
  if (!/^[a-f0-9]{64}$/.test(expected || '') || crypto.createHash('sha256').update(bytes).digest('hex') !== expected) {
    throw new Error('Document integrity check failed.');
  }
}

// Recover an immutable upload after a lost response, without overwriting it.
export async function uploadImmutable(supabase, path, bytes, contentType = 'application/pdf') {
  const storage = supabase.storage.from('contratos_firmados');
  const { error } = await storage.upload(path, bytes, { contentType, upsert: false });
  if (!error) return;
  const { data, error: readError } = await storage.download(path);
  if (readError || !data) throw error;
  assertDocumentHash(Buffer.from(await data.arrayBuffer()), crypto.createHash('sha256').update(bytes).digest('hex'));
}
