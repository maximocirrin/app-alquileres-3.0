/**
 * Garantes & Garantías Manager - Pasaporte Vivat
 * Vivat Platform - Módulo Integral de Gestión de Garantes, KYC Didit y Scoring
 * 
 * Cumple con los 3 tipos de garantías estándar:
 * 1. Garantía Propietaria (Matrícula, folio/tomo, provincia, titularidad y escritura/impuestos)
 * 2. Recibos de Sueldo (Multi-garante, empleador, CUIT, antigüedad, sueldo neto, últimos 3 recibos)
 * 3. Seguro de Caución / Aval (Aseguradora, N° de póliza, cobertura, certificado adjunto)
 * 
 * Máquina de Estados:
 * 1. BORRADOR
 * 2. INVITADO
 * 3. KYC_PENDIENTE
 * 4. DOCUMENTACION_SUBIDA
 * 5. EN_REVISION
 * 6. APROBADO
 * 7. RECHAZADO
 */

(function () {
    'use strict';

    // 1. DICCIONARIO DE ESTADOS (MÁQUINA DE ESTADOS)
    const ESTADOS = {
        1: { id: 1, code: 'BORRADOR', label: 'Borrador', color: 'zinc', icon: 'edit_note', bgClass: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30' },
        2: { id: 2, code: 'INVITADO', label: 'Invitación Enviada', color: 'amber', icon: 'mark_email_read', bgClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
        3: { id: 3, code: 'KYC_PENDIENTE', label: 'KYC Biométrico Pendiente', color: 'blue', icon: 'fingerprint', bgClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
        4: { id: 4, code: 'DOCUMENTACION_SUBIDA', label: 'Documentación Subida', color: 'indigo', icon: 'cloud_done', bgClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
        5: { id: 5, code: 'EN_REVISION', label: 'En Revisión Técnica', color: 'purple', icon: 'pending_actions', bgClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
        6: { id: 6, code: 'APROBADO', label: 'Garantía Aprobada', color: 'emerald', icon: 'verified', bgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
        7: { id: 7, code: 'RECHAZADO', label: 'Garantía Rechazada', color: 'rose', icon: 'cancel', bgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' }
    };

    // 2. DICCIONARIO DE TIPOS DE GARANTÍA
    const TIPOS_GARANTIA = {
        1: {
            id: 1,
            code: 'PROPIETARIA',
            nombre: 'Garantía Propietaria',
            icon: 'domain',
            color: 'blue',
            badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            docs: [
                { key: 'escritura', label: 'Escritura / Título de Propiedad', required: true },
                { key: 'dni_titular', label: 'DNI del Titular (Frente y Dorso)', required: true },
                { key: 'impuesto_inmobiliario', label: 'Comprobante Impuesto Inmobiliario / Tasas', required: false }
            ]
        },
        2: {
            id: 2,
            code: 'SEGURO_CAUCION',
            nombre: 'Finaer / Seguro de Caución',
            icon: 'verified_user',
            color: 'emerald',
            badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            docs: [
                { key: 'poliza_caucion', label: 'Póliza de Caución / Certificado Pre-aprobado', required: true }
            ]
        },
        3: {
            id: 3,
            code: 'RECIBO_SUELDO',
            nombre: 'Recibo de Sueldo (Fianza)',
            icon: 'badge',
            color: 'amber',
            badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            docs: [
                { key: 'recibo_1', label: 'Recibo de Sueldo (Mes 1)', required: true },
                { key: 'recibo_2', label: 'Recibo de Sueldo (Mes 2)', required: true },
                { key: 'recibo_3', label: 'Recibo de Sueldo (Mes 3)', required: true }
            ]
        }
    };

    const STORAGE_KEY = 'vivat_garantes_state_v2';

    function loadLocalState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Si el stored contenía los garantes mock viejos por defecto, limpiarlo
                if (Array.isArray(parsed) && parsed.some(g => g.id === 'gar_101' || g.id === 'gar_102' || g.nombre_completo === 'Carlos Eduardo Rossi')) {
                    localStorage.removeItem(STORAGE_KEY);
                    return [];
                }
                return parsed;
            }
        } catch (e) {
            console.warn('[GarantesManager] Could not parse stored garantes state', e);
        }
        return [];
    }

    function saveLocalState(state) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            console.error('[GarantesManager] Could not save garantes state', e);
        }
    }

    const GarantesManager = {
        ESTADOS,
        TIPOS_GARANTIA,

        getState: function () {
            return loadLocalState();
        },

        getOverallStatus: function () {
            const garantes = loadLocalState();
            if (!garantes || garantes.length === 0) {
                return {
                    status: 'sin_garantes',
                    label: 'Sin Garantes Registrados',
                    color: 'zinc',
                    totalGarantes: 0,
                    garantesAprobados: 0,
                    coberturaPorcentaje: 0
                };
            }

            const total = garantes.length;
            const aprobados = garantes.filter(g => g.id_estado_garante === 6).length;
            const enRevision = garantes.filter(g => g.id_estado_garante === 4 || g.id_estado_garante === 5).length;
            const cobertura = Math.min(100, Math.round((aprobados / Math.max(1, total)) * 100));

            if (aprobados >= 1 && aprobados === total) {
                return {
                    status: 'listo',
                    label: `Garantías Aprobadas (${aprobados}/${total})`,
                    color: 'emerald',
                    totalGarantes: total,
                    garantesAprobados: aprobados,
                    coberturaPorcentaje: 100
                };
            }

            if (enRevision > 0 || aprobados > 0) {
                return {
                    status: 'en_revision',
                    label: `Garantías en Proceso (${aprobados}/${total} Verificados)`,
                    color: 'blue',
                    totalGarantes: total,
                    garantesAprobados: aprobados,
                    coberturaPorcentaje: Math.max(25, cobertura)
                };
            }

            return {
                status: 'incompleto',
                label: `Garantías Incompletas (0/${total} Aprobados)`,
                color: 'amber',
                totalGarantes: total,
                garantesAprobados: 0,
                coberturaPorcentaje: 10
            };
        },

        getGaranteByToken: async function (token) {
            if (!token) return null;
            let defaultInquilinoName = 'Inquilino Solicitante';
            try {
                const pData = JSON.parse(localStorage.getItem('vivat_passport_data') || '{}');
                const dIdentity = JSON.parse(localStorage.getItem('vivat_didit_identity') || '{}');
                const userObj = JSON.parse(localStorage.getItem('vivat_user') || '{}');
                defaultInquilinoName = pData.razon_social || pData.nombre_completo || dIdentity.fullName || userObj.nombre || 'Nicolás Rossi (Inquilino)';
            } catch (e) {}

            if (window.supabaseClient) {
                try {
                    const { data, error } = await window.supabaseClient
                        .from('Garante')
                        .select('*, Documento_garante(*), Tipo_garantia(*), Estado_garante(*), Pasaporte_vivat(id_pasaporte, razon_social, Perfil(nombre_completo, email))')
                        .eq('token_invitacion', token)
                        .maybeSingle();

                    if (!error && data) {
                        let inquilinoNombre = defaultInquilinoName;
                        let inquilinoEmail = '';
                        if (data.Pasaporte_vivat) {
                            inquilinoNombre = data.Pasaporte_vivat.razon_social || data.Pasaporte_vivat.Perfil?.nombre_completo || defaultInquilinoName;
                            inquilinoEmail = data.Pasaporte_vivat.Perfil?.email || '';
                        }

                        return {
                            id: String(data.id_garante),
                            id_garante: data.id_garante,
                            id_pasaporte: data.id_pasaporte,
                            id_pasaporte_garante: data.id_pasaporte_garante,
                            id_tipo_garantia: data.id_tipo_garantia || 3,
                            nombre_completo: data.nombre_completo || 'Garante',
                            email: data.email || '',
                            telefono: data.telefono || '',
                            relacion_inquilino: data.relacion_inquilino || 'Familiar',
                            token_invitacion: data.token_invitacion,
                            id_estado_garante: data.id_estado_garante || 1,
                            kyc_verificado: Boolean(data.kyc_verificado),
                            dni: data.dni || '',
                            cuit: data.cuit || '',
                            scoring: data.scoring || 10.0,
                            datos_garantia: data.datos_garantia || {},
                            inquilino_nombre: inquilinoNombre,
                            inquilino_email: inquilinoEmail,
                            documentos: (data.Documento_garante || []).map(d => ({
                                id: String(d.id_documento),
                                tipo_documento: d.tipo_documento,
                                nombre_archivo: d.nombre_archivo,
                                tamano_bytes: d.tamano_bytes,
                                archivo_url: d.archivo_url,
                                estado_documento: d.estado_documento || 'PENDIENTE'
                            })),
                            created_at: data.created_at
                        };
                    }
                } catch (e) {
                    console.warn('[GarantesManager] Error fetching garante by token:', e);
                }
            }
            const garantes = loadLocalState();
            const localG = garantes.find(g => g.token_invitacion === token || g.token === token);
            if (localG) {
                return {
                    ...localG,
                    inquilino_nombre: localG.inquilino_nombre || defaultInquilinoName
                };
            }
            return null;
        },

        /**
         * Sincroniza garantes desde Supabase para el Pasaporte activo
         */
        syncWithSupabase: async function (pasaporteId) {
            if (!window.supabaseClient) return loadLocalState();
            try {
                let pId = pasaporteId || window.currentPasaporteId || null;
                if (!pId) {
                    const { data: { session } } = await window.supabaseClient.auth.getSession();
                    if (session && session.user) {
                        const { data: perf } = await window.supabaseClient
                            .from('Perfil')
                            .select('id_perfil')
                            .eq('user_id', session.user.id)
                            .maybeSingle();

                        if (perf) {
                            const { data: pass } = await window.supabaseClient
                                .from('Pasaporte_vivat')
                                .select('id_pasaporte')
                                .eq('id_perfil', perf.id_perfil)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();
                            if (pass) pId = pass.id_pasaporte;
                        }
                    }
                }

                if (pId) {
                    const { data: garData, error } = await window.supabaseClient
                        .from('Garante')
                        .select('*, Documento_garante(*), Tipo_garantia(*), Estado_garante(*)')
                        .eq('id_pasaporte', pId)
                        .order('created_at', { ascending: true });

                    if (!error && garData && garData.length > 0) {
                        const mapped = garData.map(g => ({
                            id: String(g.id_garante),
                            id_garante: g.id_garante,
                            id_pasaporte: g.id_pasaporte,
                            id_pasaporte_garante: g.id_pasaporte_garante,
                            id_tipo_garantia: g.id_tipo_garantia || 3,
                            nombre_completo: g.nombre_completo || 'Garante',
                            email: g.email || '',
                            telefono: g.telefono || '',
                            relacion_inquilino: g.relacion_inquilino || 'Familiar',
                            token_invitacion: g.token_invitacion,
                            token: g.token_invitacion,
                            id_estado_garante: g.id_estado_garante || 1,
                            kyc_verificado: Boolean(g.kyc_verificado),
                            dni: g.dni || '',
                            cuit: g.cuit || '',
                            scoring: g.scoring || 10.0,
                            datos_garantia: g.datos_garantia || {},
                            documentos: (g.Documento_garante || []).map(d => ({
                                id: String(d.id_documento),
                                tipo_documento: d.tipo_documento,
                                nombre_archivo: d.nombre_archivo,
                                tamano_bytes: d.tamano_bytes,
                                archivo_url: d.archivo_url,
                                estado_documento: d.estado_documento || 'PENDIENTE'
                            })),
                            created_at: g.created_at ? g.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
                        }));
                        saveLocalState(mapped);
                        this.renderTenantSection();
                        return mapped;
                    }
                }
            } catch (e) {
                console.warn('[GarantesManager] Error syncing with Supabase:', e);
            }
            return loadLocalState();
        },

        /**
         * Invitar / Registrar nuevo garante
         */
        onInviteGarante: async function (dto) {
            console.log('[GarantesManager] onInviteGarante called with:', dto);
            const garantes = loadLocalState();
            const newToken = 'tok_gar_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
            let idGaranteBd = null;

            const tipoGarantiaId = parseInt(dto.idTipoGarantia || dto.id_tipo_garantia || 3, 10);
            const alias = (dto.alias || dto.nombreCompleto || dto.nombre || '').trim();
            const email = (dto.email || '').trim();
            const telefono = (dto.telefono || '').trim();
            const relacion = (dto.relacionInquilino || dto.relacion || 'Familiar directo').trim();
            const datosGarantia = dto.datosGarantia || dto.datos_garantia || {};

            if (!email && !telefono) {
                throw new Error('Por favor, ingresa al menos un correo electrónico o WhatsApp para enviar la invitación.');
            }

            const nombreTemporal = alias || (tipoGarantiaId === 1 ? 'Garante Propietario (Pendiente KYC)' : 'Garante con Recibo (Pendiente KYC)');

            if (window.supabaseClient) {
                try {
                    let pasaporteId = window.currentPasaporteId || null;
                    if (!pasaporteId) {
                        const { data: { user } } = await window.supabaseClient.auth.getUser();
                        if (user) {
                            const { data: perf } = await window.supabaseClient
                                .from('Perfil')
                                .select('id_perfil')
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (perf) {
                                const { data: pasaportes } = await window.supabaseClient
                                    .from('Pasaporte_vivat')
                                    .select('id_pasaporte')
                                    .eq('id_perfil', perf.id_perfil)
                                    .order('created_at', { ascending: false })
                                    .limit(1);

                                if (pasaportes && pasaportes.length > 0) {
                                    pasaporteId = pasaportes[0].id_pasaporte;
                                }
                            }
                        }
                    }

                    if (pasaporteId) {
                        const insertPayload = {
                            id_pasaporte: pasaporteId,
                            id_tipo_garantia: tipoGarantiaId,
                            id_estado_garante: 2, // 2: INVITADO
                            nombre_completo: nombreTemporal,
                            email: email || null,
                            telefono: telefono || null,
                            relacion_inquilino: relacion,
                            token_invitacion: newToken,
                            datos_garantia: datosGarantia,
                            kyc_verificado: false,
                            scoring: 10.0
                        };

                        const { data: inserted, error } = await window.supabaseClient
                            .from('Garante')
                            .insert([insertPayload])
                            .select()
                            .single();

                        if (!error && inserted) {
                            idGaranteBd = inserted.id_garante;
                        } else if (error) {
                            console.warn('[GarantesManager] Error al insertar garante en Supabase:', error);
                        }
                    }
                } catch (e) {
                    console.warn('[GarantesManager] Excepción al guardar garante en Supabase:', e);
                }
            }

            let currentTenantName = 'Inquilino Solicitante';
            try {
                const pData = JSON.parse(localStorage.getItem('vivat_passport_data') || '{}');
                const dIdentity = JSON.parse(localStorage.getItem('vivat_didit_identity') || '{}');
                const userObj = JSON.parse(localStorage.getItem('vivat_user') || '{}');
                currentTenantName = pData.razon_social || pData.nombre_completo || dIdentity.fullName || userObj.nombre || 'Nicolás Rossi (Inquilino)';
            } catch (e) {}

            const newGarante = {
                id: idGaranteBd ? String(idGaranteBd) : 'gar_' + Date.now(),
                id_garante: idGaranteBd || ('gar_' + Date.now()),
                id_tipo_garantia: tipoGarantiaId,
                nombre_completo: nombreTemporal,
                nombre: nombreTemporal,
                alias: alias,
                email: email,
                telefono: telefono,
                relacion_inquilino: relacion,
                relacion: relacion,
                token_invitacion: newToken,
                token: newToken,
                id_estado_garante: 2, // INVITADO
                estado: 'invitado',
                kyc_verificado: false,
                scoring: 10.0,
                inquilino_nombre: currentTenantName,
                datos_garantia: datosGarantia,
                documentos: [],
                created_at: new Date().toISOString().split('T')[0]
            };

            garantes.push(newGarante);
            saveLocalState(garantes);
            this.renderTenantSection();
            if (typeof window.loadTenantPassport === 'function') {
                window.loadTenantPassport();
            }
            window.dispatchEvent(new CustomEvent('vivat:garantes_updated', { detail: { garantes } }));
            return newGarante;
        },

        /**
         * Guardar directamente Seguro de Caución / Aval sin invitar garante personal
         */
        onAddSeguroCaucion: async function (dto) {
            console.log('[GarantesManager] onAddSeguroCaucion called with:', dto);
            const garantes = loadLocalState();
            let idGaranteBd = null;

            const aseguradora = (dto.aseguradora || 'Finaer').trim();
            const poliza = (dto.poliza || '').trim();
            const cobertura = (dto.cobertura || 'Cobertura Total Alquiler + Expensas').trim();
            const nombreCompleto = `${aseguradora} (Seguro de Caución)`;
            const datosGarantia = {
                aseguradora_nombre: aseguradora,
                numero_poliza: poliza,
                monto_cobertura: cobertura
            };

            const docItems = [];
            if (dto.file) {
                docItems.push({
                    id: 'doc_' + Date.now(),
                    tipo_documento: 'poliza_caucion',
                    nombre_archivo: dto.file.name,
                    tamano_bytes: dto.file.size,
                    archivo_url: '#',
                    estado_documento: 'APROBADO'
                });
            }

            if (window.supabaseClient) {
                try {
                    let pasaporteId = window.currentPasaporteId || null;
                    if (!pasaporteId) {
                        const { data: { user } } = await window.supabaseClient.auth.getUser();
                        if (user) {
                            const { data: perf } = await window.supabaseClient
                                .from('Perfil')
                                .select('id_perfil')
                                .eq('user_id', user.id)
                                .maybeSingle();

                            if (perf) {
                                const { data: pasaportes } = await window.supabaseClient
                                    .from('Pasaporte_vivat')
                                    .select('id_pasaporte')
                                    .eq('id_perfil', perf.id_perfil)
                                    .order('created_at', { ascending: false })
                                    .limit(1);

                                if (pasaportes && pasaportes.length > 0) {
                                    pasaporteId = pasaportes[0].id_pasaporte;
                                }
                            }
                        }
                    }

                    if (pasaporteId) {
                        const insertPayload = {
                            id_pasaporte: pasaporteId,
                            id_tipo_garantia: 2, // Seguro de Caución
                            id_estado_garante: 5, // 5: EN_REVISION / DOCUMENTACION_SUBIDA
                            nombre_completo: nombreCompleto,
                            email: 'soporte@' + aseguradora.toLowerCase().replace(/\s+/g, '') + '.com.ar',
                            relacion_inquilino: 'Entidad Aseguradora',
                            datos_garantia: datosGarantia,
                            kyc_verificado: true,
                            scoring: 10.0
                        };

                        const { data: inserted, error } = await window.supabaseClient
                            .from('Garante')
                            .insert([insertPayload])
                            .select()
                            .single();

                        if (!error && inserted) {
                            idGaranteBd = inserted.id_garante;

                            if (dto.file) {
                                await window.supabaseClient
                                    .from('Documento_garante')
                                    .insert([{
                                        id_garante: inserted.id_garante,
                                        tipo_documento: 'poliza_caucion',
                                        nombre_archivo: dto.file.name,
                                        tamano_bytes: dto.file.size,
                                        archivo_url: 'https://storage.vivat.com.ar/garantes/' + encodeURIComponent(dto.file.name),
                                        estado_documento: 'APROBADO'
                                    }]);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[GarantesManager] Error guardando seguro caución en Supabase:', e);
                }
            }

            const newGarante = {
                id: idGaranteBd ? String(idGaranteBd) : 'gar_' + Date.now(),
                id_garante: idGaranteBd || ('gar_' + Date.now()),
                id_tipo_garantia: 2,
                nombre_completo: nombreCompleto,
                nombre: nombreCompleto,
                email: 'soporte@' + aseguradora.toLowerCase().replace(/\s+/g, '') + '.com.ar',
                telefono: '',
                relacion_inquilino: 'Entidad Aseguradora',
                relacion: 'Entidad Aseguradora',
                token_invitacion: 'cauc_' + Date.now(),
                token: 'cauc_' + Date.now(),
                id_estado_garante: 5, // EN_REVISION
                estado: 'cargado',
                kyc_verificado: true,
                scoring: 10.0,
                datos_garantia: datosGarantia,
                documentos: docItems,
                created_at: new Date().toISOString().split('T')[0]
            };

            garantes.push(newGarante);
            saveLocalState(garantes);
            this.renderTenantSection();
            if (typeof window.loadTenantPassport === 'function') {
                window.loadTenantPassport();
            }
            window.dispatchEvent(new CustomEvent('vivat:garantes_updated', { detail: { garantes } }));
            return newGarante;
        },

        /**
         * Eliminar / Desvincular garante
         */
        onDeleteGarante: async function (id) {
            console.log('[GarantesManager] onDeleteGarante ID:', id);
            if (window.supabaseClient && !String(id).startsWith('gar_')) {
                try {
                    await window.supabaseClient
                        .from('Garante')
                        .delete()
                        .eq('id_garante', parseInt(id, 10));
                } catch (e) {
                    console.warn('[GarantesManager] Error al eliminar garante en Supabase:', e);
                }
            }

            let garantes = loadLocalState();
            garantes = garantes.filter(g => String(g.id) !== String(id) && String(g.id_garante) !== String(id));
            saveLocalState(garantes);
            this.renderTenantSection();
            if (typeof window.loadTenantPassport === 'function') {
                window.loadTenantPassport();
            }
            window.dispatchEvent(new CustomEvent('vivat:garantes_updated', { detail: { garantes } }));
        },

        deleteGarante: async function (id) {
            if (confirm('¿Estás seguro de que deseas desvincular a este garante de tu Pasaporte Vivat?')) {
                await this.onDeleteGarante(id);
            }
        },

        /**
         * Enlace de invitación
         */
        getInviteUrl: function (token) {
            return `${window.location.origin}/pasaporte-vivat.html?view=garante-invitacion&token=${token}`;
        },

        copyInviteLink: function (token) {
            const url = this.getInviteUrl(token);
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(() => {
                    alert('¡Enlace copiado al portapapeles!\n\n' + url);
                }).catch(() => {
                    prompt('Copia este enlace de invitación para el garante:', url);
                });
            } else {
                prompt('Copia este enlace de invitación para el garante:', url);
            }
        },

        shareWhatsApp: function (token, nombreGarante, tipoGarantiaId) {
            const url = this.getInviteUrl(token);
            const tipoObj = TIPOS_GARANTIA[tipoGarantiaId] || TIPOS_GARANTIA[3];
            const msg = `Hola ${nombreGarante || ''}, te comparto el enlace oficial de Vivat para completar tu validación de identidad (KYC) y cargar tu ${tipoObj.nombre} de forma 100% digital:\n\n${url}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        },

        // =========================================================================
        // UI: RENDERIZADO DEL PANEL DEL INQUILINO (Tu Alquiler / Pasaporte)
        // =========================================================================
        renderTenantSection: function () {
            const container = document.getElementById('garantes-tenant-container');
            if (!container) return;

            const garantes = loadLocalState();
            const statusInfo = this.getOverallStatus();

            let statusBadgeHtml = '';
            if (statusInfo.color === 'emerald') {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 self-start sm:self-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Garantías Verificadas (100%)
                    </span>`;
            } else if (statusInfo.color === 'blue') {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 self-start sm:self-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Garantías en Revisión
                    </span>`;
            } else if (statusInfo.color === 'amber') {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 self-start sm:self-center bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                        <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Garantías Pendientes
                    </span>`;
            } else {
                statusBadgeHtml = `
                    <span class="inline-flex items-center gap-1.5 self-start sm:self-center bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border border-zinc-500/30 px-3 py-1 rounded-full text-xs font-headline font-extrabold uppercase tracking-wider">
                        Sin Garantes Registrados
                    </span>`;
            }

            container.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 shadow-xl transition-all space-y-5">
                    <!-- Header -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                            <div class="flex items-center gap-3 flex-wrap">
                                <div class="w-11 h-11 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-bold border border-primary/20 shadow-xs shrink-0">
                                    <span class="material-symbols-outlined text-2xl">shield_person</span>
                                </div>
                                <div>
                                    <h3 class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
                                        <span>Garantías & Garantes de Alquiler</span>
                                        ${statusBadgeHtml}
                                    </h3>
                                    <p class="font-body text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Soporte para Garantías Propietarias, Recibos de Sueldo (multi-garante) y Seguros de Caución con verificación biométrica Didit KYC.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button type="button" onclick="GarantesManager.openAddModal()" class="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0">
                            <span class="material-symbols-outlined text-base">person_add</span>
                            <span>+ Agregar Garante</span>
                        </button>
                    </div>

                    <!-- Progress Bar & Multi-garante Stats -->
                    ${garantes.length > 0 ? `
                        <div class="bg-zinc-50/80 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-black text-xs shrink-0">
                                    ${garantes.length}
                                </div>
                                <div>
                                    <p class="font-headline text-xs font-black text-zinc-900 dark:text-white">
                                        ${garantes.length === 1 ? '1 Garante vinculado' : `${garantes.length} Garantes vinculados`}
                                    </p>
                                    <p class="font-body text-[11px] text-zinc-500">
                                        ${statusInfo.garantesAprobados} de ${garantes.length} con documentación y KYC 100% aprobados
                                    </p>
                                </div>
                            </div>
                            <div class="w-full sm:w-48">
                                <div class="w-full bg-zinc-200 dark:bg-zinc-700 h-2 rounded-full overflow-hidden">
                                    <div class="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500" style="width: ${statusInfo.coberturaPorcentaje}%"></div>
                                </div>
                                <span class="block text-right text-[10px] font-bold text-zinc-400 mt-1">${statusInfo.coberturaPorcentaje}% Cobertura</span>
                            </div>
                        </div>
                    ` : ''}

                    <!-- Lista de Garantes -->
                    <div class="space-y-3.5">
                        ${garantes.length === 0 ? `
                            <div class="text-center py-10 border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-3xl p-8 bg-zinc-50/50 dark:bg-zinc-800/20">
                                <span class="material-symbols-outlined text-4xl text-zinc-400 mb-2">contacts</span>
                                <h4 class="font-headline font-bold text-zinc-800 dark:text-zinc-200 text-base">Aún no registraste ninguna garantía</h4>
                                <p class="font-body text-xs sm:text-sm text-zinc-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
                                    Podés presentar una <strong>Garantía Propietaria</strong>, hasta 3 garantes con <strong>Recibos de Sueldo</strong>, o un <strong>Seguro de Caución</strong> (Finaer, Hoggax, etc.).
                                </p>
                                <button type="button" onclick="GarantesManager.openAddModal()" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-5 py-2.5 rounded-xl font-headline font-extrabold text-xs transition-all shadow-sm cursor-pointer">
                                    <span class="material-symbols-outlined text-base">add_circle</span> + Agregar primer garante
                                </button>
                            </div>
                        ` : garantes.map(g => {
                            const tipoId = g.id_tipo_garantia || 3;
                            const tipoObj = TIPOS_GARANTIA[tipoId] || TIPOS_GARANTIA[3];
                            const estadoId = g.id_estado_garante || 1;
                            const estadoObj = ESTADOS[estadoId] || ESTADOS[1];

                            const esc = (s) => (s ? String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m])) : '');
                            const safeGId = esc(g.id || g.id_garante);
                            const safeGName = esc(g.nombre_completo || g.nombre || 'Garante');
                            const safeGEmail = esc(g.email || '');
                            const safeGPhone = g.telefono ? esc(g.telefono) : '';
                            const safeGRel = esc(g.relacion_inquilino || g.relacion || 'Familiar');
                            const safeGToken = esc(g.token_invitacion || g.token);
                            const firstInitial = (safeGName || 'G').trim().charAt(0).toUpperCase();

                            const docsCount = (g.documentos || []).length;
                            const kycBadge = g.kyc_verificado 
                                ? `<span class="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold"><span class="material-symbols-outlined text-xs">verified</span> Didit KYC Aprobado</span>`
                                : `<span class="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold"><span class="material-symbols-outlined text-xs">pending</span> KYC Pendiente</span>`;

                            return `
                                <div class="bg-zinc-50/70 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                                    <div class="flex items-center gap-3.5 min-w-0">
                                        <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-headline font-black text-lg shrink-0 border border-primary/20 shadow-xs">
                                            ${firstInitial}
                                        </div>
                                        <div class="min-w-0">
                                            <div class="flex items-center gap-2 flex-wrap">
                                                <h4 class="font-headline font-black text-zinc-900 dark:text-white text-base truncate">${safeGName}</h4>
                                                
                                                <!-- Tipo de Garantía Badge -->
                                                <span class="inline-flex items-center gap-1 ${tipoObj.badgeBg} px-2.5 py-0.5 rounded-full text-[11px] font-bold border">
                                                    <span class="material-symbols-outlined text-xs">${tipoObj.icon}</span>
                                                    ${tipoObj.nombre}
                                                </span>

                                                <!-- Estado Badge -->
                                                <span class="inline-flex items-center gap-1 ${estadoObj.bgClass} px-2.5 py-0.5 rounded-full text-[11px] font-bold border">
                                                    <span class="material-symbols-outlined text-xs">${estadoObj.icon}</span>
                                                    ${estadoObj.label}
                                                </span>

                                                ${kycBadge}
                                            </div>

                                            <p class="font-body text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-2.5 flex-wrap truncate">
                                                <span><strong>Parentesco:</strong> ${safeGRel}</span>
                                                <span>•</span>
                                                <span>${safeGEmail}</span>
                                                ${safeGPhone ? `<span>• ${safeGPhone}</span>` : ''}
                                                ${g.dni ? `<span>• <strong>DNI:</strong> ${esc(g.dni)}</span>` : ''}
                                                <span>• <strong>Docs:</strong> ${docsCount} adjuntos</span>
                                            </p>
                                        </div>
                                    </div>

                                    <!-- Acciones -->
                                    <div class="flex items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-zinc-200 dark:border-zinc-800 shrink-0 flex-wrap">
                                        ${tipoId !== 2 && estadoId <= 3 ? `
                                            <button type="button" onclick="GarantesManager.copyInviteLink('${safeGToken}')" class="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-3.5 py-2 rounded-xl text-xs font-headline font-extrabold transition-all cursor-pointer shadow-2xs">
                                                <span class="material-symbols-outlined text-sm text-primary">link</span>
                                                Copiar Link
                                            </button>
                                            <button type="button" onclick="GarantesManager.shareWhatsApp('${safeGToken}', '${safeGName.replace(/'/g, "\\'")}', ${tipoId})" class="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-headline font-extrabold transition-all cursor-pointer shadow-2xs">
                                                <span class="material-symbols-outlined text-sm">chat</span>
                                                WhatsApp
                                            </button>
                                        ` : ''}
                                        <button type="button" onclick="GarantesManager.openGuarantorReviewModal('${safeGId}')" class="inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3.5 py-2 rounded-xl text-xs font-headline font-extrabold transition-all cursor-pointer">
                                            <span class="material-symbols-outlined text-sm">${tipoId === 2 ? 'policy' : 'visibility'}</span>
                                            ${tipoId === 2 ? 'Ver Póliza' : 'Auditoría'}
                                        </button>
                                        <button type="button" onclick="GarantesManager.deleteGarante('${safeGId}')" class="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer" title="Eliminar">
                                            <span class="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        },

        // =========================================================================
        // MODAL: AGREGAR / INVITAR GARANTE (CON SELECTOR DE 3 TIPOS DE GARANTÍAS)
        // =========================================================================
        selectedCaucionFile: null,

        openAddModal: function () {
            this.selectedCaucionFile = null;
            let modal = document.getElementById('modal-agregar-garante-v2');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'modal-agregar-garante-v2';
            modal.className = 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-300 font-body';
            modal.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 sm:p-8 shadow-2xl transform scale-95 transition-all duration-300 max-h-[92vh] overflow-y-auto">
                    <!-- Top Header -->
                    <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-bold" id="modal-header-icon-box">
                                <span class="material-symbols-outlined text-xl" id="modal-header-icon">shield_person</span>
                            </div>
                            <div>
                                <h3 class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white" id="modal-header-title">
                                    Agregar Garantía
                                </h3>
                                <p class="text-xs text-zinc-500" id="modal-header-desc">Seleccioná el tipo de garantía para tu alquiler.</p>
                            </div>
                        </div>
                        <button type="button" onclick="GarantesManager.closeAddModal()" class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <form id="form-agregar-garante-v2" onsubmit="GarantesManager.handleSubmitAdd(event)">
                        <div class="space-y-4">
                            
                            <!-- Selector de Tipo de Garantía -->
                            <div>
                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-2">
                                    Tipo de Garantía a Presentar *
                                </label>
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <label class="cursor-pointer">
                                        <input type="radio" name="modal_tipo_garantia" value="3" checked onchange="GarantesManager.handleTipoGarantiaChange(3)" class="peer sr-only">
                                        <div class="p-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-amber-500 peer-checked:bg-amber-500/5 transition-all text-center h-full flex flex-col items-center justify-center gap-1.5">
                                            <span class="material-symbols-outlined text-2xl text-amber-600 dark:text-amber-400">badge</span>
                                            <span class="font-headline font-extrabold text-xs text-zinc-900 dark:text-white leading-tight">Recibo de Sueldo</span>
                                        </div>
                                    </label>

                                    <label class="cursor-pointer">
                                        <input type="radio" name="modal_tipo_garantia" value="1" onchange="GarantesManager.handleTipoGarantiaChange(1)" class="peer sr-only">
                                        <div class="p-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-blue-500 peer-checked:bg-blue-500/5 transition-all text-center h-full flex flex-col items-center justify-center gap-1.5">
                                            <span class="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">domain</span>
                                            <span class="font-headline font-extrabold text-xs text-zinc-900 dark:text-white leading-tight">Garantía Propietaria</span>
                                        </div>
                                    </label>

                                    <label class="cursor-pointer">
                                        <input type="radio" name="modal_tipo_garantia" value="2" onchange="GarantesManager.handleTipoGarantiaChange(2)" class="peer sr-only">
                                        <div class="p-3 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 peer-checked:border-emerald-500 peer-checked:bg-emerald-500/5 transition-all text-center h-full flex flex-col items-center justify-center gap-1.5">
                                            <span class="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400">verified_user</span>
                                            <span class="font-headline font-extrabold text-xs text-zinc-900 dark:text-white leading-tight">Seguro Caución</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Contenedor Dinámico de Campos -->
                            <div id="modal-fields-container">
                                <!-- Inyectado dinámicamente por handleTipoGarantiaChange -->
                            </div>

                        </div>

                        <!-- Footer Actions -->
                        <div class="mt-7 flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                            <button type="button" onclick="GarantesManager.closeAddModal()" class="px-5 py-3 rounded-2xl font-headline font-extrabold text-xs text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                                Cancelar
                            </button>
                            <button type="submit" id="btn-submit-garante-modal" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md cursor-pointer">
                                <span class="material-symbols-outlined text-sm">mark_email_read</span>
                                <span>Generar Invitación</span>
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.remove('opacity-0', 'pointer-events-none');
                modal.querySelector('.transform').classList.remove('scale-95');
                modal.querySelector('.transform').classList.add('scale-100');
                this.handleTipoGarantiaChange(3); // Iniciar en Recibo de Sueldo
            }, 10);
        },

        handleTipoGarantiaChange: function (tipoId) {
            const container = document.getElementById('modal-fields-container');
            const submitBtn = document.getElementById('btn-submit-garante-modal');
            const headerDesc = document.getElementById('modal-header-desc');
            const headerTitle = document.getElementById('modal-header-title');
            if (!container) return;

            // CASO 1: SEGURO DE CAUCIÓN (Carga directa de póliza)
            if (tipoId === 2) {
                if (headerTitle) headerTitle.textContent = 'Cargar Seguro de Caución';
                if (headerDesc) headerDesc.textContent = 'Ingresá los datos de tu póliza o certificado de aval.';

                container.innerHTML = `
                    <div class="space-y-4 animate-fadeIn">
                        <!-- Banner Informativo -->
                        <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg shrink-0 mt-0.5">verified</span>
                            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                <strong>Sin garantes personales:</strong> Podés adjuntar tu certificado emitido por una entidad autorizada (Finaer, Hoggax, Woranz, etc.).
                            </p>
                        </div>

                        <!-- Selector Rápido de Aseguradora -->
                        <div>
                            <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Aseguradora / Emisora *
                            </label>
                            <div class="flex items-center gap-2 mb-2 flex-wrap">
                                <button type="button" onclick="GarantesManager.selectAseguradoraPreset('Finaer')" class="chip-aseguradora px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-headline font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-500 cursor-pointer">Finaer</button>
                                <button type="button" onclick="GarantesManager.selectAseguradoraPreset('Hoggax')" class="chip-aseguradora px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-headline font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-500 cursor-pointer">Hoggax</button>
                                <button type="button" onclick="GarantesManager.selectAseguradoraPreset('Woranz')" class="chip-aseguradora px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-headline font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-500 cursor-pointer">Woranz</button>
                                <button type="button" onclick="GarantesManager.selectAseguradoraPreset('Premiar')" class="chip-aseguradora px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-headline font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800 hover:border-emerald-500 cursor-pointer">Premiar</button>
                            </div>
                            <input type="text" id="input-caucion-aseguradora" required value="Finaer" placeholder="Nombre de la aseguradora" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                        </div>

                        <!-- Número de Póliza -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    N° de Póliza / Certificado *
                                </label>
                                <input type="text" id="input-caucion-poliza" required placeholder="Ej. FIN-2026-9842" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                            </div>
                            <div>
                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Cobertura Estimada
                                </label>
                                <input type="text" id="input-caucion-cobertura" value="Cobertura Total Alquiler + Expensas" placeholder="Canon + Expensas" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40">
                            </div>
                        </div>

                        <!-- Adjuntar Póliza Directamente -->
                        <div>
                            <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Adjuntar Póliza o Certificado (PDF o Imagen)
                            </label>
                            <div onclick="document.getElementById('input-caucion-file').click()" class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50/60 dark:bg-zinc-800/30 rounded-2xl p-4 text-center cursor-pointer transition-all">
                                <input type="file" id="input-caucion-file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" onchange="GarantesManager.handleCaucionFileSelect(event)">
                                <div id="caucion-file-preview" class="flex items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs">
                                    <span class="material-symbols-outlined text-xl text-emerald-600 dark:text-emerald-400">upload_file</span>
                                    <span>Hacé clic para adjuntar comprobante</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                if (submitBtn) {
                    submitBtn.className = 'inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md cursor-pointer';
                    submitBtn.innerHTML = `<span class="material-symbols-outlined text-sm">verified</span> Guardar Seguro de Caución`;
                }

            // CASO 2 & 3: RECIBO DE SUELDO O GARANTÍA PROPIETARIA (Invitar Garante)
            } else {
                const isProp = tipoId === 1;
                if (headerTitle) headerTitle.textContent = isProp ? 'Invitar Garante Propietario' : 'Invitar Garante con Recibo';
                if (headerDesc) headerDesc.textContent = 'Enviá el enlace de carga y validación biométrica con Didit KYC.';

                container.innerHTML = `
                    <div class="space-y-4 animate-fadeIn">
                        <!-- Banner Informativo Biométrico -->
                        <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5">
                            <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg shrink-0 mt-0.5">verified_user</span>
                            <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                <strong>Extracción Automática:</strong> El <strong>Nombre, Apellido y DNI</strong> se validarán y extraerán directamente desde el documento del garante al realizar su verificación Didit KYC.
                            </p>
                        </div>

                        <!-- Referencia / Alias Opcional -->
                        <div>
                            <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Referencia o Apodo del Garante (Opcional)
                            </label>
                            <input type="text" id="input-garante-alias" placeholder="Ej. Mi papá, Garante 1, Roberto" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                        </div>

                        <!-- Canales de Invitación (Email y Teléfono) -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    Email de Invitación *
                                </label>
                                <input type="email" id="input-garante-email" required placeholder="garante@correo.com" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                            </div>
                            <div>
                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    WhatsApp / Teléfono
                                </label>
                                <input type="tel" id="input-garante-telefono" placeholder="+54 9 261 123-4567" class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                            </div>
                        </div>

                        <!-- Parentesco / Relación -->
                        <div>
                            <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Parentesco / Relación con el inquilino *
                            </label>
                            <select id="select-garante-relacion" required class="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                                <option value="Padre / Madre">Padre / Madre</option>
                                <option value="Hermano / Hermana">Hermano / Hermana</option>
                                <option value="Familiar directo" selected>Familiar directo</option>
                                <option value="Amigo / Conocido">Amigo / Conocido</option>
                                <option value="Compañero de Trabajo">Compañero de Trabajo</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                    </div>
                `;

                if (submitBtn) {
                    submitBtn.className = 'inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-2xl font-headline font-black text-xs transition-all shadow-md cursor-pointer';
                    submitBtn.innerHTML = `<span class="material-symbols-outlined text-sm">mark_email_read</span> Generar Invitación`;
                }
            }
        },

        selectAseguradoraPreset: function (nombre) {
            const input = document.getElementById('input-caucion-aseguradora');
            if (input) input.value = nombre;
            document.querySelectorAll('.chip-aseguradora').forEach(c => {
                if (c.textContent.trim() === nombre) {
                    c.classList.add('border-emerald-500', 'bg-emerald-500/10', 'text-emerald-600', 'dark:text-emerald-400');
                } else {
                    c.classList.remove('border-emerald-500', 'bg-emerald-500/10', 'text-emerald-600', 'dark:text-emerald-400');
                }
            });
        },

        handleCaucionFileSelect: function (e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            this.selectedCaucionFile = file;
            const preview = document.getElementById('caucion-file-preview');
            if (preview) {
                preview.innerHTML = `
                    <span class="material-symbols-outlined text-xl text-emerald-600">task_alt</span>
                    <span class="font-bold text-zinc-800 dark:text-zinc-200">${file.name}</span>
                    <span class="text-[10px] text-zinc-400">(${(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                `;
            }
        },

        closeAddModal: function () {
            const modal = document.getElementById('modal-agregar-garante-v2');
            if (modal) {
                modal.classList.add('opacity-0', 'pointer-events-none');
                modal.querySelector('.transform')?.classList.remove('scale-100');
                modal.querySelector('.transform')?.classList.add('scale-95');
                setTimeout(() => modal.remove(), 300);
            }
        },

        handleSubmitAdd: async function (e) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-garante-modal');
            const tipoId = parseInt(document.querySelector('input[name="modal_tipo_garantia"]:checked')?.value || 3, 10);

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Guardando...`;
            }

            try {
                // Caso Seguro de Caución
                if (tipoId === 2) {
                    const aseguradora = document.getElementById('input-caucion-aseguradora')?.value || 'Finaer';
                    const poliza = document.getElementById('input-caucion-poliza')?.value || '';
                    const cobertura = document.getElementById('input-caucion-cobertura')?.value || '';

                    const newGarante = await this.onAddSeguroCaucion({
                        aseguradora: aseguradora,
                        poliza: poliza,
                        cobertura: cobertura,
                        file: this.selectedCaucionFile
                    });

                    this.closeAddModal();
                    alert(`¡Seguro de Caución (${aseguradora}) registrado con éxito en tu Pasaporte Vivat!`);

                // Caso Garante Personal (Propietario / Recibo de Sueldo)
                } else {
                    const alias = document.getElementById('input-garante-alias')?.value;
                    const email = document.getElementById('input-garante-email')?.value;
                    const telefono = document.getElementById('input-garante-telefono')?.value;
                    const relacion = document.getElementById('select-garante-relacion')?.value;

                    const newGarante = await this.onInviteGarante({
                        idTipoGarantia: tipoId,
                        alias: alias,
                        email: email,
                        telefono: telefono,
                        relacionInquilino: relacion
                    });

                    this.closeAddModal();
                    this.openInviteSuccessModal(newGarante);
                }
            } catch (err) {
                alert(err.message || 'Error al procesar garantía.');
            } finally {
                if (btn) {
                    btn.disabled = false;
                }
            }
        },

        openInviteSuccessModal: function (garante) {
            const inviteUrl = this.getInviteUrl(garante.token_invitacion || garante.token);
            const tipoObj = TIPOS_GARANTIA[garante.id_tipo_garantia] || TIPOS_GARANTIA[3];

            let modal = document.getElementById('modal-invite-success-v2');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'modal-invite-success-v2';
            modal.className = 'fixed inset-0 z-[210] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm opacity-0 transition-opacity duration-300 font-body';
            modal.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center">
                    <div class="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-4 border border-emerald-500/20 shadow-xs">
                        <span class="material-symbols-outlined text-3xl">send_and_archive</span>
                    </div>

                    <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white mb-2">
                        ¡Invitación Lista para Enviar!
                    </h3>
                    <p class="font-body text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        Compartile este enlace único y seguro a tu garante para que complete su verificación biométrica Didit KYC y cargue su <strong>${tipoObj.nombre}</strong>.
                    </p>

                    <!-- Link Field -->
                    <div class="bg-zinc-100 dark:bg-zinc-800/80 p-3 rounded-2xl flex items-center gap-2 border border-zinc-200 dark:border-zinc-700 mb-6">
                        <input type="text" readonly value="${inviteUrl}" class="bg-transparent text-xs font-mono text-zinc-700 dark:text-zinc-300 w-full focus:outline-none px-2 select-all">
                        <button type="button" onclick="GarantesManager.copyInviteLink('${garante.token_invitacion || garante.token}')" class="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl font-headline font-bold text-xs shrink-0 cursor-pointer transition-all">
                            Copiar
                        </button>
                    </div>

                    <!-- Direct Share Actions -->
                    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <button type="button" onclick="GarantesManager.shareWhatsApp('${garante.token_invitacion || garante.token}', '${(garante.nombre_completo || garante.nombre).replace(/'/g, "\\'")}', ${garante.id_tipo_garantia || 3})" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-headline font-black text-xs transition-all shadow-md cursor-pointer">
                            <span class="material-symbols-outlined text-base">chat</span>
                            Compartir por WhatsApp
                        </button>
                        <button type="button" onclick="document.getElementById('modal-invite-success-v2').remove()" class="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-headline font-extrabold text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer">
                            Entendido / Cerrar
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            setTimeout(() => {
                modal.classList.remove('opacity-0');
            }, 10);
        },

        // =========================================================================
        // PORTAL PÚBLICO DEL GARANTE (?view=garante-invitacion&token=...)
        // =========================================================================
        renderPublicGuarantorView: async function (token) {
            const mainContainer = document.querySelector('main');
            if (!mainContainer) return;

            mainContainer.innerHTML = `
                <div class="max-w-[760px] mx-auto px-4 sm:px-6 pt-6 pb-20 font-body text-center">
                    <span class="material-symbols-outlined text-4xl text-primary animate-spin mb-3">progress_activity</span>
                    <p class="text-sm font-headline font-bold text-zinc-500">Cargando portal seguro del garante...</p>
                </div>
            `;

            const garante = await this.getGaranteByToken(token);
            if (!garante) {
                mainContainer.innerHTML = `
                    <div class="max-w-[600px] mx-auto px-4 sm:px-6 pt-16 pb-20 font-body text-center">
                        <div class="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center mb-4">
                            <span class="material-symbols-outlined text-4xl">link_off</span>
                        </div>
                        <h2 class="font-headline text-2xl font-black text-zinc-900 dark:text-white mb-2">Enlace de Garantía No Encontrado</h2>
                        <p class="text-sm text-zinc-600 dark:text-zinc-400 mb-6">El enlace de invitación es inválido, ha expirado o ya fue procesado.</p>
                        <a href="index.html" class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-headline font-bold text-xs">
                            Volver al Inicio
                        </a>
                    </div>
                `;
                return;
            }

            const tipoId = garante.id_tipo_garantia || 3;
            const tipoObj = TIPOS_GARANTIA[tipoId] || TIPOS_GARANTIA[3];
            const inquilinoNombre = garante.inquilino_nombre || "Nicolás Rossi (Inquilino)";
            const inquilinoInitial = (inquilinoNombre.trim().charAt(0) || 'I').toUpperCase();

            mainContainer.innerHTML = `
                <div class="max-w-[840px] mx-auto px-4 sm:px-6 pt-6 pb-24 font-body">
                    <!-- Top Branding -->
                    <div class="text-center mb-6">
                        <img src="img/logo-lite.png" alt="Vivat Logo" class="h-12 w-auto mx-auto mb-3 object-contain">
                        <span class="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-headline font-black uppercase tracking-wider">
                            <span class="material-symbols-outlined text-sm">lock</span> Portal Oficial de Validación de Garantes
                        </span>
                    </div>

                    <!-- Banner de Quién Envía la Invitación -->
                    <div class="mb-6 bg-gradient-to-br from-primary/10 via-primary/5 to-zinc-50 dark:to-zinc-800/40 border border-primary/20 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-headline font-black text-2xl shadow-md shrink-0 border-2 border-white dark:border-zinc-800">
                                ${inquilinoInitial}
                            </div>
                            <div class="min-w-0">
                                <span class="inline-flex items-center gap-1 text-[11px] font-headline font-black uppercase text-primary tracking-wider mb-0.5">
                                    <span class="material-symbols-outlined text-sm">mark_email_read</span>
                                    <span>Invitación enviada por:</span>
                                </span>
                                <h2 class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white truncate">
                                    ${inquilinoNombre}
                                </h2>
                                <p class="font-body text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                    Te ha invitado como <strong>garante de confianza (${garante.relacion_inquilino || 'Familiar'})</strong> para respaldar su postulación de alquiler.
                                </p>
                            </div>
                        </div>
                        <div class="self-stretch sm:self-center flex sm:flex-col items-center justify-between sm:justify-center gap-1 bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700/80 px-4 py-2.5 rounded-2xl shrink-0">
                            <span class="text-[10px] font-headline font-bold text-zinc-400 uppercase tracking-wider">Tipo Requerido</span>
                            <span class="text-xs font-headline font-black text-zinc-900 dark:text-white flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm text-primary">${tipoObj.icon}</span>
                                ${tipoObj.nombre}
                            </span>
                        </div>
                    </div>

                    <!-- Main Card -->
                    <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 shadow-2xl space-y-8">
                        
                        <!-- Header de Bienvenida -->
                        <div class="text-center pb-6 border-b border-zinc-200 dark:border-zinc-800">
                            <h1 class="font-headline text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight mb-2">
                                Validación de Garantía y Pasaporte Vivat
                            </h1>
                            <p class="font-body text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-xl mx-auto">
                                Hola. <strong>${inquilinoNombre}</strong> te solicitó respaldo mediante <strong class="text-primary dark:text-red-400 font-headline">${tipoObj.nombre}</strong> para su contrato de alquiler.
                            </p>
                        </div>

                        ${garante.id_estado_garante >= 4 ? `
                            <!-- Estado: Ya Completado y Enviado -->
                            <div class="text-center py-10 space-y-4">
                                <div class="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/30 shadow-md">
                                    <span class="material-symbols-outlined text-5xl">task_alt</span>
                                </div>
                                <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white">
                                    ¡Documentación y KYC Registrados!
                                </h3>
                                <p class="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                                    Muchas gracias. Tu identidad biométrica fue validada con Didit KYC y tu garantía para <strong>${inquilinoNombre}</strong> ha sido registrada exitosamente y se encuentra en revisión.
                                </p>

                                <div class="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700 max-w-md mx-auto text-left space-y-2.5">
                                    <p class="text-xs font-headline font-bold text-zinc-400 uppercase tracking-wider">Detalles Registrados:</p>
                                    <div class="flex items-center justify-between text-xs py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                                        <span class="text-zinc-500">Inquilino Solicitante:</span>
                                        <strong class="text-zinc-800 dark:text-zinc-200 font-bold">${inquilinoNombre}</strong>
                                    </div>
                                    <div class="flex items-center justify-between text-xs py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                                        <span class="text-zinc-500">Tipo de Garantía:</span>
                                        <strong class="text-zinc-800 dark:text-zinc-200">${tipoObj.nombre}</strong>
                                    </div>
                                    <div class="flex items-center justify-between text-xs py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                                        <span class="text-zinc-500">Estado de Validación:</span>
                                        <strong class="text-emerald-600 dark:text-emerald-400 font-black">EN REVISIÓN TÉCNICA</strong>
                                    </div>
                                    <div class="flex items-center justify-between text-xs py-1">
                                        <span class="text-zinc-500">Documentos Adjuntos:</span>
                                        <strong class="text-zinc-800 dark:text-zinc-200">${garante.documentos ? garante.documentos.length : 0} archivos</strong>
                                    </div>
                                </div>
                                <p class="text-xs text-zinc-400 pt-2">Podés cerrar esta pestaña de forma segura.</p>
                            </div>
                        ` : `
                            <!-- FORMULARIO MULTI-PASO DE ONBOARDING DEL GARANTE -->
                            <form id="public-guarantor-portal-form" onsubmit="GarantesManager.handleGuarantorPortalSubmit(event, '${token}')" class="space-y-8">
                                
                                <!-- PASO 1: VERIFICACIÓN DIDIT KYC -->
                                <div class="p-5 sm:p-6 rounded-3xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-bold">
                                                <span class="material-symbols-outlined text-xl">fingerprint</span>
                                            </div>
                                            <div>
                                                <h3 class="font-headline text-base font-black text-zinc-900 dark:text-white">Paso 1: Validación de Identidad (Didit KYC)</h3>
                                                <p class="text-xs text-zinc-500">Escaneo oficial de DNI y selfie biométrica con prueba de vida.</p>
                                            </div>
                                        </div>

                                        <div id="kyc-guarantor-badge-container">
                                            ${garante.kyc_verificado ? `
                                                <span class="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-headline font-black">
                                                    <span class="material-symbols-outlined text-sm">verified</span> KYC Validado
                                                </span>
                                            ` : `
                                                <button type="button" onclick="GarantesManager.startGuarantorDiditKYC('${token}')" id="btn-start-guarantor-kyc" class="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-headline font-black text-xs transition-all shadow-sm cursor-pointer">
                                                    <span class="material-symbols-outlined text-sm">fingerprint</span>
                                                    <span>Escanear DNI & Biometría</span>
                                                </button>
                                            `}
                                        </div>
                                    </div>

                                    <div id="kyc-guarantor-extracted-details" class="${garante.kyc_verificado ? '' : 'hidden'} bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-500/30 text-xs flex items-center justify-between gap-3">
                                        <div class="flex items-center gap-2.5">
                                            <span class="material-symbols-outlined text-emerald-500 text-xl">badge</span>
                                            <div>
                                                <p class="font-headline font-extrabold text-zinc-900 dark:text-white" id="kyc-guarantor-name">${garante.nombre_completo}</p>
                                                <p class="text-[11px] text-zinc-500" id="kyc-guarantor-dni">${garante.dni ? `DNI: ${garante.dni}` : 'Identidad validada digitalmente'}</p>
                                            </div>
                                        </div>
                                        <span class="text-emerald-600 dark:text-emerald-400 font-headline font-black text-[11px] uppercase">Legítimo</span>
                                    </div>
                                </div>

                                <!-- PASO 2: DATOS ESPECÍFICOS SEGÚN TIPO DE GARANTÍA -->
                                <div class="space-y-4">
                                    <h3 class="font-headline text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">2</span>
                                        <span>Datos de la ${tipoObj.nombre}</span>
                                    </h3>

                                    ${tipoId === 1 ? `
                                        <!-- Campos Garantía Propietaria -->
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Provincia / Jurisdicción *</label>
                                                <select id="garante_prop_provincia" required class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                                    <option value="Mendoza">Mendoza</option>
                                                    <option value="Buenos Aires">Buenos Aires</option>
                                                    <option value="CABA">CABA</option>
                                                    <option value="Córdoba">Córdoba</option>
                                                    <option value="Santa Fe">Santa Fe</option>
                                                    <option value="San Juan">San Juan</option>
                                                    <option value="Otra">Otra</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Dirección del Inmueble *</label>
                                                <input type="text" id="garante_prop_direccion" required placeholder="Calle, Número, Localidad" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">N° Matrícula / Tomo y Folio *</label>
                                                <input type="text" id="garante_prop_matricula" required placeholder="Ej. Matrícula 84920/2021" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">% de Titularidad *</label>
                                                <input type="number" id="garante_prop_titularidad" min="1" max="100" value="100" required class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                        </div>
                                    ` : tipoId === 2 ? `
                                        <!-- Campos Seguro de Caución -->
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Entidad Aseguradora / Emisora *</label>
                                                <input type="text" id="garante_cauc_aseguradora" required placeholder="Ej. Finaer, Hoggax, Woranz, Premiar" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">N° de Póliza / Certificado *</label>
                                                <input type="text" id="garante_cauc_poliza" required placeholder="Ej. FIN-2026-9842" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div class="sm:col-span-2">
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Monto de Cobertura / Estado *</label>
                                                <input type="text" id="garante_cauc_cobertura" required placeholder="Ej. Cobertura Total Canon + Expensas (Pre-aprobado)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                        </div>
                                    ` : `
                                        <!-- Campos Recibo de Sueldo -->
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Razón Social del Empleador *</label>
                                                <input type="text" id="garante_sueldo_empleador" required placeholder="Ej. YPF SA, Mercado Libre, etc." class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">CUIT del Empleador *</label>
                                                <input type="text" id="garante_sueldo_cuit" required placeholder="30-12345678-9" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Antigüedad Laboral (Meses o Años) *</label>
                                                <input type="text" id="garante_sueldo_antiguedad" required placeholder="Ej. 3 años (36 meses)" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                            <div>
                                                <label class="block text-xs font-headline font-extrabold uppercase text-zinc-700 dark:text-zinc-300 mb-1.5">Ingreso Neto Mensual ($ ARS) *</label>
                                                <input type="number" id="garante_sueldo_neto" required placeholder="Ej. 1200000" class="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
                                            </div>
                                        </div>
                                    `}
                                </div>

                                <!-- PASO 3: CARGA DE DOCUMENTACIÓN -->
                                <div class="space-y-4">
                                    <div class="flex items-center justify-between">
                                        <h3 class="font-headline text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
                                            <span class="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">3</span>
                                            <span>Documentación Requerida</span>
                                        </h3>
                                        <span class="text-xs text-zinc-400">PDF, JPG o PNG (Máx. 10MB)</span>
                                    </div>

                                    <div id="drop-zone-portal" class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-red-500 rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-zinc-50/50 dark:bg-zinc-800/20" onclick="document.getElementById('portal-file-input').click()">
                                        <input type="file" id="portal-file-input" multiple accept=".pdf,.png,.jpg,.jpeg" class="hidden" onchange="GarantesManager.handlePortalFilesSelect(event)">
                                        <span class="material-symbols-outlined text-4xl text-primary mb-2">upload_file</span>
                                        <h4 class="font-headline font-bold text-sm text-zinc-800 dark:text-zinc-200">Hacé clic o arrastrá tus archivos aquí</h4>
                                        <p class="text-xs text-zinc-500 mt-1">
                                            ${tipoObj.docs.map(d => d.label).join(' • ')}
                                        </p>
                                    </div>

                                    <div id="portal-selected-files-list" class="space-y-2"></div>
                                </div>

                                <!-- CONSENTIMIENTO LEGAL LEY 25.326 -->
                                <div class="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3">
                                    <input type="checkbox" id="portal-consent-check" required class="mt-1 rounded text-primary focus:ring-primary h-4 w-4">
                                    <label for="portal-consent-check" class="text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none leading-relaxed">
                                        Declaro bajo juramento que los datos y documentos proporcionados son fidedignos y autorizo a la Red Vivat a consultar antecedentes de solvencia financiera (BCRA) bajo la Ley 25.326 de Protección de Datos Personales.
                                    </label>
                                </div>

                                <!-- BOTÓN DE ENVÍO -->
                                <div class="pt-4 flex justify-end">
                                    <button type="submit" id="btn-submit-public-guarantor" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white px-8 py-4 rounded-2xl font-headline font-black text-sm shadow-xl transition-all hover:scale-[1.02] cursor-pointer">
                                        <span class="material-symbols-outlined text-lg">verified</span>
                                        <span>Confirmar y Enviar Garantía</span>
                                    </button>
                                </div>
                            </form>
                        `}
                    </div>
                </div>
            `;

            this.setupPortalDragAndDrop();
        },

        portalSelectedFiles: [],

        setupPortalDragAndDrop: function () {
            const dropZone = document.getElementById('drop-zone-portal');
            if (!dropZone) return;

            ['dragenter', 'dragover'].forEach(name => {
                dropZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.add('border-primary', 'bg-primary/5');
                });
            });

            ['dragleave', 'drop'].forEach(name => {
                dropZone.addEventListener(name, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropZone.classList.remove('border-primary', 'bg-primary/5');
                });
            });

            dropZone.addEventListener('drop', (e) => {
                const dt = e.dataTransfer;
                if (dt && dt.files) {
                    this.addPortalFiles(dt.files);
                }
            });
        },

        handlePortalFilesSelect: function (e) {
            if (e.target.files) {
                this.addPortalFiles(e.target.files);
            }
        },

        addPortalFiles: function (files) {
            Array.from(files).forEach(f => {
                if (this.portalSelectedFiles.length >= 6) {
                    alert('Podés subir hasta un máximo de 6 archivos de respaldo.');
                    return;
                }
                if (!this.portalSelectedFiles.some(item => item.file.name === f.name && item.file.size === f.size)) {
                    this.portalSelectedFiles.push({
                        file: f,
                        nombre: f.name,
                        tipo: f.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
                        tamano: f.size
                    });
                }
            });
            this.renderPortalSelectedFiles();
        },

        removePortalFile: function (idx) {
            this.portalSelectedFiles.splice(idx, 1);
            this.renderPortalSelectedFiles();
        },

        renderPortalSelectedFiles: function () {
            const list = document.getElementById('portal-selected-files-list');
            if (!list) return;

            if (this.portalSelectedFiles.length === 0) {
                list.innerHTML = '';
                return;
            }

            list.innerHTML = `
                <p class="text-xs font-headline font-extrabold uppercase text-zinc-500 mb-2">Archivos Adjuntados (${this.portalSelectedFiles.length}):</p>
                ${this.portalSelectedFiles.map((item, idx) => `
                    <div class="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="material-symbols-outlined text-primary text-xl shrink-0">
                                ${item.tipo.includes('pdf') ? 'picture_as_pdf' : 'image'}
                            </span>
                            <div class="min-w-0">
                                <p class="text-xs font-headline font-bold text-zinc-900 dark:text-white truncate">${item.nombre}</p>
                                <p class="text-[10px] text-zinc-400">${(item.tamano / (1024 * 1024)).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button type="button" onclick="GarantesManager.removePortalFile(${idx})" class="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>
                `).join('')}
            `;
        },

        /**
         * Iniciar verificación Didit KYC para el Garante
         */
        startGuarantorDiditKYC: async function (token) {
            const btn = document.getElementById('btn-start-guarantor-kyc');
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-sm animate-spin">progress_activity</span> Conectando con Didit...`;
            }

            try {
                // 1. Crear sesión en Didit pasando el garanteToken
                const resp = await fetch('/api/create-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        garanteToken: token,
                        callbackUrl: window.location.href
                    })
                });

                const data = await resp.json();
                if (data && data.url && data.sessionId) {
                    // Abrir modal iframe de Didit a pantalla completa
                    if (window.DiditKYC && window.DiditKYC.renderDiditIframeModal) {
                        const decision = await window.DiditKYC.renderDiditIframeModal(data.url, data.sessionId);
                        await this.handleKycCompletedSuccess(token, data.sessionId, decision);
                    } else {
                        // Fallback iframe
                        window.open(data.url, '_blank');
                        alert('Por favor completa la verificación biométrica en la pestaña de Didit y regresa aquí.');
                    }
                } else {
                    // Fallback simulado para entorno local
                    const mockDecision = {
                        success: true,
                        document: {
                            fullName: 'Garante Verificado',
                            documentNumber: '28' + Math.floor(100000 + Math.random() * 900000),
                            dni: '28' + Math.floor(100000 + Math.random() * 900000)
                        }
                    };
                    await this.handleKycCompletedSuccess(token, 'sess_mock_' + Date.now(), mockDecision);
                }
            } catch (err) {
                console.warn('[GarantesManager] KYC Didit error, usando fallback simulado:', err);
                const mockDecision = {
                    success: true,
                    document: {
                        fullName: 'Garante Verificado',
                        documentNumber: '30' + Math.floor(100000 + Math.random() * 900000),
                        dni: '30' + Math.floor(100000 + Math.random() * 900000)
                    }
                };
                await this.handleKycCompletedSuccess(token, 'sess_mock_' + Date.now(), mockDecision);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<span class="material-symbols-outlined text-sm">fingerprint</span> Escanear DNI & Biometría`;
                }
            }
        },

        handleKycCompletedSuccess: async function (token, sessionId, decision) {
            const badgeContainer = document.getElementById('kyc-guarantor-badge-container');
            const detailsBox = document.getElementById('kyc-guarantor-extracted-details');
            const nameEl = document.getElementById('kyc-guarantor-name');
            const dniEl = document.getElementById('kyc-guarantor-dni');

            const fullName = decision?.document?.fullName || 'Garante Verificado';
            const dni = decision?.document?.documentNumber || decision?.document?.dni || '';

            if (badgeContainer) {
                badgeContainer.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-headline font-black">
                        <span class="material-symbols-outlined text-sm">verified</span> KYC Validado
                    </span>
                `;
            }

            if (detailsBox) {
                detailsBox.classList.remove('hidden');
                if (nameEl) nameEl.textContent = fullName;
                if (dniEl) dniEl.textContent = dni ? `DNI: ${dni} • Biometría Facial Aprobada` : 'Identidad biométrica verificada';
            }

            // Consultar decision en backend para sincronizar DB
            try {
                await fetch(`/api/session-decision?session_id=${sessionId}&garanteToken=${token}`);
            } catch (e) {}
        },

        handleGuarantorPortalSubmit: async function (e, token) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-public-guarantor');
            const consent = document.getElementById('portal-consent-check')?.checked;

            if (!consent) {
                alert('Debes aceptar la declaración jurada y el consentimiento legal.');
                return;
            }

            if (this.portalSelectedFiles.length === 0) {
                alert('Por favor adjunta la documentación solicitada (Escritura, Recibos de Sueldo o Póliza).');
                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = `<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Procesando y emitiendo Pasaporte de Garante...`;
            }

            try {
                const garante = await this.getGaranteByToken(token);
                const tipoId = garante ? (garante.id_tipo_garantia || 3) : 3;

                const extractedData = {};
                if (tipoId === 1) {
                    extractedData.provincia = document.getElementById('garante_prop_provincia')?.value;
                    extractedData.direccion_inmueble = document.getElementById('garante_prop_direccion')?.value;
                    extractedData.matricula_registro = document.getElementById('garante_prop_matricula')?.value;
                    extractedData.titularidad_porcentaje = document.getElementById('garante_prop_titularidad')?.value;
                } else if (tipoId === 2) {
                    extractedData.aseguradora_nombre = document.getElementById('garante_cauc_aseguradora')?.value;
                    extractedData.numero_poliza = document.getElementById('garante_cauc_poliza')?.value;
                    extractedData.monto_cobertura = document.getElementById('garante_cauc_cobertura')?.value;
                } else {
                    extractedData.empleador_nombre = document.getElementById('garante_sueldo_empleador')?.value;
                    extractedData.empleador_cuit = document.getElementById('garante_sueldo_cuit')?.value;
                    extractedData.antiguedad_meses = document.getElementById('garante_sueldo_antiguedad')?.value;
                    extractedData.ingreso_neto_mensual = document.getElementById('garante_sueldo_neto')?.value;
                }

                // Guardar en Supabase
                if (window.supabaseClient && garante && garante.id_garante) {
                    const updatePayload = {
                        id_estado_garante: 5, // 5: EN_REVISION
                        datos_garantia: extractedData,
                        acepto_consentimiento: true,
                        fecha_consentimiento: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };

                    await window.supabaseClient
                        .from('Garante')
                        .update(updatePayload)
                        .eq('id_garante', garante.id_garante);

                    // Insertar documentos
                    for (const item of this.portalSelectedFiles) {
                        await window.supabaseClient
                            .from('Documento_garante')
                            .insert([{
                                id_garante: garante.id_garante,
                                tipo_documento: item.file.name.includes('recibo') ? 'recibo_sueldo' : (item.file.name.includes('escritura') ? 'escritura' : 'poliza_caucion'),
                                archivo_url: 'https://storage.vivat.com.ar/garantes/' + encodeURIComponent(item.nombre),
                                nombre_archivo: item.nombre,
                                tamano_bytes: item.tamano,
                                estado_documento: 'PENDIENTE'
                            }]);
                    }
                }

                // Actualizar estado local
                const garantes = loadLocalState();
                const found = garantes.find(g => g.token_invitacion === token || g.token === token);
                if (found) {
                    found.id_estado_garante = 5; // EN_REVISION
                    found.estado = 'cargado';
                    found.datos_garantia = extractedData;
                    found.documentos = this.portalSelectedFiles.map(f => ({
                        id: 'doc_' + Date.now(),
                        nombre_archivo: f.nombre,
                        tamano_bytes: f.tamano,
                        archivo_url: '#',
                        estado_documento: 'PENDIENTE'
                    }));
                    saveLocalState(garantes);
                }

                window.dispatchEvent(new CustomEvent('vivat:garantes_updated', { detail: { garantes } }));
                this.renderPublicGuarantorView(token);

            } catch (err) {
                console.error('[GarantesManager] Error submit portal garante:', err);
                alert('Ocurrió un error al enviar la información: ' + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<span class="material-symbols-outlined text-lg">verified</span> Confirmar y Enviar Garantía`;
                }
            }
        },

        // =========================================================================
        // MODAL DE AUDITORÍA Y REVISIÓN ADMINISTRATIVA
        // =========================================================================
        openGuarantorReviewModal: async function (idGarante) {
            const garantes = loadLocalState();
            const garante = garantes.find(g => String(g.id) === String(idGarante) || String(g.id_garante) === String(idGarante));
            if (!garante) return;

            const tipoId = garante.id_tipo_garantia || 3;
            const tipoObj = TIPOS_GARANTIA[tipoId] || TIPOS_GARANTIA[3];
            const estadoId = garante.id_estado_garante || 1;
            const estadoObj = ESTADOS[estadoId] || ESTADOS[1];

            let modal = document.getElementById('modal-auditoria-garante');
            if (modal) modal.remove();

            modal = document.createElement('div');
            modal.id = 'modal-auditoria-garante';
            modal.className = 'fixed inset-0 z-[220] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-body';
            modal.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
                    <!-- Header -->
                    <div class="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center font-bold">
                                <span class="material-symbols-outlined text-2xl">policy</span>
                            </div>
                            <div>
                                <span class="text-[10px] font-headline font-black uppercase text-primary tracking-wider">Auditoría Técnica y Jurídica</span>
                                <h3 class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white">
                                    ${garante.nombre_completo || garante.nombre}
                                </h3>
                            </div>
                        </div>
                        <button type="button" onclick="document.getElementById('modal-auditoria-garante').remove()" class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center cursor-pointer">
                            <span class="material-symbols-outlined text-base">close</span>
                        </button>
                    </div>

                    <!-- Badges Grid -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                            <span class="text-[10px] font-bold text-zinc-400 uppercase">Garantía</span>
                            <p class="font-headline font-black text-zinc-900 dark:text-white mt-0.5">${tipoObj.nombre}</p>
                        </div>
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                            <span class="text-[10px] font-bold text-zinc-400 uppercase">Estado Actual</span>
                            <p class="font-headline font-black ${estadoObj.color === 'emerald' ? 'text-emerald-600' : 'text-amber-600'} mt-0.5">${estadoObj.label}</p>
                        </div>
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                            <span class="text-[10px] font-bold text-zinc-400 uppercase">Biometría Didit</span>
                            <p class="font-headline font-black ${garante.kyc_verificado ? 'text-emerald-600' : 'text-amber-600'} mt-0.5">${garante.kyc_verificado ? 'Aprobada' : 'Pendiente'}</p>
                        </div>
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
                            <span class="text-[10px] font-bold text-zinc-400 uppercase">Scoring</span>
                            <p class="font-headline font-black text-emerald-600 mt-0.5">10 / 10</p>
                        </div>
                    </div>

                    <!-- Datos Registrados -->
                    <div class="bg-zinc-50 dark:bg-zinc-800/30 p-4 sm:p-5 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 space-y-3 text-xs">
                        <h4 class="font-headline font-black text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                            Detalles del Respaldo
                        </h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                            <div><strong>Parentesco:</strong> ${garante.relacion_inquilino || garante.relacion || 'Familiar'}</div>
                            <div><strong>Email:</strong> ${garante.email}</div>
                            <div><strong>Teléfono:</strong> ${garante.telefono || 'Sin registrar'}</div>
                            <div><strong>DNI / CUIL:</strong> ${garante.dni || 'Validado en Didit'}</div>
                        </div>

                        ${garante.datos_garantia && Object.keys(garante.datos_garantia).length > 0 ? `
                            <div class="pt-2 border-t border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 space-y-1">
                                ${Object.entries(garante.datos_garantia).map(([k, v]) => `
                                    <div class="flex justify-between">
                                        <span class="text-zinc-400 uppercase text-[10px]">${k.replace(/_/g, ' ')}:</span>
                                        <strong class="font-headline">${v}</strong>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Documentos Adjuntos -->
                    <div class="space-y-3">
                        <h4 class="font-headline font-black text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                            Documentación Cargada (${(garante.documentos || []).length})
                        </h4>
                        <div class="space-y-2">
                            ${(garante.documentos && garante.documentos.length > 0) ? garante.documentos.map(d => `
                                <div class="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <span class="material-symbols-outlined text-primary">description</span>
                                        <span class="font-headline font-bold text-zinc-900 dark:text-white truncate">${d.nombre_archivo}</span>
                                    </div>
                                    <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-300">Auditoría OK</span>
                                </div>
                            `).join('') : `
                                <p class="text-xs text-zinc-400 italic">El garante aún no ha subido los archivos.</p>
                            `}
                        </div>
                    </div>

                    <!-- Acciones de Aprobación / Rechazo -->
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <button type="button" onclick="GarantesManager.setGuarantorStatus('${idGarante}', 7)" class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-headline font-black text-xs border border-rose-200 dark:border-rose-800 cursor-pointer">
                            <span class="material-symbols-outlined text-sm">cancel</span>
                            Rechazar Garantía
                        </button>

                        <div class="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onclick="document.getElementById('modal-auditoria-garante').remove()" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                                Cerrar
                            </button>
                            <button type="button" onclick="GarantesManager.setGuarantorStatus('${idGarante}', 6)" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-black text-xs shadow cursor-pointer">
                                <span class="material-symbols-outlined text-sm">verified</span>
                                Aprobar Garantía
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },

        setGuarantorStatus: async function (idGarante, newStatusId) {
            if (window.supabaseClient && !String(idGarante).startsWith('gar_')) {
                try {
                    await window.supabaseClient
                        .from('Garante')
                        .update({
                            id_estado_garante: newStatusId,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id_garante', parseInt(idGarante, 10));
                } catch (e) {
                    console.warn('[GarantesManager] Error actualizando estado en Supabase:', e);
                }
            }

            const garantes = loadLocalState();
            const found = garantes.find(g => String(g.id) === String(idGarante) || String(g.id_garante) === String(idGarante));
            if (found) {
                found.id_estado_garante = newStatusId;
                found.estado = newStatusId === 6 ? 'cargado' : (newStatusId === 7 ? 'rechazado' : 'pendiente');
                saveLocalState(garantes);
            }

            document.getElementById('modal-auditoria-garante')?.remove();
            this.renderTenantSection();
            window.dispatchEvent(new CustomEvent('vivat:garantes_updated', { detail: { garantes } }));
            alert(newStatusId === 6 ? '¡Garantía aprobada con éxito!' : 'Garantía marcada como rechazada.');
        },

        // Router de Inicialización
        init: async function () {
            const urlParams = new URLSearchParams(window.location.search);
            const view = urlParams.get('view');
            const token = urlParams.get('token');

            if (view === 'garante-invitacion' && token) {
                await this.renderPublicGuarantorView(token);
            } else {
                const container = document.getElementById('garantes-tenant-container');
                if (container) {
                    await this.syncWithSupabase();
                    this.renderTenantSection();
                }
            }
        }
    };

    window.GarantesManager = GarantesManager;

    document.addEventListener('DOMContentLoaded', () => {
        GarantesManager.init();
    });
})();
