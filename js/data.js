/**
 * Data Management Module - Supabase Production Integration
 * Connects all application features to Supabase Postgres DB
 */

// Helper function to convert base64 data URL to Blob for Supabase Storage
window.STORAGE_BUCKETS = {
    PROPIEDADES_MULTIMEDIA: 'propiedades_multimedia',
    FOTOS_DE_PERFIL: 'fotos_de_perfil',
    INVENTARIO_DIGITAL: 'inventario_digital',
    RAG_DOCUMENTS: 'rag-documents',
    CONTRATOS_FIRMADOS: 'contratos_firmados',
    BOVEDA_BIOMETRICA: 'boveda_biometrica'
};

function base64ToBlob(base64Data, contentType = 'image/jpeg') {
    if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:')) {
        return null;
    }
    try {
        const parts = base64Data.split(';base64,');
        const mime = parts[0].split(':')[1] || contentType;
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: mime });
    } catch (e) {
        console.error("Error converting base64 to blob:", e);
        return null;
    }
}

async function authenticatedApiHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const { data } = await window.supabaseClient?.auth.getSession();
    const accessToken = data?.session?.access_token;
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
}

async function uploadPropertyImageSecurely(publicationId, file) {
    if (!(file instanceof Blob) || !window.supabaseClient?.storage) {
        throw new Error('No se recibió una imagen válida.');
    }
    const contentType = String(file.type || '').toLowerCase().split(';')[0].trim();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || file.size < 1 || file.size > 10 * 1024 * 1024) {
        throw new Error('Cada imagen debe ser JPG, PNG o WEBP y no superar los 10 MB.');
    }

    const grantResponse = await fetch('/api/property-media-upload', {
        method: 'POST',
        headers: await authenticatedApiHeaders(),
        body: JSON.stringify({
            id_publicacion: publicationId,
            contentType,
            size: file.size
        })
    });
    const grantPayload = await grantResponse.json().catch(() => ({}));
    if (!grantResponse.ok || !grantPayload?.ok || !grantPayload.data?.path || !grantPayload.data?.token) {
        throw new Error(grantPayload?.message || grantPayload?.error || 'No se pudo autorizar la carga de la imagen.');
    }

    const grant = grantPayload.data;
    const { error } = await window.supabaseClient.storage
        .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
        .uploadToSignedUrl(grant.path, grant.token, file, { contentType: grant.contentType });
    if (error) throw error;

    const { data: publicData } = window.supabaseClient.storage
        .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
        .getPublicUrl(grant.path);
    if (!publicData?.publicUrl) throw new Error('No se pudo obtener la URL pública de la imagen.');
    return publicData.publicUrl;
}

function safeExternalImageUrl(value) {
    if (typeof value !== 'string') return null;
    if (value.startsWith('img/')) return value;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' ? url.toString() : null;
    } catch (_) {
        return null;
    }
}

var DataManager = {
    // Resolve only a server-provisioned profile tied to the immutable Auth ID.
    // Browser code must never create a profile, assign a role, or mark KYC valid.
    _getOrCreateProfile: async function () {
        if (!window.supabaseClient) return null;
        try {
            const { data: userData, error: userError } = await window.supabaseClient.auth.getUser();
            const authUser = userData?.user;
            if (userError || !authUser) return null;

            const { data: profile, error } = await window.supabaseClient
                .from('Perfil')
                .select('id_perfil')
                .eq('user_id', authUser.id)
                .maybeSingle();
            if (error) {
                console.warn('No se pudo resolver el perfil autenticado.');
                return null;
            }
            return profile?.id_perfil || null;
        } catch (e) {
            console.error('Error al resolver el perfil autenticado:', e);
            return null;
        }
    },

    // User Management
    login: async (email, password) => {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            console.error("Login error:", error);
            return null;
        }
        await DataManager._getOrCreateProfile();
        return data.user;
    },

    signUp: async (email, password, fullName) => {
        if (!window.supabaseClient) return null;
        const { data, error } = await window.supabaseClient.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) {
            console.error("Signup error:", error);
            throw error;
        }
        // El perfil se aprovisiona del lado servidor y queda ligado a auth.users.
        // No se permite al navegador elegir roles ni campos de verificación.
        return data.user;
    },

    logout: async () => {
        try {
            localStorage.removeItem('vivat_tenant_applications');
            localStorage.removeItem('vivat_passport_data');
            localStorage.removeItem('vivat_didit_identity');
            localStorage.removeItem('vivat_user');
            localStorage.removeItem('vivat_user_id');
            sessionStorage.removeItem('vivat_pending_didit_session');
            window.hasActivePassport = false;
            window.currentPasaporteId = null;
        } catch (e) {}
        if (window.supabaseClient) {
            const { error } = await window.supabaseClient.auth.signOut();
            if (error) console.error("Logout error:", error);
        }
    },

    getCurrentUser: async () => {
        if (!window.supabaseClient) return null;
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        return user;
    },

    getUserProfile: async () => {
        if (!window.supabaseClient) return null;
        const { data: { user } } = await window.supabaseClient.auth.getUser();
        if (!user) return null;
        const { data } = await window.supabaseClient
            .from('Perfil')
            .select('*')
            .or(`user_id.eq.${user.id},mail.eq.${user.email}`)
            .maybeSingle();
        return data || { mail: user.email, nombre_completo: user.user_metadata?.full_name || 'Usuario' };
    },

    // Property & Marketplace Management
    getProperties: async function (targetProfileId = null, filterByUser = false) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data: properties, error } = await window.supabaseClient
                .from('Propiedad')
                .select(`
                    *,
                    Publicacion (*, Multimedia (*)),
                    Contrato (*),
                    Propiedad_caracteristica (
                        Caracteristica (*)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching Propiedad:", error);
                return [];
            }

            // Also check broker's assigned leads if filtering by user
            let brokerLeadPropNames = [];
            if (filterByUser && profileId) {
                try {
                    const { data: brokerLeads } = await window.supabaseClient
                        .from('Lead_inmobiliario')
                        .select('nombre_propiedad, direccion_propiedad')
                        .eq('id_perfil_corredor', profileId);
                    if (brokerLeads) {
                        brokerLeadPropNames = brokerLeads.map(l => (l.nombre_propiedad || l.direccion_propiedad || '').toLowerCase().trim()).filter(Boolean);
                    }
                } catch (e) {}
            }

            const rawList = properties || [];
            const filtered = (filterByUser && profileId) ? rawList.filter(p => {
                const isOwner = Number(p.id_perfil_propietario) === Number(profileId);
                const isCaptador = Number(p.id_perfil_captador) === Number(profileId);
                const pubs = Array.isArray(p.Publicacion) ? p.Publicacion : (p.Publicacion ? [p.Publicacion] : []);
                const hasUserPub = pubs.some(pub => Number(pub.id_perfil) === Number(profileId));
                
                const pAddr = `${p.calle || ''} ${p.numero || ''}`.toLowerCase().trim();
                const isLeadProp = brokerLeadPropNames.some(name => {
                    if (!name || name.length < 5 || !pAddr || pAddr.length < 5) return false;
                    return pAddr === name || pAddr.includes(name) || name.includes(pAddr);
                });

                return isOwner || isCaptador || hasUserPub || isLeadProp;
            }) : rawList;

            return filtered.map(p => {
                const pub = Array.isArray(p.Publicacion) ? p.Publicacion[0] : p.Publicacion;
                const media = pub?.Multimedia || [];
                const contract = Array.isArray(p.Contrato) ? p.Contrato[0] : p.Contrato;

                const photoUrls = media.length > 0
                    ? Array.from(new Set(media.map(m => (typeof m === 'string' ? m : (m.url_archivo || m.url || m.url_foto || m.url_multimedia))).filter(Boolean)))
                    : ['img/hero-marketplace.jpg'];
                if (photoUrls.length === 0) photoUrls.push('img/hero-marketplace.jpg');
                const title = pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : `${p.calle || 'Propiedad'} ${p.numero || ''}`.trim();
                const address = `${p.calle || 'Sin calle'} ${p.numero || ''}, ${p.piso_dpto || ''}`.trim();
                const dbCaracteristicas = (p.Propiedad_caracteristica || []).map(pc => pc.Caracteristica?.nombre).filter(Boolean);

                return {
                    id: p.id_propiedad,
                    id_propiedad: p.id_propiedad,
                    title: title,
                    description: pub?.descripcion || '',
                    address: address,
                    price: pub?.precio || p.expensas_mensuales || 0,
                    rentDueDay: contract?.dia_vencimiento_mensual || 10,
                    contractStartDate: contract?.fecha_inicio_contrato || null,
                    contractEndDate: contract?.fecha_fin_contrato || null,
                    tenantName: 'Inquilino Activo',
                    tenantEmail: '',
                    tenantPhone: '',
                    cbuAlias: contract?.alias_cbu || 'VIVAT.MP',
                    photoUrl: photoUrls[0],
                    images: photoUrls,
                    caracteristicas: dbCaracteristicas,
                    status: pub ? 'disponible' : 'alquilada',
                    paymentStatus: 'al_dia'
                };
            });
        } catch (e) {
            console.error("getProperties catch error:", e);
            return [];
        }
    },

    getBrokerProperties: async function (targetProfileId = null) {
        return this.getProperties(targetProfileId, true);
    },

    getPublicMarketplaceProperties: async (limit = 50, includeAllStatuses = false, filterByUser = false) => {
        if (!window.supabaseClient) return [];
        try {
            let query = window.supabaseClient
                .from('Publicacion')
                .select(`
                    *,
                    Historial_Estado_Publicacion (*, Estado_Publicacion (*)),
                    Propiedad (
                        *,
                        Contrato (*),
                        Antiguedad (*),
                        Subtipo_propiedad (*),
                        Barrio (
                            *,
                            Departamento (
                                *,
                                Provincia (*)
                            )
                        ),
                        Propiedad_caracteristica (
                            Caracteristica (*)
                        )
                    ),
                    Multimedia (*)
                `);

            let profileId = null;
            if (filterByUser) {
                if (window.DataManager && window.DataManager._getOrCreateProfile) {
                    profileId = await window.DataManager._getOrCreateProfile();
                }
                if (!profileId) {
                    return [];
                }
                query = query.eq('id_perfil', profileId);
            }

            const { data: publications, error } = await query
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching Publicacion:", error);
                return [];
            }

            return (publications || []).map(pub => {
                const prop = pub.Propiedad || {};
                const media = pub.Multimedia || [];
                const imageUrls = media.length > 0
                    ? Array.from(new Set(media.map(m => (typeof m === 'string' ? m : (m.url_archivo || m.url || m.url_foto || m.url_multimedia))).filter(Boolean)))
                    : ['img/hero-marketplace.jpg'];
                if (imageUrls.length === 0) imageUrls.push('img/hero-marketplace.jpg');
                const firstImage = imageUrls[0];
                const address = `${prop.calle || 'Mendoza'} ${prop.numero || ''}`.trim();

                // Extract details from JSON suffix or fallback to Propiedad table columns
                let extraInfo = {};
                if (pub.descripcion && pub.descripcion.includes('Detalles: ')) {
                    try { extraInfo = JSON.parse(pub.descripcion.split('Detalles: ')[1]); } catch (e) { }
                }

                const dbCaracteristicas = (prop.Propiedad_caracteristica || []).map(pc => pc.Caracteristica?.nombre).filter(Boolean);
                if (dbCaracteristicas.length > 0) {
                    extraInfo.caracteristicas = Array.from(new Set([
                        ...(extraInfo.caracteristicas || []),
                        ...dbCaracteristicas
                    ]));
                }

                const rawDescPrefix = pub.descripcion
                    ? pub.descripcion.split(' | Detalles: ')[0].split('Detalles: ')[0].replace(/(\s*\|\s*)+$/, '').trim()
                    : '';
                const cleanTitle = extraInfo.title || (rawDescPrefix ? rawDescPrefix.substring(0, 70) : `Propiedad en ${address}`);

                const lat = prop.latitud ? parseFloat(prop.latitud) : -32.8898;
                const lng = prop.longitud ? parseFloat(prop.longitud) : -68.8373;
                const dormitorios = prop.dormitorios || extraInfo.dormitorios || 1;
                const banos = prop.banos_completos || extraInfo.banos || 1;
                const ambientes = prop.habitaciones_total || extraInfo.ambientes || dormitorios;
                const cocheras = prop.cantidad_cocheras || extraInfo.cocheras || 0;
                const supCubierta = prop.superficie_cubierta || extraInfo.supCubierta || 0;
                const isVerifiedOwner = Boolean(
                    extraInfo.isVerifiedOwner ||
                    extraInfo.verified ||
                    (pub.descripcion && pub.descripcion.includes('"isVerifiedOwner":true'))
                );

                const tags = [
                    dormitorios ? `${dormitorios} dorm.` : null,
                    banos ? `${banos} bañ.` : null,
                    ambientes ? `${ambientes} amb.` : null,
                    cocheras ? `${cocheras} coch.` : null,
                    supCubierta ? `${supCubierta} m²` : null,
                    isVerifiedOwner ? 'Propietario Verificado' : null
                ].filter(Boolean);

                const dbBarrio = prop.Barrio?.nombre;
                const dbDepartamento = prop.Barrio?.Departamento?.nombre;
                const dbProvincia = prop.Barrio?.Departamento?.Provincia?.nombre;
                const dbSubtipo = prop.Subtipo_propiedad?.subtipo;
                const dbAntiguedad = prop.Antiguedad?.nombre;

                // Resolve current active status from Historial_Estado_Publicacion
                let currentPropStatus = 'disponible';
                if (pub.Historial_Estado_Publicacion && pub.Historial_Estado_Publicacion.length > 0) {
                    const sortedHist = [...pub.Historial_Estado_Publicacion].sort((a, b) => new Date(b.fecha_inicio || b.created_at) - new Date(a.fecha_inicio || a.created_at));
                    const activeHist = sortedHist.find(h => !h.fecha_fin) || sortedHist[0];
                    const estadoNombre = (activeHist.Estado_Publicacion?.nombre || '').toLowerCase();
                    if (estadoNombre === 'pausada' || estadoNombre === 'pausado' || activeHist.id_estado_publicacion === 4) {
                        currentPropStatus = 'paused';
                    } else if (estadoNombre === 'eliminada' || estadoNombre === 'eliminado' || activeHist.id_estado_publicacion === 5) {
                        currentPropStatus = 'deleted';
                    } else if (estadoNombre === 'alquilada' || estadoNombre === 'alquilado' || activeHist.id_estado_publicacion === 2) {
                        currentPropStatus = 'alquilada';
                    } else if (estadoNombre === 'vendida' || estadoNombre === 'vendido' || activeHist.id_estado_publicacion === 3) {
                        currentPropStatus = 'vendida';
                    } else if (estadoNombre === 'borrador' || estadoNombre === 'draft' || activeHist.id_estado_publicacion === 6) {
                        currentPropStatus = 'draft';
                    } else if (estadoNombre === 'mantenimiento') {
                        currentPropStatus = 'mantenimiento';
                    } else {
                        currentPropStatus = 'disponible';
                    }
                } else if (pub.status || pub.estado) {
                    const st = (pub.status || pub.estado).toLowerCase();
                    if (st.includes('paus')) currentPropStatus = 'paused';
                    else if (st.includes('alquil')) currentPropStatus = 'alquilada';
                    else if (st.includes('vend')) currentPropStatus = 'vendida';
                    else if (st.includes('borr') || st.includes('draft')) currentPropStatus = 'draft';
                    else if (st.includes('mant')) currentPropStatus = 'mantenimiento';
                    else currentPropStatus = 'disponible';
                }

                // Check active contract for rental end date if rented
                const contractsList = Array.isArray(prop.Contrato) ? prop.Contrato : (prop.Contrato ? [prop.Contrato] : []);
                const latestContract = contractsList.sort((a, b) => (b.id_contrato || 0) - (a.id_contrato || 0))[0];
                const contractEndDate = latestContract?.fecha_fin_contrato || extraInfo.contractEndDate || extraInfo.fecha_fin_contrato || null;

                return {
                    id: pub.id_publicacion,
                    id_propiedad: pub.id_propiedad,
                    id_publicacion: pub.id_publicacion,
                    id_perfil_propietario: prop.id_perfil_propietario || pub.id_perfil || null,
                    owner_profile_id: prop.id_perfil_propietario || pub.id_perfil || null,
                    id_perfil: pub.id_perfil || prop.id_perfil_propietario || null,
                    owner_email: extraInfo.ownerEmail || extraInfo.owner_email || '',
                    owner_name: extraInfo.ownerName || extraInfo.owner_name || '',
                    title: cleanTitle,
                    description: rawDescPrefix || pub.descripcion || '',
                    address: address,
                    province: dbProvincia || extraInfo.provincia || 'Mendoza',
                    city: dbDepartamento || extraInfo.ciudad || 'Mendoza',
                    price: parseFloat(pub.precio || 0),
                    images: imageUrls,
                    photoUrl: firstImage,
                    image: firstImage,
                    coords: [lat, lng],
                    latitud: lat,
                    longitud: lng,
                    dormitorios: dormitorios,
                    banos: banos,
                    toilettes: extraInfo.toilettes || prop.toilettes || 0,
                    ambientes: ambientes,
                    cocheras: cocheras,
                    sup_cubierta: supCubierta,
                    sup_total: prop.superficie_lote || extraInfo.supTotal || extraInfo.sup_total || 0,
                    piso_dpto: prop.piso_dpto || extraInfo.piso_dpto || '',
                    numero_local: prop.numero_local || extraInfo.numero_local || '',
                    antiguedad: dbAntiguedad || extraInfo.antiguedad || '',
                    disposicion: extraInfo.disposicion || '',
                    orientacion: extraInfo.orientacion || '',
                    barrio: dbBarrio || extraInfo.barrio || '',
                    subtipo_propiedad: dbSubtipo || extraInfo.subtipoPropiedad || extraInfo.subtipo_propiedad || '',
                    caracteristicas: extraInfo.caracteristicas || dbCaracteristicas || [],
                    tags: tags,
                    note: cleanTitle,
                    tipo_propiedad: extraInfo.tipo_propiedad || extraInfo.tipo || (prop.id_tipo_propiedad === 2 ? 'Casa' : (prop.id_tipo_propiedad === 3 ? 'PH' : (prop.id_tipo_propiedad === 6 ? 'Local comercial' : 'Departamento'))),
                    type: extraInfo.tipo || extraInfo.tipo_propiedad || (prop.id_tipo_propiedad === 2 ? 'casa' : (prop.id_tipo_propiedad === 3 ? 'ph' : (prop.id_tipo_propiedad === 6 ? 'local-comercial' : 'departamento'))),
                    id_tipo_propiedad: prop.id_tipo_propiedad,
                    pet: extraInfo.mascotas || false,
                    verified: isVerifiedOwner,
                    isVerifiedOwner: isVerifiedOwner,
                    status: currentPropStatus,
                    contractEndDate: contractEndDate,
                    expensasIncluidas: extraInfo.expensasIncluidas !== undefined ? extraInfo.expensasIncluidas : true,
                    expensas: (extraInfo.expensas !== undefined) ? Number(extraInfo.expensas) : (Number(prop.expensas_mensuales) || 0),
                    currency: extraInfo.moneda || extraInfo.currency || (pub.id_moneda === 2 ? 'USD' : 'ARS'),
                    id_moneda: pub.id_moneda || (extraInfo.moneda === 'USD' ? 2 : 1),
                    featured: (extraInfo.operacion || 'ALQUILER').toUpperCase(),
                    created_at: pub.created_at,
                    cantidad_visualizaciones_total: pub.cantidad_visualizaciones_total || 0,
                    views_count: pub.cantidad_visualizaciones_total || 0,
                    views: pub.cantidad_visualizaciones_total || 0,
                    historial: pub.Historial_Estado_Publicacion || [],
                    extraInfo: extraInfo,
                    Propiedad: prop
                };
            }).filter(p => {
                if (p.status === 'deleted') return false;
                if (filterByUser && profileId) {
                    const isAuthor = Number(p.id_perfil) === Number(profileId);
                    const isOwner = Number(p.id_perfil_propietario) === Number(profileId);
                    if (!isAuthor && !isOwner) return false;
                }
                if (includeAllStatuses) return true;
                return p.status === 'disponible' || p.status === 'alquilada';
            });
        } catch (e) {
            console.error("Error in getPublicMarketplaceProperties:", e);
            return [];
        }
    },

    getUserMarketplaceProperties: async (limit = 100) => {
        return DataManager.getPublicMarketplaceProperties(limit, true, true);
    },

    recordPublicationView: async (id_publicacion) => {
        if (!window.supabaseClient || !id_publicacion) return;
        try {
            let profileId = null;
            try {
                const { data: { user } } = await window.supabaseClient.auth.getUser();
                if (user) {
                    const { data: profile } = await window.supabaseClient
                        .from('Perfil')
                        .select('id_perfil')
                        .or(`user_id.eq.${user.id},mail.eq.${user.email}`)
                        .maybeSingle();
                    if (profile) profileId = profile.id_perfil;
                }
            } catch (e) {}

            // 1. Insert row into Registro_visualizacion (trigger automatically updates Publicacion.cantidad_visualizaciones_total)
            const { error: insertErr } = await window.supabaseClient
                .from('Registro_visualizacion')
                .insert([{ id_publicacion: id_publicacion, id_perfil: profileId }]);

            if (insertErr) {
                console.warn("Could not insert Registro_visualizacion:", insertErr);
            }

            // 2. Fetch fresh views count from Publicacion
            const { data: pubData } = await window.supabaseClient
                .from('Publicacion')
                .select('cantidad_visualizaciones_total')
                .eq('id_publicacion', id_publicacion)
                .maybeSingle();

            return pubData?.cantidad_visualizaciones_total;

        } catch (err) {
            console.error("Error recording publication view:", err);
        }
    },

    addMarketplaceProperty: async (propertyData) => {
        if (!window.supabaseClient) throw new Error("Supabase client not available");

        const profileId = await DataManager._getOrCreateProfile({
            email: propertyData.contactEmail || propertyData.email,
            nombre: `${propertyData.contactNombre || ''} ${propertyData.contactApellido || ''}`.trim()
        });

        // 1. Parse address & street number accurately
        let fullCalle = propertyData.calleAltura || propertyData.address || 'Calle Principal';
        let numero = propertyData.numero || '';

        // Extract street number if attached in street input
        if (!numero && fullCalle) {
            const match = fullCalle.match(/^(.*?)\s+(\d+)\s*$/);
            if (match) {
                fullCalle = match[1];
                numero = match[2];
            }
        }

        if (!numero && window.selectedPropertyStreetNumber) {
            numero = window.selectedPropertyStreetNumber;
        }

        // 1. Map tipoPropiedad to id_tipo_propiedad integer
        const tipoSlug = (propertyData.tipoPropiedad || 'departamento').toLowerCase();
        const tipoMap = {
            'departamento': 1,
            'casa': 2,
            'ph': 3,
            'lote': 4,
            'oficina': 5,
            'local-comercial': 6,
            'local': 6,
            'cochera': 7
        };
        const idTipoPropiedad = tipoMap[tipoSlug] || 1;

        // 2. Lookup id_subtipo_propiedad dynamically from Subtipo_propiedad table
        let idSubtipoPropiedad = null;
        const directSubtipoMap = {
            'duplex': 1,
            'estandar': 2,
            'monoambiente': 3,
            'piso': 4,
            'local-a-calle': 23,
            'galeria': 24,
            'galpon': 26,
            'deposito': 27
        };

        if (propertyData.subtipoPropiedad) {
            const rawSub = propertyData.subtipoPropiedad.toLowerCase();
            idSubtipoPropiedad = directSubtipoMap[rawSub] || null;

            if (!idSubtipoPropiedad) {
                const { data: dbSubtipos } = await window.supabaseClient
                    .from('Subtipo_propiedad')
                    .select('id_subtipo_propiedad, subtipo')
                    .eq('id_tipo_propiedad', idTipoPropiedad);

                if (dbSubtipos && dbSubtipos.length > 0) {
                    const matched = dbSubtipos.find(s => {
                        const dbName = s.subtipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const rawSubNorm = rawSub.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                        const dbSlug = dbName.replace(/[^a-z0-9]/g, '');
                        return dbSlug === rawSubNorm || dbName === rawSub || dbName.includes(rawSubNorm) || rawSubNorm.includes(dbSlug);
                    });
                    if (matched) {
                        idSubtipoPropiedad = matched.id_subtipo_propiedad;
                    }
                }
            }
        }

        // 2.1 Map id_antiguedad integer (1: A estrenar, 2: Años de antigüedad, 3: Remodelado)
        let idAntiguedad = null;
        if (propertyData.antiguedad) {
            const rawAnt = String(propertyData.antiguedad).toLowerCase();
            const antMap = {
                'a-estrenar': 1,
                'estrenar': 1,
                'anos-antiguedad': 2,
                'anios': 2,
                'anos': 2,
                'remodelado': 3
            };
            idAntiguedad = antMap[rawAnt] || null;
        }

        // 3. Auto-populate Provincia, Departamento, Barrio & get id_barrio
        let idBarrio = null;
        try {
            const provinciaName = (propertyData.provincia || 'Mendoza').trim();
            const ciudadName = (propertyData.ciudad || 'Mendoza').trim();
            const barrioName = (propertyData.barrio || 'Centro').trim();

            if (provinciaName) {
                let { data: prov } = await window.supabaseClient
                    .from('Provincia')
                    .select('id_provincia')
                    .ilike('nombre', provinciaName)
                    .maybeSingle();

                if (!prov) {
                    const { data: newProv } = await window.supabaseClient
                        .from('Provincia')
                        .insert([{ nombre: provinciaName }])
                        .select('id_provincia')
                        .single();
                    prov = newProv;
                }

                if (prov && ciudadName) {
                    let { data: deptoGeog } = await window.supabaseClient
                        .from('Departamento')
                        .select('id_departamento')
                        .eq('id_provincia', prov.id_provincia)
                        .ilike('nombre', ciudadName)
                        .maybeSingle();

                    if (!deptoGeog) {
                        const { data: newDepto } = await window.supabaseClient
                            .from('Departamento')
                            .insert([{ nombre: ciudadName, id_provincia: prov.id_provincia }])
                            .select('id_departamento')
                            .single();
                        deptoGeog = newDepto;
                    }

                    if (deptoGeog && barrioName) {
                        let { data: bar } = await window.supabaseClient
                            .from('Barrio')
                            .select('id_barrio')
                            .eq('id_departamento', deptoGeog.id_departamento)
                            .ilike('nombre', barrioName)
                            .maybeSingle();

                        if (!bar) {
                            const { data: newBar } = await window.supabaseClient
                                .from('Barrio')
                                .insert([{ nombre: barrioName, id_departamento: deptoGeog.id_departamento }])
                                .select('id_barrio')
                                .single();
                            bar = newBar;
                        }

                        if (bar) {
                            idBarrio = bar.id_barrio;
                        }
                    }
                }
            }
        } catch (geoErr) {
            console.error("Error auto-populating geographic tables:", geoErr);
        }

        const expensasVal = propertyData.expensasIncluidas ? 0 : parseFloat(propertyData.expensas || 0);
        const resolvedCp = (typeof window.resolvePostalCode === 'function')
            ? window.resolvePostalCode(fullCalle, propertyData.provincia, propertyData.ciudad, propertyData.codigoPostal || window.selectedPropertyPostalCode)
            : (propertyData.codigoPostal || window.selectedPropertyPostalCode || '5500');

        // 4. Insert Propiedad
        const { data: propData, error: propErr } = await window.supabaseClient
            .from('Propiedad')
            .insert([{
                id_tipo_propiedad: idTipoPropiedad,
                id_subtipo_propiedad: idSubtipoPropiedad,
                id_barrio: idBarrio,
                id_antiguedad: idAntiguedad,
                id_unidad_medida: 1,
                id_perfil_propietario: profileId,
                calle: fullCalle,
                numero: numero || null,
                piso_dpto: propertyData.piso ? `${propertyData.piso} ${propertyData.depto || ''}`.trim() : null,
                numero_local: propertyData.numeroLocal || propertyData.numero_local || null,
                codigo_postal: resolvedCp,
                expensas_mensuales: expensasVal,
                dormitorios: parseInt(propertyData.dormitorios || 0),
                banos_completos: parseInt(propertyData.banos || 0),
                habitaciones_total: parseInt(propertyData.ambientes || 0),
                cantidad_cocheras: parseInt(propertyData.cocheras || 0),
                superficie_cubierta: parseFloat(propertyData.supCubierta || 0),
                superficie_lote: parseFloat(propertyData.supTotal || 0),
                latitud: propertyData.latitud ? parseFloat(propertyData.latitud) : (window.selectedPropertyLat || null),
                longitud: propertyData.longitud ? parseFloat(propertyData.longitud) : (window.selectedPropertyLng || null)
            }])
            .select()
            .single();

        if (propErr) {
            console.error("Error inserting Propiedad:", propErr);
            throw propErr;
        }

        // 2.1 Save Caracteristica & Propiedad_caracteristica for Extras step checkboxes
        const rawCaracteristicas = Array.isArray(propertyData.caracteristicas) ? propertyData.caracteristicas : [];
        const featureNames = Array.from(new Set(rawCaracteristicas.filter(Boolean)));

        if (featureNames.length > 0) {
            try {
                // Fetch existing characteristics matching these names
                const { data: existingFeats, error: selectErr } = await window.supabaseClient
                    .from('Caracteristica')
                    .select('id_caracteristica, nombre')
                    .in('nombre', featureNames);

                if (selectErr) {
                    console.error("Error fetching existing Caracteristica:", selectErr);
                }

                const existingMap = new Map();
                (existingFeats || []).forEach(f => {
                    existingMap.set(f.nombre, f.id_caracteristica);
                });

                // Identify feature names not yet in Caracteristica table
                const missingNames = featureNames.filter(name => !existingMap.has(name));

                if (missingNames.length > 0) {
                    const { data: insertedFeats, error: insertErr } = await window.supabaseClient
                        .from('Caracteristica')
                        .insert(missingNames.map(nombre => ({ nombre })))
                        .select('id_caracteristica, nombre');

                    if (insertErr) {
                        console.error("Error inserting into Caracteristica:", insertErr);
                    } else if (insertedFeats) {
                        insertedFeats.forEach(f => {
                            existingMap.set(f.nombre, f.id_caracteristica);
                        });
                    }
                }

                // Map to Propiedad_caracteristica records
                const propFeatRows = featureNames
                    .map(name => existingMap.get(name))
                    .filter(Boolean)
                    .map(id_caracteristica => ({
                        id_propiedad: propData.id_propiedad,
                        id_caracteristica: id_caracteristica
                    }));

                if (propFeatRows.length > 0) {
                    const { error: relErr } = await window.supabaseClient
                        .from('Propiedad_caracteristica')
                        .insert(propFeatRows);

                    if (relErr) {
                        console.error("Error inserting Propiedad_caracteristica:", relErr);
                    }
                }
            } catch (featErr) {
                console.error("Error saving property characteristics:", featErr);
            }
        }

        // 3. Construct description string with metadata suffix
        const baseDescription = propertyData.descripcionAviso || propertyData.tituloAviso || 'Propiedad publicada en alquiler';
        const price = parseFloat(propertyData.precio || propertyData.price || 0);

        const extraMeta = {
            tipo: propertyData.tipoPropiedad || 'departamento',
            tipo_propiedad: propertyData.tipoPropiedad || 'departamento',
            tipoPropiedad: propertyData.tipoPropiedad || 'departamento',
            isVerifiedOwner: Boolean(propertyData.isVerifiedOwner),
            moneda: propertyData.moneda || 'ARS',
            operacion: propertyData.operacion || 'Alquiler',
            dormitorios: parseInt(propertyData.dormitorios || 0),
            banos: parseInt(propertyData.banos || 0),
            toilettes: parseInt(propertyData.toilettes || 0),
            ambientes: parseInt(propertyData.ambientes || 0),
            cocheras: parseInt(propertyData.cocheras || 0),
            supCubierta: parseFloat(propertyData.supCubierta || 0),
            supTotal: parseFloat(propertyData.supTotal || 0),
            provincia: propertyData.provincia,
            ciudad: propertyData.ciudad,
            barrio: propertyData.barrio,
            calle: fullCalle,
            numero: numero || null,
            piso_dpto: propertyData.piso ? `${propertyData.piso} ${propertyData.depto || ''}`.trim() : null,
            numero_local: propertyData.numeroLocal || propertyData.numero_local || null,
            antiguedad: propertyData.antiguedad,
            disposicion: propertyData.disposicion,
            orientacion: propertyData.orientacion,
            subtipoPropiedad: propertyData.subtipoPropiedad || '',
            subtipo_propiedad: propertyData.subtipoPropiedad || '',
            amoblado: propertyData.amoblado,
            expensasIncluidas: Boolean(propertyData.expensasIncluidas),
            expensas: propertyData.expensasIncluidas ? 0 : parseFloat(propertyData.expensas || 0),
            caracteristicas: propertyData.caracteristicas || []
        };
        const descriptionWithMeta = `${baseDescription} | Detalles: ${JSON.stringify(extraMeta)}`;

        const { data: pubData, error: pubErr } = await window.supabaseClient
            .from('Publicacion')
            .insert([{
                id_propiedad: propData.id_propiedad,
                id_perfil: profileId,
                id_tipo_operacion: 1,
                id_moneda: propertyData.moneda === 'USD' ? 2 : 1,
                precio: price,
                descripcion: descriptionWithMeta
            }])
            .select()
            .single();

        if (pubErr) {
            console.error("Error inserting Publicacion:", pubErr);
            throw pubErr;
        }

        // 4. Record in Historial_Estado_Publicacion (State 1 = disponible)
        await window.supabaseClient
            .from('Historial_Estado_Publicacion')
            .insert([{
                id_publicacion: pubData.id_publicacion,
                id_estado_publicacion: 1,
                fecha_inicio: new Date().toISOString()
            }]);

        // 4.1 Save Politica_Mascota & Limite_mascota
        try {
            const petPref = propertyData.preferenciasAlquiler?.mascotas || {};
            const permiteMascotas = Boolean(propertyData.preferenciasAlquiler?.permiteMascotas || petPref.permiteMascotas);

            await window.supabaseClient
                .from('Politica_Mascota')
                .insert([{
                    id_publicacion: pubData.id_publicacion,
                    permite_mascotas: permiteMascotas,
                    es_negociable: Boolean(petPref.negociable),
                    tarifa_ingreso: parseFloat(petPref.tarifaIngreso || 0),
                    tarifa_reembolsable: Boolean(petPref.tarifaReembolsable),
                    alquiler_mensual_extra: parseFloat(petPref.alquilerMensualMascota || 0)
                }]);

            const limits = [];
            if (parseInt(petPref.perrosPequenos || 0) > 0) limits.push({ id_publicacion: pubData.id_publicacion, id_tipo_mascota: 1, cantidad: parseInt(petPref.perrosPequenos) });
            if (parseInt(petPref.perrosGrandes || 0) > 0) limits.push({ id_publicacion: pubData.id_publicacion, id_tipo_mascota: 2, cantidad: parseInt(petPref.perrosGrandes) });
            if (parseInt(petPref.gatos || 0) > 0) limits.push({ id_publicacion: pubData.id_publicacion, id_tipo_mascota: 3, cantidad: parseInt(petPref.gatos) });

            if (limits.length > 0) {
                await window.supabaseClient.from('Limite_mascota').insert(limits);
            }
        } catch (petErr) {
            console.error("Error saving Politica_Mascota:", petErr);
        }

        // 5. Upload photos to Supabase Storage bucket propiedades_multimedia and save to Multimedia table
        let rawPhotos = propertyData.photos || propertyData.multimedia?.fotos || window.selectedPropertyPhotos || [];
        if (!Array.isArray(rawPhotos) || rawPhotos.length === 0) {
            rawPhotos = ['img/hero-marketplace.jpg'];
        }

        // Deduplicar array de entrada para evitar uploads o registros dobles
        const uniqueRawPhotos = [];
        const seenItems = new Set();
        for (const item of rawPhotos) {
            if (!item) continue;
            let key = item;
            if (item instanceof File || item instanceof Blob) {
                key = `${item.name || item.originalName || 'blob'}-${item.size || item.originalSize || 0}-${item.type || ''}`;
            } else if (typeof item === 'object') {
                key = item.url || item.src || item.file?.name || JSON.stringify(item);
            }
            if (!seenItems.has(key)) {
                seenItems.add(key);
                uniqueRawPhotos.push(item);
            }
        }

        const uploadedMediaItems = [];
        const seenUrls = new Set();

        for (let idx = 0; idx < uniqueRawPhotos.length; idx++) {
            let item = uniqueRawPhotos[idx];
            let publicUrl = null;

            if (item && typeof item === 'object' && !(item instanceof File) && !(item instanceof Blob)) {
                item = item.file || item.blob || item.url || item.src || item.preview || item;
            }

            try {
                if (item instanceof File || item instanceof Blob) {
                    publicUrl = await uploadPropertyImageSecurely(pubData.id_publicacion, item);
                } else if (typeof item === 'string' && item.startsWith('data:')) {
                    const blob = base64ToBlob(item);
                    if (blob) {
                        publicUrl = await uploadPropertyImageSecurely(pubData.id_publicacion, blob);
                    }
                } else if (typeof item === 'string') {
                    publicUrl = safeExternalImageUrl(item);
                }
            } catch (imgErr) {
                console.warn("Storage upload exception:", imgErr);
            }

            if (!publicUrl && typeof item === 'string') {
                publicUrl = safeExternalImageUrl(item);
            }

            if (publicUrl && !seenUrls.has(publicUrl)) {
                seenUrls.add(publicUrl);
                uploadedMediaItems.push({
                    id_publicacion: pubData.id_publicacion,
                    id_tipo_multimedia: 1,
                    url_archivo: publicUrl,
                    orden_visualizacion: uploadedMediaItems.length + 1
                });
            }
        }

        if (uploadedMediaItems.length > 0) {
            const { error: mediaErr } = await window.supabaseClient.from('Multimedia').insert(uploadedMediaItems);
            if (mediaErr) {
                console.error("Error inserting Multimedia rows:", mediaErr);
            }
        }

        // Limpiar estado de fotos en memoria
        window.selectedPropertyPhotos = [];

        return {
            id: pubData.id_publicacion,
            id_propiedad: propData.id_propiedad,
            title: baseDescription,
            address: propData.calle,
            price: price
        };
    },

    addProperty: async (propertyData) => {
        return DataManager.addMarketplaceProperty(propertyData);
    },

    deleteProperty: async (id_publicacion) => {
        if (!id_publicacion) return;
        const nowIso = new Date().toISOString();
        const strId = String(id_publicacion);

        // 1. Guardar en lista local de eliminadas para filtrado inmediato
        try {
            const deletedProps = JSON.parse(localStorage.getItem('vivat_deleted_properties') || '[]');
            if (!deletedProps.includes(strId)) {
                deletedProps.push(strId);
                localStorage.setItem('vivat_deleted_properties', JSON.stringify(deletedProps));
            }

            // Eliminar postulaciones locales asociadas a esta propiedad / publicación
            const rawApps = localStorage.getItem('vivat_tenant_applications');
            if (rawApps) {
                const parsed = JSON.parse(rawApps);
                if (Array.isArray(parsed)) {
                    const remainingApps = parsed.filter(a => {
                        const pid = String(a.property_id || a.propertyId || a.id_propiedad || '');
                        const pPubId = String(a.publication_id || a.publicationId || a.id_publicacion || '');
                        return pid !== strId && pPubId !== strId;
                    });
                    localStorage.setItem('vivat_tenant_applications', JSON.stringify(remainingApps));
                }
            }
        } catch (e) {
            console.warn("Error updating local deleted properties:", e);
        }

        // 2. Si Supabase está disponible, registrar estado 5 (eliminada)
        if (window.supabaseClient) {
            try {
                // Close active status history
                await window.supabaseClient
                    .from('Historial_Estado_Publicacion')
                    .update({ fecha_fin: nowIso })
                    .eq('id_publicacion', id_publicacion)
                    .is('fecha_fin', null);

                // Insert new status history with id_estado_publicacion = 5 ('eliminada')
                await window.supabaseClient
                    .from('Historial_Estado_Publicacion')
                    .insert([{
                        id_publicacion: id_publicacion,
                        id_estado_publicacion: 5,
                        fecha_inicio: nowIso
                    }]);
            } catch (e) {
                console.error("Error setting property status to eliminada in Supabase:", e);
            }
        }
    },

    togglePauseProperty: async (id_publicacion, currentStatus) => {
        if (!window.supabaseClient || !id_publicacion) return 'paused';
        const isPaused = (currentStatus === 'paused' || currentStatus === 'pausado');
        const newStatus = isPaused ? 'disponible' : 'paused';
        const newEstadoId = isPaused ? 1 : 4; // 4 = pausada, 1 = disponible

        const nowIso = new Date().toISOString();

        try {
            // Close active status history
            await window.supabaseClient
                .from('Historial_Estado_Publicacion')
                .update({ fecha_fin: nowIso })
                .eq('id_publicacion', id_publicacion)
                .is('fecha_fin', null);

            // Insert new status history with correct id_estado_publicacion (4 for pausada)
            await window.supabaseClient
                .from('Historial_Estado_Publicacion')
                .insert([{
                    id_publicacion: id_publicacion,
                    id_estado_publicacion: newEstadoId,
                    fecha_inicio: nowIso
                }]);
        } catch (e) {
            console.warn("Historial_Estado_Publicacion update error:", e);
        }
        return newStatus;
    },

    // Finances & Income
    calculateTotalIncome: async () => {
        if (!window.supabaseClient) return 0;
        const { data } = await window.supabaseClient.from('Publicacion').select('precio');
        return (data || []).reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0);
    },

    // Postulaciones / Solicitudes
    getApplications: async function (targetProfileId = null, filterByUser = false) {
        let deletedProps = [];
        try {
            deletedProps = JSON.parse(localStorage.getItem('vivat_deleted_properties') || '[]');
        } catch (e) {}

        let dbApps = [];
        if (window.supabaseClient) {
            try {
                let profileId = targetProfileId;
                if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                    profileId = await window.DataManager._getOrCreateProfile();
                }
                if (filterByUser && !profileId) {
                    return [];
                }

                const { data, error } = await window.supabaseClient
                    .from('Solicitud')
                    .select(`
                        *,
                        Historial_estado_solicitud (
                            id_historial_estado_solicitud,
                            id_estado_solicitud,
                            fecha_inicio,
                            Estado_solicitud (
                                id_estado_solicitud,
                                nombre
                            )
                        ),
                        Publicacion (
                            *,
                            Historial_Estado_Publicacion (*, Estado_Publicacion (*)),
                            Multimedia (*),
                            Propiedad (
                                *,
                                Barrio (*)
                            )
                        ),
                        Perfil (
                            *,
                            Pasaporte_vivat (*)
                        )
                    `)
                    .order('fecha_solicitud', { ascending: false });

                let dbContractsMap = new Map();
                try {
                    const { data: dbContr } = await window.supabaseClient
                        .from('Contrato')
                        .select('id_contrato, id_propiedad, id_publicacion, id_perfil_inquilino');
                    if (dbContr) {
                        dbContr.forEach(c => {
                            const code = `CTR-2026-${String(c.id_contrato).padStart(4, '0')}`;
                            if (c.id_propiedad && c.id_perfil_inquilino) {
                                dbContractsMap.set(`${c.id_propiedad}_${c.id_perfil_inquilino}`, code);
                            }
                            if (c.id_publicacion && c.id_perfil_inquilino) {
                                dbContractsMap.set(`pub_${c.id_publicacion}_${c.id_perfil_inquilino}`, code);
                            }
                            if (c.id_propiedad) {
                                dbContractsMap.set(`prop_${c.id_propiedad}`, code);
                            }
                        });
                    }
                } catch (eContr) { }

                if (!error && data) {
                    dbApps = data
                        .filter(s => {
                            const pub = s.Publicacion || {};
                            const prop = pub.Propiedad || s.Propiedad || {};

                            // Strict user filter: only show applications for this user's listings/properties
                            if (filterByUser) {
                                if (!profileId) return false;
                                const isPubAuthor = Number(pub.id_perfil) === Number(profileId);
                                const isPropOwner = Number(prop.id_perfil_propietario) === Number(profileId);
                                const isPropCaptador = Number(prop.id_perfil_captador) === Number(profileId);
                                if (!isPubAuthor && !isPropOwner && !isPropCaptador) {
                                    return false;
                                }
                            }
                            
                            // Verificar si la publicación está eliminada en Supabase
                            if (pub?.Historial_Estado_Publicacion && pub.Historial_Estado_Publicacion.length > 0) {
                                const sortedHist = [...pub.Historial_Estado_Publicacion].sort((a, b) => new Date(b.fecha_inicio || b.created_at) - new Date(a.fecha_inicio || a.created_at));
                                const activeHist = sortedHist.find(h => !h.fecha_fin) || sortedHist[0];
                                const estadoNombre = (activeHist.Estado_Publicacion?.nombre || '').toLowerCase();
                                if (estadoNombre === 'eliminada' || estadoNombre === 'eliminado' || activeHist.id_estado_publicacion === 5) {
                                    return false;
                                }
                            }

                            // Verificar si está en la lista de eliminadas local
                            const pubIdStr = String(pub?.id_publicacion || s.id_publicacion || '');
                            const propIdStr = String(prop?.id_propiedad || pub?.id_propiedad || s.id_propiedad || '');
                            if (deletedProps.includes(pubIdStr) || deletedProps.includes(propIdStr)) {
                                return false;
                            }

                            return true;
                        })
                        .map(s => {
                            const pub = s.Publicacion || {};
                            const prop = pub.Propiedad || s.Propiedad || {};
                            const perf = s.Perfil || {};
                            const passList = Array.isArray(perf.Pasaporte_vivat) ? perf.Pasaporte_vivat : (perf.Pasaporte_vivat ? [perf.Pasaporte_vivat] : []);
                            const pass = passList[0] || {};
                            const media = pub?.Multimedia || [];
                            const photoUrls = media.length > 0 ? media.map(m => m.url_archivo) : [];
                            const photoUrl = photoUrls[0] || 'img/hero-marketplace.jpg';

                            const propId = String(prop.id_propiedad || pub.id_propiedad || s.id_propiedad || '');
                            const pubId = pub.id_publicacion || s.id_publicacion || null;

                            // Parse extraInfo from pub.descripcion if available
                            let extraInfo = {};
                            if (pub?.descripcion && pub.descripcion.includes('Detalles: ')) {
                                try { extraInfo = JSON.parse(pub.descripcion.split('Detalles: ')[1]); } catch (e) {}
                            }

                            const title = pub?.descripcion 
                                ? pub.descripcion.split(' | Detalles: ')[0] 
                                : `Propiedad en ${prop.calle || 'Alquiler'} ${prop.numero || ''}`.trim();

                            // Determinar estado real desde Historial_estado_solicitud
                            const hist = s.Historial_estado_solicitud || [];
                            let appStatus = 'pendiente';
                            if (hist.length > 0) {
                                const sortedHist = [...hist].sort((a, b) => new Date(b.fecha_inicio || b.created_at) - new Date(a.fecha_inicio || a.created_at));
                                const latest = sortedHist[0];
                                const stName = (latest.Estado_solicitud?.nombre || '').toLowerCase();
                                if (latest.id_estado_solicitud === 2 || stName === 'aceptada' || stName === 'aprobada') {
                                    appStatus = 'aceptada';
                                } else if (latest.id_estado_solicitud === 3 || stName === 'rechazada') {
                                    appStatus = 'rechazada';
                                }
                            }

                            // Resolver DNI y CUIT reales
                            let realDni = perf.dni || pass.dni || null;
                            let realCuit = pass.cuit || null;
                            if (!realDni && realCuit && realCuit.replace(/\D/g, '').length === 11) {
                                const clean = realCuit.replace(/\D/g, '');
                                realDni = clean.substring(2, clean.length - 1);
                            }

                            const foundCId = dbContractsMap.get(`${propId}_${s.id_perfil}`) || dbContractsMap.get(`pub_${pubId}_${s.id_perfil}`) || dbContractsMap.get(`prop_${propId}`) || null;

                            return {
                                id: s.id_solicitud,
                                contract_id: foundCId || s.contract_id || (appStatus === 'aceptada' ? `CTR-2026-${String(s.id_solicitud).padStart(4, '0')}` : null),
                                contractId: foundCId || s.contract_id || (appStatus === 'aceptada' ? `CTR-2026-${String(s.id_solicitud).padStart(4, '0')}` : null),
                                property_id: propId,
                                propertyId: propId,
                                id_propiedad: propId,
                                publication_id: pubId,
                                publicationId: pubId,
                                id_publicacion: pubId,
                                id_perfil_propietario: prop.id_perfil_propietario || pub.id_perfil || null,
                                owner_profile_id: prop.id_perfil_propietario || pub.id_perfil || null,
                                owner_email: pub?.Perfil?.mail || '',
                                owner_name: pub?.Perfil?.nombre_completo || '',
                                property_title: title,
                                property_address: `${prop.calle || 'Dirección'} ${prop.numero || ''}`.trim(),
                                property_price: pub?.precio || prop.expensas_mensuales || 450000,
                                property_expenses: prop.expensas_mensuales || 45000,
                                property_image: photoUrl,
                                property_photos: photoUrls.length > 0 ? photoUrls : [photoUrl],
                                property_m2: prop.superficie_total || prop.superficie_cubierta || extraInfo.supTotal || 65,
                                property_rooms: prop.ambientes || prop.habitaciones_total || extraInfo.ambientes || 2,
                                property_beds: prop.dormitorios || extraInfo.dormitorios || 1,
                                property_baths: prop.banos_completos || prop.banos || extraInfo.banos || 1,
                                tenant_id: s.id_perfil,
                                tenant_user_id: perf.user_id || null,
                                tenant_name: perf.nombre_completo || pass.razon_social || 'Postulante Verificado',
                                tenant_email: perf.mail || 'inquilino@email.com',
                                tenant_phone: s.telefono || perf.telefono || '',
                                tenant_dni: realDni,
                                tenant_cuit: realCuit,
                                tenant_edad: perf.edad || pass.edad || null,
                                tenant_fecha_nacimiento: perf.fecha_nacimiento || pass.fecha_nacimiento || null,
                                edad: perf.edad || pass.edad || null,
                                age: perf.edad || pass.edad || null,
                                fecha_nacimiento: perf.fecha_nacimiento || pass.fecha_nacimiento || null,
                                passport_code: pass.codigo_pasaporte || (pass.id_pasaporte ? `HBT-2026-${pass.id_pasaporte}` : null),
                                condicion_fiscal: pass.condicion_fiscal || null,
                                situacion_crediticia: pass.situacion_crediticia || null,
                                monthly_income: parseFloat(s.ingreso_mensual_declarado || 0),
                                income_proof: s.comprobante_ingreso || 'Pasaporte Vivat',
                                income_proof_url: '#',
                                message: s.mensaje || 'Interesado en alquilar la propiedad.',
                                status: appStatus,
                                created_at: s.fecha_solicitud
                            };
                        });
                }
            } catch (e) {
                console.error("Error in getApplications (Supabase query):", e);
            }
        }

        let localSavedApps = [];
        try {
            const raw = localStorage.getItem('vivat_tenant_applications');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    localSavedApps = parsed.filter(a => {
                        if (!a || !a.id) return false;
                        if (String(a.id).startsWith('app-00') || String(a.property_title || '').includes('Carlos Gómez') || String(a.tenant_name || '').includes('Carlos Gómez')) return false;
                        const pid = String(a.property_id || a.propertyId || a.id_propiedad || '');
                        const pPubId = String(a.publication_id || a.publicationId || a.id_publicacion || '');
                        if (deletedProps.includes(pid) || deletedProps.includes(pPubId)) return false;
                        return true;
                    });
                }
            }
        } catch (e) {}

        // Combinar con postulaciones locales sincronizando estado exacto desde Supabase
        const appMap = new Map();
        localSavedApps.forEach(a => appMap.set(String(a.id), a));
        dbApps.forEach(dba => {
            if (appMap.has(String(dba.id))) {
                const existing = appMap.get(String(dba.id));
                const updatedStatus = (dba.status === 'aceptada' || dba.status === 'rechazada') ? dba.status : (existing.status || dba.status);
                appMap.set(String(dba.id), {
                    ...existing,
                    ...dba,
                    status: updatedStatus,
                    contract_id: existing.contract_id || dba.contract_id || (updatedStatus === 'aceptada' ? `CTR-2026-${String(dba.id).padStart(4, '0')}` : null)
                });
            } else {
                appMap.set(String(dba.id), dba);
            }
        });

        const combined = Array.from(appMap.values());
        try {
            localStorage.setItem('vivat_tenant_applications', JSON.stringify(combined));
        } catch (e) {}

        return combined;
    },

    submitApplication: async function (appData) {
        let insertedId = `sol_${Date.now()}`;
        let fecha = new Date().toISOString();

        if (window.supabaseClient) {
            try {
                const profileId = await DataManager._getOrCreateProfile();
                if (!profileId) {
                    throw new Error('Debes iniciar sesión para postularte a un alquiler.');
                }

                // 1. Validar OBLIGATORIAMENTE que el usuario posea Pasaporte Vivat Activo en Supabase
                const { data: activePassports, error: errPass } = await window.supabaseClient
                    .from('Pasaporte_vivat')
                    .select('id_pasaporte, id_estado_pasaporte, fecha_vencimiento')
                    .eq('id_perfil', profileId)
                    .eq('id_estado_pasaporte', 3); // 3 = Activo

                let hasValidPass = false;
                if (activePassports && activePassports.length > 0) {
                    const pass = activePassports[0];
                    if (!pass.fecha_vencimiento || new Date(pass.fecha_vencimiento).getTime() > Date.now()) {
                        hasValidPass = true;
                    }
                }

                if (!hasValidPass) {
                    const err = new Error('Para postularte es requisito obligatorio contar con tu Pasaporte Vivat digital activo y verificado.');
                    err.code = 'PASSPORT_REQUIRED';
                    throw err;
                }

                const pubIdNum = appData.publicationId || appData.id_publicacion
                    ? parseInt(appData.publicationId || appData.id_publicacion, 10)
                    : null;
                const propIdVal = appData.propertyId || appData.id_propiedad || null;

                // 2. Prevenir duplicados: verificar si ya existe una postulación activa para esta propiedad en LocalStorage o Supabase
                try {
                    const localApps = JSON.parse(localStorage.getItem('vivat_tenant_applications') || '[]');
                    const existingLocal = localApps.find(a => {
                        const aPubId = a.publication_id || a.publicationId || a.id_publicacion;
                        const aPropId = a.property_id || a.propertyId || a.id_propiedad;
                        const matchPub = pubIdNum && aPubId && String(aPubId) === String(pubIdNum);
                        const matchProp = propIdVal && aPropId && String(aPropId) === String(propIdVal);
                        return (matchPub || matchProp) && a.status !== 'rechazada' && a.status !== 'cancelada';
                    });

                    if (existingLocal) {
                        console.log("[DataManager] Postulación existente en memoria/local detectada:", existingLocal.id);
                        return {
                            id: existingLocal.id,
                            status: existingLocal.status || 'pendiente',
                            created_at: existingLocal.created_at || fecha,
                            isDuplicate: true,
                            message: 'Ya posees una postulación enviada para esta propiedad.'
                        };
                    }
                } catch (eLocal) {}

                if (pubIdNum) {
                    const { data: existingApp } = await window.supabaseClient
                        .from('Solicitud')
                        .select('id_solicitud, fecha_solicitud')
                        .eq('id_perfil', profileId)
                        .eq('id_publicacion', pubIdNum)
                        .maybeSingle();

                    if (existingApp) {
                        console.log("[DataManager] Postulación existente detectada para evitar duplicación. ID:", existingApp.id_solicitud);
                        return {
                            id: existingApp.id_solicitud,
                            status: 'pendiente',
                            created_at: existingApp.fecha_solicitud || fecha,
                            isDuplicate: true,
                            message: 'Ya posees una postulación enviada para esta propiedad.'
                        };
                    }
                }

                // 3. Insertar Solicitud en Supabase
                const { data, error } = await window.supabaseClient
                    .from('Solicitud')
                    .insert([{
                        id_perfil: profileId,
                        id_publicacion: pubIdNum,
                        ingreso_mensual_declarado: parseFloat(appData.declaredIncome || appData.monthly_income || appData.propertyPrice || 0),
                        mensaje: appData.message || '',
                        comprobante_ingreso: appData.incomeProof || 'Pasaporte Vivat',
                        telefono: appData.tenantPhone || '+54 9 11 0000-0000'
                    }])
                    .select()
                    .single();

                if (!error && data) {
                    insertedId = data.id_solicitud;
                    fecha = data.fecha_solicitud || fecha;
                    try {
                        await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                            id_solicitud: data.id_solicitud,
                            id_estado_solicitud: 1, // Pendiente
                            fecha_inicio: new Date().toISOString()
                        }]);
                    } catch (e) { }

                    // 4. Notificar en tiempo real al PROPIETARIO
                    try {
                        let ownerTargetId = null;
                        if (pubIdNum) {
                            const { data: pubData } = await window.supabaseClient
                                .from('Publicacion')
                                .select('id_propiedad, Propiedad(id_perfil_propietario)')
                                .eq('id_publicacion', pubIdNum)
                                .maybeSingle();
                            if (pubData && pubData.Propiedad) {
                                ownerTargetId = pubData.Propiedad.id_perfil_propietario;
                            }
                        } else if (appData.propertyId || appData.id_propiedad) {
                            try {
                                const propIdVal = appData.propertyId || appData.id_propiedad;
                                const localProps = JSON.parse(localStorage.getItem('vivat_properties') || '[]');
                                const prop = localProps.find(p => String(p.id) === String(propIdVal));
                                if (prop && prop.id_perfil_propietario) {
                                    ownerTargetId = Number(prop.id_perfil_propietario);
                                }
                            } catch (e) {}
                        }
                        if (window.NotificationManager) {
                            const notifFn = window.NotificationManager.createNotification || window.NotificationManager.add;
                            if (typeof notifFn === 'function') {
                                notifFn.call(window.NotificationManager, {
                                    id: `notif_solicitud_${insertedId}`,
                                    title: '🎉 ¡Nueva postulación recibida!',
                                    message: `${appData.tenantName || 'Un inquilino verificado'} se ha postulado para alquilar "${appData.propertyTitle || 'tu propiedad'}".`,
                                    type: 'application',
                                    icon: 'person_add',
                                    link: 'administrador.html#postulaciones',
                                    role: 'OWNER',
                                    senderRole: 'TENANT',
                                    senderProfileId: profileId,
                                    targetProfileId: ownerTargetId
                                });
                            }
                        }
                    } catch (eNotif) {
                        console.warn("[DataManager] Aviso enviando notificación al propietario:", eNotif);
                    }
                } else if (error) {
                    console.error("[DataManager] Error insertando Solicitud:", error);
                    throw error;
                }
            } catch (err) {
                console.error("[DataManager] Error en submitApplication:", err);
                throw err;
            }
        }

        // Guardar copia local exclusiva para el usuario
        try {
            const localApps = JSON.parse(localStorage.getItem('vivat_tenant_applications') || '[]');
            const existsLocal = localApps.some(a => String(a.id) === String(insertedId));
            if (!existsLocal) {
                const newApp = {
                    id: insertedId,
                    property_id: appData.propertyId || 1,
                    publication_id: appData.publicationId || null,
                    property_title: appData.propertyTitle || 'Propiedad en Alquiler',
                    property_address: appData.propertyAddress || 'Buenos Aires',
                    property_price: appData.propertyPrice || appData.price || 420000,
                    property_expenses: appData.propertyExpenses || 45000,
                    property_image: appData.propertyImage || (Array.isArray(appData.propertyPhotos) && appData.propertyPhotos[0]) || 'img/hero-marketplace.jpg',
                    property_photos: Array.isArray(appData.propertyPhotos) && appData.propertyPhotos.length > 0 ? appData.propertyPhotos : [appData.propertyImage || 'img/hero-marketplace.jpg'],
                    property_m2: appData.propertyM2 || 65,
                    property_rooms: appData.propertyRooms || 2,
                    property_beds: appData.propertyBeds || 1,
                    property_baths: appData.propertyBaths || 1,
                    tenant_name: appData.tenantName || 'Inquilino Postulante',
                    tenant_email: appData.tenantEmail || 'inquilino@vivat.com.ar',
                    tenant_phone: appData.tenantPhone || '+54 9 11 0000-0000',
                    tenant_dni: appData.tenantDni || null,
                    tenant_cuit: appData.tenantCuit || null,
                    condicion_fiscal: appData.condicion_fiscal || appData.condicionFiscal || 'Monotributista',
                    monthly_income: parseFloat(appData.declaredIncome || appData.monthly_income || 1500000),
                    income_proof: appData.incomeProof || 'Pasaporte Vivat',
                    message: appData.message || 'Interesado en alquilar la propiedad.',
                    status: 'pendiente',
                    created_at: fecha
                };
                localApps.unshift(newApp);
                localStorage.setItem('vivat_tenant_applications', JSON.stringify(localApps));
            }
        } catch (e) {
            console.warn("Error saving local application:", e);
        }

        return {
            id: insertedId,
            status: 'pendiente',
            created_at: fecha
        };
    },

    acceptApplication: async function (appId, customTerms = null) {
        let contractId = `CTR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        let propTitle = 'Propiedad en Alquiler';
        let propAddress = 'Mendoza, Argentina';
        let monthlyRent = customTerms?.monthlyRent || 450000;
        let tenantName = 'Inquilino';
        let tenantDni = '';
        let tenantEmail = 'inquilino@email.com';
        let tenantPhone = '+54 9 261 000-0000';
        let photoUrls = ['img/hero-marketplace.jpg'];
        let ownerName = 'Propietario';
        let ownerDni = '';
        let ownerEmail = 'propietario@email.com';
        let solPropId = null;
        let solPerfilId = 14;
        let solPubId = null;

        const durationMonths = customTerms?.durationMonths || 24;
        const periodoAumento = customTerms?.adjustmentFrequencyMonths || 3;
        const diaVencimiento = customTerms?.paymentDueDay || 10;
        const aliasCbu = customTerms?.aliasCbu || 'VIVAT.ALQUILER.MP';
        const adjustmentIndex = customTerms?.adjustmentIndex || 'IPC';

        // 1. Obtener datos desde localStorage si existen
        let localApp = null;
        try {
            const raw = localStorage.getItem('vivat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                localApp = apps.find(a => String(a.id) === String(appId));
                if (localApp) {
                    propTitle = localApp.property_title || propTitle;
                    propAddress = localApp.property_address || propAddress;
                    if (!customTerms?.monthlyRent) {
                        monthlyRent = Number(localApp.property_price || monthlyRent);
                    }
                    tenantName = localApp.tenant_name || tenantName;
                    tenantEmail = localApp.tenant_email || tenantEmail;
                    tenantPhone = localApp.tenant_phone || tenantPhone;
                    if (Array.isArray(localApp.property_photos) && localApp.property_photos.length > 0) {
                        photoUrls = localApp.property_photos;
                    } else if (localApp.property_image) {
                        photoUrls = [localApp.property_image];
                    }
                }
            }
        } catch (e) {}

        if (window.supabaseClient && appId) {
            try {
                const profileId = await DataManager._getOrCreateProfile();

                // Consultar Perfil del Propietario
                try {
                    const { data: ownerPerf } = await window.supabaseClient.from('Perfil').select('*').eq('id_perfil', profileId).maybeSingle();
                    if (ownerPerf) {
                        ownerName = ownerPerf.nombre_completo || ownerName;
                        ownerEmail = ownerPerf.mail || ownerEmail;
                        if (ownerPerf.dni) ownerDni = ownerPerf.dni;
                    }
                } catch (e) {}

                // Consultar Solicitud con jerarquía exacta: Solicitud -> Publicacion -> Propiedad
                const { data: sol } = await window.supabaseClient
                    .from('Solicitud')
                    .select(`
                        *,
                        Publicacion (
                            id_publicacion,
                            id_propiedad,
                            descripcion,
                            precio,
                            Propiedad (
                                id_propiedad,
                                id_perfil_propietario,
                                calle,
                                numero,
                                piso,
                                depto,
                                expensas_mensuales,
                                Barrio (*)
                            ),
                            Multimedia (*)
                        ),
                        Perfil (*)
                    `)
                    .eq('id_solicitud', appId)
                    .maybeSingle();

                const pub = sol?.Publicacion || {};
                const prop = pub?.Propiedad || {};
                const media = pub?.Multimedia || [];
                if (media.length > 0) {
                    photoUrls = media.map(m => m.url_archivo).filter(Boolean);
                }

                if (pub?.descripcion) {
                    propTitle = pub.descripcion.split(' | Detalles: ')[0];
                } else if (prop.calle) {
                    propTitle = `Propiedad en ${prop.calle} ${prop.numero || ''}`.trim();
                }

                if (prop.calle) {
                    propAddress = `${prop.calle} ${prop.numero || ''}`.trim();
                }

                if (!customTerms?.monthlyRent) {
                    if (pub?.precio) monthlyRent = Number(pub.precio);
                    else if (sol?.ingreso_mensual_declarado) monthlyRent = Number(sol.ingreso_mensual_declarado);
                }

                const perf = sol?.Perfil || {};
                if (perf.nombre_completo) tenantName = perf.nombre_completo;
                if (perf.mail) tenantEmail = perf.mail;
                if (perf.dni) tenantDni = perf.dni;
                if (sol?.telefono || perf.telefono) tenantPhone = sol?.telefono || perf.telefono;

                solPropId = prop?.id_propiedad || pub?.id_propiedad || localApp?.property_id || 42;
                solPerfilId = sol?.id_perfil || localApp?.tenant_id || 14;
                solPubId = pub?.id_publicacion || sol?.id_publicacion || localApp?.publication_id || 40;

                const todayStr = new Date().toISOString().split('T')[0];
                const nextYearStr = new Date(Date.now() + 86400000 * 30.5 * durationMonths).toISOString().split('T')[0];

                // 1. Registrar Historial_estado_solicitud (Aprobada / Aceptada = 2)
                try {
                    await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                        id_solicitud: appId,
                        id_estado_solicitud: 2, // Aceptada
                        fecha_inicio: new Date().toISOString()
                    }]);
                } catch (e) {
                    console.warn("Aviso al registrar Historial_estado_solicitud:", e);
                }

                // 2. Buscar o crear registro en tabla Contrato con todos los campos obligatorios
                let contract = null;
                try {
                    if (solPropId && solPerfilId) {
                        const { data: existingC } = await window.supabaseClient
                            .from('Contrato')
                            .select('*')
                            .eq('id_propiedad', solPropId)
                            .eq('id_perfil_inquilino', solPerfilId)
                            .order('id_contrato', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (existingC && existingC.id_contrato) {
                            // Verificar si el contrato existente ya está firmado
                            let isSigned = false;
                            try {
                                const { data: sigs } = await window.supabaseClient
                                    .from('Firma_contrato')
                                    .select('estado_firma, didit_status')
                                    .eq('id_contrato', existingC.id_contrato);
                                isSigned = (sigs || []).some(s => 
                                    ['sellada', 'completada', 'firmada'].includes(s.estado_firma) || s.didit_status === 'APPROVED'
                                );
                            } catch (e) {}

                            if (!isSigned) {
                                contract = existingC;
                                // Actualizar condiciones si fueron personalizadas
                                if (customTerms) {
                                    await window.supabaseClient.from('Contrato').update({
                                        id_perfil_inquilino: solPerfilId,
                                        monto_cierre: monthlyRent,
                                        periodo_aumento_meses: periodoAumento,
                                        dia_vencimiento_mensual: diaVencimiento,
                                        alias_cbu: aliasCbu,
                                        fecha_fin_contrato: nextYearStr,
                                        tasa_punitoria_diaria: customTerms?.clauses?.tasaMoraDiaria || 0.5,
                                        clausulas_adicionales: customTerms?.clauses || {}
                                    }).eq('id_contrato', existingC.id_contrato);
                                }

                                // Limpiar firmas anteriores si es un borrador previo sin completar
                                try {
                                    await window.supabaseClient
                                        .from('Firma_contrato')
                                        .delete()
                                        .eq('id_contrato', existingC.id_contrato);
                                } catch (e) {
                                    console.warn("Aviso al limpiar firmas previas:", e);
                                }
                            }
                        }
                    }

                    if (!contract && solPropId) {
                        const { data: cData, error: cErr } = await window.supabaseClient
                            .from('Contrato')
                            .insert([{
                                id_perfil_propietario: prop?.id_perfil_propietario || profileId || 6,
                                id_perfil_inquilino: solPerfilId,
                                id_propiedad: solPropId,
                                id_publicacion: solPubId,
                                id_tipo_garantia: 1,
                                "id_Indice": customTerms?.adjustmentIndex === 'ICL' ? 2 : 1,
                                id_moneda: customTerms?.currency === 'USD' ? 2 : 1,
                                fecha_firma_contrato: todayStr,
                                fecha_inicio_contrato: todayStr,
                                fecha_fin_contrato: nextYearStr,
                                monto_cierre: monthlyRent,
                                descuentos_aplicados: 0,
                                periodo_aumento_meses: periodoAumento,
                                dia_vencimiento_mensual: diaVencimiento,
                                monto_deposito: monthlyRent,
                                deposito_devuelto: false,
                                tasa_punitoria_diaria: customTerms?.clauses?.tasaMoraDiaria || 0.5,
                                alias_cbu: aliasCbu,
                                porcentaje_honorarios_cierre: prop?.id_perfil_captador ? (customTerms?.brokerFee || 4.15) : null,
                                porcentaje_comision_mensual: prop?.id_perfil_captador ? (customTerms?.brokerMonthlyCommission || 5.0) : null,
                                clausulas_adicionales: {
                                     ...(customTerms?.clauses || {}),
                                     customClauses: customTerms?.customClauses || [],
                                     activeClausesList: customTerms?.activeClausesList || [],
                                     durationMonths: customTerms?.durationMonths || 24,
                                     adjustmentIndex: customTerms?.adjustmentIndex || 'IPC',
                                     currency: customTerms?.currency || 'ARS',
                                     aliasCbu: aliasCbu,
                                     monthlyRent: monthlyRent,
                                     paymentDueDay: diaVencimiento,
                                     adjustmentFrequencyMonths: periodoAumento
                                 }
                            }])
                            .select()
                            .maybeSingle();

                        if (!cErr && cData) contract = cData;
                    }
                } catch (e) {
                    console.warn("Aviso al crear fila en Contrato:", e);
                }

                if (contract && contract.id_contrato) {
                    contractId = `CTR-2026-${String(contract.id_contrato).padStart(4, '0')}`;

                    // 3. Registrar Historial_Estado_Contrato (5 = pendiente_firma)
                    try {
                        await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                            id_contrato: contract.id_contrato,
                            id_estado_contrato: 5, // pendiente_firma
                            fecha_inicio: new Date().toISOString()
                        }]);
                    } catch (e) { }

                    // 4. Crear registro en tabla Pago
                    try {
                        const { data: pago } = await window.supabaseClient
                            .from('Pago')
                            .insert([{
                                id_contrato: contract.id_contrato,
                                id_metodo_pago: 1, // Transferencia
                                monto: monthlyRent,
                                fecha_vencimiento: todayStr,
                                periodo: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                            }])
                            .select()
                            .maybeSingle();

                        if (pago) {
                            // 5. Registrar Historial_pago (1 = pendiente)
                            await window.supabaseClient.from('Historial_pago').insert([{
                                id_pago: pago.id_pago,
                                id_estado_pago: 1, // Pendiente
                                fecha_inicio: new Date().toISOString()
                            }]);
                        }
                    } catch (e) { }
                }

                // 6. Actualizar estado de la Propiedad a 'Reservada' (id_estado_propiedad = 3)
                if (solPropId) {
                    try {
                        await window.supabaseClient
                            .from('Propiedad')
                            .update({ id_estado_propiedad: 3 })
                            .eq('id_propiedad', solPropId);

                        await window.supabaseClient.from('Historial_estado_propiedad').insert([{
                            id_propiedad: solPropId,
                            id_estado_propiedad: 3, // Reservada
                            fecha_inicio: new Date().toISOString()
                        }]);
                    } catch (e) { }
                }

                // 7. Actualizar estado de la Publicacion a 'Pausada / En proceso' (id_estado_publicacion = 4)
                if (solPubId) {
                    try {
                        await window.supabaseClient
                            .from('Historial_Estado_Publicacion')
                            .insert([{
                                id_publicacion: solPubId,
                                id_estado_publicacion: 4, // Pausada
                                fecha_inicio: new Date().toISOString()
                            }]);
                    } catch (e) { }
                }
            } catch (err) {
                console.error("Error in acceptApplication:", err);
            }
        }

        // Crear objeto de contrato completo con la propiedad real y guardarlo en vivat_contracts
        const todayStr = new Date().toISOString().split('T')[0];
        const nextYearStr = new Date(Date.now() + 86400000 * 365 * 2).toISOString().split('T')[0];
        const contractObj = {
            id: contractId,
            contractNumber: contractId,
            propertyId: String(solPropId || appId),
            title: `Contrato de Locación - ${propTitle}`,
            propertyAddress: propAddress,
            propertyCity: 'Mendoza',
            propertyImage: photoUrls[0] || 'img/hero-marketplace.jpg',
            propertyPhotos: photoUrls,
            monthlyRent: monthlyRent,
            monthly_rent: monthlyRent,
            currency: customTerms?.currency || 'ARS',
            status: 'WAITING_TENANT',
            startDate: todayStr,
            endDate: nextYearStr,
            durationMonths: customTerms?.durationMonths || 24,
            duration_months: customTerms?.durationMonths || 24,
            paymentDueDay: diaVencimiento || 10,
            payment_due_day: diaVencimiento || 10,
            adjustmentIndex: customTerms?.adjustmentIndex || 'IPC',
            adjustment_index: customTerms?.adjustmentIndex || 'IPC',
            adjustmentFrequencyMonths: periodoAumento || 3,
            adjustment_frequency_months: periodoAumento || 3,
            depositAmount: monthlyRent,
            aliasCbu: aliasCbu || 'VIVAT.ALQUILER.MP',
            alias_cbu: aliasCbu || 'VIVAT.ALQUILER.MP',
            clauses: customTerms?.clauses || {},
            customClauses: customTerms?.customClauses || [],
            activeClausesList: customTerms?.activeClausesList || [],
            clausulas_adicionales: {
                ...(customTerms?.clauses || {}),
                customClauses: customTerms?.customClauses || [],
                activeClausesList: customTerms?.activeClausesList || [],
                durationMonths: customTerms?.durationMonths || 24,
                adjustmentIndex: customTerms?.adjustmentIndex || 'IPC',
                currency: customTerms?.currency || 'ARS',
                aliasCbu: aliasCbu,
                monthlyRent: monthlyRent,
                paymentDueDay: diaVencimiento,
                adjustmentFrequencyMonths: periodoAumento
            },
            id_perfil_propietario: Number(prop?.id_perfil_propietario || profileId || 6),
            id_perfil_inquilino: solPerfilId,
            tenant: {
                role: 'TENANT',
                profileId: solPerfilId,
                id_perfil: solPerfilId,
                name: tenantName,
                email: tenantEmail,
                phone: tenantPhone,
                cuil: tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '20-46665957-7',
                dni: tenantDni,
                hasSigned: false,
                isKycVerified: true
            },
            owner: {
                role: 'OWNER',
                profileId: Number(prop?.id_perfil_propietario || profileId || 6),
                id_perfil: Number(prop?.id_perfil_propietario || profileId || 6),
                name: ownerName,
                email: ownerEmail,
                cuil: ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '20-44662043-7',
                dni: ownerDni,
                hasSigned: false,
                isKycVerified: true
            },
            broker: {
                name: 'Martín Palermo',
                license: 'CUCICBA Mat. 6842',
                agencyName: 'Palermo & Asociados Propiedades',
                email: 'contacto@palermoprop.com'
            },
            sha256Hash: 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            auditTrailEvents: [
                {
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    action: 'CONTRATO_GENERADO',
                    actor: `${ownerName} (Aceptación de Postulación)`,
                    details: `Contrato digital confeccionado para ${tenantName} en ${propAddress}.`
                }
            ]
        };

        try {
            const rawContr = localStorage.getItem('vivat_contracts');
            let existingContracts = [];
            if (rawContr) existingContracts = JSON.parse(rawContr);
            existingContracts = existingContracts.filter(c => c && c.id !== contractId && c.contractNumber !== contractId);
            existingContracts.unshift(contractObj);
            localStorage.setItem('vivat_contracts', JSON.stringify(existingContracts));
        } catch (e) {}

        // Actualizar copia local en localStorage
        try {
            const raw = localStorage.getItem('vivat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                apps.forEach(a => {
                    if (String(a.id) === String(appId)) {
                        a.status = 'aceptada';
                        a.contract_id = contractId;
                    }
                });
                localStorage.setItem('vivat_tenant_applications', JSON.stringify(apps));
            }
        } catch (e) {}

        // Despachar notificaciones in-app para ambas partes con IDs canónicos
        if (window.NotificationManager) {
            window.NotificationManager.createNotification({
                id: `notif_accept_owner_${appId}_${contractId}`,
                title: '¡Postulación Aceptada! Contrato Listo para Firma',
                message: `Has aceptado a ${tenantName} para "${propTitle}". El contrato digital ya está disponible para firmar.`,
                type: 'contract',
                link: `contratos.html?contract=${contractId}&sign=1&role=OWNER`,
                role: 'OWNER',
                senderRole: 'OWNER',
                targetProfileId: Number(prop?.id_perfil_propietario || profileId || 6)
            });
            window.NotificationManager.createNotification({
                id: `notif_accept_tenant_${appId}_${contractId}`,
                title: '¡Tu postulación fue aprobada por el propietario! 🎉',
                message: `El propietario aprobó tu postulación para "${propTitle}". Ingresa para realizar tu validación biométrica y firmar el contrato digital.`,
                type: 'contract',
                link: `contratos.html?contract=${contractId}&sign=1&role=TENANT`,
                role: 'TENANT',
                senderRole: 'OWNER',
                targetProfileId: solPerfilId
            });
        }

        return {
            id: appId,
            status: 'aceptada',
            contractId: contractId,
            tenantName: tenantName,
            propertyTitle: propTitle,
            propertyAddress: propAddress
        };
    },

    rejectApplication: async function (appId) {
        let propTitle = 'la propiedad';
        let targetProfileId = null;
        if (window.supabaseClient && appId) {
            try {
                const { data: sol } = await window.supabaseClient
                    .from('Solicitud')
                    .select('id_perfil')
                    .eq('id_solicitud', appId)
                    .maybeSingle();
                if (sol) {
                    targetProfileId = sol.id_perfil;
                }
                
                await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                    id_solicitud: appId,
                    id_estado_solicitud: 3, // Rechazada
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) {
                console.error("Error in rejectApplication:", e);
            }
        }

        // Actualizar copia local en localStorage
        try {
            const raw = localStorage.getItem('vivat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                apps.forEach(a => {
                    if (String(a.id) === String(appId)) {
                        a.status = 'rechazada';
                        if (a.property_title) propTitle = a.property_title;
                        if (a.tenant_id || a.id_perfil) targetProfileId = targetProfileId || Number(a.tenant_id || a.id_perfil);
                    }
                });
                localStorage.setItem('vivat_tenant_applications', JSON.stringify(apps));
            }
        } catch (e) {}

        if (window.NotificationManager) {
            window.NotificationManager.createNotification({
                id: `notif_reject_${appId}`,
                title: 'Estado de postulación actualizado',
                message: `El proceso de evaluación para "${propTitle}" ha concluido. Puedes explorar más propiedades disponibles en el Marketplace.`,
                type: 'rejection',
                link: 'index.html',
                role: 'TENANT',
                senderRole: 'OWNER',
                targetProfileId: targetProfileId
            });
        }

        return { id: appId, status: 'rechazada' };
    },

    // Visitas Programadas


    scheduleVisit: async function (visitData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();
        const propId = visitData.propertyId || 1;

        // Verificar si ya existe una visita de este usuario a esta propiedad
        const { data: existingVisit } = await window.supabaseClient
            .from('Evento')
            .select('*')
            .eq('id_perfil', profileId)
            .eq('id_propiedad', propId)
            .eq('id_tipo_evento', 1) // 1 es Visita
            .single();

        let eventId = null;

        if (existingVisit) {
            // Ya existe una visita (incluso si está cancelada o completada, la regla de negocio
            // dice "solo pueden ser solicitadas una vez por propiedad")
            alert("Ya has solicitado una visita para esta propiedad.");
            throw new Error("Ya has solicitado una visita para esta propiedad.");
        }

        // Crear nueva visita
        const { data, error } = await window.supabaseClient
            .from('Evento')
            .insert([{
                id_perfil: profileId,
                id_propiedad: propId,
                fecha_evento: visitData.visitDate || new Date().toISOString(),
                hora_evento: visitData.visitTime || '16:00 hs',
                nombre_visitante: visitData.visitorName || 'Visitante',
                email_visitante: visitData.visitorEmail || 'visitante@email.com',
                telefono_visitante: visitData.visitorPhone || '+54 9 11 0000-0000',
                id_tipo_evento: 1, // Visita
                id_estado_evento: 1 // Programada
            }])
            .select()
            .single();

        if (error) {
            console.error("Error scheduling visit:", error);
            throw error;
        }
        eventId = data.id_evento;

        try {
            await window.supabaseClient.from('Historial_estado_evento').insert([{
                id_visita: eventId,
                id_estado_visita: 1, // Programada
                fecha_inicio: new Date().toISOString()
            }]);
            
            // Trigger notification for the owner (we pass propId so they know which property)
            await this.createNotification({
                title: "Nueva solicitud de visita",
                message: "Un inquilino ha solicitado agendar o modificado una visita.",
                type: "visita",
                userId: null, 
                link: "administrador.html"
            });
        } catch (e) { console.error(e) }

        return {
            id: eventId,
            status: 'programada'
        };
    },

    cancelVisit: async function (visitId) {
        if (window.supabaseClient && visitId) {
            try {
                await window.supabaseClient.from('Evento')
                    .update({ id_estado_evento: 3 })
                    .eq('id_evento', visitId);

                await window.supabaseClient.from('Historial_estado_evento').insert([{
                    id_visita: visitId,
                    id_estado_visita: 3, // Cancelada
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }
        }
        return { id: visitId, status: 'cancelada' };
    },

    acceptEvent: async function (eventId) {
        if (!window.supabaseClient || !eventId) return null;
        try {
            const { data, error } = await window.supabaseClient.from('Evento')
                .update({ id_estado_evento: 2 }) // 2 = Confirmada
                .eq('id_evento', eventId)
                .select()
                .single();
                
            if (error) throw error;

            await window.supabaseClient.from('Historial_estado_evento').insert([{
                id_visita: eventId,
                id_estado_visita: 2,
                fecha_inicio: new Date().toISOString()
            }]);

            // Try to notify the tenant
            if (data.id_perfil) {
                await this.createNotification({
                    title: "Visita Aceptada",
                    message: "Tu solicitud de visita ha sido confirmada por el propietario.",
                    type: "visita",
                    userId: data.id_perfil,
                    link: "tu-alquiler.html"
                });
            }
            return data;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    rejectEvent: async function (eventId) {
        if (!window.supabaseClient || !eventId) return null;
        try {
            const { data, error } = await window.supabaseClient.from('Evento')
                .update({ id_estado_evento: 3 }) // 3 = Cancelada/Rechazada
                .eq('id_evento', eventId)
                .select()
                .single();
                
            if (error) throw error;

            await window.supabaseClient.from('Historial_estado_evento').insert([{
                id_visita: eventId,
                id_estado_visita: 3,
                fecha_inicio: new Date().toISOString()
            }]);

            // Try to notify the tenant
            if (data.id_perfil) {
                await this.createNotification({
                    title: "Visita Rechazada",
                    message: "Lamentablemente tu solicitud de visita no pudo ser confirmada.",
                    type: "visita",
                    userId: data.id_perfil,
                    link: "tu-alquiler.html"
                });
            }
            return data;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    proposeNewVisitTime: async function (eventId, newDate, newTime) {
        if (!window.supabaseClient || !eventId) return null;
        try {
            const { data, error } = await window.supabaseClient.from('Evento')
                .update({ 
                    id_estado_evento: 1, // Keep as pending/scheduled
                    fecha_evento: newDate,
                    hora_evento: newTime 
                })
                .eq('id_evento', eventId)
                .select()
                .single();
                
            if (error) throw error;

            await window.supabaseClient.from('Historial_estado_evento').insert([{
                id_visita: eventId,
                id_estado_visita: 1,
                fecha_inicio: new Date().toISOString()
            }]);

            // Notify the tenant about the reschedule
            if (data.id_perfil) {
                await this.createNotification({
                    title: "Visita Reprogramada",
                    message: `El propietario ha propuesto una nueva fecha para tu visita: ${newDate} a las ${newTime}.`,
                    type: "visita",
                    userId: data.id_perfil,
                    link: "tu-alquiler.html#visitas"
                });
            }
            return data;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    // Tenants & Contracts
    getTenants: async () => {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Contrato')
                .select(`
                    *,
                    Propiedad (*),
                    Perfil!id_perfil_inquilino (*)
                `);

            if (error) return [];

            return (data || []).map(c => {
                const prop = c.Propiedad || {};
                const tenant = c.Perfil || {};
                return {
                    id: c.id_contrato,
                    name: tenant.nombre_completo || 'Inquilino',
                    email: tenant.mail || '',
                    phone: tenant.telefono || '',
                    propertyAddress: `${prop.calle || 'Propiedad'} ${prop.numero || ''}`,
                    rent: c.monto_cierre || 0,
                    status: 'al_dia',
                    rentDueDay: c.dia_vencimiento_mensual || 10,
                    contractEnd: c.fecha_fin_contrato
                };
            });
        } catch (e) {
            console.error("Error in getTenants:", e);
            return [];
        }
    },

    getOwnerContracts: async function(targetProfileId = null) {
        let contractsList = [];
        try {
            const raw = localStorage.getItem('vivat_contracts');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    contractsList = parsed.filter(c => c && c.id && !['CTR-2026-0891', 'CTR-2026-0742', 'CTR-2026-0610', 'CTR-2026-0925', 'CTR-2026-0518'].includes(c.id) && c.tenant?.name !== 'Carlos Gómez' && c.tenant?.name !== 'Lucía Fernández');
                }
            }
        } catch(e) {}

        if (!window.supabaseClient) {
            return contractsList;
        }

        try {
            let profileId = targetProfileId;
            if (!profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }

            if (!profileId) {
                return [];
            }

            let query = window.supabaseClient
                .from('Contrato')
                .select(`
                    *,
                    Propiedad (
                        *,
                        Publicacion (*, Multimedia (*)),
                        Propiedad_caracteristica (
                            Caracteristica (*)
                        )
                    ),
                    Inquilino:Perfil!id_perfil_inquilino (*),
                    Propietario:Perfil!id_perfil_propietario (*),
                    Firma_contrato (*),
                    Historial_Estado_Contrato (*)
                `)
                .order('id_contrato', { ascending: false })
                .eq('id_perfil_propietario', profileId);

            const { data, error } = await query;

            if (!error && Array.isArray(data) && data.length > 0) {
                const dbContracts = data.map(item => {
                    const prop = item.Propiedad || {};
                    const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                    const media = pub?.Multimedia || [];
                    const photos = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
                    const inq = item.Inquilino || {};
                    const propOwner = item.Propietario || {};

                    const cleanTitle = pub?.descripcion 
                        ? pub.descripcion.split(' | Detalles: ')[0] 
                        : `Propiedad en ${prop.calle || 'Alquiler'} ${prop.numero || ''}`.trim();

                    const cleanAddress = prop.calle 
                        ? `${prop.calle} ${prop.numero || ''}${prop.piso_dpto ? ', ' + prop.piso_dpto : ''}, Mendoza`.trim()
                        : 'Mendoza, Argentina';

                    const cleanVivatVal = (str, def) => {
                        if (!str) return def;
                        return String(str)
                            .replace(/HABITAT/gi, (m) => m === m.toUpperCase() ? 'VIVAT' : (m[0] === m[0].toUpperCase() ? 'Vivat' : 'vivat'))
                            .replace(/HÁBITAT/gi, (m) => m === m.toUpperCase() ? 'VIVAT' : (m[0] === m[0].toUpperCase() ? 'Vivat' : 'vivat'));
                    };

                    const inqName = cleanVivatVal(inq.nombre_completo, 'Inquilino Titular');
                    const inqEmail = cleanVivatVal(inq.mail, 'inquilino@email.com');
                    const inqPhone = inq.telefono || '+54 9 11 0000-0000';
                    const inqDni = inq.dni || '';

                    const ownerName = cleanVivatVal(propOwner.nombre_completo, 'Propietario Titular');
                    const ownerEmail = cleanVivatVal(propOwner.mail, 'propietario@email.com');
                    const ownerPhone = propOwner.telefono || '+54 9 261 000-0000';
                    const ownerDni = propOwner.dni || '';

                    const tenantFirmado = (item.Firma_contrato || []).some(f => 
                        ['TENANT', 'INQUILINO', 'inquilino', 'tenant'].includes(f.rol_firmante) &&
                        (['sellada', 'completada', 'firmada'].includes(f.estado_firma) || f.didit_status === 'APPROVED')
                    );
                    const ownerFirmado = (item.Firma_contrato || []).some(f => 
                        ['OWNER', 'PROPIETARIO', 'propietario', 'owner'].includes(f.rol_firmante) &&
                        (['sellada', 'completada', 'firmada'].includes(f.estado_firma) || f.didit_status === 'APPROVED')
                    );

                    let status = 'WAITING_TENANT';
                    if (tenantFirmado && ownerFirmado) status = 'SIGNED_AND_SEALED';
                    else if (tenantFirmado) status = 'WAITING_OWNER';
                    else if (ownerFirmado) status = 'WAITING_TENANT';

                    const finalOwnerProfileId = Number(item.id_perfil_propietario || prop.id_perfil_propietario || profileId || 6);
                    const finalTenantProfileId = Number(item.id_perfil_inquilino || inq.id_perfil || 14);

                    let extraClauses = item.clausulas_adicionales || {};
                    if (typeof extraClauses === 'string') {
                        try { extraClauses = JSON.parse(extraClauses); } catch(e) { extraClauses = {}; }
                    }
                    const customClausesFromDb = extraClauses.customClauses || [];
                    const activeClausesFromDb = extraClauses.activeClausesList || [];
                    const currencyFromDb = extraClauses.currency || extraClauses.moneda || (item.id_moneda === 2 ? 'USD' : 'ARS');
                    const durationFromDb = Number(extraClauses.durationMonths || 24);
                    const indexFromDb = extraClauses.adjustmentIndex || item.indice_ajuste || (item.id_Indice === 2 ? 'ICL' : 'IPC');
                    const freqFromDb = Number(item.periodo_aumento_meses || extraClauses.adjustmentFrequencyMonths || 3);
                    const dueDayFromDb = Number(item.dia_vencimiento_mensual || extraClauses.paymentDueDay || 10);
                    const aliasFromDb = item.alias_cbu || extraClauses.aliasCbu || 'VIVAT.ALQUILER.MP';
                    const rentFromDb = Number(item.monto_cierre || extraClauses.monthlyRent || pub?.precio || 450000);

                    // Detectar historial y finalización
                    const histList = Array.isArray(item.Historial_Estado_Contrato) ? item.Historial_Estado_Contrato : [];
                    const latestHist = histList.slice().sort((a, b) => (Number(b.id_historial_contrato) || 0) - (Number(a.id_historial_contrato) || 0))[0];
                    const idEstadoContrato = latestHist ? Number(latestHist.id_estado_contrato) : Number(extraClauses.id_estado_contrato || (status === 'SIGNED_AND_SEALED' ? 1 : 5));

                    const isFinalized = Boolean(
                        idEstadoContrato === 2 ||
                        idEstadoContrato === 3 ||
                        extraClauses.is_finalized ||
                        extraClauses.status === 'finalizado' ||
                        item.status === 'finalizado'
                    );

                    if (isFinalized) {
                        status = 'finalizado';
                    }

                    return {
                        id: `CTR-2026-${String(item.id_contrato).padStart(4, '0')}`,
                        contractNumber: `CTR-2026-${String(item.id_contrato).padStart(4, '0')}`,
                        dbContractId: item.id_contrato,
                        id_contrato: item.id_contrato,
                        id_propiedad: item.id_propiedad,
                        property_id: item.id_propiedad,
                        propertyId: String(item.id_propiedad),
                        id_publicacion: item.id_publicacion || pub?.id_publicacion || null,
                        publication_id: item.id_publicacion || pub?.id_publicacion || null,
                        publicationId: item.id_publicacion || pub?.id_publicacion || null,
                        id_perfil_propietario: finalOwnerProfileId,
                        id_perfil_inquilino: finalTenantProfileId,
                        property_title: cleanTitle,
                        property_address: cleanAddress,
                        property_image: photos[0] || 'img/hero-marketplace.jpg',
                        photos: photos,
                        monthly_rent: rentFromDb,
                        monthlyRent: rentFromDb,
                        currency: currencyFromDb,
                        durationMonths: durationFromDb,
                        duration_months: durationFromDb,
                        adjustmentIndex: indexFromDb,
                        adjustment_index: indexFromDb,
                        adjustmentFrequencyMonths: freqFromDb,
                        adjustment_frequency_months: freqFromDb,
                        paymentDueDay: dueDayFromDb,
                        payment_due_day: dueDayFromDb,
                        aliasCbu: aliasFromDb,
                        alias_cbu: aliasFromDb,
                        cbu_alias: aliasFromDb,
                        expenses_amount: Number(prop.expensas_mensuales || 0),
                        punitive_daily_rate: Number(item.tasa_punitoria_diaria || 0.5),
                        broker_commission_percent: 4.15,
                        start_date: item.fecha_inicio_contrato || new Date().toISOString().split('T')[0],
                        end_date: item.fecha_fin_contrato || new Date(Date.now() + 86400000 * 365 * 2).toISOString().split('T')[0],
                        tenant_name: inqName,
                        tenant_email: inqEmail,
                        tenant_phone: inqPhone,
                        tenant_dni: inqDni,
                        owner_name: ownerName,
                        owner_email: ownerEmail,
                        owner_phone: ownerPhone,
                        owner_dni: ownerDni,
                        tenant_has_signed: tenantFirmado,
                        owner_has_signed: ownerFirmado,
                        status: status,
                        id_estado_contrato: isFinalized ? 2 : idEstadoContrato,
                        is_finalized: isFinalized,
                        isFinalized: isFinalized,
                        finalized_at: extraClauses.finalized_at || (isFinalized ? (item.fecha_fin_contrato || latestHist?.fecha_inicio || null) : null),
                        termination_reason: extraClauses.termination_reason || null,
                        termination_notes: extraClauses.termination_notes || null,
                        deposit_status: extraClauses.deposit_status || (item.deposito_devuelto ? 'devuelto_total' : null),
                        url_contrato_final_pdf: item.url_contrato_final_pdf || null,
                        url_contrato_original_pdf: item.url_contrato_original_pdf || null,
                        hash_original_sha256: item.hash_original_sha256 || null,
                        hash_final_sha256: item.hash_final_sha256 || null,
                        clauses: extraClauses,
                        customClauses: customClausesFromDb,
                        activeClausesList: activeClausesFromDb,
                        clausulas_adicionales: extraClauses,
                        has_contract: Boolean(
                            item.url_contrato_final_pdf || 
                            item.url_contrato_original_pdf || 
                            item.hash_original_sha256 || 
                            (item.clausulas_adicionales && typeof item.clausulas_adicionales === 'object' && Object.keys(item.clausulas_adicionales).length > 0) ||
                            tenantFirmado ||
                            ownerFirmado
                        ),
                        tenant: {
                            role: 'TENANT',
                            profileId: finalTenantProfileId,
                            id_perfil: finalTenantProfileId,
                            name: inqName,
                            email: inqEmail,
                            phone: inqPhone,
                            dni: inqDni,
                            hasSigned: tenantFirmado
                        },
                        owner: {
                            role: 'OWNER',
                            profileId: finalOwnerProfileId,
                            id_perfil: finalOwnerProfileId,
                            name: ownerName,
                            email: ownerEmail,
                            phone: ownerPhone,
                            dni: ownerDni,
                            hasSigned: ownerFirmado
                        }
                    };
                });

                // Combinar contratos de base de datos con los contratos locales de localStorage
                const mergedMap = new Map();
                (contractsList || []).forEach(c => {
                    if (c && c.id) mergedMap.set(String(c.id), c);
                });
                (dbContracts || []).forEach(c => {
                    if (c && c.id) {
                        if (mergedMap.has(String(c.id))) {
                            const local = mergedMap.get(String(c.id)) || {};
                            const localFinalized = Boolean(local.is_finalized || local.isFinalized || local.status === 'finalizado' || local.id_estado_contrato === 2);
                            const finalIsFinalized = c.is_finalized || localFinalized;
                            const mergedItem = {
                                ...local,
                                ...c,
                                dbContractId: c.dbContractId,
                                is_finalized: finalIsFinalized,
                                isFinalized: finalIsFinalized,
                                status: finalIsFinalized ? 'finalizado' : (c.status || local.status),
                                id_estado_contrato: finalIsFinalized ? 2 : (c.id_estado_contrato || local.id_estado_contrato),
                                finalized_at: c.finalized_at || local.finalized_at || null,
                                termination_reason: c.termination_reason || local.termination_reason || null,
                                termination_notes: c.termination_notes || local.termination_notes || null,
                                deposit_status: c.deposit_status || local.deposit_status || null,
                                clauses: (c.clauses && Object.keys(c.clauses).length > 0) ? c.clauses : (local.clauses || local.clausulas_adicionales || {}),
                                customClauses: (c.customClauses && c.customClauses.length > 0) ? c.customClauses : (local.customClauses || []),
                                activeClausesList: (c.activeClausesList && c.activeClausesList.length > 0) ? c.activeClausesList : (local.activeClausesList || []),
                                durationMonths: c.durationMonths || local.durationMonths || 24,
                                duration_months: c.durationMonths || local.durationMonths || 24,
                                currency: c.currency || local.currency || 'ARS',
                                adjustmentIndex: c.adjustmentIndex || local.adjustmentIndex || 'IPC',
                                adjustmentFrequencyMonths: c.adjustmentFrequencyMonths || local.adjustmentFrequencyMonths || 3,
                                paymentDueDay: c.paymentDueDay || local.paymentDueDay || 10,
                                aliasCbu: c.aliasCbu || local.aliasCbu || 'VIVAT.ALQUILER.MP'
                            };
                            mergedMap.set(String(c.id), mergedItem);
                        } else {
                            mergedMap.set(String(c.id), c);
                        }
                    }
                });

                const uniqueOwnerContracts = [];
                const seenContractIds = new Set();
                const sortedContracts = Array.from(mergedMap.values()).sort((a, b) => {
                    const aFinalized = Boolean(a.is_finalized || a.status === 'finalizado') ? 1 : 0;
                    const bFinalized = Boolean(b.is_finalized || b.status === 'finalizado') ? 1 : 0;
                    if (aFinalized !== bFinalized) return aFinalized - bFinalized; // Activos primero
                    const aSigned = a.status === 'SIGNED_AND_SEALED' || a.tenant_has_signed || a.owner_has_signed ? 1 : 0;
                    const bSigned = b.status === 'SIGNED_AND_SEALED' || b.tenant_has_signed || b.owner_has_signed ? 1 : 0;
                    if (bSigned !== aSigned) return bSigned - aSigned;
                    return (Number(b.dbContractId || b.id_contrato || 0)) - (Number(a.dbContractId || a.id_contrato || 0));
                });

                for (const c of sortedContracts) {
                    const cKey = String(c.id || c.dbContractId || '');
                    if (cKey && seenContractIds.has(cKey)) continue;
                    if (cKey) seenContractIds.add(cKey);
                    uniqueOwnerContracts.push(c);
                }
                return uniqueOwnerContracts;
            }
        } catch(e) {
            console.error("Error in getOwnerContracts:", e);
        }

        // Si no hubo datos de supabase o falló, normalizar lista local
        return (contractsList || []).map(c => {
            const isFin = Boolean(c.is_finalized || c.isFinalized || c.status === 'finalizado' || c.id_estado_contrato === 2);
            return {
                ...c,
                is_finalized: isFin,
                isFinalized: isFin,
                status: isFin ? 'finalizado' : (c.status || 'SIGNED_AND_SEALED'),
                        id_estado_contrato: isFin ? 2 : (c.id_estado_contrato || 1)
            };
        });
    },

    finalizeRental: async function (contractId, details = {}) {
        try {
            const now = new Date();
            const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const terminationDate = details.fecha_fin || todayLocal;
            const reason = details.motivo || 'Cumplimiento regular de contrato';
            const depositStatus = details.deposito_estado || 'devuelto_total';
            const notes = details.observaciones || '';

            let numericDbId = null;
            if (typeof contractId === 'number') numericDbId = contractId;
            else if (typeof contractId === 'string') {
                const match = contractId.match(/\d+/g);
                if (match) numericDbId = parseInt(match[match.length - 1], 10);
            }

            let propertyId = null;

            // 1. Supabase
            if (window.supabaseClient && numericDbId) {
                try {
                    const { data: currentContract } = await window.supabaseClient
                        .from('Contrato')
                        .select('id_contrato, id_propiedad, clausulas_adicionales')
                        .eq('id_contrato', numericDbId)
                        .maybeSingle();

                    if (currentContract) {
                        propertyId = currentContract.id_propiedad;
                        let extra = currentContract.clausulas_adicionales || {};
                        if (typeof extra === 'string') {
                            try { extra = JSON.parse(extra); } catch (e) { extra = {}; }
                        }
                        const updatedClauses = {
                            ...extra,
                            is_finalized: true,
                            finalized_at: terminationDate,
                            termination_reason: reason,
                            termination_notes: notes,
                            deposit_status: depositStatus,
                            id_estado_contrato: 2
                        };

                        await window.supabaseClient
                            .from('Contrato')
                            .update({
                                fecha_fin_contrato: terminationDate,
                                clausulas_adicionales: updatedClauses,
                                deposito_devuelto: depositStatus === 'devuelto_total'
                            })
                            .eq('id_contrato', numericDbId);

                        // Cerrar registros anteriores en Historial_Estado_Contrato
                        const { data: activeHist } = await window.supabaseClient
                            .from('Historial_Estado_Contrato')
                            .select('id_historial_contrato')
                            .eq('id_contrato', numericDbId)
                            .is('fecha_fin', null);

                        if (Array.isArray(activeHist)) {
                            for (const h of activeHist) {
                                await window.supabaseClient
                                    .from('Historial_Estado_Contrato')
                                    .update({ fecha_fin: new Date().toISOString() })
                                    .eq('id_historial_contrato', h.id_historial_contrato);
                            }
                        }

                        // Insertar nuevo registro con estado 2 (finalizado)
                        await window.supabaseClient
                            .from('Historial_Estado_Contrato')
                            .insert([{
                                id_contrato: numericDbId,
                                id_estado_contrato: 2,
                                fecha_inicio: new Date().toISOString()
                            }]);

                        // Si hay propiedad asociada, cerrar su estado actual y pasarla a Disponible (2)
                        if (propertyId) {
                            try {
                                const { data: propHists } = await window.supabaseClient
                                    .from('Historial_estado_propiedad')
                                    .select('id_historial_estado_propiedad')
                                    .eq('id_propiedad', propertyId)
                                    .is('fecha_fin', null);

                                if (Array.isArray(propHists)) {
                                    for (const ph of propHists) {
                                        await window.supabaseClient
                                            .from('Historial_estado_propiedad')
                                            .update({ fecha_fin: new Date().toISOString() })
                                            .eq('id_historial_estado_propiedad', ph.id_historial_estado_propiedad);
                                    }
                                }

                                await window.supabaseClient
                                    .from('Historial_estado_propiedad')
                                    .insert([{
                                        id_propiedad: propertyId,
                                        id_estado_propiedad: 2, // Disponible
                                        fecha_inicio: new Date().toISOString()
                                    }]);
                            } catch (pe) {
                                console.warn("Aviso al actualizar Historial_estado_propiedad:", pe);
                            }
                        }
                    }
                } catch (dbErr) {
                    console.warn("Aviso al actualizar Supabase para finalizar contrato:", dbErr);
                }
            }

            // 2. localStorage
            try {
                let local = JSON.parse(localStorage.getItem('vivat_contracts') || '[]');
                let found = false;
                local = local.map(c => {
                    const cNum = (c.id || '').match(/\d+/g);
                    const matchNumeric = cNum && numericDbId && parseInt(cNum[cNum.length - 1], 10) === numericDbId;
                    if (c.id === contractId || String(c.dbContractId) === String(contractId) || matchNumeric) {
                        found = true;
                        return {
                            ...c,
                            is_finalized: true,
                            isFinalized: true,
                            status: 'finalizado',
                            id_estado_contrato: 2,
                            finalized_at: terminationDate,
                            fecha_fin: terminationDate,
                            fecha_fin_contrato: terminationDate,
                            termination_reason: reason,
                            termination_notes: notes,
                            deposit_status: depositStatus,
                            clausulas_adicionales: {
                                ...(c.clausulas_adicionales || {}),
                                is_finalized: true,
                                finalized_at: terminationDate,
                                termination_reason: reason,
                                termination_notes: notes,
                                deposit_status: depositStatus
                            }
                        };
                    }
                    return c;
                });

                if (!found && contractId) {
                    local.push({
                        id: String(contractId),
                        dbContractId: numericDbId,
                        is_finalized: true,
                        isFinalized: true,
                        status: 'finalizado',
                        id_estado_contrato: 2,
                        finalized_at: terminationDate,
                        termination_reason: reason,
                        termination_notes: notes,
                        deposit_status: depositStatus
                    });
                }
                localStorage.setItem('vivat_contracts', JSON.stringify(local));
            } catch (e) {
                console.warn("Aviso al guardar en localStorage vivat_contracts:", e);
            }

            return { success: true, contractId, terminationDate };
        } catch (err) {
            console.error("Error en finalizeRental:", err);
            throw err;
        }
    },

    reactivateRental: async function (contractId) {
        try {
            let numericDbId = null;
            if (typeof contractId === 'number') numericDbId = contractId;
            else if (typeof contractId === 'string') {
                const match = contractId.match(/\d+/g);
                if (match) numericDbId = parseInt(match[match.length - 1], 10);
            }

            // 1. Supabase
            if (window.supabaseClient && numericDbId) {
                try {
                    const { data: currentContract } = await window.supabaseClient
                        .from('Contrato')
                        .select('id_contrato, id_propiedad, clausulas_adicionales')
                        .eq('id_contrato', numericDbId)
                        .maybeSingle();

                    if (currentContract) {
                        let extra = currentContract.clausulas_adicionales || {};
                        if (typeof extra === 'string') {
                            try { extra = JSON.parse(extra); } catch (e) { extra = {}; }
                        }
                        delete extra.is_finalized;
                        delete extra.finalized_at;
                        delete extra.termination_reason;
                        delete extra.termination_notes;
                        extra.id_estado_contrato = 1;

                        await window.supabaseClient
                            .from('Contrato')
                            .update({ clausulas_adicionales: extra })
                            .eq('id_contrato', numericDbId);

                        // Cerrar registro 2 en Historial_Estado_Contrato
                        await window.supabaseClient
                            .from('Historial_Estado_Contrato')
                            .update({ fecha_fin: new Date().toISOString() })
                            .eq('id_contrato', numericDbId)
                            .is('fecha_fin', null);

                        // Insertar estado 1 (activo)
                        await window.supabaseClient
                            .from('Historial_Estado_Contrato')
                            .insert([{
                                id_contrato: numericDbId,
                                id_estado_contrato: 1,
                                fecha_inicio: new Date().toISOString()
                            }]);

                        if (currentContract.id_propiedad) {
                            await window.supabaseClient
                                .from('Historial_estado_propiedad')
                                .insert([{
                                    id_propiedad: currentContract.id_propiedad,
                                    id_estado_propiedad: 4, // Alquilada
                                    fecha_inicio: new Date().toISOString()
                                }]);
                        }
                    }
                } catch (e) {
                    console.warn("Aviso al reactivar en Supabase:", e);
                }
            }

            // 2. localStorage
            try {
                let local = JSON.parse(localStorage.getItem('vivat_contracts') || '[]');
                local = local.map(c => {
                    const cNum = (c.id || '').match(/\d+/g);
                    const matchNumeric = cNum && numericDbId && parseInt(cNum[cNum.length - 1], 10) === numericDbId;
                    if (c.id === contractId || String(c.dbContractId) === String(contractId) || matchNumeric) {
                        return {
                            ...c,
                            is_finalized: false,
                            isFinalized: false,
                            status: 'SIGNED_AND_SEALED',
                            id_estado_contrato: 1,
                            finalized_at: null,
                            termination_reason: null,
                            termination_notes: null
                        };
                    }
                    return c;
                });
                localStorage.setItem('vivat_contracts', JSON.stringify(local));
            } catch (e) { }

            return { success: true };
        } catch (err) {
            console.error("Error en reactivateRental:", err);
            throw err;
        }
    },

    getTenantContracts: async function (tenantProfileId = null) {
        let localContracts = [];
        try {
            localContracts = JSON.parse(localStorage.getItem('vivat_contracts') || '[]');
        } catch (e) {}

        // 1. Obtener la identidad del inquilino autenticado
        let currentUserId = null;
        let currentUserEmail = null;
        let currentProfileId = tenantProfileId ? Number(tenantProfileId) : null;
        let currentDni = null;

        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    currentUserId = session.user.id;
                    currentUserEmail = (session.user.email || '').toLowerCase().trim();
                    if (!currentProfileId) {
                        const { data: perfil } = await window.supabaseClient
                            .from('Perfil')
                            .select('id_perfil, dni, mail')
                            .eq('user_id', currentUserId)
                            .maybeSingle();
                        if (perfil) {
                            currentProfileId = perfil.id_perfil;
                            if (perfil.dni) currentDni = perfil.dni;
                            if (perfil.mail) currentUserEmail = perfil.mail.toLowerCase().trim();
                        }
                    }
                }
            } catch (e) {}
        }

        if (!currentUserEmail) {
            try {
                const uLocal = JSON.parse(localStorage.getItem('vivat_user') || '{}');
                currentUserEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                if (uLocal.dni) currentDni = uLocal.dni;
                if (uLocal.id && !currentUserId) currentUserId = uLocal.id;
            } catch (e) {}
        }

        const diditIdent = JSON.parse(localStorage.getItem('vivat_didit_identity') || '{}');
        if (!currentDni && diditIdent.documentNumber) currentDni = diditIdent.documentNumber;

        // 2. Extraer postulaciones presentadas por este inquilino
        let tenantApplications = [];
        try {
            const rawApps = localStorage.getItem('vivat_tenant_applications');
            if (rawApps) {
                const parsed = JSON.parse(rawApps);
                if (Array.isArray(parsed)) tenantApplications.push(...parsed);
            }
        } catch (e) {}

        if (typeof this.getApplications === 'function') {
            try {
                const allDbApps = await this.getApplications();
                if (Array.isArray(allDbApps)) tenantApplications.push(...allDbApps);
            } catch (e) {
                console.warn('[DataManager] Error obteniendo solicitudes:', e);
            }
        }

        const appliedPropertyIds = new Set();
        const appliedContractIds = new Set();
        tenantApplications.forEach(a => {
            if (!a) return;
            const isMockApp = String(a.id || '').startsWith('app-00') || String(a.property_title || '').includes('Carlos Gómez');
            if (isMockApp && (!currentUserEmail || !currentUserEmail.includes('carlos'))) return;

            const matchUserId = currentUserId && (String(a.tenant_user_id || a.user_id) === String(currentUserId));
            const matchProfileId = currentProfileId && (Number(a.tenant_id || a.id_perfil_inquilino) === Number(currentProfileId));
            const matchEmail = currentUserEmail && (String(a.tenant_email || a.mail || '').toLowerCase().trim() === currentUserEmail);
            const matchDni = currentDni && (String(a.tenant_dni || a.dni || '').replace(/\D/g, '') === String(currentDni).replace(/\D/g, ''));

            if (matchUserId || matchProfileId || matchEmail || matchDni) {
                const propId = a.property_id || a.propertyId || a.id_propiedad;
                if (propId) appliedPropertyIds.add(String(propId));
                const cId = a.contract_id || a.contractId || a.id_contrato;
                if (cId) appliedContractIds.add(String(cId));
            }
        });

        // Verificador estricto: el contrato debe pertenecer a este inquilino
        const isTenantContract = (c) => {
            if (!c) return false;
            const isMock = ['CTR-2026-0891', 'CTR-2026-0742', 'CTR-2026-0610', 'CTR-2026-0925', 'CTR-2026-0518', 'CTR-2026-1041', 'CTR-2026-0001'].includes(String(c.id))
                || (c.tenant?.name === 'Carlos Gómez' && (!currentUserEmail || !currentUserEmail.includes('carlos')))
                || (c.tenant?.name === 'Lucía Fernández' && (!currentUserEmail || !currentUserEmail.includes('lucia')));

            const cTenantEmail = (c.tenant_email || c.tenant?.email || '').toLowerCase().trim();
            const cTenantDni = (c.tenant_dni || c.tenant?.dni || '').replace(/\D/g, '');
            const cTenantProfileId = c.id_perfil_inquilino || c.tenant_id || c.tenantProfileId;
            const cTenantUserId = c.tenant_user_id || c.tenant?.id;
            const cPropId = String(c.property_id || c.propertyId || c.id_propiedad || '');
            const cContractId = String(c.id || c.dbContractId || c.contract_number || '');

            const matchProfile = currentProfileId && cTenantProfileId && Number(cTenantProfileId) === Number(currentProfileId);
            const matchEmail = currentUserEmail && cTenantEmail && cTenantEmail === currentUserEmail;
            const matchDni = currentDni && cTenantDni && cTenantDni === String(currentDni).replace(/\D/g, '');
            const matchUser = currentUserId && cTenantUserId && String(cTenantUserId) === String(currentUserId);
            const matchAppliedProp = cPropId && appliedPropertyIds.has(cPropId);
            const matchAppliedContract = cContractId && (appliedContractIds.has(cContractId) || appliedContractIds.has(String(c.id)));

            if (isMock && !matchEmail && !matchProfile) return false;

            return Boolean(matchProfile || matchEmail || matchDni || matchUser || matchAppliedProp || matchAppliedContract);
        };

        const contractsMap = new Map();

        // 3. Procesar contratos locales compatibles con este inquilino
        localContracts.filter(isTenantContract).forEach(c => {
            if (c && c.id) {
                const canon = Number(c.monthly_rent || c.monthlyRent || 380000);
                const exp = Number(c.expenses_amount || c.expenses || 48000);
                const cKey = String(c.id);
                const hasContractVal = (c.has_contract !== undefined) ? Boolean(c.has_contract) : (
                    (c.hasContract !== undefined) ? Boolean(c.hasContract) : Boolean(
                        c.url_contrato_final_pdf ||
                        c.url_contrato_original_pdf ||
                        c.hash_original_sha256 ||
                        (c.clausulas_adicionales && typeof c.clausulas_adicionales === 'object' && Object.keys(c.clausulas_adicionales).length > 0) ||
                        (c.customClauses && c.customClauses.length > 0) ||
                        c.tenant_signed ||
                        c.tenant_has_signed ||
                        c.owner_has_signed ||
                        c.status === 'SIGNED_AND_SEALED'
                    )
                );
                contractsMap.set(cKey, {
                    id: c.id,
                    dbContractId: c.dbContractId || c.id,
                    contract_number: c.contractNumber || c.id,
                    property_id: c.propertyId || c.property_id,
                    property_title: c.property_title || c.title || 'Inmueble en Alquiler',
                    property_address: c.property_address || c.propertyAddress || 'Buenos Aires',
                    property_image: c.propertyImage || (c.propertyPhotos && c.propertyPhotos[0]) || 'img/hero-marketplace.jpg',
                    photos: c.propertyPhotos || (c.propertyImage ? [c.propertyImage] : ['img/hero-marketplace.jpg']),
                    monthly_rent: canon,
                    expenses: exp,
                    currency: c.currency || 'ARS',
                    status: c.status || 'WAITING_TENANT',
                    has_contract: hasContractVal,
                    hasContract: hasContractVal,
                    clausulas_adicionales: c.clausulas_adicionales || c.clauses || {},
                    customClauses: c.customClauses || [],
                    tenant_signed: Boolean(c.tenant?.hasSigned || c.tenant_signed || c.status === 'SIGNED_AND_SEALED'),
                    start_date: c.start_date || c.startDate || '2026-08-01',
                    end_date: c.end_date || c.endDate || '2028-08-01',
                    payment_due_day: c.payment_due_day || c.paymentDueDay || 10,
                    adjustment_index: c.adjustment_index || c.adjustmentIndex || 'IPC',
                    adjustment_frequency_months: c.adjustment_frequency_months || c.adjustmentFrequencyMonths || 3,
                    cbu_alias: c.alias_cbu || c.aliasCbu || 'VIVAT.ALQUILER.MP',
                    landlord_name: c.owner?.name || c.landlord_name || 'Propietario Verificado',
                    landlord_phone: c.owner?.phone || c.landlord_phone || '+54 9 261 598-7654',
                    landlord_email: c.owner?.email || c.landlord_email || 'propietario@vivat.com.ar'
                });
            }
        });

        // 4. Si hay Supabase, consultar contratos vinculados al perfil o propiedades postuladas
        if (window.supabaseClient) {
            try {
                let query = window.supabaseClient
                    .from('Contrato')
                    .select(`
                        *,
                        Propiedad (
                            *,
                            Publicacion (*, Multimedia (*)),
                            Propiedad_caracteristica (
                                Caracteristica (*)
                            )
                        ),
                        Inquilino:Perfil!id_perfil_inquilino (*),
                        Propietario:Perfil!id_perfil_propietario (*),
                        Firma_contrato (*)
                    `)
                    .order('id_contrato', { ascending: false });

                if (currentProfileId) {
                    query = query.eq('id_perfil_inquilino', Number(currentProfileId));
                } else if (appliedPropertyIds.size > 0) {
                    const validPropIds = Array.from(appliedPropertyIds).map(Number).filter(n => !isNaN(n) && n > 0);
                    if (validPropIds.length > 0) {
                        query = query.in('id_propiedad', validPropIds);
                    } else {
                        query = null;
                    }
                } else {
                    query = null; // Evitar traer contratos ajenos de la BD
                }

                if (query) {
                    const { data, error } = await query;
                    if (!error && Array.isArray(data)) {
                        data.forEach(item => {
                            const prop = item.Propiedad || {};
                            const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                            const media = pub?.Multimedia || [];
                            const photos = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
                            const propOwner = item.Propietario || {};
                            const inq = item.Inquilino || {};
                            const dbCaracteristicas = (prop.Propiedad_caracteristica || []).map(pc => pc.Caracteristica?.nombre).filter(Boolean);

                            const cleanTitle = pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : `Propiedad en ${prop.calle || 'Alquiler'} ${prop.numero || ''}`.trim();
                            const cleanAddress = `${prop.calle || 'Calle'} ${prop.numero || ''}${prop.piso_dpto ? ', ' + prop.piso_dpto : ''}, Mendoza`.trim();

                            const cKey = `CTR-2026-${String(item.id_contrato).padStart(4, '0')}`;
                            const localMatch = contractsMap.get(cKey) || contractsMap.get(String(item.id_contrato)) || {};

                            const canon = Number(item.monto_cierre || localMatch.monthly_rent || pub?.precio || 380000);
                            const exp = Number(prop.expensas_mensuales || localMatch.expenses || 48000);

                            let extraCfg = item.clausulas_adicionales || {};
                            if (typeof extraCfg === 'string') {
                                try { extraCfg = JSON.parse(extraCfg); } catch (e) { extraCfg = {}; }
                            }
                            const dbHasContract = Boolean(
                                localMatch.has_contract || localMatch.hasContract ||
                                item.url_contrato_final_pdf ||
                                item.url_contrato_original_pdf ||
                                item.hash_original_sha256 ||
                                (extraCfg && typeof extraCfg === 'object' && Object.keys(extraCfg).length > 0) ||
                                item.Firma_contrato?.length > 0
                            );

                            const mergedObj = {
                                id: item.id_contrato,
                                dbContractId: item.id_contrato,
                                contract_number: cKey,
                                property_id: item.id_propiedad,
                                property_title: cleanTitle,
                                property_address: cleanAddress,
                                property_image: photos[0] || 'img/hero-marketplace.jpg',
                                photos: photos,
                                monthly_rent: canon,
                                expenses: exp,
                                currency: (item.id_moneda === 2 || localMatch.currency === 'USD') ? 'USD' : 'ARS',
                                m2_cubiertos: prop.superficie_cubierta || 75,
                                m2_totales: prop.superficie_total || 85,
                                ambientes: prop.ambientes || 3,
                                dormitorios: prop.dormitorios || 2,
                                banos: prop.banos || 1,
                                cocheras: prop.cocheras || 1,
                                cochera: prop.cocheras ? `${prop.cocheras} Cubierta fija` : 'Sin cochera',
                                start_date: item.fecha_inicio_contrato || '2026-08-01',
                                end_date: item.fecha_fin_contrato || '2027-08-01',
                                payment_due_day: item.dia_vencimiento_mensual || 10,
                                punitive_daily_rate: Number(item.tasa_punitoria_diaria || 0.5),
                                adjustment_index: item.indice_ajuste || 'IPC',
                                adjustment_frequency_months: item.periodo_aumento_meses || 3,
                                cbu_alias: item.alias_cbu || 'VIVAT.PAGOS.ALQUILER',
                                tenant_name: inq.nombre_completo || (inq.nombre && inq.apellido ? `${inq.nombre} ${inq.apellido}` : 'Inquilino Verificado'),
                                tenant_email: inq.mail || 'inquilino@vivat.com.ar',
                                tenant_phone: inq.telefono || '+54 9 261 412-3456',
                                landlord_name: propOwner.nombre_completo || (propOwner.nombre && propOwner.apellido ? `${propOwner.nombre} ${propOwner.apellido}` : 'Propietario Verificado'),
                                landlord_email: propOwner.mail || 'propietario@vivat.com.ar',
                                landlord_phone: propOwner.telefono || '+54 9 261 598-7654',
                                description: pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : 'Propiedad en alquiler administrada bajo contrato digital en Vivat.',
                                caracteristicas: dbCaracteristicas,
                                has_contract: dbHasContract,
                                hasContract: dbHasContract,
                                clausulas_adicionales: extraCfg,
                                status: item.Firma_contrato?.length > 0 ? 'SIGNED_AND_SEALED' : (localMatch.status || 'WAITING_TENANT'),
                                tenant_signed: Boolean(localMatch.tenant_signed || item.Firma_contrato?.length > 0)
                            };

                            contractsMap.set(String(item.id_contrato), mergedObj);
                            contractsMap.set(cKey, mergedObj);
                        });
                    }
                }
            } catch (err) {
                console.warn('[DataManager] Error obteniendo Contratos de Supabase:', err);
            }
        }

        const unique = [];
        const seenProps = new Set();
        const seenContractIds = new Set();

        // Ordenar dando prioridad a contratos firmados y con ID de contrato más reciente
        const sortedContracts = Array.from(contractsMap.values()).sort((a, b) => {
            const aSigned = a.tenant_signed || a.status === 'SIGNED_AND_SEALED' ? 1 : 0;
            const bSigned = b.tenant_signed || b.status === 'SIGNED_AND_SEALED' ? 1 : 0;
            if (bSigned !== aSigned) return bSigned - aSigned;
            return (Number(b.dbContractId || b.id || 0)) - (Number(a.dbContractId || a.id || 0));
        });

        for (const val of sortedContracts) {
            const propKey = String(val.property_id || val.propertyId || val.id_propiedad || '');
            const idKey = String(val.dbContractId || val.id || '');

            // Si ya tenemos un contrato más reciente/firmado para esta propiedad física, no duplicarlo
            if (propKey && seenProps.has(propKey)) {
                continue;
            }
            if (idKey && seenContractIds.has(idKey)) {
                continue;
            }

            if (propKey) seenProps.add(propKey);
            if (idKey) seenContractIds.add(idKey);
            unique.push(val);
        }
        return unique;
    },

    getActiveContract: async function (targetId = null, tenantProfileId = null) {
        const contracts = await this.getTenantContracts(tenantProfileId);
        if (!contracts || contracts.length === 0) {
            return null;
        }
        if (targetId) {
            const found = contracts.find(c => c && (
                String(c.id) === String(targetId) ||
                String(c.contract_number) === String(targetId) ||
                String(c.contractNumber) === String(targetId) ||
                String(c.dbContractId) === String(targetId) ||
                String(c.property_id) === String(targetId) ||
                String(c.propertyId) === String(targetId)
            ));
            if (found) return found;
        }
        return contracts[0] || null;
    },

    _getStoredPaymentState: function (contractId) {
        if (!contractId) return null;
        try {
            const raw = localStorage.getItem('vivat_payment_state_' + contractId);
            if (raw) return JSON.parse(raw);
        } catch (e) { }
        return null;
    },

    _setStoredPaymentState: function (contractId, state) {
        if (!contractId) return;
        try {
            const existing = this._getStoredPaymentState(contractId) || {};
            const merged = { ...existing, ...state, updated_at: new Date().toISOString() };
            localStorage.setItem('vivat_payment_state_' + contractId, JSON.stringify(merged));
        } catch (e) { }
    },

    getCurrentPayment: async function (contractId, fallbackContract = null) {
        const isNumeric = contractId !== null && contractId !== undefined && (typeof contractId === 'number' || (typeof contractId === 'string' && /^\d+$/.test(contractId.trim())));
        
        const now = new Date();
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const currentPeriod = `${months[now.getMonth()]} ${now.getFullYear()}`;
        const dueMonth = String(now.getMonth() + 1).padStart(2, '0');
        const defaultDueDate = `${now.getFullYear()}-${dueMonth}-10`;

        const stored = this._getStoredPaymentState(contractId);

        // Buscar canon real del contrato para evitar fallbacks desactualizados
        let contractCanon = null;
        let contractCurrency = 'ARS';
        if (fallbackContract) {
            contractCanon = Number(fallbackContract.monthly_rent || fallbackContract.monthlyRent || fallbackContract.price || 0);
            contractCurrency = fallbackContract.currency || ((fallbackContract.id_moneda === 2) ? 'USD' : 'ARS');
        }
        if (!contractCanon || contractCanon <= 0) {
            try {
                const rawC = localStorage.getItem('vivat_contracts');
                if (rawC) {
                    const cList = JSON.parse(rawC);
                    const match = cList.find(c => c && (
                        String(c.id) === String(contractId) ||
                        String(c.dbContractId) === String(contractId) ||
                        String(c.propertyId) === String(contractId) ||
                        String(c.property_id) === String(contractId)
                    ));
                    if (match) {
                        contractCanon = Number(match.monthly_rent || match.monthlyRent || match.canon || match.monto_mensual || 0);
                        if (match.currency) contractCurrency = match.currency;
                    }
                }
            } catch (e) { }
        }

        const effectiveBase = Number(stored?.amount_base || contractCanon || 380000);

        if (!isNumeric) {
            return {
                id: 'pay-' + (contractId || 'current'),
                contract_id: contractId,
                period: stored?.period || currentPeriod,
                amount_base: effectiveBase,
                currency: contractCurrency,
                due_date: stored?.due_date || defaultDueDate,
                status: stored?.status || 'pendiente',
                is_punitive_waived: stored ? Boolean(stored.is_punitive_waived) : false
            };
        }

        if (!window.supabaseClient) {
            return {
                id: 'pay-' + (contractId || 'current'),
                contract_id: contractId,
                period: stored?.period || currentPeriod,
                amount_base: effectiveBase,
                currency: contractCurrency,
                due_date: stored?.due_date || defaultDueDate,
                status: stored?.status || 'pendiente',
                is_punitive_waived: stored ? Boolean(stored.is_punitive_waived) : false
            };
        }

        try {
            const { data, error } = await window.supabaseClient
                .from('Pago')
                .select('*')
                .eq('id_contrato', Number(contractId))
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data) {
                return {
                    id: 'pay-' + contractId,
                    contract_id: contractId,
                    period: stored?.period || currentPeriod,
                    amount_base: effectiveBase,
                    currency: contractCurrency,
                    due_date: stored?.due_date || defaultDueDate,
                    status: stored?.status || 'pendiente',
                    is_punitive_waived: stored ? Boolean(stored.is_punitive_waived) : false
                };
            }

            const dbWaived = data.interes_perdonado || false;
            const isWaived = (stored && stored.is_punitive_waived !== undefined) ? stored.is_punitive_waived : dbWaived;
            const dbStatus = data.fecha_pago ? 'pagado' : 'pendiente';
            const status = (stored && stored.status) ? stored.status : dbStatus;
            const amountBase = dbStatus === 'pagado' ? Number(data.monto || effectiveBase) : effectiveBase;

            return {
                id: data.id_pago,
                contract_id: data.id_contrato,
                period: data.periodo || currentPeriod,
                amount_base: amountBase,
                currency: contractCurrency,
                due_date: data.fecha_vencimiento || defaultDueDate,
                status: status,
                is_punitive_waived: isWaived
            };
        } catch (e) {
            return {
                id: 'pay-' + (contractId || 'current'),
                contract_id: contractId,
                period: stored?.period || currentPeriod,
                amount_base: effectiveBase,
                currency: contractCurrency,
                due_date: stored?.due_date || defaultDueDate,
                status: stored?.status || 'pendiente',
                is_punitive_waived: stored ? Boolean(stored.is_punitive_waived) : false
            };
        }
    },

    calculatePunitiveInterests: function (contract, payment) {
        if (!contract || !payment) return { daysLate: 0, dailyRate: 0, punitiveAmount: 0, totalAmount: 0, isWaived: false, isPaid: false };
        
        const isWaived = Boolean(payment.is_punitive_waived);
        const isPaid = (payment.status === 'pagado');
        const dailyRate = Number(contract.punitive_daily_rate || contract.punitiveDailyRate || 0.5);
        const baseAmount = Number(payment.amount_base || contract.monthly_rent || 0);

        if (isPaid || isWaived) {
            return {
                daysLate: 0,
                dailyRate,
                punitiveAmount: 0,
                totalAmount: baseAmount,
                isWaived,
                isPaid
            };
        }

        const today = new Date();
        const dueDate = new Date(payment.due_date);
        
        // Comparación a nivel de fecha (medianoche local)
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
        const diffTime = todayMidnight - dueMidnight;
        const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        if (daysLate <= 0) {
            return {
                daysLate: 0,
                dailyRate,
                punitiveAmount: 0,
                totalAmount: baseAmount,
                isWaived: false,
                isPaid: false
            };
        }

        const punitiveAmount = Math.round(baseAmount * (dailyRate / 100) * daysLate);
        return {
            daysLate,
            dailyRate,
            punitiveAmount,
            totalAmount: baseAmount + punitiveAmount,
            isWaived: false,
            isPaid: false
        };
    },

    waivePunitiveInterests: async function (paymentId, contractId) {
        const cId = contractId || (typeof paymentId === 'string' && paymentId.startsWith('pay-') ? paymentId.replace('pay-', '') : null);
        if (cId) {
            this._setStoredPaymentState(cId, { is_punitive_waived: true });
        }
        if (window.supabaseClient && typeof paymentId === 'number') {
            try {
                await window.supabaseClient.from('Pago').update({ interes_perdonado: true }).eq('id_pago', paymentId);
            } catch (e) { }
        }
        return { id: paymentId, is_punitive_waived: true };
    },

    markPaymentAsPaid: async function (paymentId, method = 'Transferencia', contractId) {
        const cId = contractId || (typeof paymentId === 'string' && paymentId.startsWith('pay-') ? paymentId.replace('pay-', '') : null);
        if (cId) {
            this._setStoredPaymentState(cId, { status: 'pagado', payment_method: method, fecha_pago: new Date().toISOString() });
        }
        if (window.supabaseClient && typeof paymentId === 'number') {
            try {
                await window.supabaseClient
                    .from('Pago')
                    .update({ fecha_pago: new Date().toISOString(), id_metodo_pago: 1 })
                    .eq('id_pago', paymentId);

                await window.supabaseClient.from('Historial_pago').insert([{
                    id_pago: paymentId,
                    id_estado_pago: 2, // Pagado
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }
        }
        return { id: paymentId, status: 'pagado', payment_method: method };
    },

    syncRentalValues: async function ({
        contractId = null,
        propertyId = null,
        publicationId = null,
        monthlyRent = null,
        expenses = null,
        currency = 'ARS',
        adjustmentIndex = 'IPC',
        adjustmentFrequencyMonths = 3,
        paymentDueDay = 10,
        tenant = null
    } = {}) {
        let propId = propertyId ? Number(propertyId) : null;
        let pubId = publicationId ? Number(publicationId) : null;

        if (window.supabaseClient) {
            // 1. Resolver IDs si falta alguno
            if (!pubId && propId) {
                try {
                    const { data: pubData } = await window.supabaseClient
                        .from('Publicacion')
                        .select('id_publicacion')
                        .eq('id_propiedad', propId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (pubData?.id_publicacion) pubId = pubData.id_publicacion;
                } catch (e) {}
            }
            if (!propId && pubId) {
                try {
                    const { data: pubData } = await window.supabaseClient
                        .from('Publicacion')
                        .select('id_propiedad')
                        .eq('id_publicacion', pubId)
                        .maybeSingle();
                    if (pubData?.id_propiedad) propId = pubData.id_propiedad;
                } catch (e) {}
            }

            // 2. Actualizar Publicacion en Supabase
            if (pubId && monthlyRent !== null && monthlyRent !== undefined) {
                try {
                    const { data: curPub } = await window.supabaseClient
                        .from('Publicacion')
                        .select('precio, descripcion')
                        .eq('id_publicacion', pubId)
                        .maybeSingle();

                    const oldPrice = curPub?.precio || 0;
                    let desc = curPub?.descripcion || '';
                    let cleanDesc = desc;
                    let extraInfo = {};

                    if (desc.includes('Detalles: ')) {
                        const parts = desc.split('Detalles: ');
                        cleanDesc = parts[0].replace(/(\s*\|\s*)+$/, '').trim();
                        try { extraInfo = JSON.parse(parts[1]); } catch (e) {}
                    }

                    extraInfo.price = Number(monthlyRent);
                    extraInfo.precio = Number(monthlyRent);
                    if (expenses !== null && expenses !== undefined) {
                        extraInfo.expensas = Number(expenses);
                    }
                    extraInfo.moneda = currency || 'ARS';

                    const formattedDesc = `${cleanDesc} | Detalles: ${JSON.stringify(extraInfo)}`;

                    await window.supabaseClient
                        .from('Publicacion')
                        .update({
                            precio: Number(monthlyRent),
                            id_moneda: currency === 'USD' ? 2 : 1,
                            descripcion: formattedDesc
                        })
                        .eq('id_publicacion', pubId);

                    // Insertar en Historial_Precio si cambió
                    if (Number(oldPrice) !== Number(monthlyRent)) {
                        try {
                            await window.supabaseClient.from('Historial_Precio').insert([{
                                id_publicacion: pubId,
                                precio_antiguo: oldPrice,
                                precio_nuevo: Number(monthlyRent),
                                fecha_cambio: new Date().toISOString()
                            }]);
                        } catch (hpErr) {}
                    }
                } catch (pubErr) {
                    console.warn('[DataManager.syncRentalValues] Error actualizando Publicacion:', pubErr);
                }
            }

            // 3. Actualizar Propiedad (expensas_mensuales) en Supabase
            if (propId && expenses !== null && expenses !== undefined) {
                try {
                    await window.supabaseClient
                        .from('Propiedad')
                        .update({ expensas_mensuales: Number(expenses) })
                        .eq('id_propiedad', propId);
                } catch (propErr) {
                    console.warn('[DataManager.syncRentalValues] Error actualizando Propiedad:', propErr);
                }
            }
        }

        // 4. Sincronizar vivat_tenant_applications en localStorage
        try {
            const rawApps = localStorage.getItem('vivat_tenant_applications');
            if (rawApps) {
                let appsList = JSON.parse(rawApps);
                let anyUpdated = false;
                appsList = appsList.map(a => {
                    if (!a) return a;
                    const matchProp = (propId && (String(a.property_id) === String(propId) || String(a.propertyId) === String(propId) || String(a.id_propiedad) === String(propId))) ||
                                      (pubId && (String(a.publication_id) === String(pubId) || String(a.publicationId) === String(pubId) || String(a.id_publicacion) === String(pubId)));
                    const matchContract = contractId && (String(a.contract_id) === String(contractId) || String(a.contractId) === String(contractId));
                    const matchTenant = tenant && (
                        (tenant.email && a.tenant_email && String(a.tenant_email).toLowerCase() === String(tenant.email).toLowerCase()) ||
                        (tenant.dni && a.tenant_dni && String(a.tenant_dni).replace(/\D/g, '') === String(tenant.dni).replace(/\D/g, ''))
                    );

                    if (matchContract || matchProp || matchTenant) {
                        anyUpdated = true;
                        return {
                            ...a,
                            property_price: Number(monthlyRent || a.property_price),
                            propertyPrice: Number(monthlyRent || a.propertyPrice),
                            price: Number(monthlyRent || a.price),
                            property_expenses: (expenses !== null && expenses !== undefined) ? Number(expenses) : (a.property_expenses ?? 45000),
                            propertyExpenses: (expenses !== null && expenses !== undefined) ? Number(expenses) : (a.propertyExpenses ?? 45000),
                            expensas: (expenses !== null && expenses !== undefined) ? Number(expenses) : (a.expensas ?? 45000),
                            currency: currency || a.currency || 'ARS',
                            status: 'aceptada',
                            contract_id: contractId || a.contract_id,
                            contractId: contractId || a.contractId
                        };
                    }
                    return a;
                });
                if (anyUpdated) {
                    localStorage.setItem('vivat_tenant_applications', JSON.stringify(appsList));
                }
            }
        } catch (e) {}

        // 5. Sincronizar vivat_contracts en localStorage
        try {
            const rawC = localStorage.getItem('vivat_contracts');
            if (rawC) {
                let cList = JSON.parse(rawC);
                let anyUpdatedC = false;
                cList = cList.map(c => {
                    if (!c) return c;
                    const matchC = (contractId && (String(c.id) === String(contractId) || String(c.contractNumber) === String(contractId) || String(c.dbContractId) === String(contractId))) ||
                                   (propId && (String(c.propertyId) === String(propId) || String(c.property_id) === String(propId) || String(c.id_propiedad) === String(propId)));
                    if (matchC) {
                        anyUpdatedC = true;
                        return {
                            ...c,
                            monthly_rent: Number(monthlyRent || c.monthly_rent),
                            monthlyRent: Number(monthlyRent || c.monthlyRent),
                            expenses_amount: (expenses !== null && expenses !== undefined) ? Number(expenses) : (c.expenses_amount ?? 45000),
                            expenses: (expenses !== null && expenses !== undefined) ? Number(expenses) : (c.expenses ?? 45000),
                            currency: currency || c.currency || 'ARS',
                            adjustment_index: adjustmentIndex || c.adjustment_index || 'IPC',
                            adjustmentIndex: adjustmentIndex || c.adjustmentIndex || 'IPC',
                            adjustment_frequency_months: adjustmentFrequencyMonths || c.adjustment_frequency_months || 3,
                            payment_due_day: paymentDueDay || c.payment_due_day || 10
                        };
                    }
                    return c;
                });
                if (anyUpdatedC) {
                    localStorage.setItem('vivat_contracts', JSON.stringify(cList));
                }
            }
        } catch (e) {}

        // 5.1 Sincronizar estado de pagos almacenados (para evitar desfase en "Alquiler Base" y "Total Final a Pagar")
        if (monthlyRent) {
            const rentNum = Number(monthlyRent);
            if (contractId) this._setStoredPaymentState(contractId, { amount_base: rentNum, currency });
            if (propId) this._setStoredPaymentState(propId, { amount_base: rentNum, currency });
            if (contractId && String(contractId).startsWith('CTR-')) {
                const numOnly = String(contractId).replace(/\D/g, '');
                if (numOnly) this._setStoredPaymentState(Number(numOnly), { amount_base: rentNum, currency });
            }

            if (window.supabaseClient) {
                let dbCId = null;
                if (contractId && !isNaN(Number(contractId))) dbCId = Number(contractId);
                else if (contractId && String(contractId).startsWith('CTR-')) {
                    const n = String(contractId).replace(/\D/g, '');
                    if (n && !isNaN(Number(n))) dbCId = Number(n);
                }
                if (dbCId) {
                    try {
                        window.supabaseClient
                            .from('Pago')
                            .update({ monto: rentNum })
                            .eq('id_contrato', dbCId)
                            .is('fecha_pago', null)
                            .then(() => {})
                            .catch(() => {});
                    } catch (pErr) {}
                }
            }
        }

        // 6. Actualizar colecciones en memoria de publicaciones y propiedades
        if (window.ownerAvisosState && Array.isArray(window.ownerAvisosState)) {
            const av = window.ownerAvisosState.find(a => a && (
                (pubId && (String(a.id) === String(pubId) || String(a.id_publicacion) === String(pubId))) ||
                (propId && (String(a.id_propiedad) === String(propId) || String(a.property_id) === String(propId)))
            ));
            if (av) {
                if (monthlyRent !== null && monthlyRent !== undefined) av.price = Number(monthlyRent);
                if (expenses !== null && expenses !== undefined) av.expensas = Number(expenses);
                if (currency) av.moneda = currency;
            }
        }
        if (window.ownerRawProperties && Array.isArray(window.ownerRawProperties)) {
            const rp = window.ownerRawProperties.find(p => p && (
                (pubId && (String(p.id) === String(pubId) || String(p.id_publicacion) === String(pubId))) ||
                (propId && (String(p.id_propiedad) === String(propId) || String(p.id) === String(propId)))
            ));
            if (rp) {
                if (monthlyRent !== null && monthlyRent !== undefined) rp.price = Number(monthlyRent);
                if (expenses !== null && expenses !== undefined) rp.expensas = Number(expenses);
                if (currency) rp.moneda = currency;
            }
        }
        if (window.currentBrokerProperties && Array.isArray(window.currentBrokerProperties)) {
            const bp = window.currentBrokerProperties.find(p => p && (
                (pubId && String(p.id) === String(pubId)) ||
                (propId && (String(p.id) === String(propId) || String(p.id_propiedad) === String(propId)))
            ));
            if (bp) {
                if (monthlyRent !== null && monthlyRent !== undefined) bp.price = Number(monthlyRent);
                if (expenses !== null && expenses !== undefined) bp.expensas = Number(expenses);
                if (currency) bp.moneda = currency;
            }
        }

        // 7. Notificar a todas las vistas mediante eventos globales
        window.dispatchEvent(new CustomEvent('vivat:contract_updated', { detail: { contractId, propertyId: propId, publicationId: pubId, monthlyRent, expenses, currency } }));
        window.dispatchEvent(new CustomEvent('vivat:rental_created', { detail: { contractId, propertyId: propId, publicationId: pubId, monthlyRent, expenses, currency } }));
        window.dispatchEvent(new CustomEvent('vivat:application_updated', { detail: { propertyId: propId, publicationId: pubId, monthlyRent, expenses, currency } }));
        window.dispatchEvent(new CustomEvent('vivat:publication_updated', { detail: { id_publicacion: pubId, id_propiedad: propId, price: monthlyRent, expensas: expenses, moneda: currency } }));

        return { success: true, propId, pubId, monthlyRent, expenses, currency };
    },

    updatePublicationPrice: async function (id_publicacion, newPrice) {
        if (!window.supabaseClient || !id_publicacion) return null;
        try {
            const { data: pub } = await window.supabaseClient
                .from('Publicacion')
                .select('precio')
                .eq('id_publicacion', id_publicacion)
                .single();

            const oldPrice = pub?.precio || 0;

            await window.supabaseClient
                .from('Publicacion')
                .update({ precio: newPrice })
                .eq('id_publicacion', id_publicacion);

            await window.supabaseClient.from('Historial_Precio').insert([{
                id_publicacion: id_publicacion,
                precio_antiguo: oldPrice,
                precio_nuevo: newPrice,
                fecha_cambio: new Date().toISOString()
            }]);

            return { id_publicacion, oldPrice, newPrice };
        } catch (e) {
            console.error("Error updating publication price:", e);
            return null;
        }
    },

    updatePublicationDirect: async function (pubId, data) {
        if (!pubId) return { success: false, error: 'ID de publicación no especificado' };
        try {
            const newPrice = Number(data.price) || 0;
            const newTitle = (data.title || '').trim();
            let cleanDesc = (data.description || '').trim();
            if (cleanDesc.includes('Detalles: ')) {
                cleanDesc = cleanDesc.split('Detalles: ')[0].trim();
            }
            cleanDesc = cleanDesc.replace(/(\s*\|\s*)+$/, '').trim();

            const moneda = data.moneda === 'USD' ? 'USD' : 'ARS';
            const expensas = Number(data.expensas) || 0;
            const expensasIncluidas = Boolean(data.expensasIncluidas);
            const status = (data.status || 'disponible').toLowerCase();
            const dormitorios = Number(data.dormitorios) || 0;
            const banos = Number(data.banos) || 1;
            const ambientes = Number(data.ambientes) || dormitorios || 1;
            const cocheras = Number(data.cocheras) || 0;
            const supCubierta = Number(data.sup_cubierta) || 0;
            const supTotal = Number(data.sup_total) || supCubierta || 0;
            const amoblado = data.amoblado || 'sin-amoblar';
            const mascotas = Boolean(data.mascotas);

            let currentPub = null;
            let existingExtra = {};

            const rawCaracteristicas = Array.isArray(data.caracteristicas)
                ? data.caracteristicas
                : (Array.isArray(data.tags) ? data.tags : null);
            const featureNames = rawCaracteristicas !== null
                ? Array.from(new Set(rawCaracteristicas.map(s => String(s).trim()).filter(Boolean)))
                : null;

            let propId = data.id_propiedad || null;
            let finalTipoProp = data.tipo_propiedad || data.tipo || 'Departamento';
            let isNoSubtype = String(finalTipoProp).toLowerCase().includes('casa') || String(finalTipoProp).toLowerCase().includes('ph');
            let finalSubtipoProp = isNoSubtype
                ? ''
                : (data.subtipo_propiedad !== undefined && data.subtipo_propiedad !== null
                    ? data.subtipo_propiedad
                    : (data.subtipoPropiedad || 'Estándar'));

            let mergedExtra = {
                title: newTitle,
                moneda: moneda,
                expensas: expensas,
                expensasIncluidas: expensasIncluidas,
                dormitorios: dormitorios,
                banos: banos,
                ambientes: ambientes,
                cocheras: cocheras,
                supCubierta: supCubierta,
                supTotal: supTotal,
                amoblado: amoblado,
                mascotas: mascotas,
                caracteristicas: featureNames !== null ? featureNames : [],
                disposicion: data.disposicion || 'Frente',
                orientacion: data.orientacion || 'Norte',
                antiguedad: data.antiguedad || 'Excelente estado',
                tipo_propiedad: finalTipoProp,
                subtipo_propiedad: finalSubtipoProp,
                subtipoPropiedad: finalSubtipoProp
            };

            let resolvedPubId = Number(pubId) || pubId;
            let resolvedPropId = Number(propId) || null;
            let targetPropId = resolvedPropId || (data.id_propiedad ? Number(data.id_propiedad) : null);

            if (window.supabaseClient) {
                // 1. Fetch current publication to get details and resolve IDs
                let { data: pubData } = await window.supabaseClient
                    .from('Publicacion')
                    .select('id_publicacion, id_propiedad, precio, descripcion, id_moneda')
                    .eq('id_publicacion', resolvedPubId)
                    .maybeSingle();

                if (!pubData && (data.id_propiedad || pubId)) {
                    // Try by id_propiedad in case pubId was a property ID
                    const lookupPropId = data.id_propiedad || pubId;
                    const { data: pubByProp } = await window.supabaseClient
                        .from('Publicacion')
                        .select('id_publicacion, id_propiedad, precio, descripcion, id_moneda')
                        .eq('id_propiedad', lookupPropId)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (pubByProp) pubData = pubByProp;
                }

                currentPub = pubData;
                if (currentPub) {
                    resolvedPubId = currentPub.id_publicacion;
                    resolvedPropId = currentPub.id_propiedad || resolvedPropId;
                    if (currentPub.descripcion && currentPub.descripcion.includes('Detalles: ')) {
                        try {
                            existingExtra = JSON.parse(currentPub.descripcion.split('Detalles: ')[1]);
                        } catch (e) {}
                    }
                }

                if (!resolvedPropId && currentPub?.id_propiedad) {
                    resolvedPropId = currentPub.id_propiedad;
                }

                // 2. Merge extra metadata
                if (!data.tipo_propiedad && !data.tipo && (existingExtra.tipo_propiedad || existingExtra.tipo)) {
                    finalTipoProp = existingExtra.tipo_propiedad || existingExtra.tipo;
                }
                isNoSubtype = String(finalTipoProp).toLowerCase().includes('casa') || String(finalTipoProp).toLowerCase().includes('ph');
                finalSubtipoProp = isNoSubtype
                    ? ''
                    : (data.subtipo_propiedad !== undefined && data.subtipo_propiedad !== null
                        ? data.subtipo_propiedad
                        : (existingExtra.subtipo_propiedad || existingExtra.subtipoPropiedad || existingExtra.subtipo || 'Estándar'));

                mergedExtra = {
                    ...existingExtra,
                    title: newTitle,
                    moneda: moneda,
                    expensas: expensas,
                    expensasIncluidas: expensasIncluidas,
                    dormitorios: dormitorios,
                    banos: banos,
                    ambientes: ambientes,
                    toilettes: data.toilettes !== undefined ? data.toilettes : existingExtra.toilettes,
                    cocheras: cocheras,
                    cochera_tipo: data.cochera_tipo || existingExtra.cochera_tipo,
                    supCubierta: supCubierta,
                    supTotal: supTotal,
                    amoblado: amoblado,
                    mascotas: mascotas,
                    caracteristicas: featureNames !== null ? featureNames : (existingExtra.caracteristicas || []),
                    disposicion: data.disposicion || existingExtra.disposicion || 'Frente',
                    orientacion: data.orientacion || existingExtra.orientacion || 'Norte',
                    antiguedad: data.antiguedad || existingExtra.antiguedad || 'Excelente estado',
                    tipo_propiedad: finalTipoProp,
                    subtipo_propiedad: finalSubtipoProp,
                    subtipoPropiedad: finalSubtipoProp,
                    // Ubicación
                    address: data.address || data.direccion || existingExtra.address || existingExtra.direccion,
                    direccion: data.address || data.direccion || existingExtra.address || existingExtra.direccion,
                    calle: data.calle || existingExtra.calle,
                    numero: data.numero !== undefined ? data.numero : existingExtra.numero,
                    piso_dpto: data.piso_dpto !== undefined ? data.piso_dpto : existingExtra.piso_dpto,
                    barrio: data.barrio || existingExtra.barrio,
                    ciudad: data.city || data.ciudad || existingExtra.ciudad || existingExtra.city,
                    city: data.city || data.ciudad || existingExtra.ciudad || existingExtra.city,
                    provincia: data.province || data.provincia || existingExtra.provincia || existingExtra.province,
                    province: data.province || data.provincia || existingExtra.provincia || existingExtra.province,
                    // Detalles constructivos y características adicionales
                    pisos: data.pisos || existingExtra.pisos,
                    ascensor: data.ascensor || existingExtra.ascensor,
                    hogar: data.hogar || existingExtra.hogar,
                    calefaccion: data.calefaccion || existingExtra.calefaccion,
                    climatizacion: data.climatizacion || data.refrigeracion || existingExtra.climatizacion || existingExtra.refrigeracion,
                    equipamiento: data.equipamiento || existingExtra.equipamiento,
                    lavadero: data.lavadero || existingExtra.lavadero,
                    edificio_nombre: data.edificio_nombre || data.complejo || existingExtra.edificio_nombre || existingExtra.complejo,
                    complejo: data.edificio_nombre || data.complejo || existingExtra.edificio_nombre || existingExtra.complejo,
                    instalaciones_complejo: data.instalaciones_complejo || existingExtra.instalaciones_complejo,
                    plazo_contrato: data.plazo_contrato || existingExtra.plazo_contrato,
                    deposito_garantia: data.deposito_garantia || existingExtra.deposito_garantia
                };

                const formattedDesc = `${cleanDesc} | Detalles: ${JSON.stringify(mergedExtra)}`;

                // 3. Update via RPC function (atomic, SECURITY DEFINER)
                let rpcSucceeded = false;
                if (typeof window.supabaseClient.rpc === 'function') {
                    try {
                        const tipoSlug = String(finalTipoProp).toLowerCase().trim();
                        const tipoMap = {
                            'departamento': 1,
                            'casa': 2,
                            'ph': 3,
                            'lote': 4,
                            'terreno': 4,
                            'oficina': 5,
                            'local': 6,
                            'local comercial': 6,
                            'local-comercial': 6,
                            'cochera': 7
                        };
                        const idTipoPropiedad = tipoMap[tipoSlug] || 1;

                        let idEstadoPub = null;
                        if (status === 'paused' || status === 'pausado') idEstadoPub = 4;
                        else if (status === 'alquilada' || status === 'alquilado') idEstadoPub = 2;
                        else if (status === 'disponible') idEstadoPub = 1;

                        const { data: rpcRes, error: rpcErr } = await window.supabaseClient.rpc('update_marketplace_publication', {
                            p_id_publicacion: resolvedPubId,
                            p_precio: newPrice,
                            p_id_moneda: moneda === 'USD' ? 2 : 1,
                            p_descripcion: formattedDesc,
                            p_dormitorios: dormitorios,
                            p_banos: banos,
                            p_ambientes: ambientes,
                            p_cocheras: cocheras,
                            p_sup_cubierta: supCubierta,
                            p_sup_lote: supTotal,
                            p_expensas: expensasIncluidas ? 0 : expensas,
                            p_id_tipo_propiedad: idTipoPropiedad,
                            p_id_subtipo_propiedad: null,
                            p_id_estado_publicacion: idEstadoPub
                        });

                        if (!rpcErr && rpcRes && rpcRes.success !== false) {
                            rpcSucceeded = true;
                            if (rpcRes.id_publicacion) resolvedPubId = rpcRes.id_publicacion;
                            if (rpcRes.id_propiedad) resolvedPropId = rpcRes.id_propiedad;
                        }
                    } catch (rpcEx) {
                        console.warn("update_marketplace_publication RPC failed, using fallback:", rpcEx);
                    }
                }

                // Fallback to direct tables update if RPC was unavailable
                if (!rpcSucceeded) {
                    const { error: pubUpdateErr } = await window.supabaseClient
                        .from('Publicacion')
                        .update({
                            precio: newPrice,
                            id_moneda: moneda === 'USD' ? 2 : 1,
                            descripcion: formattedDesc
                        })
                        .eq('id_publicacion', resolvedPubId);

                    if (pubUpdateErr) {
                        console.error("Error updating Publicacion:", pubUpdateErr);
                        throw pubUpdateErr;
                    }
                }

                // 4. Update Price History if changed (if fallback used)
                if (!rpcSucceeded && currentPub && Number(currentPub.precio) !== newPrice) {
                    try {
                        await window.supabaseClient.from('Historial_Precio').insert([{
                            id_publicacion: resolvedPubId,
                            precio_antiguo: currentPub.precio || 0,
                            precio_nuevo: newPrice,
                            fecha_cambio: new Date().toISOString()
                        }]);
                    } catch (e) {
                        console.warn("Could not insert Historial_Precio:", e);
                    }
                }

                // 5. Update Propiedad table if id_propiedad exists
                targetPropId = resolvedPropId || propId || data.id_propiedad || currentPub?.id_propiedad || targetPropId;
                if (targetPropId) {
                    try {
                        const tipoSlug = String(finalTipoProp).toLowerCase().trim();
                        const tipoMap = {
                            'departamento': 1,
                            'casa': 2,
                            'ph': 3,
                            'lote': 4,
                            'terreno': 4,
                            'oficina': 5,
                            'local': 6,
                            'local comercial': 6,
                            'local-comercial': 6,
                            'cochera': 7
                        };
                        const idTipoPropiedad = tipoMap[tipoSlug] || 1;

                        let idSubtipoPropiedad = null;
                        if (finalSubtipoProp) {
                            const rawSub = String(finalSubtipoProp).toLowerCase().trim();
                            const { data: dbSubtipos } = await window.supabaseClient
                                .from('Subtipo_propiedad')
                                .select('id_subtipo_propiedad, subtipo')
                                .eq('id_tipo_propiedad', idTipoPropiedad);

                            if (dbSubtipos && dbSubtipos.length > 0) {
                                const rawSubNorm = rawSub.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
                                const matched = dbSubtipos.find(s => {
                                    const dbName = s.subtipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                                    const dbSlug = dbName.replace(/[^a-z0-9]/g, '');
                                    return dbSlug === rawSubNorm || dbName === rawSub || dbName.includes(rawSubNorm) || rawSubNorm.includes(dbSlug);
                                });
                                if (matched) {
                                    idSubtipoPropiedad = matched.id_subtipo_propiedad;
                                }
                            }
                        }

                        const propUpdatePayload = {
                            dormitorios: dormitorios,
                            banos_completos: banos,
                            habitaciones_total: ambientes,
                            cantidad_cocheras: cocheras,
                            superficie_cubierta: supCubierta,
                            superficie_lote: supTotal,
                            expensas_mensuales: expensasIncluidas ? 0 : expensas,
                            id_tipo_propiedad: idTipoPropiedad,
                            id_subtipo_propiedad: idSubtipoPropiedad || null
                        };
                        if (data.calle) propUpdatePayload.calle = data.calle;
                        if (data.numero !== undefined) propUpdatePayload.numero = data.numero;
                        if (data.piso_dpto !== undefined) propUpdatePayload.piso_dpto = data.piso_dpto;

                        await window.supabaseClient
                            .from('Propiedad')
                            .update(propUpdatePayload)
                            .eq('id_propiedad', targetPropId);
                    } catch (propErr) {
                        console.warn("Could not update Propiedad table:", propErr);
                    }

                    // 5.1 Sync Caracteristica & Propiedad_caracteristica in Supabase
                    if (featureNames !== null) {
                        try {
                            if (featureNames.length > 0) {
                                // Fetch existing characteristics matching these names
                                const { data: existingFeats } = await window.supabaseClient
                                    .from('Caracteristica')
                                    .select('id_caracteristica, nombre')
                                    .in('nombre', featureNames);

                                const existingMap = new Map();
                                (existingFeats || []).forEach(f => {
                                    if (f.nombre) existingMap.set(f.nombre.toLowerCase().trim(), f.id_caracteristica);
                                });

                                // Insert missing characteristic names
                                const missingNames = featureNames.filter(name => !existingMap.has(name.toLowerCase().trim()));
                                if (missingNames.length > 0) {
                                    const { data: insertedFeats, error: insertErr } = await window.supabaseClient
                                        .from('Caracteristica')
                                        .insert(missingNames.map(nombre => ({ nombre })))
                                        .select('id_caracteristica, nombre');

                                    if (!insertErr && insertedFeats) {
                                        insertedFeats.forEach(f => {
                                            if (f.nombre) existingMap.set(f.nombre.toLowerCase().trim(), f.id_caracteristica);
                                        });
                                    }
                                }

                                // Delete existing property characteristic links to avoid duplicates/stale items
                                await window.supabaseClient
                                    .from('Propiedad_caracteristica')
                                    .delete()
                                    .eq('id_propiedad', targetPropId);

                                // Insert updated characteristic associations
                                const propFeatRows = featureNames
                                    .map(name => existingMap.get(name.toLowerCase().trim()))
                                    .filter(Boolean)
                                    .map(id_caracteristica => ({
                                        id_propiedad: targetPropId,
                                        id_caracteristica: id_caracteristica
                                    }));

                                if (propFeatRows.length > 0) {
                                    await window.supabaseClient
                                        .from('Propiedad_caracteristica')
                                        .insert(propFeatRows);
                                }
                            } else {
                                // If user removed all amenities, clear the relationship
                                await window.supabaseClient
                                    .from('Propiedad_caracteristica')
                                    .delete()
                                    .eq('id_propiedad', targetPropId);
                            }
                        } catch (featErr) {
                            console.warn("Could not sync Propiedad_caracteristica table:", featErr);
                        }
                    }
                }

                // 6. Update Status if specified (if fallback used)
                if (!rpcSucceeded && (status === 'paused' || status === 'disponible')) {
                    try {
                        const isPaused = status === 'paused';
                        const newEstadoId = isPaused ? 4 : 1;
                        const nowIso = new Date().toISOString();

                        await window.supabaseClient
                            .from('Historial_Estado_Publicacion')
                            .update({ fecha_fin: nowIso })
                            .eq('id_publicacion', resolvedPubId)
                            .is('fecha_fin', null);

                        await window.supabaseClient
                            .from('Historial_Estado_Publicacion')
                            .insert([{
                                id_publicacion: resolvedPubId,
                                id_estado_publicacion: newEstadoId,
                                fecha_inicio: nowIso
                            }]);
                    } catch (stErr) {
                        console.warn("Could not update Historial_Estado_Publicacion:", stErr);
                    }
                }
            }

            return {
                success: true,
                data: {
                    id: resolvedPubId,
                    id_publicacion: resolvedPubId,
                    id_propiedad: targetPropId || data.id_propiedad || currentPub?.id_propiedad,
                    title: newTitle,
                    price: newPrice,
                    moneda: moneda,
                    expensas: expensas,
                    expensasIncluidas: expensasIncluidas,
                    status: status,
                    description: cleanDesc,
                    dormitorios: dormitorios,
                    banos: banos,
                    ambientes: ambientes,
                    toilettes: mergedExtra.toilettes,
                    cocheras: cocheras,
                    cochera_tipo: mergedExtra.cochera_tipo,
                    sup_cubierta: supCubierta,
                    sup_total: supTotal,
                    amoblado: amoblado,
                    mascotas: mascotas,
                    pet: mascotas,
                    caracteristicas: featureNames !== null ? featureNames : (mergedExtra.caracteristicas || []),
                    tags: featureNames !== null ? featureNames : (mergedExtra.caracteristicas || []),
                    disposicion: mergedExtra.disposicion,
                    orientacion: mergedExtra.orientacion,
                    antiguedad: mergedExtra.antiguedad,
                    tipo_propiedad: finalTipoProp,
                    subtipo_propiedad: finalSubtipoProp,
                    subtipoPropiedad: mergedExtra.subtipoPropiedad,
                    address: mergedExtra.address,
                    direccion: mergedExtra.direccion,
                    calle: mergedExtra.calle,
                    numero: mergedExtra.numero,
                    piso_dpto: mergedExtra.piso_dpto,
                    barrio: mergedExtra.barrio,
                    city: mergedExtra.city,
                    ciudad: mergedExtra.ciudad,
                    province: mergedExtra.province,
                    provincia: mergedExtra.provincia,
                    pisos: mergedExtra.pisos,
                    ascensor: mergedExtra.ascensor,
                    hogar: mergedExtra.hogar,
                    calefaccion: mergedExtra.calefaccion,
                    climatizacion: mergedExtra.climatizacion,
                    refrigeracion: mergedExtra.climatizacion,
                    equipamiento: mergedExtra.equipamiento,
                    lavadero: mergedExtra.lavadero,
                    edificio_nombre: mergedExtra.edificio_nombre,
                    complejo: mergedExtra.complejo,
                    instalaciones_complejo: mergedExtra.instalaciones_complejo,
                    plazo_contrato: mergedExtra.plazo_contrato,
                    deposito_garantia: mergedExtra.deposito_garantia,
                    extraInfo: mergedExtra
                }
            };
        } catch (err) {
            console.error("Error in updatePublicationDirect:", err);
            return { success: false, error: err.message || 'Error al actualizar la publicación' };
        }
    },

    updatePropertyState: async function (id_propiedad, newEstadoId) {
        if (!window.supabaseClient || !id_propiedad) return null;
        try {
            await window.supabaseClient
                .from('Propiedad')
                .update({ id_estado_propiedad: newEstadoId })
                .eq('id_propiedad', id_propiedad);

            await window.supabaseClient.from('Historial_estado_propiedad').insert([{
                id_propiedad: id_propiedad,
                id_estado_propiedad: newEstadoId,
                fecha_inicio: new Date().toISOString()
            }]);

            return { id_propiedad, newEstadoId };
        } catch (e) {
            console.error("Error updating property state:", e);
            return null;
        }
    },

    createProfessionalConnection: async function (clientId, professionalId, mandateType = 'administracion_alquiler', commissionRate = 4.15) {
        if (!window.supabaseClient) return null;
        try {
            const { data: conn, error } = await window.supabaseClient
                .from('Conexion_profesional')
                .insert([{
                    id_profesional: professionalId,
                    id_cliente: clientId,
                    tipo_mandato: mandateType,
                    porcentaje_comision_pactado: commissionRate,
                    estado: 'activa',
                    fecha_conexion: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return conn;
        } catch (e) {
            console.error("Error creating professional connection:", e);
            return null;
        }
    },

    // Módulo de Leads y Monetización
    getLeads: async function (targetProfileId = null, includeStoreLeads = true) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (!profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }

            const { data, error } = await window.supabaseClient
                .from('Lead_inmobiliario')
                .select('*, Zona_lead(*), Disputa_lead(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const rawList = data || [];
            const filtered = rawList.filter(l => {
                if (!profileId) return true;
                if (includeStoreLeads) {
                    return Number(l.id_perfil_corredor) === Number(profileId) || l.id_perfil_corredor === null;
                }
                return Number(l.id_perfil_corredor) === Number(profileId);
            });

            return filtered.map(l => {
                const dispute = (l.Disputa_lead && l.Disputa_lead.length > 0) ? l.Disputa_lead[l.Disputa_lead.length - 1] : null;
                return {
                    id: `lead-${l.id_lead}`,
                    raw_id: l.id_lead,
                    id_perfil_corredor: l.id_perfil_corredor,
                    clientName: l.nombre_cliente,
                    phone: l.telefono,
                    email: l.email || '',
                    propertyName: l.nombre_propiedad || 'Consulta Inmueble',
                    propertyAddress: l.direccion_propiedad || '',
                    propertyPrice: l.precio_propiedad || '',
                    intentScore: l.puntaje_intencion || 'high',
                    timeline: l.tiempo_mudanza || 'Inmediata',
                    hasCredit: l.tiene_garantia_o_credito,
                    creditType: l.tipo_garantia || 'Directo',
                    hasPropertyToSell: l.tiene_propiedad_para_vender,
                    source: l.origen || 'Vivat',
                    status: l.estado || 'new',
                    createdAt: l.created_at ? new Date(l.created_at).toLocaleDateString('es-AR') : 'Reciente',
                    notes: Array.isArray(l.notas) ? l.notas : [],
                    disputeStatus: dispute ? (dispute.estado === 'pendiente' ? 'pending' : dispute.estado) : 'none',
                    disputeReason: dispute ? dispute.motivo : undefined,
                    disputeComments: dispute ? dispute.comentarios : undefined
                };
            });
        } catch (e) {
            console.warn("Error in getLeads:", e);
            return [];
        }
    },

    getLeadZones: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Zona_lead')
                .select('*')
                .eq('activa', true)
                .order('precio_por_lead', { ascending: false });

            if (error) throw error;
            return (data || []).map(z => ({
                id: z.id_zona,
                name: z.nombre,
                postalCode: z.codigo_postal,
                availableQuota: z.cupo_disponible,
                maxQuota: z.cupo_maximo,
                pricePerLeadARS: Number(z.precio_por_lead),
                demandLevel: z.nivel_demanda
            }));
        } catch (e) {
            console.warn("Error in getLeadZones:", e);
            return [];
        }
    },

    createLead: async function (leadData) {
        if (!window.supabaseClient) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from('Lead_inmobiliario')
                .insert([{
                    nombre_cliente: leadData.clientName,
                    telefono: leadData.phone,
                    email: leadData.email,
                    nombre_propiedad: leadData.propertyName,
                    direccion_propiedad: leadData.propertyAddress,
                    precio_propiedad: leadData.propertyPrice,
                    id_zona: leadData.zoneId || 'palermo-soho',
                    puntaje_intencion: leadData.intentScore || 'high',
                    tiempo_mudanza: leadData.timeline || 'Mudanza Inmediata',
                    tiene_garantia_o_credito: leadData.hasCredit !== false,
                    tipo_garantia: leadData.creditType || 'Efectivo',
                    origen: leadData.source || 'Manual',
                    estado: leadData.status || 'new',
                    notas: leadData.notes || []
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error creating Lead in DB:", e);
            return null;
        }
    },

    updateLeadStatus: async function (leadRawId, newStatus, notesArray) {
        if (!window.supabaseClient || !leadRawId) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from('Lead_inmobiliario')
                .update({
                    estado: newStatus,
                    notas: notesArray || []
                })
                .eq('id_lead', leadRawId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error updating Lead in DB:", e);
            return null;
        }
    },

    disputeLeadInDb: async function (leadRawId, reason, comments, profileId) {
        if (!window.supabaseClient || !leadRawId) return null;
        try {
            // Update Lead
            await window.supabaseClient
                .from('Lead_inmobiliario')
                .update({
                    estado: 'disputed'
                })
                .eq('id_lead', leadRawId);

            // Record Disputa
            const pId = profileId || await DataManager._getOrCreateProfile();
            const { data, error } = await window.supabaseClient
                .from('Disputa_lead')
                .insert([{
                    id_lead: leadRawId,
                    id_perfil_corredor: pId,
                    motivo: reason,
                    comentarios: comments,
                    estado: 'pendiente'
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error disputing Lead in DB:", e);
            return null;
        }
    },

    sendInvoiceEmail: async function (paymentId) {
        return {
            success: true,
            invoiceNumber: 'FAC-' + Math.floor(100000 + Math.random() * 900000),
            sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
    },

    // Índices de Actualización BCRA (IPC & ICL)
    syncIndicesFromBcra: async function () {
        // This privileged operation is performed by a server-side scheduler.
        // A browser session must never invoke a service-role BCRA synchronizer.
        throw new Error('La sincronización de índices se ejecuta automáticamente desde el servidor.');
    },

    getLatestIndices: async function () {
        const defaults = {
            ipc: { valor: 2.1, fecha: '2026-07-31', tasaSugeridaTrimestral: 7.2, tasaSugeridaSemestral: 14.8 },
            icl: { valor: 35.80, fecha: '2026-09-03', valorProyectado: 36.21, fechaProyectada: '2026-09-16', tasaSugeridaTrimestral: 6.8, tasaSugeridaSemestral: 13.9 }
        };

        if (!window.supabaseClient) return defaults;

        try {
            // 1. Obtener los últimos 6 meses de IPC (id_indice = 1)
            const { data: ipcRows } = await window.supabaseClient
                .from('Valor_Indice_Mensual')
                .select('*')
                .eq('id_indice', 1)
                .order('fecha_publicacion', { ascending: false })
                .limit(6);

            // 2. Obtener los últimos 200 valores de ICL (id_indice = 2)
            const { data: iclRows } = await window.supabaseClient
                .from('Valor_Indice_Mensual')
                .select('*')
                .eq('id_indice', 2)
                .order('fecha_publicacion', { ascending: false })
                .limit(200);

            let ipcResult = defaults.ipc;
            if (ipcRows && ipcRows.length > 0) {
                const latestIpc = ipcRows[0];
                // Calcular acumulado trimestral compuesto (últimos 3 meses publicados)
                let trimestral = 1;
                ipcRows.slice(0, 3).forEach(r => {
                    trimestral *= (1 + Number(r.valor_oficial) / 100);
                });
                const pctTrimestral = Number(((trimestral - 1) * 100).toFixed(1));

                // Calcular acumulado semestral compuesto (últimos 6 meses publicados)
                let semestral = 1;
                ipcRows.slice(0, 6).forEach(r => {
                    semestral *= (1 + Number(r.valor_oficial) / 100);
                });
                const pctSemestral = Number(((semestral - 1) * 100).toFixed(1));

                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const getMonthName = (dateStr) => {
                    const p = String(dateStr).split('T')[0].split('-');
                    return p.length > 1 ? `${monthNames[parseInt(p[1], 10) - 1]} ${p[0]}` : dateStr;
                };
                const last3 = ipcRows.slice(0, 3);
                const last6 = ipcRows.slice(0, 6);
                const periodo3 = last3.length > 1
                    ? `${getMonthName(last3[last3.length - 1].fecha_publicacion)} a ${getMonthName(last3[0].fecha_publicacion)}`
                    : getMonthName(last3[0].fecha_publicacion);
                const periodo6 = last6.length > 1
                    ? `${getMonthName(last6[last6.length - 1].fecha_publicacion)} a ${getMonthName(last6[0].fecha_publicacion)}`
                    : getMonthName(last6[0].fecha_publicacion);

                ipcResult = {
                    valor: Number(latestIpc.valor_oficial),
                    fecha: latestIpc.fecha_publicacion,
                    tasaSugeridaTrimestral: pctTrimestral || 7.2,
                    tasaSugeridaSemestral: pctSemestral || 14.8,
                    periodoTrimestralTexto: periodo3,
                    periodoSemestralTexto: periodo6,
                    fuenteCriterio: 'Últimos índices oficiales publicados por INDEC'
                };
            }

            let iclResult = defaults.icl;
            if (iclRows && iclRows.length > 0) {
                const todayStr = new Date().toISOString().split('T')[0];
                const effectiveIcl = iclRows.find(r => r.fecha_publicacion <= todayStr) || iclRows[0];
                const projectedIcl = iclRows[0];

                // Calcular variación trimestral respecto a 90 días atrás de la fecha efectiva
                const effDate = new Date(effectiveIcl.fecha_publicacion);
                const target90 = new Date(effDate.getFullYear(), effDate.getMonth(), effDate.getDate() - 90).toISOString().split('T')[0];
                const row90Days = iclRows.find(r => r.fecha_publicacion <= target90) || iclRows[Math.min(90, iclRows.length - 1)];
                const pctIclTrimestral = row90Days && Number(row90Days.valor_oficial) > 0
                    ? Number((((Number(effectiveIcl.valor_oficial) / Number(row90Days.valor_oficial)) - 1) * 100).toFixed(1))
                    : 6.8;

                // Calcular variación semestral respecto a 180 días atrás de la fecha efectiva
                const target180 = new Date(effDate.getFullYear(), effDate.getMonth(), effDate.getDate() - 180).toISOString().split('T')[0];
                const row180Days = iclRows.find(r => r.fecha_publicacion <= target180) || iclRows[Math.min(180, iclRows.length - 1)];
                const pctIclSemestral = row180Days && Number(row180Days.valor_oficial) > 0
                    ? Number((((Number(effectiveIcl.valor_oficial) / Number(row180Days.valor_oficial)) - 1) * 100).toFixed(1))
                    : 13.9;

                iclResult = {
                    valor: Number(effectiveIcl.valor_oficial),
                    fecha: effectiveIcl.fecha_publicacion,
                    valorProyectado: Number(projectedIcl.valor_oficial),
                    fechaProyectada: projectedIcl.fecha_publicacion,
                    tasaSugeridaTrimestral: pctIclTrimestral,
                    tasaSugeridaSemestral: pctIclSemestral
                };
            }

            return { ipc: ipcResult, icl: iclResult };
        } catch (err) {
            console.warn('[DataManager] Error obteniendo índices de Supabase, usando defaults:', err);
            return defaults;
        }
    },

    getAllIndicesHistory: async function (indexType = 'all', limit = 200) {
        if (!window.supabaseClient) {
            return [
                { id_indice: 1, indice_nombre: 'IPC', fecha_publicacion: '2026-07-31', valor_oficial: 2.1 },
                { id_indice: 1, indice_nombre: 'IPC', fecha_publicacion: '2026-06-30', valor_oficial: 2.3 },
                { id_indice: 1, indice_nombre: 'IPC', fecha_publicacion: '2026-05-31', valor_oficial: 2.6 },
                { id_indice: 2, indice_nombre: 'ICL', fecha_publicacion: '2026-08-16', valor_oficial: 35.32 },
                { id_indice: 2, indice_nombre: 'ICL', fecha_publicacion: '2026-08-15', valor_oficial: 35.29 },
                { id_indice: 2, indice_nombre: 'ICL', fecha_publicacion: '2026-08-14', valor_oficial: 35.25 }
            ];
        }

        try {
            let query = window.supabaseClient
                .from('Valor_Indice_Mensual')
                .select('*')
                .order('fecha_publicacion', { ascending: false })
                .limit(limit);

            if (indexType === 'IPC' || indexType === 1) {
                query = query.eq('id_indice', 1);
            } else if (indexType === 'ICL' || indexType === 2) {
                query = query.eq('id_indice', 2);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map(d => ({
                ...d,
                indice_nombre: d.id_indice === 1 ? 'IPC (Inflación Mensual)' : 'ICL (Índice Locaciones)'
            }));
        } catch (e) {
            console.warn('[DataManager] Error obteniendo historial de índices:', e);
            return [];
        }
    },

    calculateNextRentAdjustment: function (startDateStr, freqMonths = 3) {
        if (!startDateStr) {
            return {
                nextDate: '01/11/2026',
                daysRemaining: 79,
                isDue: false,
                label: 'Próxima actualización en 79 días'
            };
        }

        const start = new Date(startDateStr);
        const today = new Date();
        const freq = Number(freqMonths) || 3;

        let nextAdj = new Date(start);
        while (nextAdj <= today) {
            nextAdj.setMonth(nextAdj.getMonth() + freq);
        }

        const diffTime = nextAdj.getTime() - today.getTime();
        const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        const nextDateFormatted = nextAdj.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        return {
            nextDate: nextDateFormatted,
            daysRemaining: daysRemaining,
            isDue: daysRemaining <= 7,
            label: daysRemaining === 0 ? '¡Actualización requerida hoy!' : `Próxima actualización en ${daysRemaining} días (${nextDateFormatted})`
        };
    },

    applyIndexAdjustment: async function (contractId, newRent, indexType, customRate = null) {
        const finalRent = Number(newRent) || 380000;

        if (window.supabaseClient && (typeof contractId === 'number' || (typeof contractId === 'string' && !isNaN(Number(contractId))))) {
            try {
                const numericContractId = Number(contractId);
                const { data: contract } = await window.supabaseClient
                    .from('Contrato')
                    .select('monto_cierre')
                    .eq('id_contrato', numericContractId)
                    .single();

                if (contract) {
                    const oldRent = contract.monto_cierre;
                    await window.supabaseClient
                        .from('Contrato')
                        .update({ monto_cierre: finalRent })
                        .eq('id_contrato', numericContractId);

                    return { oldRent, newRent: finalRent, pct: customRate, indexType };
                }
            } catch (err) {
                console.warn('[DataManager] Error aplicando ajuste en DB:', err);
            }
        }
        return { oldRent: 380000, newRent: finalRent, pct: customRate, indexType };
    },

    // Tickets de Mantenimiento
    getMaintenanceTickets: async function (targetProfileId = null, filterByUser = false) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data, error } = await window.supabaseClient
                .from('Ticket_mantenimiento')
                .select(`
                    *,
                    Estado_ticket (*),
                    Contrato:id_contrato (
                        id_propiedad,
                        id_perfil_inquilino,
                        Propiedad:id_propiedad (calle, numero),
                        Perfil:id_perfil_inquilino (nombre_completo)
                    )
                `)
                .order('created_at', { ascending: false });

            if (error || !data) return [];

            // If filtering by user, also get user's property addresses
            let userPropAddresses = [];
            if (filterByUser && profileId) {
                try {
                    const { data: userProps } = await window.supabaseClient
                        .from('Propiedad')
                        .select('calle, numero, id_perfil_propietario, id_perfil_captador')
                        .or(`id_perfil_propietario.eq.${profileId},id_perfil_captador.eq.${profileId}`);
                    if (userProps) {
                        userPropAddresses = userProps.map(p => `${p.calle || ''} ${p.numero || ''}`.toLowerCase().trim()).filter(Boolean);
                    }
                } catch (e) {}
            }

            const rawList = data || [];
            const filtered = (filterByUser && profileId) ? rawList.filter(t => {
                if (Number(t.id_perfil) === Number(profileId)) return true;
                const tAddr = (t.direccion_propiedad || '').toLowerCase().trim();
                if (tAddr && userPropAddresses.some(addr => addr && (tAddr.includes(addr) || addr.includes(tAddr)))) {
                    return true;
                }
                return false;
            }) : rawList;

            const statusMap = {
                1: 'abierto',
                2: 'en_proceso',
                3: 'resuelto',
                4: 'cerrado',
                5: 'cancelado'
            };

            return filtered.map(t => {
                const estadoObj = t.Estado_ticket || {};
                const mappedStatus = statusMap[t.id_estado_ticket] || (estadoObj.nombre || '').toLowerCase().replace(/\s+/g, '_') || t.estado || 'abierto';
                return {
                    id: t.id_ticket,
                    contract_id: t.id_contrato,
                    property_address: t.Contrato?.Propiedad ? `${t.Contrato.Propiedad.calle} ${t.Contrato.Propiedad.numero}` : 'Propiedad Alquilada',
                    tenant_name: t.Contrato?.Perfil?.nombre_completo || 'Inquilino',
                    title: t.titulo,
                    category: t.categoria || 'General',
                    priority: t.prioridad || 'Media',
                    description: t.descripcion || '',
                    photo_url: t.url_foto || null,
                    id_estado_ticket: t.id_estado_ticket || 1,
                    status: mappedStatus,
                    status_label: estadoObj.nombre || 'Abierto',
                    landlord_response: t.respuesta_propietario || null,
                    created_at: t.created_at
                };
            });
        } catch (e) {
            console.error("Error in getMaintenanceTickets:", e);
            return [];
        }
    },

    createMaintenanceTicket: async function (ticketData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();

        const { data, error } = await window.supabaseClient
            .from('Ticket_mantenimiento')
            .insert([{
                id_perfil: profileId,
                id_contrato: ticketData.contractId || 1,
                titulo: ticketData.title,
                categoria: ticketData.category,
                prioridad: ticketData.priority || 'Media',
                descripcion: ticketData.description || '',
                url_foto: ticketData.photoUrl || null,
                id_estado_ticket: 1
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating ticket:", error);
            throw error;
        }

        try {
            await window.supabaseClient.from('Historial_estado_ticket').insert([{
                id_ticket: data.id_ticket,
                id_estado_ticket: 1, // Abierto
                fecha_inicio: new Date().toISOString()
            }]);
        } catch (e) {
            console.warn("Error creating Historial_estado_ticket:", e);
        }

        return {
            id: data.id_ticket,
            title: data.titulo,
            status: 'abierto',
            id_estado_ticket: 1,
            created_at: data.created_at
        };
    },

    updateTicketStatus: async function (ticketId, newStatus, responseText) {
        if (!window.supabaseClient || !ticketId) return null;

        const statusIdMap = {
            'abierto': 1,
            'en_proceso': 2,
            'en proceso': 2,
            'resuelto': 3,
            'cerrado': 4,
            'cancelado': 5
        };

        const targetEstadoId = typeof newStatus === 'number' ? newStatus : (statusIdMap[String(newStatus).toLowerCase()] || 2);
        const nowIso = new Date().toISOString();

        const updateData = {};
        if (newStatus !== undefined) {
            updateData.id_estado_ticket = targetEstadoId;
            updateData.estado = String(newStatus).toLowerCase();
        }
        if (responseText !== undefined) updateData.respuesta_propietario = responseText;

        const { data, error } = await window.supabaseClient
            .from('Ticket_mantenimiento')
            .update(updateData)
            .eq('id_ticket', ticketId)
            .select()
            .single();

        if (error) {
            console.error("Error updating ticket in DB:", error);
            return null;
        }

        try {
            // Close active status history
            await window.supabaseClient
                .from('Historial_estado_ticket')
                .update({ fecha_fin: nowIso })
                .eq('id_ticket', ticketId)
                .is('fecha_fin', null);

            // Insert new status history
            await window.supabaseClient
                .from('Historial_estado_ticket')
                .insert([{
                    id_ticket: ticketId,
                    id_estado_ticket: targetEstadoId,
                    fecha_inicio: nowIso
                }]);
        } catch (e) {
            console.warn("Error updating Historial_estado_ticket:", e);
        }

        return {
            id: data.id_ticket,
            id_estado_ticket: data.id_estado_ticket,
            status: data.estado,
            landlord_response: data.respuesta_propietario
        };
    },

    deductTicketFromRent: async function (ticketId, amount, note) {
        if (!window.supabaseClient || !ticketId) return null;
        try {
            const numAmount = parseFloat(amount) || 0;
            const updatePayload = {
                monto_descuento_alquiler: numAmount,
                id_estado_ticket: 3, // Resuelto
                estado: 'resuelto',
                respuesta_propietario: `[DESCUENTO APLICADO: $ ${numAmount.toLocaleString('es-AR')} descontados del alquiler] - ${note || 'Reparación abonada por inquilino'}`
            };

            const { data, error } = await window.supabaseClient
                .from('Ticket_mantenimiento')
                .update(updatePayload)
                .eq('id_ticket', ticketId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (e) {
            console.error("Error deducting ticket from rent:", e);
            return null;
        }
    },

    // Eventos y Calendario Inmobiliario
    getEvents: async function (targetProfileId = null, filterByUser = false) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data, error } = await window.supabaseClient
                .from('Evento')
                .select(`
                    *,
                    Tipo_evento!fk_evento_tipo (*),
                    Estado_evento!fk_evento_estado (*),
                    Propiedad!fk_evento_propiedad (*, Publicacion(*))
                `)
                .order('fecha_evento', { ascending: false });

            if (error) {
                console.error("Error fetching Eventos:", error);
                return [];
            }

            const rawList = data || [];
            const filtered = (filterByUser && profileId) ? rawList.filter(ev => {
                if (Number(ev.id_perfil) === Number(profileId)) return true;
                const prop = ev.Propiedad || {};
                if (Number(prop.id_perfil_propietario) === Number(profileId) || Number(prop.id_perfil_captador) === Number(profileId)) return true;
                const pubs = Array.isArray(prop.Publicacion) ? prop.Publicacion : (prop.Publicacion ? [prop.Publicacion] : []);
                if (pubs.some(p => Number(p.id_perfil) === Number(profileId))) return true;
                return false;
            }) : rawList;

            return filtered.map(ev => {
                const tipoObj = ev.Tipo_evento || {};
                const estadoObj = ev.Estado_evento || {};
                const prop = ev.Propiedad || {};
                const propTitle = prop.calle ? `${prop.calle} ${prop.numero || ''}`.trim() : (ev.notas?.includes('Inmueble: ') ? ev.notas.split('Inmueble: ')[1].split(' | ')[0] : 'Inmueble en Cartera');

                let formattedDate = '';
                if (ev.fecha_evento) {
                    try {
                        formattedDate = new Date(ev.fecha_evento).toISOString().split('T')[0];
                    } catch (e) {
                        formattedDate = String(ev.fecha_evento).split('T')[0];
                    }
                }

                return {
                    id: `EVT-${ev.id_evento}`,
                    raw_id: ev.id_evento,
                    id_tipo_evento: ev.id_tipo_evento,
                    type: tipoObj.nombre?.toLowerCase().includes('firma') ? 'firma' : (tipoObj.nombre?.toLowerCase().includes('entrega') ? 'entrega' : (tipoObj.nombre?.toLowerCase().includes('tasacion') ? 'tasacion' : 'visita')),
                    typeLabel: tipoObj.nombre || 'Visita Presencial',
                    property_title: propTitle,
                    visitor_name: ev.nombre_visitante || 'Cliente Interesado',
                    visitor_email: ev.email_visitante || '',
                    visitor_phone: ev.telefono_visitante || '',
                    visit_date: formattedDate || '2026-08-03',
                    visit_time: ev.hora_evento || '15:00',
                    status: estadoObj.nombre || 'Confirmada',
                    notes: ev.notas || ''
                };
            });
        } catch (e) {
            console.error("Error in getEvents:", e);
            return [];
        }
    },

    getVisits: async function () {
        // Pass true to filter by the current logged in user
        return this.getEvents(null, true);
    },

    createEvent: async function (eventData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await this._getOrCreateProfile();

        let isoDate = eventData.date;
        if (!isoDate || isoDate.length <= 10) {
            isoDate = `${isoDate || new Date().toISOString().split('T')[0]}T${eventData.time || '15:00'}:00.000Z`;
        }

        const { data, error } = await window.supabaseClient
            .from('Evento')
            .insert([{
                id_propiedad: eventData.propertyId || null,
                id_perfil: profileId,
                id_tipo_evento: eventData.id_tipo_evento || 1,
                id_estado_evento: eventData.id_estado_evento || 2, // Confirmada
                fecha_evento: isoDate,
                hora_evento: eventData.time || '15:00',
                nombre_visitante: eventData.visitorName || '',
                email_visitante: eventData.visitorEmail || '',
                telefono_visitante: eventData.visitorPhone || '',
                notas: eventData.notes ? `${eventData.notes}${eventData.propertyTitle ? ' | Inmueble: ' + eventData.propertyTitle : ''}` : (eventData.propertyTitle ? 'Inmueble: ' + eventData.propertyTitle : '')
            }])
            .select('*, Tipo_evento(*), Estado_evento(*)')
            .single();

        if (error) {
            console.error("Error creating Evento:", error);
            throw error;
        }

        try {
            await window.supabaseClient.from('Historial_estado_evento').insert([{
                id_evento: data.id_evento,
                id_estado_evento: data.id_estado_evento || 2,
                fecha_inicio: new Date().toISOString()
            }]);
        } catch (e) { }

        return data;
    },

    // Solicitudes de Tasación Comercial
    getValuations: async function (targetProfileId = null, filterByUser = false) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data, error } = await window.supabaseClient
                .from('Tasacion')
                .select('*, Perfil:id_perfil_solicitante(nombre_completo, telefono, mail)')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching Tasaciones:", error);
                return [];
            }

            const rawList = data || [];
            const filtered = (filterByUser && profileId) ? rawList.filter(v => {
                return Number(v.id_perfil_corredor) === Number(profileId) || Number(v.id_perfil_solicitante) === Number(profileId) || !v.id_perfil_corredor;
            }) : rawList;

            return filtered.map(v => ({
                id: `TAS-00${v.id_tasacion}`,
                raw_id: v.id_tasacion,
                address: v.direccion,
                type: `${v.tipo_inmueble || 'Departamento'} • ${v.ambientes || 3} Amb • ${v.superficie_m2 || 70} m²`,
                owner: (v.Perfil && v.Perfil.nombre_completo) ? v.Perfil.nombre_completo : 'Propietario Solicitante',
                phone: (v.Perfil && v.Perfil.telefono) ? v.Perfil.telefono : '+54 11 0000-0000',
                estimated: v.valor_estimado ? `$ ${v.valor_estimado}` : 'Pendiente de cotización',
                status: v.estado || 'Pendiente'
            }));
        } catch (e) {
            console.error("Error in getValuations:", e);
            return [];
        }
    },

    createValuation: async function (valData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();

        const { data, error } = await window.supabaseClient
            .from('Tasacion')
            .insert([{
                id_perfil_solicitante: profileId,
                direccion: valData.address,
                tipo_inmueble: valData.propertyType || 'Departamento',
                ambientes: parseInt(valData.rooms) || 3,
                superficie_m2: parseFloat(valData.surface) || 65,
                estado: 'pendiente'
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating Tasacion:", error);
            throw error;
        }
        return data;
    },

    // Inventario Digital (N:M con Item, Lectura_Medidor_Inventario 1:N)
    getDigitalInventories: async function (contractId) {
        if (!window.supabaseClient) return [];
        try {
            let query = window.supabaseClient
                .from('Inventario_Digital')
                .select(`
                    *,
                    Tipo_inventario (*),
                    Lectura_Medidor_Inventario (
                        *,
                        Tipo_servicio_medidor (*)
                    ),
                    Detalle_Inventario_Item (
                        *,
                        Item (
                            *,
                            Categoria_item (*)
                        ),
                        Estado_item (*),
                        Foto_Item_Inventario (*)
                    )
                `)
                .order('fecha_inspeccion', { ascending: false });

            if (contractId) {
                query = query.eq('id_contrato', contractId);
            }

            const { data, error } = await query;
            if (error) return [];

            return data || [];
        } catch (e) {
            console.error("Error in getDigitalInventories:", e);
            return [];
        }
    },

    getInventoryTypes: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Tipo_inventario')
                .select('*')
                .order('id_tipo_inventario', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) {
            console.error("Error fetching getInventoryTypes:", e);
            return [];
        }
    },

    createDigitalInventory: async function (invData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();

        const { data, error } = await window.supabaseClient
            .from('Inventario_Digital')
            .insert([{
                id_contrato: invData.contractId || 1,
                id_propiedad: invData.propertyId || 1,
                id_perfil_creador: profileId,
                id_tipo_inventario: typeof invData.inventoryTypeId === 'number' ? invData.inventoryTypeId : 1,
                tipo_inventario: invData.inventoryType || 'Entrega_Inicial',
                cantidad_llaves_entregadas: invData.keysCount || 1,
                observaciones_generales: invData.generalNotes || ''
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating digital inventory:", error);
            throw error;
        }

        return data;
    },

    addMeterReadingToInventory: async function (inventoryId, serviceTypeId, readingValue, meterNumber = null, notes = '') {
        if (!window.supabaseClient || !inventoryId) return null;
        const { data, error } = await window.supabaseClient
            .from('Lectura_Medidor_Inventario')
            .insert([{
                id_inventario: inventoryId,
                id_tipo_servicio: serviceTypeId || 1,
                valor_lectura: String(readingValue),
                numero_medidor: meterNumber,
                observaciones: notes
            }])
            .select()
            .single();

        if (error) {
            console.error("Error adding meter reading:", error);
            return null;
        }
        return data;
    },

    addItemToInventory: async function (inventoryId, itemId, room = 'General', conditionStateId = 3, notes = '', legacyConditionText = 'Bueno') {
        if (!window.supabaseClient || !inventoryId) return null;
        const { data, error } = await window.supabaseClient
            .from('Detalle_Inventario_Item')
            .insert([{
                id_inventario: inventoryId,
                id_item: itemId || 1,
                ambiente: room,
                id_estado_conservacion: typeof conditionStateId === 'number' ? conditionStateId : 3,
                estado_conservacion: legacyConditionText,
                observaciones: notes
            }])
            .select()
            .single();

        if (error) {
            console.error("Error adding item to inventory:", error);
            return null;
        }
        return data;
    },

    addPhotoToInventoryItem: async function (detalleItemId, photoUrl) {
        if (!window.supabaseClient || !detalleItemId) return null;
        const { data, error } = await window.supabaseClient
            .from('Foto_Item_Inventario')
            .insert([{
                id_detalle_item: detalleItemId,
                url_foto: photoUrl
            }])
            .select()
            .single();

        if (error) return null;
        return data;
    },

    // Catálogos de Inventario
    getConservationStates: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Estado_item')
                .select('*')
                .order('id_estado_conservacion', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) {
            console.error("Error fetching getConservationStates:", e);
            return [];
        }
    },

    getItemCategories: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Categoria_item')
                .select('*')
                .order('nombre', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) {
            console.error("Error fetching getItemCategories:", e);
            return [];
        }
    },

    getItemCatalog: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Item')
                .select(`
                    *,
                    Categoria_item (*)
                `)
                .order('nombre', { ascending: true });
            if (error) return [];
            return data || [];
        } catch (e) {
            console.error("Error fetching getItemCatalog:", e);
            return [];
        }
    },

    // Storage Upload Helpers per Bucket
    uploadProfileAvatar: async function (fileOrBase64, userId) {
        // Kept for compatibility with old callers. A browser must not choose an
        // avatar path or write directly to Storage because that enabled account
        // impersonation via arbitrary user ids.
        console.warn('La carga directa de avatares fue deshabilitada; requiere un endpoint autenticado.');
        return null;
    },

    uploadInventoryPhotoFile: async function (fileOrBase64, inventoryId, itemId) {
        // Inventory uploads use /api/inventario-upload and a path-scoped signed
        // URL in inventory-manager.js. Do not revive the unrestricted helper.
        console.warn('La carga directa de inventario fue deshabilitada por seguridad.');
        return null;
    },

    uploadRAGDocumentFile: async function (fileOrBlob, documentName) {
        // RAG material can include private source documents. It is deliberately
        // server-only until an admin-reviewed upload route exists.
        console.warn('La carga directa de documentos RAG fue deshabilitada por seguridad.');
        return null;
    },

    getTenants: async function() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('Perfil').select('*').eq('id_tipo_perfil', 2);
            return (data || []).map(t => ({
                id: t.id_perfil,
                name: t.nombre_completo || 'Inquilino',
                email: t.mail || '',
                phone: t.telefono || '-',
                propertyAddress: '-',
                rent: 0,
                contractEnd: '-'
            }));
        } catch (e) {
            return [];
        }
    },

    getMockPayments: async function() {
        if (!window.supabaseClient) return [];
        try {
            const { data } = await window.supabaseClient.from('Pago').select('*, Contrato(*)').order('created_at', { ascending: false });
            return (data || []).map(p => ({
                id: p.id_pago,
                date: p.created_at ? new Date(p.created_at).toLocaleDateString() : '-',
                tenantName: 'Inquilino',
                propertyAddress: 'Propiedad',
                method: 'Transferencia',
                amount: parseFloat(p.monto || 0),
                status: p.monto ? 'Pagado' : 'Pendiente'
            }));
        } catch (e) {
            return [];
        }
    },

    getPaymentStats: async function() {
        const payments = await DataManager.getMockPayments();
        const totalPaid = payments.filter(p => p.status === 'Pagado').reduce((sum, p) => sum + p.amount, 0);
        const pendingCount = payments.filter(p => p.status === 'Pendiente').length;
        return {
            totalPaid: totalPaid,
            pendingCount: pendingCount,
            totalTransactions: payments.length
        };
    },

    // ==========================================
    // MÓDULO: FIRMA ELECTRÓNICA DE CONTRATOS (FASE 1)
    // ==========================================
    
    /**
     * Inicia la transacción de firma para un contrato (Fase 1)
     * @param {number|string} idContrato - ID del contrato a firmar
     * @param {Object} metadata - Metadatos opcionales de contexto (geolocalización, etc.)
     * @param {string} callbackUrl - URL a la que volver tras completar Didit
     * @returns {Promise<Object>} Resultado con id_firma, estado y didit_session_url
     */
    iniciarFirmaContrato: async function (idContrato, metadata = {}, callbackUrl = '') {
        const payload = {
            id_contrato: Number(idContrato),
            consentGiven: metadata.consentGiven === true,
            metadata: {
                userAgent: navigator.userAgent,
                geolocation: metadata.geolocation || null,
                screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...metadata,
                consentGiven: undefined
            },
            callbackUrl: callbackUrl || window.location.href
        };

        try {
            const authHeaders = await this._getAuthHeaders();
            const response = await fetch('/api/firmas/iniciar', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.message || 'Error al iniciar la transacción de firma.');
            }
            return result.data;
        } catch (err) {
            console.error("Error en iniciarFirmaContrato:", err);
            throw err;
        }
    },

    _getAuthHeaders: async function () {
        const headers = { 'Content-Type': 'application/json' };
        if (window.supabaseClient) {
            try {
                const { data: sessData } = await window.supabaseClient.auth.getSession();
                const token = sessData?.session?.access_token;
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (e) {}
        }
        return headers;
    },

    /**
     * Obtiene el estado actual de las firmas registradas para un contrato
     * @param {number|string} idContrato 
     * @returns {Promise<Array>} Lista de firmas con perfiles y estados
     */
    getFirmasContrato: async function (idContrato) {
        if (!idContrato) return [];
        try {
            const authHeaders = await this._getAuthHeaders();
            const response = await fetch(`/api/firmas/finalizar?id_contrato=${encodeURIComponent(Number(idContrato))}`, {
                headers: authHeaders
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'No se pudo consultar las firmas.');
            const summary = result.data?.resumen_firmas || {};
            return [
                { rol_firmante: 'inquilino', estado_firma: summary.inquilino?.estado || 'pendiente', fecha_firma: summary.inquilino?.fecha || null },
                { rol_firmante: 'propietario', estado_firma: summary.propietario?.estado || 'pendiente', fecha_firma: summary.propietario?.fecha || null }
            ];
        } catch (err) {
            console.error("Error al consultar firmas de contrato:", err);
            return [];
        }
    },

    /**
     * Consulta el estado en tiempo real de una firma específica
     * @param {number|string} idFirma 
     * @returns {Promise<Object|null>} Datos de la firma y scores biométricos
     */
    consultarEstadoFirma: async function (idFirma) {
        if (!idFirma) return null;
        try {
            const authHeaders = await this._getAuthHeaders();
            const response = await fetch(`/api/firmas/estado?id_firma=${encodeURIComponent(Number(idFirma))}`, {
                headers: authHeaders
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok || !result.ok) throw new Error(result.message || result.error || 'No se pudo consultar la firma.');
            return result.data || null;
        } catch (err) {
            console.error("Error al consultar estado de firma individual:", err);
            return null;
        }
    },

    /**
     * Ejecuta el sellado de tiempo y generación de Audit Trail oficial (Fase 3)
     * @param {number|string} idFirma 
     * @returns {Promise<Object>} Resultado del sellado, hashes y URL del PDF
     */
    sellarFirmaContrato: async function (idFirma) {
        try {
            const authHeaders = await this._getAuthHeaders();
            const response = await fetch('/api/firmas/sellar', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ id_firma: Number(idFirma) })
            });

            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.message || 'Error al sellar la firma del contrato.');
            }
            return result.data;
        } catch (err) {
            console.error("Error en sellarFirmaContrato:", err);
            throw err;
        }
    },

    /**
     * Consulta el estado de cierre del contrato y obtiene los links de descarga de los certificados (Fase 4)
     * @param {number|string} idContrato 
     * @returns {Promise<Object>} Resumen consolidado, estado activo y URLs firmadas de descarga
     */
    finalizarYObtenerDocumentosContrato: async function (idContrato) {
        try {
            const authHeaders = await this._getAuthHeaders();
            const response = await fetch('/api/firmas/finalizar', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ id_contrato: Number(idContrato) })
            });
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.message || 'Error al consultar documentos del contrato.');
            }
            return result.data;
        } catch (err) {
            console.error("Error en finalizarYObtenerDocumentosContrato:", err);
            throw err;
        }
    },

    /**
     * Obtiene los contratos / alquileres activos del corredor con relaciones completas
     */
    getBrokerActiveRentals: async function (targetProfileId = null, filterByUser = true) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data, error } = await window.supabaseClient
                .from('Contrato')
                .select(`
                    *,
                    Propiedad (
                        *,
                        Publicacion (*, Multimedia (*)),
                        Propiedad_caracteristica (Caracteristica (*))
                    ),
                    Inquilino:Perfil!id_perfil_inquilino (*),
                    Propietario:Perfil!id_perfil_propietario (*),
                    Pago (*),
                    Firma_contrato (*)
                `)
                .order('id_contrato', { ascending: false });

            if (error || !Array.isArray(data)) {
                console.warn("Could not query Contrato for broker:", error);
                return [];
            }

            const rawList = data || [];
            const filtered = (filterByUser && profileId) ? rawList.filter(item => {
                const isOwner = Number(item.id_perfil_propietario) === Number(profileId);
                const isInq = Number(item.id_perfil_inquilino) === Number(profileId);
                const prop = item.Propiedad || {};
                const isCaptador = Number(prop.id_perfil_captador) === Number(profileId);
                const pubs = Array.isArray(prop.Publicacion) ? prop.Publicacion : (prop.Publicacion ? [prop.Publicacion] : []);
                const hasUserPub = pubs.some(pub => Number(pub.id_perfil) === Number(profileId));

                return isOwner || isInq || isCaptador || hasUserPub;
            }) : rawList;

            return filtered.map(item => {
                const prop = item.Propiedad || {};
                const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                const media = pub?.Multimedia || [];
                const photos = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
                const inq = item.Inquilino || {};
                const propOwner = item.Propietario || {};

                const cleanTitle = pub?.descripcion 
                    ? pub.descripcion.split(' | Detalles: ')[0] 
                    : (prop.calle ? `Propiedad en ${prop.calle} ${prop.numero || ''}`.trim() : `Propiedad #${item.id_propiedad}`);

                const cleanAddress = prop.calle 
                    ? `${prop.calle} ${prop.numero || ''}${prop.piso_dpto ? ', ' + prop.piso_dpto : ''}, Mendoza`.trim()
                    : 'Mendoza, Argentina';

                const payments = item.Pago || [];
                const latestPayment = payments.length > 0 ? payments[payments.length - 1] : null;
                const isPaid = latestPayment ? (latestPayment.id_estado_pago === 2 || latestPayment.estado === 'pagado' || latestPayment.estado === 'aprobado') : false;

                const freq = item.periodo_aumento_meses || 3;
                const adjText = freq === 4 ? 'Cuatrimestral IPC oficial' : (freq === 6 ? 'Semestral ICL oficial' : 'Trimestral IPC oficial');

                const monthlyRentVal = Number(item.monto_cierre || pub?.precio || 0) || 350000;
                const feeVal = Math.round(monthlyRentVal * 0.0415);
                const expensesVal = Number(prop.expensas_mensuales || 0) || 0;

                return {
                    id: `RENT-${item.id_contrato}`,
                    raw_id: item.id_contrato,
                    rentalId: `RENT-${item.id_contrato}`,
                    propertyId: item.id_propiedad,
                    propertyTitle: cleanTitle,
                    propertyAddress: cleanAddress,
                    propertyImage: photos[0] || 'img/hero-marketplace.jpg',
                    tenantName: inq.nombre_completo || 'Inquilino Vivat',
                    tenantEmail: inq.mail || 'inquilino@vivat.com',
                    tenantPhone: inq.telefono || '+54 9 11',
                    ownerName: propOwner.nombre_completo || 'Propietario Vivat',
                    ownerEmail: propOwner.mail || 'propietario@vivat.com',
                    ownerPhone: propOwner.telefono || '+54 9 261',
                    monthlyRent: monthlyRentVal,
                    feeAmount: feeVal,
                    feePercent: 4.15,
                    currency: item.id_moneda === 2 ? 'USD' : 'ARS',
                    expensesAmount: expensesVal,
                    punitives: 0,
                    dueDay: item.dia_vencimiento_mensual || 10,
                    punitiveDailyRate: Number(item.tasa_punitoria_diaria || 0.5) || 0.5,
                    startDate: item.fecha_inicio_contrato || '2026-08-01',
                    endDate: item.fecha_fin_contrato || '2028-08-01',
                    adjustmentType: adjText,
                    paymentStatus: isPaid ? 'PAGADO' : 'PENDIENTE',
                    paymentMethod: isPaid ? (latestPayment?.metodo_pago || 'Transferencia Bancaria') : 'Pendiente de cobro',
                    cbu: item.alias_cbu || 'VIVAT.ALQUILER.MP',
                    cbuAlias: item.alias_cbu || 'VIVAT.ALQUILER.MP',
                    depositAmount: Number(item.monto_deposito || item.monto_cierre || 0) || 0,
                    contractCode: `CTR-2026-${String(item.id_contrato).padStart(4, '0')}`,
                    inventoryId: `INV-2026-${String(item.id_contrato).padStart(3, '0')}`,
                    inventoryItemsCount: 14,
                    payments: payments
                };
            });
        } catch (e) {
            console.error("Error in getBrokerActiveRentals:", e);
            return [];
        }
    },

    /**
     * Obtiene los clientes propietarios de las propiedades administradas
     */
    getBrokerOwners: async function (targetProfileId = null, filterByUser = true) {
        if (!window.supabaseClient) return [];
        try {
            let profileId = targetProfileId;
            if (filterByUser && !profileId && window.DataManager._getOrCreateProfile) {
                profileId = await window.DataManager._getOrCreateProfile();
            }
            if (filterByUser && !profileId) {
                return [];
            }

            const { data: props, error } = await window.supabaseClient
                .from('Propiedad')
                .select(`
                    id_propiedad,
                    calle,
                    numero,
                    expensas_mensuales,
                    id_perfil_propietario,
                    id_perfil_captador,
                    Propietario:Perfil!id_perfil_propietario (*),
                    Publicacion (*),
                    Contrato (*)
                `);

            if (error || !Array.isArray(props)) {
                return [];
            }

            const rawProps = props || [];
            const brokerProps = (filterByUser && profileId) ? rawProps.filter(p => {
                const isCaptador = Number(p.id_perfil_captador) === Number(profileId);
                const isOwner = Number(p.id_perfil_propietario) === Number(profileId);
                const pubs = Array.isArray(p.Publicacion) ? p.Publicacion : (p.Publicacion ? [p.Publicacion] : []);
                const hasUserPub = pubs.some(pub => Number(pub.id_perfil) === Number(profileId));

                return isCaptador || isOwner || hasUserPub;
            }) : rawProps;

            const ownersMap = new Map();
            brokerProps.forEach(p => {
                const owner = p.Propietario;
                if (!owner) return;
                const ownerId = String(owner.id_perfil);
                const propTitle = p.calle ? `${p.calle} ${p.numero || ''}`.trim() : `Propiedad #${p.id_propiedad}`;
                const pub = Array.isArray(p.Publicacion) ? p.Publicacion[0] : p.Publicacion;
                const contracts = p.Contrato || [];
                const activeContract = contracts.find(c => !c.fecha_fin_contrato || new Date(c.fecha_fin_contrato) >= new Date());

                if (!ownersMap.has(ownerId)) {
                    ownersMap.set(ownerId, {
                        id: `CLI-00${owner.id_perfil}`,
                        raw_id: owner.id_perfil,
                        name: owner.nombre_completo || 'Propietario Vivat',
                        phone: owner.telefono || '+54 9 11 4802-9988',
                        email: owner.mail || 'propietario@vivat.com',
                        dni: owner.dni || 'Verificado',
                        propsCount: 0,
                        propsList: [],
                        monthlyIncome: 0,
                        commissionRate: '4.15%',
                        mandateStatus: 'Activo (Exclusivo)',
                        verified: owner.cuenta_verificada !== false
                    });
                }

                const entry = ownersMap.get(ownerId);
                entry.propsCount += 1;
                entry.propsList.push(propTitle);
                const rentVal = Number(activeContract?.monto_cierre || pub?.precio || 0);
                entry.monthlyIncome += rentVal;
            });

            return Array.from(ownersMap.values());
        } catch (e) {
            console.error("Error in getBrokerOwners:", e);
            return [];
        }
    },

    /**
     * Obtiene la billetera de créditos de leads del corredor
     */
    getBrokerCreditWallet: async function (profileId = null) {
        if (!window.supabaseClient) return { creditos_disponibles: 25, total_creditos_adquiridos: 50 };
        try {
            let pid = profileId;
            if (!pid && window.DataManager._getOrCreateProfile) {
                pid = await window.DataManager._getOrCreateProfile();
            }
            if (!pid) pid = 6; // fallback profile

            const { data, error } = await window.supabaseClient
                .from('Billetera_credito_corredor')
                .select('*')
                .eq('id_perfil_corredor', pid)
                .maybeSingle();

            if (data) {
                return data;
            }

            // Insert initial record if not exists
            const { data: newWallet } = await window.supabaseClient
                .from('Billetera_credito_corredor')
                .insert([{
                    id_perfil_corredor: pid,
                    creditos_disponibles: 25,
                    total_creditos_adquiridos: 50,
                    zonas_activas: ['palermo-soho', 'recoleta', 'belgrano-r']
                }])
                .select('*')
                .maybeSingle();

            return newWallet || { creditos_disponibles: 25, total_creditos_adquiridos: 50 };
        } catch (e) {
            console.error("Error in getBrokerCreditWallet:", e);
            return { creditos_disponibles: 25, total_creditos_adquiridos: 50 };
        }
    },

    /**
     * Compra un lead deduciendo créditos de la billetera
     */
    purchaseBrokerLead: async function (leadRawId, costCredits = 1) {
        if (!window.supabaseClient) return { ok: true };
        try {
            const profileId = await window.DataManager._getOrCreateProfile();
            // 1. Deduct credits
            const wallet = await window.DataManager.getBrokerCreditWallet(profileId);
            if ((wallet.creditos_disponibles || 0) < costCredits) {
                throw new Error("Créditos insuficientes para desbloquear este lead.");
            }

            const newCredits = Math.max(0, (wallet.creditos_disponibles || 0) - costCredits);
            await window.supabaseClient
                .from('Billetera_credito_corredor')
                .update({ creditos_disponibles: newCredits, updated_at: new Date().toISOString() })
                .eq('id_billetera', wallet.id_billetera);

            // 2. Assign lead to broker
            await window.supabaseClient
                .from('Lead_inmobiliario')
                .update({ id_perfil_corredor: profileId, estado: 'contacted' })
                .eq('id_lead', Number(leadRawId));

            return { ok: true, remainingCredits: newCredits };
        } catch (e) {
            console.error("Error in purchaseBrokerLead:", e);
            throw e;
        }
    }
};

window.DataManager = DataManager;

// Modal Global de Consulta de Tabla de Índices BCRA (IPC & ICL)
window.openBcraIndicesTableModal = async function(initialTab = 'IPC') {
    let modal = document.getElementById('bcra-indices-table-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'bcra-indices-table-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md font-body';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="relative w-full max-w-4xl h-[90vh] max-h-[850px] bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-white overflow-hidden" onclick="event.stopPropagation()">
            <!-- Header Modal -->
            <div class="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-bold shrink-0 border border-primary/20">
                        <span class="material-symbols-outlined text-xl sm:text-2xl">table_chart</span>
                    </div>
                    <div>
                        <h3 class="font-headline text-base sm:text-xl font-extrabold text-zinc-900 dark:text-white leading-tight">
                            Tabla Oficial de Índices BCRA
                        </h3>
                        <p class="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Valores oficiales del Banco Central de la República Argentina con 2 decimales.</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" onclick="document.getElementById('bcra-indices-table-modal').style.display='none'" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                        <span class="material-symbols-outlined text-base sm:text-lg">close</span>
                    </button>
                </div>
            </div>

            <!-- Tabs Switcher + Filter -->
            <div class="px-4 sm:px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-zinc-900 shrink-0">
                <div class="grid grid-cols-2 gap-1 w-full sm:w-72 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shrink-0">
                    <button type="button" id="tab-btn-ipc" onclick="renderIndicesTableContent('IPC')" class="w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-extrabold bg-primary text-white shadow-sm transition-all cursor-pointer">
                        IPC (Inflación)
                    </button>
                    <button type="button" id="tab-btn-icl" onclick="renderIndicesTableContent('ICL')" class="w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all cursor-pointer">
                        ICL (Locación)
                    </button>
                </div>
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs w-full sm:w-64">
                    <span class="material-symbols-outlined text-base text-zinc-400">search</span>
                    <input type="text" id="indices-search-input" oninput="filterIndicesTableRows()" placeholder="Buscar por año o mes..." class="bg-transparent outline-none w-full !p-0 !border-none !ring-0 text-xs font-medium placeholder:text-zinc-400">
                </div>
            </div>

            <!-- KPI Cards Summary (Siempre 3 columnas compactas sin espacio vacío) -->
            <div id="indices-kpi-summary" class="px-4 sm:px-6 py-3 border-b border-zinc-200/80 dark:border-zinc-800 grid grid-cols-3 gap-2 sm:gap-3 bg-zinc-50/70 dark:bg-zinc-900/60 shrink-0">
                <!-- Se llena dinámicamente -->
            </div>

            <!-- Table Content Area (Scrollable) -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[320px]" id="indices-table-container">
                <div class="p-8 text-center text-zinc-400 font-medium">Cargando registros oficiales...</div>
            </div>

            <!-- Footer Modal -->
            <div class="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 shrink-0">
                <span class="flex items-center gap-1.5 text-center sm:text-left text-[11px] sm:text-xs">
                    <span class="material-symbols-outlined text-base text-emerald-500">verified</span>
                    <span>Fuente Oficial: API Monetaria v4.0 BCRA • Sincronización Automática</span>
                </span>
                <button type="button" onclick="document.getElementById('bcra-indices-table-modal').style.display='none'" class="w-full sm:w-auto px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-headline font-bold text-xs shadow transition-colors cursor-pointer">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    let activeTab = initialTab;
    let cachedRows = [];

    window.triggerManualBcraSync = async function() {
        const btn = document.getElementById('btn-sync-bcra');
        const icon = document.getElementById('icon-sync-bcra');
        const text = document.getElementById('text-sync-bcra');
        if (btn) btn.disabled = true;
        if (icon) icon.classList.add('animate-spin');
        if (text) text.textContent = 'Sincronizando...';

        try {
            await window.DataManager.syncIndicesFromBcra();
            if (text) text.textContent = '¡Actualizado!';
            if (icon) {
                icon.classList.remove('animate-spin');
                icon.textContent = 'check';
            }
            await renderIndicesTableContent(activeTab);
            setTimeout(() => {
                if (text) text.textContent = 'Sincronizar BCRA';
                if (icon) {
                    icon.classList.remove('animate-spin');
                    icon.textContent = 'sync';
                }
                if (btn) btn.disabled = false;
            }, 2500);
        } catch (e) {
            console.error('Error sincronizando BCRA:', e);
            if (text) text.textContent = 'Error al sincronizar';
            if (icon) {
                icon.classList.remove('animate-spin');
                icon.textContent = 'error';
            }
            setTimeout(() => {
                if (text) text.textContent = 'Sincronizar BCRA';
                if (icon) icon.textContent = 'sync';
                if (btn) btn.disabled = false;
            }, 3000);
        }
    };

    const formatBcraDate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
    };

    const formatBcraMonth = (dateStr) => {
        if (!dateStr) return '-';
        const parts = String(dateStr).split('T')[0].split('-');
        if (parts.length === 3) {
            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const m = parseInt(parts[1], 10) - 1;
            return `${months[m] || parts[1]} ${parts[0]}`;
        }
        return dateStr;
    };

    window.renderIndicesTableContent = async function(tab) {
        activeTab = tab;
        const btnIpc = document.getElementById('tab-btn-ipc');
        const btnIcl = document.getElementById('tab-btn-icl');
        const container = document.getElementById('indices-table-container');
        const kpiContainer = document.getElementById('indices-kpi-summary');

        if (btnIpc && btnIcl) {
            if (tab === 'IPC') {
                btnIpc.className = 'w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-extrabold bg-primary text-white shadow-sm transition-all cursor-pointer';
                btnIcl.className = 'w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all cursor-pointer';
            } else {
                btnIcl.className = 'w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-extrabold bg-primary text-white shadow-sm transition-all cursor-pointer';
                btnIpc.className = 'w-full text-center px-3 py-2 rounded-lg text-xs font-headline font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all cursor-pointer';
            }
        }

        if (container) container.innerHTML = '<div class="p-8 text-center text-zinc-400 font-medium">Cargando registros oficiales del BCRA...</div>';

        cachedRows = await window.DataManager.getAllIndicesHistory(tab, 300);

        // Render KPI cards (3 columnas proporcionales y compactas en mobile y desktop)
        if (kpiContainer && cachedRows.length > 0) {
            const latest = cachedRows[0];
            if (tab === 'IPC') {
                let compTrim = 1;
                cachedRows.slice(0, 3).forEach(r => compTrim *= (1 + Number(r.valor_oficial) / 100));
                const pctTrim = ((compTrim - 1) * 100).toFixed(2);

                let compSem = 1;
                cachedRows.slice(0, 6).forEach(r => compSem *= (1 + Number(r.valor_oficial) / 100));
                const pctSem = ((compSem - 1) * 100).toFixed(2);

                kpiContainer.innerHTML = `
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Último IPC</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-primary dark:text-red-400 mt-0.5 truncate">+${Number(latest.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Trimestral (3m)</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">+${Number(pctTrim).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Semestral (6m)</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-blue-600 dark:text-blue-400 mt-0.5 truncate">+${Number(pctSem).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                `;
            } else {
                const todayStr = new Date().toISOString().split('T')[0];
                const effectiveIcl = cachedRows.find(r => r.fecha_publicacion <= todayStr) || latest;
                const isProjected = latest.fecha_publicacion > todayStr;

                const effDate = new Date(effectiveIcl.fecha_publicacion);
                const target90 = new Date(effDate.getFullYear(), effDate.getMonth(), effDate.getDate() - 90).toISOString().split('T')[0];
                const row90 = cachedRows.find(r => r.fecha_publicacion <= target90) || cachedRows[Math.min(90, cachedRows.length - 1)];
                const pctTrim = row90 && Number(row90.valor_oficial) > 0
                    ? (((Number(effectiveIcl.valor_oficial) / Number(row90.valor_oficial)) - 1) * 100).toFixed(2)
                    : '6.80';

                const target180 = new Date(effDate.getFullYear(), effDate.getMonth(), effDate.getDate() - 180).toISOString().split('T')[0];
                const row180 = cachedRows.find(r => r.fecha_publicacion <= target180) || cachedRows[Math.min(180, cachedRows.length - 1)];
                const pctSem = row180 && Number(row180.valor_oficial) > 0
                    ? (((Number(effectiveIcl.valor_oficial) / Number(row180.valor_oficial)) - 1) * 100).toFixed(2)
                    : '13.90';

                kpiContainer.innerHTML = `
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <div class="flex items-center justify-between gap-1">
                            <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">${isProjected ? 'ICL Hoy' : 'Último ICL'}</span>
                            ${isProjected ? `<span class="text-[9px] text-amber-500 font-bold truncate">Proy: ${Number(latest.valor_oficial).toFixed(2)}</span>` : ''}
                        </div>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-primary dark:text-red-400 mt-0.5 truncate">${Number(effectiveIcl.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Trimestral (3m)</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">+${Number(pctTrim).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Semestral (6m)</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-blue-600 dark:text-blue-400 mt-0.5 truncate">+${Number(pctSem).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</span>
                    </div>
                `;
            }
        }

        window.filterIndicesTableRows();
    };

    window.filterIndicesTableRows = function() {
        const container = document.getElementById('indices-table-container');
        const searchVal = (document.getElementById('indices-search-input')?.value || '').toLowerCase().trim();
        if (!container) return;

        const filtered = cachedRows.filter(r => {
            if (!searchVal) return true;
            const dateStr = String(r.fecha_publicacion || '');
            const monthStr = formatBcraMonth(r.fecha_publicacion).toLowerCase();
            return dateStr.includes(searchVal) || monthStr.includes(searchVal);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-zinc-400 space-y-2">
                    <span class="material-symbols-outlined text-3xl text-zinc-300 dark:text-zinc-600">search_off</span>
                    <p class="text-xs">No se encontraron registros para "${searchVal}".</p>
                </div>
            `;
            return;
        }

        if (activeTab === 'IPC') {
            container.innerHTML = `
                <div class="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-headline font-extrabold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th class="p-3.5 sm:p-4">Período / Mes</th>
                                <th class="p-3.5 sm:p-4 text-right">Variación Mensual</th>
                                <th class="p-3.5 sm:p-4 text-center">Tipo de Registro</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                            ${filtered.map(r => `
                                <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                                    <td class="p-3.5 sm:p-4 font-headline font-bold text-zinc-900 dark:text-white">
                                        <div class="flex items-center gap-2.5">
                                            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                            <div>
                                                <span class="block">${formatBcraMonth(r.fecha_publicacion)}</span>
                                                <span class="block text-[11px] font-mono font-medium text-zinc-400 dark:text-zinc-500">${formatBcraDate(r.fecha_publicacion)}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-right font-headline font-black text-sm text-primary dark:text-red-400 font-mono">
                                        +${Number(r.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-center">
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                                            Oficial BCRA
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-headline font-extrabold uppercase text-[10px] tracking-wider">
                            <tr>
                                <th class="p-3.5 sm:p-4">Fecha</th>
                                <th class="p-3.5 sm:p-4 text-right">Valor Diario Oficial</th>
                                <th class="p-3.5 sm:p-4 text-center">Tipo de Registro</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                            ${filtered.map(r => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isFuture = String(r.fecha_publicacion) > todayStr;
                                return `
                                <tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                                    <td class="p-3.5 sm:p-4 font-headline font-bold text-zinc-900 dark:text-white">
                                        <div class="flex items-center gap-2.5">
                                            <span class="w-2.5 h-2.5 rounded-full ${isFuture ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0"></span>
                                            <div>
                                                <span class="block font-mono font-bold">${formatBcraDate(r.fecha_publicacion)}</span>
                                                <span class="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500">${isFuture ? 'Anticipo Diario Proyectado' : 'Publicación Oficial Diaria'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-right font-headline font-black text-sm text-primary dark:text-red-400 font-mono">
                                        ${Number(r.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td class="p-3.5 sm:p-4 text-center">
                                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isFuture ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300/40' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'}">
                                            ${isFuture ? 'Proyección BCRA' : 'Oficial BCRA'}
                                        </span>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    };

    window.renderIndicesTableContent(initialTab);
};
