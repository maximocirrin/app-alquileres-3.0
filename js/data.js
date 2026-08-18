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

var DataManager = {
    // Helper: Get or Create Profile ID for current user
    _getOrCreateProfile: async function () {
        if (!window.supabaseClient) return null;
        try {
            const { data: { user } } = await window.supabaseClient.auth.getUser();
            if (!user) {
                const { data: fallbackProfiles } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil')
                    .limit(1);
                return fallbackProfiles?.[0]?.id_perfil || null;
            }

            const { data: existing } = await window.supabaseClient
                .from('Perfil')
                .select('id_perfil')
                .or(`user_id.eq.${user.id},mail.eq.${user.email}`)
                .limit(1);

            if (existing && existing.length > 0) {
                return existing[0].id_perfil;
            }

            const { data: newProfile, error } = await window.supabaseClient
                .from('Perfil')
                .insert([{
                    user_id: user.id,
                    mail: user.email,
                    nombre_completo: user.user_metadata?.full_name || user.email.split('@')[0],
                    id_tipo_perfil: 1,
                    cuenta_verificada: true
                }])
                .select('id_perfil')
                .single();

            if (error) {
                console.warn("Could not insert Perfil, using fallback:", error);
                return null;
            }
            return newProfile.id_perfil;
        } catch (e) {
            console.error("Error in _getOrCreateProfile:", e);
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
        if (data.user) {
            await window.supabaseClient
                .from('Perfil')
                .insert([{
                    user_id: data.user.id,
                    mail: email,
                    nombre_completo: fullName || email.split('@')[0],
                    id_tipo_perfil: 1
                }]);
        }
        return data.user;
    },

    logout: async () => {
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
    getProperties: async () => {
        if (!window.supabaseClient) return [];
        try {
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

            return (properties || []).map(p => {
                const pub = Array.isArray(p.Publicacion) ? p.Publicacion[0] : p.Publicacion;
                const media = pub?.Multimedia || [];
                const contract = Array.isArray(p.Contrato) ? p.Contrato[0] : p.Contrato;

                const photoUrls = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
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
                    cbuAlias: contract?.alias_cbu || 'HABITAT.MP',
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

    getPublicMarketplaceProperties: async (limit = 50) => {
        if (!window.supabaseClient) return [];
        try {
            const { data: publications, error } = await window.supabaseClient
                .from('Publicacion')
                .select(`
                    *,
                    Historial_Estado_Publicacion (*, Estado_Publicacion (*)),
                    Propiedad (
                        *,
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
                `)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error("Error fetching Publicacion:", error);
                return [];
            }

            return (publications || []).map(pub => {
                const prop = pub.Propiedad || {};
                const media = pub.Multimedia || [];
                const imageUrls = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
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

                const cleanTitle = pub.descripcion
                    ? pub.descripcion.split(' | Detalles: ')[0].substring(0, 70)
                    : `Propiedad en ${address}`;

                const lat = prop.latitud ? parseFloat(prop.latitud) : -32.8898;
                const lng = prop.longitud ? parseFloat(prop.longitud) : -68.8373;
                const dormitorios = prop.dormitorios || extraInfo.dormitorios || 1;
                const banos = prop.banos_completos || extraInfo.banos || 1;
                const ambientes = prop.habitaciones_total || extraInfo.ambientes || dormitorios;
                const cocheras = prop.cantidad_cocheras || extraInfo.cocheras || 0;
                const supCubierta = prop.superficie_cubierta || extraInfo.supCubierta || 0;

                const tags = [
                    dormitorios ? `${dormitorios} dorm.` : null,
                    banos ? `${banos} bañ.` : null,
                    ambientes ? `${ambientes} amb.` : null,
                    cocheras ? `${cocheras} coch.` : null,
                    supCubierta ? `${supCubierta} m²` : null,
                    'Verificado'
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
                    if (estadoNombre === 'pausada' || activeHist.id_estado_publicacion === 4) {
                        currentPropStatus = 'paused';
                    } else if (estadoNombre === 'eliminada' || estadoNombre === 'eliminado' || activeHist.id_estado_publicacion === 5) {
                        currentPropStatus = 'deleted';
                    } else if (estadoNombre === 'alquilada' || activeHist.id_estado_publicacion === 2) {
                        currentPropStatus = 'alquilada';
                    } else if (estadoNombre === 'vendida' || activeHist.id_estado_publicacion === 3) {
                        currentPropStatus = 'vendida';
                    } else {
                        currentPropStatus = 'disponible';
                    }
                }

                return {
                    id: pub.id_publicacion,
                    id_propiedad: pub.id_propiedad,
                    id_publicacion: pub.id_publicacion,
                    title: cleanTitle,
                    description: pub.descripcion || '',
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
                    subtipo_propiedad: dbSubtipo || extraInfo.subtipoPropiedad || '',
                    caracteristicas: extraInfo.caracteristicas || dbCaracteristicas || [],
                    tags: tags,
                    note: cleanTitle,
                    type: extraInfo.tipo || 'apartment',
                    pet: extraInfo.mascotas || false,
                    verified: true,
                    status: currentPropStatus,
                    expensasIncluidas: extraInfo.expensasIncluidas !== undefined ? extraInfo.expensasIncluidas : true,
                    expensas: extraInfo.expensas || 0,
                    featured: (extraInfo.operacion || 'ALQUILER').toUpperCase(),
                    created_at: pub.created_at,
                    cantidad_visualizaciones_total: pub.cantidad_visualizaciones_total || 0,
                    views_count: pub.cantidad_visualizaciones_total || 0,
                    views: pub.cantidad_visualizaciones_total || 0,
                    extraInfo: extraInfo,
                    Propiedad: prop
                };
            }).filter(p => p.status !== 'deleted');
        } catch (e) {
            console.error("Error in getPublicMarketplaceProperties:", e);
            return [];
        }
    },

    getUserMarketplaceProperties: async () => {
        return DataManager.getPublicMarketplaceProperties(50);
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

            // 1. Insert row into Registro_visualizacion
            const { error: insertErr } = await window.supabaseClient
                .from('Registro_visualizacion')
                .insert([{ id_publicacion: id_publicacion, id_perfil: profileId }]);

            if (insertErr) {
                console.warn("Could not insert Registro_visualizacion:", insertErr);
            }

            // 2. Fetch current views count and update Publicacion table
            const { data: pubData } = await window.supabaseClient
                .from('Publicacion')
                .select('cantidad_visualizaciones_total')
                .eq('id_publicacion', id_publicacion)
                .maybeSingle();

            const newTotal = (pubData?.cantidad_visualizaciones_total || 0) + 1;

            await window.supabaseClient
                .from('Publicacion')
                .update({ cantidad_visualizaciones_total: newTotal })
                .eq('id_publicacion', id_publicacion);

        } catch (err) {
            console.error("Error recording publication view:", err);
        }
    },

    addMarketplaceProperty: async (propertyData) => {
        if (!window.supabaseClient) throw new Error("Supabase client not available");

        const profileId = await DataManager._getOrCreateProfile();

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

        // 3. Construct clean description string (only publication description, no JSON metadata)
        const baseDescription = propertyData.descripcionAviso || propertyData.tituloAviso || 'Propiedad publicada en alquiler';
        const price = parseFloat(propertyData.precio || propertyData.price || 0);

        const { data: pubData, error: pubErr } = await window.supabaseClient
            .from('Publicacion')
            .insert([{
                id_propiedad: propData.id_propiedad,
                id_perfil: profileId,
                id_tipo_operacion: 1,
                id_moneda: propertyData.moneda === 'USD' ? 2 : 1,
                precio: price,
                descripcion: baseDescription
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
                    const ext = item.name ? item.name.split('.').pop() : 'webp';
                    const filePath = `prop-${pubData.id_publicacion}-${Date.now()}-${idx}.${ext}`;
                    const { data: uploadResult, error: uploadErr } = await window.supabaseClient
                        .storage
                        .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                        .upload(filePath, item, { contentType: item.type || 'image/webp', upsert: true });

                    if (!uploadErr) {
                        const { data: urlRes } = window.supabaseClient
                            .storage
                            .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                            .getPublicUrl(filePath);
                        publicUrl = urlRes?.publicUrl;
                    } else {
                        console.error("Storage upload error:", uploadErr);
                    }
                } else if (typeof item === 'string' && item.startsWith('data:')) {
                    const blob = base64ToBlob(item);
                    if (blob) {
                        const filePath = `prop-${pubData.id_publicacion}-${Date.now()}-${idx}.webp`;
                        const { data: uploadResult, error: uploadErr } = await window.supabaseClient
                            .storage
                            .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                            .upload(filePath, blob, { contentType: 'image/webp', upsert: true });

                        if (!uploadErr) {
                            const { data: urlRes } = window.supabaseClient
                                .storage
                                .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                                .getPublicUrl(filePath);
                            publicUrl = urlRes?.publicUrl;
                        }
                    }
                    if (!publicUrl) publicUrl = item;
                } else if (typeof item === 'string') {
                    publicUrl = item;
                }
            } catch (imgErr) {
                console.warn("Storage upload exception:", imgErr);
            }

            if (!publicUrl && typeof item === 'string') {
                publicUrl = item;
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
        if (!window.supabaseClient || !id_publicacion) return;
        const nowIso = new Date().toISOString();
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
            console.error("Error setting property status to eliminada:", e);
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
    getApplications: async function () {
        let dbApps = [];
        if (window.supabaseClient) {
            try {
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
                        Propiedad (
                            *,
                            Publicacion (
                                *,
                                Multimedia (*)
                            )
                        ),
                        Perfil (
                            *,
                            Pasaporte_habitat (*)
                        )
                    `)
                    .order('fecha_solicitud', { ascending: false });

                if (!error && data) {
                    dbApps = data.map(s => {
                        const prop = s.Propiedad || {};
                        const perf = s.Perfil || {};
                        const pass = (Array.isArray(perf.Pasaporte_habitat) ? perf.Pasaporte_habitat[0] : perf.Pasaporte_habitat) || {};
                        const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                        const media = pub?.Multimedia || [];
                        const photoUrls = media.length > 0 ? media.map(m => m.url_archivo) : [];
                        const photoUrl = photoUrls[0] || 'img/hero-marketplace.jpg';

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
                        let realDni = perf.dni || null;
                        let realCuit = pass.cuit || null;
                        if (!realDni && realCuit && realCuit.replace(/\D/g, '').length === 11) {
                            const clean = realCuit.replace(/\D/g, '');
                            realDni = clean.substring(2, clean.length - 1);
                        }

                        return {
                            id: s.id_solicitud,
                            property_id: s.id_propiedad,
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
                            tenant_name: perf.nombre_completo || 'Postulante Verificado',
                            tenant_email: perf.mail || 'inquilino@email.com',
                            tenant_phone: s.telefono || perf.telefono || '',
                            tenant_dni: realDni,
                            tenant_cuit: realCuit,
                            passport_code: pass.codigo_pasaporte || (s.id_pasaporte ? `HBT-2026-${s.id_pasaporte}` : null),
                            condicion_fiscal: pass.condicion_fiscal || null,
                            situacion_crediticia: pass.situacion_crediticia || null,
                            monthly_income: parseFloat(s.ingreso_mensual_declarado || 0),
                            income_proof: s.comprobante_ingreso || 'Pasaporte Hábitat',
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
            const raw = localStorage.getItem('habitat_tenant_applications');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    localSavedApps = parsed.filter(a => a && a.id && !String(a.id).startsWith('app-00') && !String(a.property_title || '').includes('Carlos Gómez') && !String(a.tenant_name || '').includes('Carlos Gómez'));
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
            localStorage.setItem('habitat_tenant_applications', JSON.stringify(combined));
        } catch (e) {}

        return combined;
    },

    submitApplication: async function (appData) {
        let insertedId = `sol_${Date.now()}`;
        let fecha = new Date().toISOString();

        if (window.supabaseClient) {
            try {
                const profileId = await DataManager._getOrCreateProfile();
                const propIdNum = (typeof appData.propertyId === 'number' || (typeof appData.propertyId === 'string' && /^\d+$/.test(appData.propertyId.trim())))
                    ? parseInt(appData.propertyId, 10)
                    : 1;

                const { data, error } = await window.supabaseClient
                    .from('Solicitud')
                    .insert([{
                        id_perfil: profileId,
                        id_propiedad: propIdNum,
                        ingreso_mensual_declarado: parseFloat(appData.declaredIncome || appData.monthly_income || appData.propertyPrice || 0),
                        mensaje: appData.message || '',
                        comprobante_ingreso: appData.incomeProof || 'Pasaporte Hábitat',
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
                }
            } catch (err) {
                console.warn("[DataManager] Error insertando en Supabase Solicitud:", err);
            }
        }

        // Guardar copia completa en localStorage
        try {
            const localApps = JSON.parse(localStorage.getItem('habitat_tenant_applications') || '[]');
            const newApp = {
                id: insertedId,
                property_id: appData.propertyId || 1,
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
                tenant_email: appData.tenantEmail || 'inquilino@habitat.ar',
                tenant_phone: appData.tenantPhone || '+54 9 11 0000-0000',
                monthly_income: parseFloat(appData.declaredIncome || appData.monthly_income || 1500000),
                income_proof: appData.incomeProof || 'Recibo de Sueldo / Pasaporte Hábitat',
                message: appData.message || 'Interesado en alquilar la propiedad.',
                status: 'pendiente',
                created_at: fecha
            };
            localApps.unshift(newApp);
            localStorage.setItem('habitat_tenant_applications', JSON.stringify(localApps));
        } catch (e) {
            console.warn("Error saving local application:", e);
        }

        return {
            id: insertedId,
            status: 'pendiente',
            created_at: fecha
        };
    },

    acceptApplication: async function (appId) {
        let contractId = `CTR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        let propTitle = 'Propiedad en Alquiler';
        let propAddress = 'Buenos Aires';
        let monthlyRent = 450000;
        let tenantName = 'Inquilino Postulante';
        let tenantEmail = 'inquilino@habitat.ar';
        let tenantPhone = '+54 9 11 0000-0000';
        let photoUrls = ['img/hero-marketplace.jpg'];
        let ownerName = 'Propietario Verificado';
        let ownerEmail = 'propietario@habitat.ar';

        // 1. Obtener datos desde localStorage si existen
        let localApp = null;
        try {
            const raw = localStorage.getItem('habitat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                localApp = apps.find(a => String(a.id) === String(appId));
                if (localApp) {
                    propTitle = localApp.property_title || propTitle;
                    propAddress = localApp.property_address || propAddress;
                    monthlyRent = Number(localApp.property_price || monthlyRent);
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
                    }
                } catch (e) {}

                // Consultar Solicitud con jerarquía completa
                const { data: sol } = await window.supabaseClient
                    .from('Solicitud')
                    .select(`
                        *,
                        Propiedad (
                            *,
                            Publicacion (
                                *,
                                Multimedia (*)
                            )
                        ),
                        Perfil (*)
                    `)
                    .eq('id_solicitud', appId)
                    .maybeSingle();

                const prop = sol?.Propiedad || {};
                const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                const media = pub?.Multimedia || [];
                if (media.length > 0) {
                    photoUrls = media.map(m => m.url_archivo);
                }

                if (pub?.descripcion) {
                    propTitle = pub.descripcion.split(' | Detalles: ')[0];
                } else if (prop.calle) {
                    propTitle = `Propiedad en ${prop.calle} ${prop.numero || ''}`.trim();
                }

                if (prop.calle) {
                    propAddress = `${prop.calle} ${prop.numero || ''}`.trim();
                }

                if (pub?.precio) monthlyRent = Number(pub.precio);
                else if (prop.expensas_mensuales && !localApp) monthlyRent = Number(prop.expensas_mensuales * 10);

                const perf = sol?.Perfil || {};
                if (perf.nombre_completo) tenantName = perf.nombre_completo;
                if (perf.mail) tenantEmail = perf.mail;
                if (sol?.telefono || perf.telefono) tenantPhone = sol?.telefono || perf.telefono;

                const solPropId = sol?.id_propiedad || 1;
                const solPerfilId = sol?.id_perfil || profileId;

                const todayStr = new Date().toISOString().split('T')[0];
                const nextYearStr = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0];

                // 1. Record Historial_estado_solicitud (Aprobada = 2)
                await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                    id_solicitud: appId,
                    id_estado_solicitud: 2, // Aprobada
                    fecha_inicio: new Date().toISOString()
                }]);

                // 2. Create Contrato
                const { data: contract, error: cErr } = await window.supabaseClient
                    .from('Contrato')
                    .insert([{
                        id_perfil_propietario: profileId,
                        id_perfil_inquilino: solPerfilId,
                        id_propiedad: solPropId,
                        id_tipo_garantia: 1,
                        "id_Indice": 1,
                        id_moneda: 1,
                        fecha_firma_contrato: todayStr,
                        fecha_inicio_contrato: todayStr,
                        fecha_fin_contrato: nextYearStr,
                        monto_cierre: monthlyRent,
                        periodo_aumento_meses: 3,
                        dia_vencimiento_mensual: 10,
                        alias_cbu: 'HABITAT.ALQUILER.MP'
                    }])
                    .select()
                    .single();

                if (contract && contract.id_contrato) {
                    contractId = `CTR-2026-${String(contract.id_contrato).padStart(4, '0')}`;

                    // Record Historial_Estado_Contrato (1 = Activo)
                    try {
                        await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                            id_contrato: contract.id_contrato,
                            id_estado_contrato: 1,
                            fecha_inicio: new Date().toISOString()
                        }]);
                    } catch (e) { }

                    // Create initial Pago
                    const { data: pago } = await window.supabaseClient
                        .from('Pago')
                        .insert([{
                            id_contrato: contract.id_contrato,
                            id_metodo_pago: 1,
                            monto: monthlyRent,
                            fecha_vencimiento: todayStr,
                            periodo: 'Julio 2026'
                        }])
                        .select()
                        .maybeSingle();

                    if (pago) {
                        try {
                            await window.supabaseClient.from('Historial_pago').insert([{
                                id_pago: pago.id_pago,
                                id_estado_pago: 1, // Pendiente
                                fecha_inicio: new Date().toISOString()
                            }]);
                        } catch (e) { }
                    }
                }

                // 3. Update Propiedad state to 'Alquilada' (id_estado_propiedad = 4)
                try {
                    await window.supabaseClient
                        .from('Propiedad')
                        .update({ id_estado_propiedad: 4 })
                        .eq('id_propiedad', solPropId);

                    await window.supabaseClient.from('Historial_estado_propiedad').insert([{
                        id_propiedad: solPropId,
                        id_estado_propiedad: 4,
                        fecha_inicio: new Date().toISOString()
                    }]);
                } catch (e) { }

                // 4. Update Publicacion state
                const { data: pubData } = await window.supabaseClient
                    .from('Publicacion')
                    .select('id_publicacion')
                    .eq('id_propiedad', solPropId)
                    .maybeSingle();

                if (pubData) {
                    await window.supabaseClient
                        .from('Historial_Estado_Publicacion')
                        .insert([{
                            id_publicacion: pubData.id_publicacion,
                            id_estado_publicacion: 2,
                            fecha_inicio: new Date().toISOString()
                        }]);
                }
            } catch (err) {
                console.error("Error in acceptApplication:", err);
            }
        }

        // Crear objeto de contrato completo con la propiedad real y guardarlo en habitat_contracts
        const todayStr = new Date().toISOString().split('T')[0];
        const nextYearStr = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0];
        const contractObj = {
            id: contractId,
            contractNumber: contractId,
            propertyId: String(appId),
            title: `Contrato de Locación - ${propTitle}`,
            propertyAddress: propAddress,
            propertyCity: 'Buenos Aires',
            propertyImage: photoUrls[0] || 'img/hero-marketplace.jpg',
            propertyPhotos: photoUrls,
            monthlyRent: monthlyRent,
            currency: 'ARS',
            status: 'WAITING_OWNER',
            startDate: todayStr,
            endDate: nextYearStr,
            durationMonths: 24,
            paymentDueDay: 10,
            adjustmentIndex: 'IPC',
            adjustmentFrequencyMonths: 3,
            depositAmount: monthlyRent,
            aliasCbu: 'HABITAT.ALQUILER.MP',
            tenant: {
                role: 'TENANT',
                name: tenantName,
                email: tenantEmail,
                phone: tenantPhone,
                cuil: '20-38491029-4',
                dni: '38.491.029',
                hasSigned: false,
                isKycVerified: true
            },
            owner: {
                role: 'OWNER',
                name: ownerName,
                email: ownerEmail,
                cuil: '27-33918274-8',
                dni: '33.918.274',
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
            const rawContr = localStorage.getItem('habitat_contracts');
            let existingContracts = [];
            if (rawContr) existingContracts = JSON.parse(rawContr);
            existingContracts = existingContracts.filter(c => c && c.id !== contractId);
            existingContracts.unshift(contractObj);
            localStorage.setItem('habitat_contracts', JSON.stringify(existingContracts));
        } catch (e) {}

        // Actualizar copia local en localStorage
        try {
            const raw = localStorage.getItem('habitat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                apps.forEach(a => {
                    if (String(a.id) === String(appId)) {
                        a.status = 'aceptada';
                        a.contract_id = contractId;
                    }
                });
                localStorage.setItem('habitat_tenant_applications', JSON.stringify(apps));
            }
        } catch (e) {}

        // Despachar notificaciones in-app para ambas partes
        if (window.NotificationManager) {
            window.NotificationManager.createNotification({
                title: '¡Postulación Aceptada! Contrato Listo para Firma',
                message: `Has aceptado a ${tenantName} para "${propTitle}". El contrato digital ya está disponible para firmar.`,
                type: 'contract',
                link: `contratos.html?contract=${contractId}&sign=1&role=OWNER`,
                role: 'OWNER'
            });
            window.NotificationManager.createNotification({
                title: '¡Tu postulación fue aprobada por el propietario! 🎉',
                message: `El propietario aprobó tu postulación para "${propTitle}". Ingresa para realizar tu validación biométrica y firmar el contrato digital.`,
                type: 'contract',
                link: `contratos.html?contract=${contractId}&sign=1&role=TENANT`,
                role: 'TENANT'
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
        if (window.supabaseClient && appId) {
            try {
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
            const raw = localStorage.getItem('habitat_tenant_applications');
            if (raw) {
                const apps = JSON.parse(raw);
                apps.forEach(a => {
                    if (String(a.id) === String(appId)) {
                        a.status = 'rechazada';
                        if (a.property_title) propTitle = a.property_title;
                    }
                });
                localStorage.setItem('habitat_tenant_applications', JSON.stringify(apps));
            }
        } catch (e) {}

        if (window.NotificationManager) {
            window.NotificationManager.createNotification({
                title: 'Estado de postulación actualizado',
                message: `El proceso de evaluación para "${propTitle}" ha concluido. Puedes explorar más propiedades disponibles en el Marketplace.`,
                type: 'rejection',
                link: 'index.html',
                role: 'TENANT'
            });
        }

        return { id: appId, status: 'rechazada' };
    },

    // Visitas Programadas
    getVisits: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Visita')
                .select(`
                    *,
                    Propiedad (*),
                    Perfil (*)
                `)
                .order('created_at', { ascending: false });

            if (error) return [];

            return (data || []).map(v => {
                const prop = v.Propiedad || {};
                const perf = v.Perfil || {};
                return {
                    id: v.id_visita,
                    property_id: v.id_propiedad,
                    property_title: `Propiedad en ${prop.calle || 'Visita'}`,
                    property_address: `${prop.calle || 'Dirección'} ${prop.numero || ''}`,
                    visitor_name: v.nombre_visitante || perf.nombre_completo || 'Visitante',
                    visitor_email: v.email_visitante || perf.mail || 'visitante@email.com',
                    visitor_phone: v.telefono_visitante || perf.telefono || '+54 9 11 0000-0000',
                    visit_date: v.fecha_visita?.split('T')[0] || new Date().toISOString().split('T')[0],
                    visit_time: v.hora_visita || '16:00 hs',
                    status: 'programada',
                    created_at: v.created_at
                };
            });
        } catch (e) {
            console.error("Error in getVisits:", e);
            return [];
        }
    },

    scheduleVisit: async function (visitData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();

        const { data, error } = await window.supabaseClient
            .from('Visita')
            .insert([{
                id_perfil: profileId,
                id_propiedad: visitData.propertyId || 1,
                fecha_visita: visitData.visitDate || new Date().toISOString(),
                hora_visita: visitData.visitTime || '16:00 hs',
                nombre_visitante: visitData.visitorName || 'Visitante',
                email_visitante: visitData.visitorEmail || 'visitante@email.com',
                telefono_visitante: visitData.visitorPhone || '+54 9 11 0000-0000'
            }])
            .select()
            .single();

        if (error) {
            console.error("Error scheduling visit:", error);
            throw error;
        }

        try {
            await window.supabaseClient.from('Historial_estado_visita').insert([{
                id_visita: data.id_visita,
                id_estado_visita: 1, // Programada
                fecha_inicio: new Date().toISOString()
            }]);
        } catch (e) { }

        return {
            id: data.id_visita,
            status: 'programada'
        };
    },

    cancelVisit: async function (visitId) {
        if (window.supabaseClient && visitId) {
            try {
                await window.supabaseClient.from('Historial_estado_visita').insert([{
                    id_visita: visitId,
                    id_estado_visita: 3, // Cancelada
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }
        }
        return { id: visitId, status: 'cancelada' };
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

    getOwnerContracts: async function() {
        let contractsList = [];
        // 1. Local contracts
        try {
            const raw = localStorage.getItem('habitat_contracts');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    contractsList = parsed.filter(c => c && c.id && c.tenant?.name !== 'Carlos Gómez' && c.tenant?.name !== 'Lucía Fernández');
                }
            }
        } catch(e) {}

        if (!window.supabaseClient) {
            return contractsList;
        }

        try {
            const { data, error } = await window.supabaseClient
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

                    const cleanAddress = `${prop.calle || 'Calle'} ${prop.numero || ''}${prop.piso_dpto ? ', ' + prop.piso_dpto : ''}, Mendoza`.trim();

                    const inqName = inq.nombre_completo || (inq.nombre && inq.apellido ? `${inq.nombre} ${inq.apellido}` : (inq.mail ? inq.mail.split('@')[0] : 'Inquilino Verificado'));

                    return {
                        id: `CTR-2026-${String(item.id_contrato).padStart(4, '0')}`,
                        dbContractId: item.id_contrato,
                        property_id: item.id_propiedad,
                        property_title: cleanTitle,
                        property_address: cleanAddress,
                        property_image: photos[0] || 'img/hero-marketplace.jpg',
                        photos: photos,
                        monthly_rent: Number(item.monto_cierre || pub?.precio || 380000),
                        expenses_amount: Number(prop.expensas_mensuales || 48000),
                        payment_due_day: item.dia_vencimiento_mensual || 10,
                        punitive_daily_rate: Number(item.tasa_punitoria_diaria || 0.5),
                        adjustment_index: item.indice_ajuste || 'IPC',
                        adjustment_frequency_months: item.periodo_aumento_meses || 3,
                        broker_commission_percent: 4.15,
                        start_date: item.fecha_inicio_contrato || '2026-08-01',
                        end_date: item.fecha_fin_contrato || '2027-08-01',
                        tenant_name: inqName,
                        tenant_email: inq.mail || 'inquilino@habitat.ar',
                        tenant_phone: inq.telefono || '+54 9 261 412-3456',
                        cbu_alias: item.alias_cbu || 'HABITAT.PAGOS.ALQUILER',
                        status: (item.Firma_contrato && item.Firma_contrato.length > 0) ? 'SIGNED_AND_SEALED' : 'ACTIVE'
                    };
                });

                // Combinar sin duplicados
                const combined = [...dbContracts];
                for (const lc of contractsList) {
                    if (!combined.some(c => c.id === lc.id || c.dbContractId === lc.dbContractId)) {
                        combined.push(lc);
                    }
                }
                return combined;
            }
        } catch(e) {
            console.error("Error in getOwnerContracts:", e);
        }

        return contractsList;
    },

    getActiveContract: async function () {
        // 1. Revisar si hay un contrato firmado en habitat_contracts de localStorage
        let localContracts = [];
        try {
            localContracts = JSON.parse(localStorage.getItem('habitat_contracts') || '[]');
        } catch (e) {}

        const activeLocal = localContracts.find(c => c && (c.status === 'SIGNED_AND_SEALED' || c.status === 'WAITING_OWNER' || c.status === 'WAITING_TENANT' || c.tenant?.hasSigned));

        if (!window.supabaseClient) {
            if (activeLocal) return activeLocal;
            return null;
        }

        try {
            // 2. Consultar el contrato más reciente en Supabase con todas las relaciones completas
            const { data, error } = await window.supabaseClient
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
                .order('id_contrato', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!error && data) {
                const prop = data.Propiedad || {};
                const pub = Array.isArray(prop.Publicacion) ? prop.Publicacion[0] : prop.Publicacion;
                const media = pub?.Multimedia || [];
                const photos = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
                const inq = data.Inquilino || {};
                const propOwner = data.Propietario || {};

                // Extraer características de la base de datos
                const dbCaracteristicas = (prop.Propiedad_caracteristica || []).map(pc => pc.Caracteristica?.nombre).filter(Boolean);

                const cleanTitle = pub?.descripcion 
                    ? pub.descripcion.split(' | Detalles: ')[0] 
                    : `Propiedad en ${prop.calle || 'Alquiler'} ${prop.numero || ''}`.trim();

                const cleanAddress = `${prop.calle || 'Calle'} ${prop.numero || ''}${prop.piso_dpto ? ', ' + prop.piso_dpto : ''}, Mendoza`.trim();

                return {
                    id: data.id_contrato,
                    dbContractId: data.id_contrato,
                    contract_number: `CTR-2026-${String(data.id_contrato).padStart(4, '0')}`,
                    property_id: data.id_propiedad,
                    property_title: cleanTitle,
                    property_address: cleanAddress,
                    property_image: photos[0] || 'img/hero-marketplace.jpg',
                    photos: photos,
                    monthly_rent: Number(data.monto_cierre || pub?.precio || 380000),
                    expenses: Number(prop.expensas_mensuales || 48000),
                    m2_cubiertos: prop.superficie_cubierta || 75,
                    m2_totales: prop.superficie_total || 85,
                    ambientes: prop.ambientes || 3,
                    dormitorios: prop.dormitorios || 2,
                    banos: prop.banos || 1,
                    cocheras: prop.cocheras || 1,
                    cochera: prop.cocheras ? `${prop.cocheras} Cubierta fija` : 'Sin cochera',
                    start_date: data.fecha_inicio_contrato || '2026-08-01',
                    end_date: data.fecha_fin_contrato || '2027-08-01',
                    payment_due_day: data.dia_vencimiento_mensual || 10,
                    punitive_daily_rate: Number(data.tasa_punitoria_diaria || 0.5),
                    adjustment_index: data.indice_ajuste || 'IPC',
                    adjustment_frequency_months: data.periodo_aumento_meses || 3,
                    cbu_alias: data.alias_cbu || 'HABITAT.PAGOS.ALQUILER',
                    tenant_name: inq.nombre_completo || (inq.nombre && inq.apellido ? `${inq.nombre} ${inq.apellido}` : 'Inquilino Verificado'),
                    tenant_email: inq.mail || 'inquilino@habitat.ar',
                    tenant_phone: inq.telefono || '+54 9 261 412-3456',
                    landlord_name: propOwner.nombre_completo || (propOwner.nombre && propOwner.apellido ? `${propOwner.nombre} ${propOwner.apellido}` : 'Propietario Verificado'),
                    landlord_email: propOwner.mail || 'propietario@habitat.ar',
                    landlord_phone: propOwner.telefono || '+54 9 261 598-7654',
                    description: pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : 'Propiedad en alquiler administrada bajo contrato digital en Hábitat.',
                    caracteristicas: dbCaracteristicas
                };
            }

            if (activeLocal) return activeLocal;

            return null;
        } catch (e) {
            console.error("Error in getActiveContract:", e);
            return activeLocal || null;
        }
    },

    getCurrentPayment: async function (contractId) {
        // Si no hay cliente o el ID es un mock string como 'cnt-001' (la columna id_contrato en Postgres es numérica), retornar mock
        const isNumeric = contractId !== null && contractId !== undefined && (typeof contractId === 'number' || (typeof contractId === 'string' && /^\d+$/.test(contractId.trim())));
        
        if (!isNumeric) {
            return {
                id: 'pay-' + (contractId || 'current'),
                contract_id: contractId,
                period: 'Julio 2026',
                amount_base: 380000,
                due_date: '2026-07-10',
                status: 'pendiente',
                is_punitive_waived: false
            };
        }

        if (!window.supabaseClient) return null;
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
                    period: 'Julio 2026',
                    amount_base: 380000,
                    due_date: '2026-07-10',
                    status: 'pendiente',
                    is_punitive_waived: false
                };
            }

            return {
                id: data.id_pago,
                contract_id: data.id_contrato,
                period: data.periodo || 'Mes Actual',
                amount_base: data.monto,
                due_date: data.fecha_vencimiento,
                status: data.fecha_pago ? 'pagado' : 'pendiente',
                is_punitive_waived: data.interes_perdonado || false
            };
        } catch (e) {
            return null;
        }
    },

    calculatePunitiveInterests: function (contract, payment) {
        if (!contract || !payment) return { daysLate: 0, dailyRate: 0, punitiveAmount: 0, totalAmount: 0 };
        if (payment.status === 'pagado' || payment.is_punitive_waived) {
            return { daysLate: 0, dailyRate: contract.punitive_daily_rate || 0.5, punitiveAmount: 0, totalAmount: payment.amount_base };
        }

        const today = new Date();
        const dueDate = new Date(payment.due_date);
        const diffTime = today - dueDate;
        const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        if (daysLate <= 0) {
            return { daysLate: 0, dailyRate: contract.punitive_daily_rate || 0.5, punitiveAmount: 0, totalAmount: payment.amount_base };
        }

        const dailyRate = contract.punitive_daily_rate || 0.5;
        const punitiveAmount = Math.round(payment.amount_base * (dailyRate / 100) * daysLate);
        return {
            daysLate,
            dailyRate,
            punitiveAmount,
            totalAmount: payment.amount_base + punitiveAmount
        };
    },

    waivePunitiveInterests: async function (paymentId) {
        if (window.supabaseClient && typeof paymentId === 'number') {
            await window.supabaseClient.from('Pago').update({ interes_perdonado: true }).eq('id_pago', paymentId);
        }
        return { id: paymentId, is_punitive_waived: true };
    },

    markPaymentAsPaid: async function (paymentId, method = 'Transferencia') {
        if (window.supabaseClient && typeof paymentId === 'number') {
            await window.supabaseClient
                .from('Pago')
                .update({ fecha_pago: new Date().toISOString(), id_metodo_pago: 1 })
                .eq('id_pago', paymentId);

            try {
                await window.supabaseClient.from('Historial_pago').insert([{
                    id_pago: paymentId,
                    id_estado_pago: 2, // Pagado
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }
        }
        return { id: paymentId, status: 'pagado', payment_method: method };
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
    getLeads: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Lead_inmobiliario')
                .select('*, Zona_lead(*)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data || []).map(l => ({
                id: `lead-${l.id_lead}`,
                raw_id: l.id_lead,
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
                source: l.origen || 'Hábitat',
                status: l.estado || 'new',
                createdAt: l.created_at ? new Date(l.created_at).toLocaleDateString('es-AR') : 'Reciente',
                notes: Array.isArray(l.notas) ? l.notas : [],
                disputeStatus: l.dispute_status || 'none',
                disputeReason: l.dispute_reason,
                disputeComments: l.dispute_comments
            }));
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
                    estado: 'disputed',
                    dispute_status: 'pending',
                    dispute_reason: reason,
                    dispute_comments: comments
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
    getLatestIndices: async function () {
        const defaults = {
            ipc: { valor: 2.1, fecha: '2026-07-31', tasaSugeridaTrimestral: 7.2, tasaSugeridaSemestral: 14.8 },
            icl: { valor: 35.25, fecha: '2026-08-16', tasaSugeridaTrimestral: 6.8, tasaSugeridaSemestral: 13.9 }
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

            // 2. Obtener los últimos valores de ICL (id_indice = 2)
            const { data: iclRows } = await window.supabaseClient
                .from('Valor_Indice_Mensual')
                .select('*')
                .eq('id_indice', 2)
                .order('fecha_publicacion', { ascending: false })
                .limit(180);

            let ipcResult = defaults.ipc;
            if (ipcRows && ipcRows.length > 0) {
                const latestIpc = ipcRows[0];
                // Calcular acumulado trimestral compuesto (últimos 3 meses)
                let trimestral = 1;
                ipcRows.slice(0, 3).forEach(r => {
                    trimestral *= (1 + Number(r.valor_oficial) / 100);
                });
                const pctTrimestral = Number(((trimestral - 1) * 100).toFixed(1));

                // Calcular acumulado semestral compuesto (últimos 6 meses)
                let semestral = 1;
                ipcRows.slice(0, 6).forEach(r => {
                    semestral *= (1 + Number(r.valor_oficial) / 100);
                });
                const pctSemestral = Number(((semestral - 1) * 100).toFixed(1));

                ipcResult = {
                    valor: Number(latestIpc.valor_oficial),
                    fecha: latestIpc.fecha_publicacion,
                    tasaSugeridaTrimestral: pctTrimestral || 7.2,
                    tasaSugeridaSemestral: pctSemestral || 14.8
                };
            }

            let iclResult = defaults.icl;
            if (iclRows && iclRows.length > 0) {
                const latestIcl = iclRows[0];
                // Calcular variación respecto a hace 90 días (trimestral)
                const row90Days = iclRows[Math.min(90, iclRows.length - 1)];
                const pctIclTrimestral = row90Days && Number(row90Days.valor_oficial) > 0
                    ? Number((((Number(latestIcl.valor_oficial) / Number(row90Days.valor_oficial)) - 1) * 100).toFixed(1))
                    : 6.8;

                const row180Days = iclRows[Math.min(180, iclRows.length - 1)];
                const pctIclSemestral = row180Days && Number(row180Days.valor_oficial) > 0
                    ? Number((((Number(latestIcl.valor_oficial) / Number(row180Days.valor_oficial)) - 1) * 100).toFixed(1))
                    : 13.9;

                iclResult = {
                    valor: Number(latestIcl.valor_oficial),
                    fecha: latestIcl.fecha_publicacion,
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
    getMaintenanceTickets: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Ticket_mantenimiento')
                .select(`
                    *,
                    Estado_ticket (*)
                `)
                .order('created_at', { ascending: false });

            if (error) return [];

            const statusMap = {
                1: 'abierto',
                2: 'en_proceso',
                3: 'resuelto',
                4: 'cerrado',
                5: 'cancelado'
            };

            return (data || []).map(t => {
                const estadoObj = t.Estado_ticket || {};
                const mappedStatus = statusMap[t.id_estado_ticket] || (estadoObj.nombre || '').toLowerCase().replace(/\s+/g, '_') || t.estado || 'abierto';
                return {
                    id: t.id_ticket,
                    contract_id: t.id_contrato,
                    property_address: t.direccion_propiedad || 'Propiedad Alquilada',
                    tenant_name: t.nombre_inquilino || 'Inquilino',
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
                direccion_propiedad: ticketData.propertyAddress || 'Propiedad alquilada',
                nombre_inquilino: ticketData.tenantName || 'Carlos Gómez',
                titulo: ticketData.title || 'Solicitud de reparación',
                categoria: ticketData.category || 'General',
                prioridad: ticketData.priority || 'Media',
                descripcion: ticketData.description || '',
                url_foto: ticketData.photoUrl || null,
                id_estado_ticket: 1, // Abierto
                estado: 'abierto'
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

    // Helper para obtener o resolver el id_perfil del usuario actual o fallback
    _getOrCreateProfile: async function () {
        if (!window.supabaseClient) return null;
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user) {
                const { data: profile } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil')
                    .or(`user_id.eq.${session.user.id},mail.eq.${session.user.email}`)
                    .limit(1)
                    .maybeSingle();

                if (profile && profile.id_perfil) {
                    return profile.id_perfil;
                }

                // Si no existe, insertar perfil
                const { data: newProf } = await window.supabaseClient
                    .from('Perfil')
                    .insert([{
                        user_id: session.user.id,
                        mail: session.user.email,
                        nombre_completo: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                        id_tipo_perfil: session.user.user_metadata?.id_tipo_perfil || 3,
                        cuenta_verificada: true,
                        acepto_terminos: true
                    }])
                    .select('id_perfil')
                    .single();

                if (newProf && newProf.id_perfil) return newProf.id_perfil;
            }

            const { data: firstProf } = await window.supabaseClient
                .from('Perfil')
                .select('id_perfil')
                .order('id_perfil', { ascending: false })
                .limit(1)
                .maybeSingle();

            return firstProf ? firstProf.id_perfil : null;
        } catch (err) {
            console.warn("Error getting profile ID:", err);
            return null;
        }
    },

    // Eventos y Calendario Inmobiliario
    getEvents: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Evento')
                .select(`
                    *,
                    Tipo_evento!fk_evento_tipo (*),
                    Estado_evento!fk_evento_estado (*),
                    Propiedad!fk_evento_propiedad (*)
                `)
                .order('fecha_evento', { ascending: false });

            if (error) {
                console.error("Error fetching Eventos:", error);
                return [];
            }

            return (data || []).map(ev => {
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
        return this.getEvents();
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
    getValuations: async function () {
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Tasacion')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching Tasaciones:", error);
                return [];
            }

            return (data || []).map(v => ({
                id: `TAS-00${v.id_tasacion}`,
                raw_id: v.id_tasacion,
                address: v.direccion,
                type: `${v.tipo_inmueble || 'Departamento'} • ${v.ambientes || 3} Amb • ${v.superficie_m2 || 70} m²`,
                owner: v.nombre_solicitante || 'Propietario Solicitante',
                phone: v.telefono_solicitante || '+54 11 0000-0000',
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
                nombre_solicitante: valData.ownerName || '',
                telefono_solicitante: valData.ownerPhone || '',
                email_solicitante: valData.ownerEmail || '',
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
        if (!window.supabaseClient) return null;
        try {
            let blob = fileOrBase64;
            if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
                blob = base64ToBlob(fileOrBase64);
            }
            if (!blob) return null;

            const ext = blob.name ? blob.name.split('.').pop() : 'jpg';
            const filePath = `avatars/user-${userId || Date.now()}.${ext}`;

            const { data, error } = await window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.FOTOS_DE_PERFIL)
                .upload(filePath, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

            if (error) {
                console.error("Error uploading to fotos_de_perfil:", error);
                return null;
            }

            const { data: urlRes } = window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.FOTOS_DE_PERFIL)
                .getPublicUrl(filePath);

            return urlRes?.publicUrl || null;
        } catch (e) {
            console.error("Exception in uploadProfileAvatar:", e);
            return null;
        }
    },

    uploadInventoryPhotoFile: async function (fileOrBase64, inventoryId, itemId) {
        if (!window.supabaseClient) return null;
        try {
            let blob = fileOrBase64;
            if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('data:')) {
                blob = base64ToBlob(fileOrBase64);
            }
            if (!blob) return null;

            const ext = blob.name ? blob.name.split('.').pop() : 'jpg';
            const filePath = `inv-${inventoryId || 0}/item-${itemId || 0}-${Date.now()}.${ext}`;

            const { data, error } = await window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.INVENTARIO_DIGITAL)
                .upload(filePath, blob, { contentType: blob.type || 'image/jpeg', upsert: true });

            if (error) {
                console.error("Error uploading to inventario_digital:", error);
                return null;
            }

            const { data: urlRes } = window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.INVENTARIO_DIGITAL)
                .getPublicUrl(filePath);

            return urlRes?.publicUrl || null;
        } catch (e) {
            console.error("Exception in uploadInventoryPhotoFile:", e);
            return null;
        }
    },

    uploadRAGDocumentFile: async function (fileOrBlob, documentName) {
        if (!window.supabaseClient) return null;
        try {
            const fileName = documentName || fileOrBlob.name || `doc-${Date.now()}.pdf`;
            const filePath = `rag-docs/${fileName}`;

            const { data, error } = await window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.RAG_DOCUMENTS)
                .upload(filePath, fileOrBlob, { contentType: fileOrBlob.type || 'application/pdf', upsert: true });

            if (error) {
                console.error("Error uploading to rag-documents:", error);
                return null;
            }

            const { data: urlRes } = window.supabaseClient
                .storage
                .from(window.STORAGE_BUCKETS.RAG_DOCUMENTS)
                .getPublicUrl(filePath);

            return urlRes?.publicUrl || null;
        } catch (e) {
            console.error("Exception in uploadRAGDocumentFile:", e);
            return null;
        }
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
        const profileId = await this._getOrCreateProfile();
        
        const payload = {
            id_contrato: Number(idContrato),
            id_perfil: profileId,
            metadata: {
                userAgent: navigator.userAgent,
                geolocation: metadata.geolocation || null,
                screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...metadata
            },
            callbackUrl: callbackUrl || window.location.href
        };

        try {
            const response = await fetch('/api/firmas/iniciar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

    /**
     * Obtiene el estado actual de las firmas registradas para un contrato
     * @param {number|string} idContrato 
     * @returns {Promise<Array>} Lista de firmas con perfiles y estados
     */
    getFirmasContrato: async function (idContrato) {
        if (!window.supabaseClient || !idContrato) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Firma_contrato')
                .select('*, Perfil(*)')
                .eq('id_contrato', Number(idContrato))
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
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
        if (!window.supabaseClient || !idFirma) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from('Firma_contrato')
                .select('*')
                .eq('id_firma', Number(idFirma))
                .single();

            if (error) throw error;
            return data;
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
            const response = await fetch('/api/firmas/sellar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const response = await fetch(`/api/firmas/finalizar?id_contrato=${Number(idContrato)}`);
            const result = await response.json();
            if (!response.ok || !result.ok) {
                throw new Error(result.message || 'Error al consultar documentos del contrato.');
            }
            return result.data;
        } catch (err) {
            console.error("Error en finalizarYObtenerDocumentosContrato:", err);
            throw err;
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
        <div class="relative w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col text-zinc-900 dark:text-white overflow-hidden" onclick="event.stopPropagation()">
            <!-- Header Modal -->
            <div class="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50 dark:bg-zinc-800/50">
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
                <button type="button" onclick="document.getElementById('bcra-indices-table-modal').style.display='none'" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors cursor-pointer shrink-0">
                    <span class="material-symbols-outlined text-base sm:text-lg">close</span>
                </button>
            </div>

            <!-- Tabs Switcher + Filter -->
            <div class="px-4 sm:px-6 py-2.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-zinc-900">
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

            <!-- Table Content Area (Scrollable con margin-top y padding para no chocar) -->
            <div class="flex-grow overflow-y-auto p-4 sm:p-6 mt-1" id="indices-table-container">
                <div class="p-8 text-center text-zinc-400">Cargando registros oficiales...</div>
            </div>

            <!-- Footer Modal -->
            <div class="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40">
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
                const row90 = cachedRows[Math.min(90, cachedRows.length - 1)];
                const pctTrim = row90 && Number(row90.valor_oficial) > 0
                    ? (((Number(latest.valor_oficial) / Number(row90.valor_oficial)) - 1) * 100).toFixed(2)
                    : '6.80';

                const row180 = cachedRows[Math.min(180, cachedRows.length - 1)];
                const pctSem = row180 && Number(row180.valor_oficial) > 0
                    ? (((Number(latest.valor_oficial) / Number(row180.valor_oficial)) - 1) * 100).toFixed(2)
                    : '13.90';

                kpiContainer.innerHTML = `
                    <div class="p-2 sm:p-3 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs flex flex-col justify-between min-w-0">
                        <span class="block text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase truncate">Último ICL</span>
                        <span class="text-xs sm:text-base font-black font-headline font-mono text-primary dark:text-red-400 mt-0.5 truncate">${Number(latest.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <!-- Contenedor Responsivo: Tabla en Desktop y Lista de Tarjetas en Mobile -->
                <div>
                    <!-- Desktop Table (>= 640px) -->
                    <div class="hidden sm:block overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-headline font-extrabold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th class="p-3.5 sm:p-4">Período / Mes</th>
                                    <th class="p-3.5 sm:p-4 text-right">Variación Mensual</th>
                                    <th class="p-3.5 sm:p-4 text-center">Tipo de Registro</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
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

                    <!-- Mobile Cards (< 640px) -->
                    <div class="sm:hidden space-y-2">
                        ${filtered.map(r => `
                            <div class="p-3.5 bg-white dark:bg-zinc-800/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                                    <div class="min-w-0">
                                        <span class="block font-headline font-extrabold text-xs text-zinc-900 dark:text-white truncate">
                                            ${formatBcraMonth(r.fecha_publicacion)}
                                        </span>
                                        <span class="block text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                                            Pub: ${formatBcraDate(r.fecha_publicacion)}
                                        </span>
                                    </div>
                                </div>
                                <div class="text-right shrink-0 flex flex-col items-end gap-1">
                                    <span class="font-headline font-black text-sm text-primary dark:text-red-400 font-mono">
                                        +${Number(r.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40">
                                        Oficial BCRA
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <!-- Contenedor Responsivo: Tabla en Desktop y Lista de Tarjetas en Mobile -->
                <div>
                    <!-- Desktop Table (>= 640px) -->
                    <div class="hidden sm:block overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-headline font-extrabold uppercase text-[10px] tracking-wider">
                                <tr>
                                    <th class="p-3.5 sm:p-4">Fecha</th>
                                    <th class="p-3.5 sm:p-4 text-right">Valor Diario Oficial</th>
                                    <th class="p-3.5 sm:p-4 text-center">Tipo de Registro</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-zinc-200/70 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
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

                    <!-- Mobile Cards (< 640px) -->
                    <div class="sm:hidden space-y-2">
                        ${filtered.map(r => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const isFuture = String(r.fecha_publicacion) > todayStr;
                            return `
                            <div class="p-3.5 bg-white dark:bg-zinc-800/90 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs flex items-center justify-between gap-3">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <span class="w-2.5 h-2.5 rounded-full ${isFuture ? 'bg-amber-500' : 'bg-emerald-500'} shrink-0"></span>
                                    <div class="min-w-0">
                                        <span class="block font-headline font-bold font-mono text-xs text-zinc-900 dark:text-white truncate">
                                            ${formatBcraDate(r.fecha_publicacion)}
                                        </span>
                                        <span class="block text-[10px] text-zinc-400 dark:text-zinc-500">
                                            ${isFuture ? 'Proyección anticipada' : 'Publicación oficial'}
                                        </span>
                                    </div>
                                </div>
                                <div class="text-right shrink-0 flex flex-col items-end gap-1">
                                    <span class="font-headline font-black text-sm text-primary dark:text-red-400 font-mono">
                                        ${Number(r.valor_oficial).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${isFuture ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300/40' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40'}">
                                        ${isFuture ? 'Proyección BCRA' : 'Oficial BCRA'}
                                    </span>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
    };

    window.renderIndicesTableContent(initialTab);
};
