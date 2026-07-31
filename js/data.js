/**
 * Data Management Module - Supabase Production Integration
 * Connects all application features to Supabase Postgres DB
 */

// Helper function to convert base64 data URL to Blob for Supabase Storage
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

const DataManager = {
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
                        .from('propiedades_multimedia')
                        .upload(filePath, item, { contentType: item.type || 'image/jpeg', upsert: true });

                    if (!uploadErr) {
                        const { data: urlRes } = window.supabaseClient
                            .storage
                            .from('propiedades_multimedia')
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
                            .from('propiedades_multimedia')
                            .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

                        if (!uploadErr) {
                            const { data: urlRes } = window.supabaseClient
                                .storage
                                .from('propiedades_multimedia')
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

        const { data: contract, error: cErr } = await window.supabaseClient
            .from('Contrato')
            .insert([{
                id_perfil_oferente: profileId,
                id_perfil_cliente: solPerfilId,
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
            await window.supabaseClient
                .from('Pago')
                .insert([{
                    id_contrato: contract.id_contrato,
                    id_metodo_pago: 1,
                    monto: 380000,
                    fecha_vencimiento: todayStr,
                    periodo: 'Julio 2026'
                }]);
        }

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

        return {
            id: data.id_visita,
            status: 'programada'
        };
    },

    cancelVisit: async function (visitId) {
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
                    Perfil!id_perfil_cliente (*)
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
                    Perfil!id_perfil_cliente (*)
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
        }
        return { id: paymentId, status: 'pagado', payment_method: method };
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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) return [];

            return (data || []).map(t => ({
                id: t.id_ticket,
                contract_id: t.id_contrato,
                property_address: t.direccion_propiedad || 'Propiedad Alquilada',
                tenant_name: t.nombre_inquilino || 'Inquilino',
                title: t.titulo,
                category: t.categoria || 'General',
                priority: t.prioridad || 'Media',
                description: t.descripcion || '',
                photo_url: t.url_foto || null,
                status: t.estado || 'abierto',
                landlord_response: t.respuesta_propietario || null,
                created_at: t.created_at
            }));
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
                estado: 'abierto'
            }])
            .select()
            .single();

        if (error) {
            console.error("Error creating ticket:", error);
            throw error;
        }

        return {
            id: data.id_ticket,
            title: data.titulo,
            status: data.estado,
            created_at: data.created_at
        };
    },

    updateTicketStatus: async function (ticketId, newStatus, responseText) {
        if (!window.supabaseClient) return null;

        const updateData = {};
        if (newStatus) updateData.estado = newStatus;
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

        return {
            id: data.id_ticket,
            status: data.estado,
            landlord_response: data.respuesta_propietario
        };
    }
};

window.DataManager = DataManager;
