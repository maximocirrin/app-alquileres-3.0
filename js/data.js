/**
 * Data Management Module - Supabase Production Integration
 * Connects all application features to Supabase Postgres DB
 */

// Helper function to convert base64 data URL to Blob for Supabase Storage
window.STORAGE_BUCKETS = {
    PROPIEDADES_MULTIMEDIA: 'propiedades_multimedia',
    FOTOS_DE_PERFIL: 'fotos_de_perfil',
    INVENTARIO_DIGITAL: 'inventario_digital',
    RAG_DOCUMENTS: 'rag-documents'
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

                const photoUrls = media.length > 0 ? media.map(m => m.url_archivo) : ['img/hero-marketplace.jpg'];
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
                const imageUrls = media.length > 0 ? media.map(m => m.url_archivo) : ['img/hero-marketplace.jpg'];
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
        const uploadedMediaItems = [];

        for (let idx = 0; idx < rawPhotos.length; idx++) {
            let item = rawPhotos[idx];
            let publicUrl = null;

            if (item && typeof item === 'object' && !(item instanceof File) && !(item instanceof Blob)) {
                item = item.file || item.blob || item.url || item.src || item.preview || item;
            }

            try {
                if (item instanceof File || item instanceof Blob) {
                    const ext = item.name ? item.name.split('.').pop() : 'jpg';
                    const filePath = `prop-${pubData.id_publicacion}-${Date.now()}-${idx}.${ext}`;
                    const { data: uploadResult, error: uploadErr } = await window.supabaseClient
                        .storage
                        .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                        .upload(filePath, item, { contentType: item.type || 'image/jpeg', upsert: true });

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
                        const filePath = `prop-${pubData.id_publicacion}-${Date.now()}-${idx}.jpg`;
                        const { data: uploadResult, error: uploadErr } = await window.supabaseClient
                            .storage
                            .from(window.STORAGE_BUCKETS.PROPIEDADES_MULTIMEDIA)
                            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

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

            if (publicUrl) {
                uploadedMediaItems.push({
                    id_publicacion: pubData.id_publicacion,
                    id_tipo_multimedia: 1,
                    url_archivo: publicUrl,
                    orden_visualizacion: idx + 1
                });
            }
        }

        if (uploadedMediaItems.length > 0) {
            const { error: mediaErr } = await window.supabaseClient.from('Multimedia').insert(uploadedMediaItems);
            if (mediaErr) {
                console.error("Error inserting Multimedia rows:", mediaErr);
            }
        }

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
        if (!window.supabaseClient) return [];
        try {
            const { data, error } = await window.supabaseClient
                .from('Solicitud')
                .select(`
                    *,
                    Propiedad (*),
                    Perfil (*)
                `)
                .order('fecha_solicitud', { ascending: false });

            if (error) {
                console.error("Error fetching Solicitud:", error);
                return [];
            }

            return (data || []).map(s => {
                const prop = s.Propiedad || {};
                const perf = s.Perfil || {};
                return {
                    id: s.id_solicitud,
                    property_id: s.id_propiedad,
                    property_title: `Propiedad en ${prop.calle || 'Alquiler'} ${prop.numero || ''}`.trim(),
                    property_address: `${prop.calle || 'Dirección'} ${prop.numero || ''}`.trim(),
                    tenant_id: s.id_perfil,
                    tenant_name: perf.nombre_completo || 'Postulante',
                    tenant_email: perf.mail || 'inquilino@email.com',
                    tenant_phone: s.telefono || perf.telefono || '+54 9 11 0000-0000',
                    monthly_income: parseFloat(s.ingreso_mensual_declarado || 0),
                    income_proof: s.comprobante_ingreso || 'Recibo de Sueldo',
                    income_proof_url: '#',
                    message: s.mensaje || 'Interesado en alquilar la propiedad.',
                    status: 'pendiente',
                    created_at: s.fecha_solicitud
                };
            });
        } catch (e) {
            console.error("Error in getApplications:", e);
            return [];
        }
    },

    submitApplication: async function (appData) {
        if (!window.supabaseClient) throw new Error("Supabase client not available");
        const profileId = await DataManager._getOrCreateProfile();

        const { data, error } = await window.supabaseClient
            .from('Solicitud')
            .insert([{
                id_perfil: profileId,
                id_propiedad: appData.propertyId || appData.id_propiedad || 1,
                ingreso_mensual_declarado: parseFloat(appData.declaredIncome || appData.monthly_income || 0),
                mensaje: appData.message || '',
                comprobante_ingreso: appData.incomeProof || 'Comprobante',
                telefono: appData.tenantPhone || '+54 9 11 0000-0000'
            }])
            .select()
            .single();

        if (error) {
            console.error("Error submitting Solicitud:", error);
            throw error;
        }

        try {
            await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                id_solicitud: data.id_solicitud,
                id_estado_solicitud: 1, // Pendiente
                fecha_inicio: new Date().toISOString()
            }]);
        } catch (e) {
            console.warn("Error recording Historial_estado_solicitud:", e);
        }

        return {
            id: data.id_solicitud,
            status: 'pendiente',
            created_at: data.fecha_solicitud
        };
    },

    acceptApplication: async function (appId) {
        if (!window.supabaseClient) return null;
        const profileId = await DataManager._getOrCreateProfile();

        const { data: sol } = await window.supabaseClient
            .from('Solicitud')
            .select('*')
            .eq('id_solicitud', appId)
            .maybeSingle();

        const solPropId = sol?.id_propiedad || 1;
        const solPerfilId = sol?.id_perfil || profileId;

        const todayStr = new Date().toISOString().split('T')[0];
        const nextYearStr = new Date(Date.now() + 86400000 * 365).toISOString().split('T')[0];

        // 1. Record Historial_estado_solicitud (Aprobada = 2)
        try {
            await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                id_solicitud: appId,
                id_estado_solicitud: 2, // Aprobada
                fecha_inicio: new Date().toISOString()
            }]);
        } catch (e) { }

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
                monto_cierre: 380000,
                periodo_aumento_meses: 3,
                dia_vencimiento_mensual: 10,
                alias_cbu: 'HABITAT.ALQUILER.MP'
            }])
            .select()
            .single();

        if (cErr) console.error("Error creating contract:", cErr);

        if (contract) {
            // Record Historial_Estado_Contrato (1 = Activo)
            try {
                await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                    id_contrato: contract.id_contrato,
                    id_estado_contrato: 1,
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }

            // Create initial Pago and record Historial_pago (1 = Pendiente)
            const { data: pago } = await window.supabaseClient
                .from('Pago')
                .insert([{
                    id_contrato: contract.id_contrato,
                    id_metodo_pago: 1,
                    monto: 380000,
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
                id_estado_propiedad: 4, // Alquilada
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

        return { id: appId, status: 'aceptada' };
    },

    rejectApplication: async function (appId) {
        if (window.supabaseClient && appId) {
            try {
                await window.supabaseClient.from('Historial_estado_solicitud').insert([{
                    id_solicitud: appId,
                    id_estado_solicitud: 3, // Rechazada
                    fecha_inicio: new Date().toISOString()
                }]);
            } catch (e) { }
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

    getActiveContract: async function () {
        if (!window.supabaseClient) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from('Contrato')
                .select(`
                    *,
                    Propiedad (*),
                    Perfil!id_perfil_inquilino (*)
                `)
                .limit(1)
                .maybeSingle();

            if (error || !data) {
                return {
                    id: 1,
                    property_title: 'Departamento 3 Ambientes',
                    property_address: 'Av. Santa Fe 2450, Recoleta, CABA',
                    property_image: 'img/hero-marketplace.jpg',
                    tenant_name: 'Carlos Gómez',
                    monthly_rent: 380000,
                    payment_due_day: 10,
                    punitive_daily_rate: 0.5,
                    adjustment_index: 'IPC',
                    cbu_alias: 'HABITAT.RECOLETA.MP'
                };
            }

            const prop = data.Propiedad || {};
            return {
                id: data.id_contrato,
                property_id: data.id_propiedad,
                property_title: `Propiedad en ${prop.calle || 'Alquiler'}`,
                property_address: `${prop.calle || 'Av. Santa Fe'} ${prop.numero || '2450'}`,
                property_image: 'img/hero-marketplace.jpg',
                monthly_rent: data.monto_cierre || 380000,
                payment_due_day: data.dia_vencimiento_mensual || 10,
                punitive_daily_rate: data.tasa_punitoria_diaria || 0.5,
                adjustment_index: data.indice_ajuste || 'IPC',
                cbu_alias: data.alias_cbu || 'HABITAT.RECOLETA.MP'
            };
        } catch (e) {
            console.error("Error in getActiveContract:", e);
            return null;
        }
    },

    getCurrentPayment: async function (contractId) {
        if (!window.supabaseClient) return null;
        try {
            const { data, error } = await window.supabaseClient
                .from('Pago')
                .select('*')
                .eq('id_contrato', contractId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error || !data) {
                return {
                    id: 'pay-current',
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

    createProfessionalConnection: async function (clientId, professionalId) {
        if (!window.supabaseClient) return null;
        try {
            const { data: conn, error } = await window.supabaseClient
                .from('Conexion_profesional')
                .insert([{
                    id_profesional: professionalId,
                    id_cliente: clientId,
                    fecha_conexion: new Date().toISOString()
                }])
                .select()
                .single();

            if (conn) {
                await window.supabaseClient.from('Historial_estado_conexion_profesional').insert([{
                    id_conexion: conn.id_conexion,
                    id_estado_conexion: 1, // Activa
                    fecha_inicio: new Date().toISOString()
                }]);
            }
            return conn;
        } catch (e) {
            console.error("Error creating professional connection:", e);
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

    applyIndexAdjustment: async function (contractId, indexType, frequencyMonths) {
        const rates = { IPC: 12.8, ICL: 10.5 };
        const pct = rates[indexType] || 12.0;

        if (window.supabaseClient && typeof contractId === 'number') {
            const { data: contract } = await window.supabaseClient.from('Contrato').select('monto_cierre').eq('id_contrato', contractId).single();
            if (contract) {
                const newRent = Math.round(contract.monto_cierre * (1 + pct / 100));
                await window.supabaseClient.from('Contrato').update({ monto_cierre: newRent, indice_ajuste: indexType, periodo_ajuste_meses: frequencyMonths }).eq('id_contrato', contractId);
                return { oldRent: contract.monto_cierre, newRent, pct, indexType };
            }
        }
        return { oldRent: 380000, newRent: 428640, pct, indexType };
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
    }
};

window.DataManager = DataManager;
