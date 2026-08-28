import { setCorsHeaders, getAuthenticatedUser, getSupabaseAdmin } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificar autenticación
  const { user, profile, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Debe iniciar sesión para guardar el inventario.' });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const id_contrato = req.query.id_contrato;
    if (!id_contrato) {
      return res.status(400).json({ error: 'Bad Request', message: 'id_contrato requerido.' });
    }

    try {
      const { data, error } = await supabase
        .from('Inventario_Digital')
        .select(`
          *,
          items:Detalle_Inventario_Item (
            *,
            Item:id_item (nombre),
            Estado_item:id_estado_item (nombre)
          )
        `)
        .eq('id_contrato', id_contrato)
        .maybeSingle();

      if (error) throw error;
      return res.status(200).json({ ok: true, inventario: data });
    } catch (e) {
      console.error('[Inventario GET Error]:', e);
      return res.status(500).json({ error: 'Internal Error', message: e.message });
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id_contrato, id_propiedad, observaciones_generales, items, video_url, video_hash } = body;

    if (!id_contrato || !id_propiedad || !items) {
      return res.status(400).json({ error: 'Bad Request', message: 'Faltan parámetros requeridos.' });
    }

    try {
      // 1. Upsert Inventario_Digital
      const { data: invBase, error: errBase } = await supabase
        .from('Inventario_Digital')
        .upsert({
          id_contrato,
          id_propiedad,
          id_perfil_creador: profile?.id_perfil || null,
          fecha_inspeccion: new Date().toISOString(),
          observaciones_generales: observaciones_generales || '',
          video_url: video_url || null,
          video_hash: video_hash || null
        }, { onConflict: 'id_contrato' })
        .select()
        .single();

      if (errBase) throw errBase;

      // 2. Limpiar items viejos
      await supabase
        .from('Detalle_Inventario_Item')
        .delete()
        .eq('id_inventario', invBase.id_inventario);

      // 3. Insertar items nuevos
      if (items.length > 0) {
        // En la UI podemos usar IDs fijos para estados: 1: Nuevo, 2: Bueno, 3: Regular, 4: Malo
        const itemsToInsert = items.map(it => ({
          id_inventario: invBase.id_inventario,
          ambiente: it.ambiente,
          id_item: it.id_item || 1, // Default a un item genérico si no lo envían
          id_estado_item: it.id_estado_item || 2, // Default a Bueno
          observaciones: it.observaciones || '',
          fotos_urls: it.fotos_urls || []
        }));
        
        const { error: errItems } = await supabase
          .from('Detalle_Inventario_Item')
          .insert(itemsToInsert);

        if (errItems) throw errItems;
      }

      return res.status(200).json({ ok: true, message: 'Inventario guardado exitosamente.' });
    } catch (e) {
      console.error('[Inventario POST Error]:', e);
      return res.status(500).json({ error: 'Internal Error', message: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
