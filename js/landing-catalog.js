// Critical homepage path: native fetch only, independent of Supabase JS and account code.
(function () {
    const defaultUrl = 'https://djhwqttaiggjaxmswggr.supabase.co';
    const defaultKey = 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';
    const requests = new Map();
    const select = `id_publicacion,id_propiedad,id_perfil,precio,descripcion,id_moneda,created_at,cantidad_visualizaciones_total,
        Historial_Estado_Publicacion(id_estado_publicacion,fecha_inicio,fecha_fin,Estado_Publicacion(nombre)),
        Propiedad(*,Antiguedad(nombre),Subtipo_propiedad(subtipo),Barrio(nombre,Departamento(nombre,Provincia(nombre))),Propiedad_caracteristica(Caracteristica(nombre))),
        Multimedia(url_archivo,orden_visualizacion)`.replace(/\s/g, '');

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[char]));
    }

    function safeImageUrl(value) {
        if (typeof value !== 'string' || !value.trim()) return 'img/hero-marketplace.jpg';
        try {
            const url = new URL(value, window.location.href);
            if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.href;
        } catch (_) { /* Use the local placeholder. */ }
        return 'img/hero-marketplace.jpg';
    }

    // Only the fields needed to paint a card. The original record is retained so
    // the full detail mapper can run when the user opens a property.
    function card(pub) {
        const property = pub.Propiedad || {};
        let extra = {};
        try { extra = JSON.parse((pub.descripcion || '').split('Detalles: ')[1] || '{}'); } catch (_) {}
        const history = [...(pub.Historial_Estado_Publicacion || [])]
            .sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
        const state = (history.find(row => !row.fecha_fin) || history[0])?.id_estado_publicacion;
        const images = [...new Set((pub.Multimedia || []).map(row => row.url_archivo).filter(Boolean))];
        if (!images.length) images.push('img/hero-marketplace.jpg');
        const verified = Boolean(extra.isVerifiedOwner || extra.verified);
        return {
            _publicationRecord: pub,
            id: pub.id_publicacion, id_publicacion: pub.id_publicacion, id_propiedad: pub.id_propiedad,
            id_perfil: pub.id_perfil, id_perfil_propietario: property.id_perfil_propietario,
            owner_profile_id: property.id_perfil_propietario || pub.id_perfil,
            address: `${property.calle || 'Mendoza'} ${property.numero || ''}`.trim(),
            title: extra.title || (pub.descripcion || '').split('Detalles: ')[0],
            price: Number(pub.precio) || 0, images, image: images[0],
            currency: extra.moneda || extra.currency || (pub.id_moneda === 2 ? 'USD' : 'ARS'),
            province: property.Barrio?.Departamento?.Provincia?.nombre || extra.provincia || 'Mendoza',
            city: property.Barrio?.Departamento?.nombre || extra.ciudad || 'Mendoza',
            barrio: property.Barrio?.nombre || extra.barrio || '',
            subtipo_propiedad: property.Subtipo_propiedad?.subtipo || extra.subtipoPropiedad || extra.subtipo_propiedad,
            tipo_propiedad: extra.tipo_propiedad || extra.tipo || ({ 2: 'Casa', 3: 'PH', 6: 'Local comercial' }[property.id_tipo_propiedad] || 'Departamento'),
            isVerifiedOwner: verified, verified,
            status: state === 1 ? 'disponible' : state === 2 ? 'alquilada' : 'hidden',
            contractEndDate: extra.contractEndDate || extra.fecha_fin_contrato,
            expensasIncluidas: extra.expensasIncluidas ?? true,
            expensas: Number(extra.expensas ?? property.expensas_mensuales) || 0,
            views_count: Number(pub.cantidad_visualizaciones_total) || 0,
            cantidad_visualizaciones_total: Number(pub.cantidad_visualizaciones_total) || 0,
            created_at: pub.created_at, extraInfo: extra, Propiedad: property,
            tags: [
                `${property.dormitorios || extra.dormitorios || 1} dorm.`,
                `${property.banos_completos || extra.banos || 1} bañ.`,
                `${property.habitaciones_total || extra.ambientes || property.dormitorios || extra.dormitorios || 1} amb.`
            ]
        };
    }

    function records(order, limit) {
        const url = window.SUPABASE_URL || defaultUrl;
        const key = window.SUPABASE_ANON_KEY || defaultKey;
        const cacheKey = `${url}:${key}:${order}:${limit}`;
        const cached = requests.get(cacheKey);
        if (cached && (cached.pending || cached.expires > Date.now())) return cached.promise;
        const entry = { pending: true, expires: 0 };
        const controller = new AbortController();
        // AbortSignal.timeout is unavailable in some browsers; abort the actual request.
        const timeout = setTimeout(() => controller.abort(), 8000);
        const endpoint = new URL('/rest/v1/Publicacion', url);
        endpoint.search = new URLSearchParams({ select, order, limit: String(limit), 'Multimedia.order': 'orden_visualizacion.asc' });
        entry.promise = fetch(endpoint.href, {
            headers: { apikey: key, Accept: 'application/json' },
            credentials: 'omit', signal: controller.signal, priority: 'high'
        }).then(async response => {
            if (!response.ok) throw new Error(`No se pudo cargar el catálogo (${response.status}).`);
            const rows = await response.json();
            if (!Array.isArray(rows)) throw new Error('Respuesta del catálogo inválida.');
            entry.expires = Date.now() + 30000;
            return rows;
        }).catch(error => {
            if (requests.get(cacheKey) === entry) requests.delete(cacheKey);
            throw error;
        }).finally(() => {
            clearTimeout(timeout);
            entry.pending = false;
        });
        requests.set(cacheKey, entry);
        return entry.promise;
    }

    function visibleCards(rows) {
        const cards = rows.map(card).filter(item => item.status !== 'hidden');
        return [...cards.filter(item => item.status === 'disponible'), ...cards.filter(item => item.status === 'alquilada')];
    }

    const featuredOrder = 'cantidad_visualizaciones_total.desc.nullslast,created_at.desc,id_publicacion.desc';
    const featuredPoolSize = 60;
    const catalog = window.LandingCatalog = {
        escapeHtml, safeImageUrl,
        invalidate() { requests.clear(); },
        getFeatured() { return records(featuredOrder, featuredPoolSize).then(rows => visibleCards(rows).slice(0, 20)); },
        async getCities() {
            // A short first response contains the whole public catalog: reuse it.
            const featured = await records(featuredOrder, featuredPoolSize);
            const rows = featured.length < featuredPoolSize ? featured : await records('created_at.desc,id_publicacion.desc', 300);
            return visibleCards([...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        },
        detailRecord(property) {
            return window.DataManager?._mapPublicationRecord && property._publicationRecord
                ? window.DataManager._mapPublicationRecord(property._publicationRecord) : property;
        }
    };
    window.escapeHtml = window.escapeHtml || escapeHtml;
    window.safeImageUrl = window.safeImageUrl || safeImageUrl;
    // Start now, in <head>, before stylesheets, fonts, analytics or account scripts.
    // A failure is handled by the visible retry control when the grid is mounted.
    catalog.getFeatured().catch(() => {});
})();
