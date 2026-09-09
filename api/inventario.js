import crypto from 'crypto';
import {
  getAuthenticatedUser,
  getContractForProfile,
  getSupabaseAdmin,
  isSafeStoragePath,
  parsePositiveInteger,
  readJsonBody,
  requireProfile,
  sendForbidden,
  sendInternalError,
  sendOriginForbidden,
  sendUnauthorized,
  setCorsHeaders
} from './_auth.js';

const MAX_ITEMS = 200;
const MAX_PHOTOS_PER_ITEM = 12;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

function text(value, maxLength = 2_000) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeItem(item, contractId) {
  if (!item || typeof item !== 'object') return null;
  const photos = Array.isArray(item.fotos_urls) ? item.fotos_urls : [];
  if (photos.length > MAX_PHOTOS_PER_ITEM || !photos.every((path) => isSafeStoragePath(path, contractId))) return null;
  const stateId = parsePositiveInteger(item.id_estado_item);
  const itemId = parsePositiveInteger(item.id_item);
  const ambiente = text(item.ambiente, 120);
  if (!ambiente || !stateId) return null;
  return {
    ambiente,
    id_item: itemId || 1,
    id_estado_item: stateId,
    observaciones: text(item.observaciones, 4_000),
    fotos_urls: photos
  };
}

async function signedPath(supabase, path, contractId) {
  if (!isSafeStoragePath(path, contractId)) return null;
  const { data, error } = await supabase.storage.from('contratos_firmados').createSignedUrl(path, 5 * 60);
  return error ? null : data?.signedUrl || null;
}

export default async function handler(req, res) {
  if (!setCorsHeaders(req, res)) return sendOriginForbidden(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { user, profile, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) return sendUnauthorized(res, 'Debe iniciar sesión para consultar o guardar el inventario.');
    if (!requireProfile(profile)) return sendForbidden(res, 'No se encontró un perfil válido para esta cuenta.');

    const body = req.method === 'POST' ? await readJsonBody(req) : (req.query || {});
    const contractId = parsePositiveInteger(body.id_contrato || body.idContrato);
    if (!contractId) return res.status(400).json({ error: 'Invalid contract id.' });

    const supabase = getSupabaseAdmin();
    const { contract, role, error: contractError } = await getContractForProfile(supabase, contractId, profile.id_perfil);
    if (contractError) throw contractError;
    if (!contract) return res.status(404).json({ error: 'Not Found' });
    if (!role) return sendForbidden(res, 'No eres parte de este contrato.');

    if (req.method === 'GET') {
      const { data: inventory, error } = await supabase
        .from('Inventario_Digital')
        .select('*, items:Detalle_Inventario_Item(*, Item:id_item(nombre), Estado_item:id_estado_item(nombre))')
        .eq('id_contrato', contractId)
        .maybeSingle();
      if (error) throw error;
      if (!inventory) return res.status(200).json({ ok: true, inventario: null });

      const hydratedItems = await Promise.all((inventory.items || []).map(async (item) => ({
        ...item,
        // Keep canonical paths for a later safe update, while exposing only
        // short-lived URLs for display.
        fotos_paths: (item.fotos_urls || []).filter((path) => isSafeStoragePath(path, contractId)),
        fotos_urls: await Promise.all((item.fotos_urls || []).map((path) => signedPath(supabase, path, contractId)))
      })));
      const hydrated = {
        ...inventory,
        video_path: isSafeStoragePath(inventory.video_url, contractId) ? inventory.video_url : null,
        video_url: await signedPath(supabase, inventory.video_url, contractId),
        items: hydratedItems.map((item) => ({ ...item, fotos_urls: item.fotos_urls.filter(Boolean) }))
      };
      return res.status(200).json({ ok: true, inventario: hydrated });
    }

    const isUpload = req.query?.action === 'upload' || body.action === 'upload' || (req.url && req.url.includes('inventario-upload'));
    if (isUpload) {
      const contentType = String(body.contentType || '').toLowerCase().split(';')[0].trim();
      const size = Number(body.size);
      const extension = IMAGE_TYPES.get(contentType);
      if (!contractId || !extension || !Number.isSafeInteger(size) || size < 1 || size > MAX_IMAGE_BYTES) {
        return res.status(400).json({ ok: false, error: 'Invalid inventory photo request.' });
      }

      const randomSuffix = crypto.randomBytes(12).toString('hex');
      const path = `${contractId}/items/item_${Date.now()}_${randomSuffix}.${extension}`;
      const { data, error } = await supabase.storage.from('contratos_firmados').createSignedUploadUrl(path);
      if (error || !data?.token) {
        return sendInternalError(res, 'inventario-upload', error || new Error('Upload token missing'));
      }

      return res.status(200).json({
        ok: true,
        data: {
          path,
          token: data.token,
          signedUrl: data.signedUrl || null
        }
      });
    }

    const propertyId = parsePositiveInteger(body.id_propiedad || body.idPropiedad);
    if (!propertyId || Number(propertyId) !== Number(contract.id_propiedad)) {
      return res.status(400).json({ error: 'The property does not belong to this contract.' });
    }
    if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS) {
      return res.status(400).json({ error: 'Invalid inventory items.' });
    }
    const items = body.items.map((item) => normalizeItem(item, contractId));
    if (items.some((item) => !item)) return res.status(400).json({ error: 'Invalid inventory item.' });

    const videoPath = body.video_url ? String(body.video_url) : null;
    if (videoPath && !isSafeStoragePath(videoPath, contractId)) {
      return res.status(400).json({ error: 'Invalid inventory media reference.' });
    }
    const videoHash = body.video_hash && /^[a-f0-9]{64}$/i.test(String(body.video_hash)) ? String(body.video_hash).toLowerCase() : null;

    const { data: inventory, error: inventoryError } = await supabase
      .from('Inventario_Digital')
      .upsert({
        id_contrato: contractId,
        id_propiedad: propertyId,
        id_perfil_creador: Number(profile.id_perfil),
        fecha_inspeccion: new Date().toISOString(),
        observaciones_generales: text(body.observaciones_generales, 10_000),
        video_url: videoPath,
        video_hash: videoHash
      }, { onConflict: 'id_contrato' })
      .select('id_inventario')
      .single();
    if (inventoryError || !inventory) throw inventoryError || new Error('Inventory could not be saved.');

    const { error: deleteError } = await supabase
      .from('Detalle_Inventario_Item')
      .delete()
      .eq('id_inventario', inventory.id_inventario);
    if (deleteError) throw deleteError;

    if (items.length) {
      const { error: itemError } = await supabase.from('Detalle_Inventario_Item').insert(items.map((item) => ({
        ...item,
        id_inventario: inventory.id_inventario
      })));
      if (itemError) throw itemError;
    }

    return res.status(200).json({ ok: true, message: 'Inventario guardado.' });
  } catch (error) {
    return sendInternalError(res, 'inventario', error);
  }
}
