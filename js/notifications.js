/**
 * Habitat - Sistema Central de Notificaciones In-App en Tiempo Real
 * Gestiona alertas instantáneas en vivo mediante Supabase Realtime (WebSockets),
 * BroadcastChannel (cross-tab) y sincronización reactiva de eventos de almacenamiento.
 */

(function () {
    'use strict';

    const NOTIF_STORAGE_KEY = 'habitat_in_app_notifications';
    const BROADCAST_CHANNEL_NAME = 'habitat_notifications_realtime_channel';

    // Generar un ID único por pestaña para evitar loops de eco
    let TAB_ID = null;
    try {
        TAB_ID = sessionStorage.getItem('habitat_tab_session_id');
        if (!TAB_ID) {
            TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
            sessionStorage.setItem('habitat_tab_session_id', TAB_ID);
        }
    } catch(e) {
        TAB_ID = 'tab_' + Date.now();
    }

    const DEFAULT_NOTIFICATIONS = [
        {
            id: 'notif_welcome_01',
            title: '¡Bienvenido a Hábitat! 🏠',
            message: 'Tu cuenta y Pasaporte digital están listos. Explora alquileres verificados y postúlate con 1 click.',
            type: 'system',
            icon: 'verified_user',
            link: 'index.html',
            role: 'ALL',
            read: true,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
        }
    ];

    // Detectar rol activo del usuario actual
    function getActiveUserRole() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get('role');
        if (urlRole && ['TENANT', 'OWNER', 'BROKER'].includes(urlRole.toUpperCase())) {
            return urlRole.toUpperCase();
        }
        if (document.referrer.includes('tu-alquiler') || window.location.pathname.includes('tu-alquiler') || window.location.pathname.includes('pasaporte')) {
            return 'TENANT';
        }
        if (document.referrer.includes('administrador') || window.location.pathname.includes('administrador')) {
            return 'OWNER';
        }
        if (document.referrer.includes('panel-corredor') || window.location.pathname.includes('panel-corredor')) {
            return 'BROKER';
        }
        const storedRole = localStorage.getItem('habitat_active_role') || localStorage.getItem('habitat_user_role') || localStorage.getItem('habitat_user_type');
        if (storedRole) {
            const up = storedRole.toUpperCase();
            if (up === 'INQUILINO' || up === 'TENANT') return 'TENANT';
            if (up === 'PROPIETARIO' || up === 'OWNER') return 'OWNER';
            if (up === 'CORREDOR' || up === 'BROKER') return 'BROKER';
        }
        return 'TENANT';
    }

    // Comprobar si el usuario actual es el destinatario de la notificación
    function isTargetRecipient(notif) {
        if (!notif) return false;
        const currentRole = getActiveUserRole();
        let uLocal = {};
        try {
            uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
        } catch (e) {}
        const myEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
        const myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;

        // Si la notificación apunta a un perfil o email específico:
        if (notif.targetProfileId && myProfileId && String(notif.targetProfileId) !== String(myProfileId)) {
            return false;
        }
        if (notif.targetEmail && myEmail && notif.targetEmail.toLowerCase().trim() !== myEmail) {
            return false;
        }

        // Si viene remitente explícito y coincide con el usuario activo:
        const isSender = (notif.senderTabId && notif.senderTabId === TAB_ID) ||
                         (notif.senderEmail && myEmail && notif.senderEmail.toLowerCase().trim() === myEmail) ||
                         (notif.senderProfileId && myProfileId && String(notif.senderProfileId) === String(myProfileId));

        // Si fui yo quien la envió y está dirigida al rol opuesto, no mostrarla en mi propia sesión
        if (isSender) {
            if (notif.senderRole && notif.role && notif.role !== 'ALL' && notif.role !== notif.senderRole) {
                return false;
            }
            // Auto-notificaciones de firmas o postulaciones
            if (notif.type === 'contract' && (notif.title?.includes('firmó') || notif.title?.includes('firmado') || notif.message?.includes('completó su firma') || notif.message?.includes('firmó el contrato'))) {
                return false;
            }
            if (notif.type === 'application' && (notif.title?.includes('postulación recibida') || notif.message?.includes('se ha postulado'))) {
                return false;
            }
        }

        // Filtrado por Rol de destino
        if (notif.role && notif.role !== 'ALL') {
            const targetRole = notif.role.toUpperCase();
            if (targetRole === 'OWNER' && currentRole !== 'OWNER' && currentRole !== 'BROKER') {
                return false;
            }
            if (targetRole === 'TENANT' && currentRole !== 'TENANT') {
                return false;
            }
            if (targetRole === 'BROKER' && currentRole !== 'BROKER') {
                return false;
            }
        }

        return true;
    }

    // BroadcastChannel cross-tab/cross-window
    let broadcastChannel = null;
    try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        }
    } catch (e) {
        console.warn('[BroadcastChannel Error]:', e);
    }

    // Sonido sutil y moderno usando Web Audio API
    function playNotificationChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.12); // A5

            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.36);
        } catch (e) {
            // Silencioso si no hay interacción de usuario
        }
    }

    const NotificationManager = {
        _realtimeInitialized: false,
        _processedNotifIds: new Set(),

        // Obtener todas las notificaciones del usuario de manera global y filtradas por rol activo
        getAll: function () {
            let storedList = [];
            try {
                const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        storedList = parsed;
                    }
                }
            } catch (e) { }

            if (storedList.length === 0) {
                return [...DEFAULT_NOTIFICATIONS];
            }

            const currentRole = getActiveUserRole();
            return storedList.filter(n => {
                if (!n.role || n.role === 'ALL') return true;
                const targetRole = n.role.toUpperCase();
                if (currentRole === 'OWNER' || currentRole === 'BROKER') {
                    return targetRole === 'OWNER' || targetRole === 'BROKER' || targetRole === 'ALL';
                }
                if (currentRole === 'TENANT') {
                    return targetRole === 'TENANT' || targetRole === 'ALL';
                }
                return true;
            });
        },

        // Guardar lista completa en almacenamiento
        saveAll: function (list) {
            try {
                localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
            } catch (e) { }
            this.updateBadge();
            this.renderDropdown();
        },

        getByRole: function () {
            return this.getAll();
        },

        getUnreadCount: function () {
            const list = this.getAll();
            return list.filter(n => !n.read).length;
        },

        createNotification: function ({ id = null, title, message, type = 'contract', link = '#', role = 'ALL', icon = null, senderRole = null, senderProfileId = null, senderEmail = null, targetRole = null, targetProfileId = null, targetEmail = null, priority = 'normal' }) {
            const finalRole = targetRole || role || 'ALL';
            const notifId = id || ('notif_' + (type || 'gen') + '_' + title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) + '_' + Date.now());

            let resolvedIcon = icon;
            if (!resolvedIcon) {
                if (type === 'chat' || type === 'message') {
                    resolvedIcon = 'forum';
                } else if (type === 'contract' || message.toLowerCase().includes('firm') || title.toLowerCase().includes('firm')) {
                    resolvedIcon = 'draw';
                } else if (type === 'acceptance' || title.toLowerCase().includes('aprob') || title.toLowerCase().includes('aceptad')) {
                    resolvedIcon = 'check_circle';
                } else if (type === 'rejection') {
                    resolvedIcon = 'cancel';
                } else if (type === 'visit') {
                    resolvedIcon = 'calendar_month';
                } else {
                    resolvedIcon = 'notifications';
                }
            }

            let uLocal = {};
            try {
                uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            } catch (e) {}
            const myEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
            const myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;

            const newNotif = {
                id: notifId,
                title,
                message,
                type,
                icon: resolvedIcon,
                link,
                role: finalRole,
                read: false,
                createdAt: new Date().toISOString(),
                senderTabId: TAB_ID,
                senderRole: senderRole || getActiveUserRole(),
                senderProfileId: senderProfileId || myProfileId || null,
                senderEmail: senderEmail || myEmail || null,
                targetProfileId: targetProfileId || null,
                targetEmail: targetEmail || null,
                priority
            };

            // Registrar en memoria de procesados para deduplicación
            this._processedNotifIds.add(newNotif.id);

            // 1. Enviar vía BroadcastChannel para otras pestañas abiertas
            if (broadcastChannel) {
                try {
                    broadcastChannel.postMessage({
                        type: 'HABITAT_REALTIME_NOTIF',
                        senderTabId: TAB_ID,
                        senderRole: newNotif.senderRole,
                        senderProfileId: newNotif.senderProfileId,
                        senderEmail: newNotif.senderEmail,
                        notification: newNotif
                    });
                } catch (e) { }
            }

            // 2. Transmitir vía Supabase Realtime WebSockets para otros dispositivos
            this.broadcastSupabaseRealtime(newNotif);

            // 3. Disparar eventos reactivos locales
            window.dispatchEvent(new CustomEvent('habitat:application_updated', { detail: newNotif }));
            window.dispatchEvent(new CustomEvent('habitat:contract_updated', { detail: newNotif }));

            // 4. Si el usuario actual en esta pestaña ES el destinatario correspondiente, guardarlo y mostrar Toast
            if (isTargetRecipient(newNotif)) {
                let allStored = [];
                try {
                    const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        if (Array.isArray(parsed)) allStored = parsed;
                    }
                } catch (e) { }

                const isDuplicate = allStored.some(n => 
                    n.id === notifId || 
                    (n.title === title && n.message === message && Math.abs(Date.now() - new Date(n.createdAt).getTime()) < 30000)
                );

                if (!isDuplicate) {
                    allStored.unshift(newNotif);
                    if (allStored.length > 40) allStored = allStored.slice(0, 40);

                    try {
                        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(allStored));
                    } catch (e) { }

                    this.updateBadge();
                    this.renderDropdown();
                    this.showToast(newNotif);
                    playNotificationChime();
                }
            }

            return newNotif;
        },

        receiveIncomingNotification: function (payload) {
            if (!payload) return;
            const senderTabId = payload.senderTabId;
            const notif = payload.notification || payload;

            // Ignorar si provino de esta misma pestaña (evita loop de eco)
            if (senderTabId && senderTabId === TAB_ID) return;
            if (!notif || !notif.id) return;
            if (this._processedNotifIds.has(notif.id)) return;

            // Comprobar si soy el destinatario legítimo
            if (!isTargetRecipient(notif)) {
                this._processedNotifIds.add(notif.id);
                return;
            }

            this._processedNotifIds.add(notif.id);

            let allStored = [];
            try {
                const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) allStored = parsed;
                }
            } catch (e) { }

            const exists = allStored.some(n => 
                n.id === notif.id || 
                (n.title === notif.title && n.message === notif.message && Math.abs(new Date(n.createdAt).getTime() - new Date(notif.createdAt).getTime()) < 30000)
            );

            if (!exists) {
                allStored.unshift(notif);
                if (allStored.length > 40) allStored = allStored.slice(0, 40);
                try {
                    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(allStored));
                } catch (e) { }
            }

            this.updateBadge();
            this.renderDropdown();
            this.showToast(notif);
            playNotificationChime();

            window.dispatchEvent(new CustomEvent('habitat:application_updated', { detail: notif }));
            window.dispatchEvent(new CustomEvent('habitat:contract_updated', { detail: notif }));
        },

        add: function (payload) {
            return this.createNotification(payload);
        },

        _supabaseChannel: null,

        broadcastSupabaseRealtime: function (notif) {
            if (this._supabaseChannel && typeof this._supabaseChannel.send === 'function') {
                try {
                    this._supabaseChannel.send({
                        type: 'broadcast',
                        event: 'habitat_notification',
                        payload: {
                            senderTabId: TAB_ID,
                            senderRole: notif.senderRole,
                            senderProfileId: notif.senderProfileId,
                            senderEmail: notif.senderEmail,
                            notification: notif
                        }
                    }).catch(() => { });
                } catch (e) { }
            }
        },

        initRealtimeWebSockets: function () {
            // A. Escuchar en BroadcastChannel local entre pestañas
            if (broadcastChannel && !this._broadcastInitialized) {
                this._broadcastInitialized = true;
                broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.type === 'HABITAT_REALTIME_NOTIF') {
                        this.receiveIncomingNotification(event.data);
                    }
                };
            }

            // B. Escuchar en Storage Event (multi-tab sync)
            if (!this._storageListenerInitialized) {
                this._storageListenerInitialized = true;
                window.addEventListener('storage', (e) => {
                    if (e.key === NOTIF_STORAGE_KEY) {
                        this.updateBadge();
                        this.renderDropdown();
                    }
                    if (e.key === 'habitat_tenant_applications' || e.key === 'habitat_contracts') {
                        window.dispatchEvent(new CustomEvent('habitat:application_updated'));
                        window.dispatchEvent(new CustomEvent('habitat:contract_updated'));
                    }
                });
            }

            // Si ya está suscrito el canal de Supabase, no recrear
            if (this._supabaseChannel) return;

            // C. Suscribirse al canal Supabase Realtime (Broadcast + Postgres Changes)
            if (window.supabaseClient && typeof window.supabaseClient.channel === 'function') {
                try {
                    // Limpiar cualquier canal previo con el mismo topic para evitar conflictos de callbacks
                    if (typeof window.supabaseClient.getChannels === 'function') {
                        const existingChannels = window.supabaseClient.getChannels() || [];
                        const prev = existingChannels.find(c => c.topic === 'realtime:habitat-realtime-global-channel');
                        if (prev) {
                            try { window.supabaseClient.removeChannel(prev); } catch (e) {}
                        }
                    }

                    const channel = window.supabaseClient.channel('habitat-realtime-global-channel');
                    channel
                        // 1. Mensajes directos Broadcast
                        .on('broadcast', { event: 'habitat_notification' }, ({ payload }) => {
                            if (payload) {
                                this.receiveIncomingNotification(payload);
                            }
                        })
                        // 2. Postgres Changes: Nueva Solicitud (Postulación)
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Solicitud' }, async (payload) => {
                            const newSol = payload.new;
                            if (!newSol) return;
                            console.log('[Supabase Realtime] Nueva Solicitud detectada:', newSol);
                            window.dispatchEvent(new CustomEvent('habitat:application_updated', { detail: newSol }));

                            let uLocal = {};
                            try {
                                uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                            } catch (e) {}
                            const myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;
                            const currentRole = getActiveUserRole();

                            // Si yo soy el solicitante o mi rol activo es inquilino, NO notificarme de "Nueva postulación recibida"
                            if (newSol.id_perfil && myProfileId && String(newSol.id_perfil) === String(myProfileId)) {
                                return;
                            }
                            if (currentRole === 'TENANT') {
                                return;
                            }

                            const solNotifId = `notif_solicitud_${newSol.id_solicitud}`;
                            if (NotificationManager._processedNotifIds.has(solNotifId)) return;

                            let applicantName = 'Un inquilino verificado';
                            let propTitle = 'tu propiedad';
                            try {
                                if (newSol.id_perfil) {
                                    const { data: p } = await window.supabaseClient.from('Perfil').select('nombre_completo').eq('id_perfil', newSol.id_perfil).maybeSingle();
                                    if (p?.nombre_completo) applicantName = p.nombre_completo;
                                }
                                if (newSol.id_publicacion) {
                                    const { data: pub } = await window.supabaseClient.from('Publicacion').select('descripcion, Propiedad(calle, numero)').eq('id_publicacion', newSol.id_publicacion).maybeSingle();
                                    if (pub?.Propiedad?.calle) propTitle = `${pub.Propiedad.calle} ${pub.Propiedad.numero || ''}`.trim();
                                    else if (pub?.descripcion) propTitle = pub.descripcion.split(' | ')[0];
                                }
                            } catch(e) {}

                            NotificationManager.receiveIncomingNotification({
                                id: solNotifId,
                                title: '🎉 ¡Nueva postulación recibida!',
                                message: `${applicantName} se ha postulado para alquilar "${propTitle}".`,
                                type: 'application',
                                icon: 'person_add',
                                link: 'administrador.html#postulaciones',
                                role: 'OWNER',
                                senderRole: 'TENANT',
                                senderProfileId: newSol.id_perfil
                            });
                        })
                        // 3. Postgres Changes: Firmas de Contrato
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'Firma_contrato' }, async (payload) => {
                            const firma = payload.new;
                            if (!firma) return;
                            console.log('[Supabase Realtime] Evento Firma_contrato detectado:', firma);
                            window.dispatchEvent(new CustomEvent('habitat:contract_updated', { detail: firma }));

                            const isSigned = ['sellada', 'completada', 'firmada'].includes(firma.estado_firma) || firma.didit_status === 'APPROVED';
                            if (!isSigned) return;

                            let uLocal = {};
                            try {
                                uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                            } catch (e) {}
                            const myEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                            const myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;
                            const currentRole = getActiveUserRole();

                            // Si yo fui quien firmó, no generar auto-notificación
                            if (firma.id_perfil && myProfileId && String(firma.id_perfil) === String(myProfileId)) {
                                return;
                            }
                            if (firma.email_firmante && myEmail && firma.email_firmante.toLowerCase().trim() === myEmail) {
                                return;
                            }

                            const isTenant = ['inquilino', 'tenant', 'TENANT', 'INQUILINO'].includes(firma.rol_firmante);
                            const contractIdNum = firma.id_contrato;
                            const ctrCode = `CTR-2026-${String(contractIdNum).padStart(4, '0')}`;

                            if (isTenant) {
                                // La firma la realizó el inquilino -> El destinatario es el PROPIETARIO
                                if (currentRole === 'TENANT') return;

                                const notifId = `notif_firma_tenant_${contractIdNum}`;
                                if (NotificationManager._processedNotifIds.has(notifId)) return;

                                NotificationManager.receiveIncomingNotification({
                                    id: notifId,
                                    title: '✍️ ¡El inquilino firmó el contrato!',
                                    message: `El locatario completó su firma digital para el contrato ${ctrCode}. Ya puedes ingresar a firmar como propietario.`,
                                    type: 'contract',
                                    icon: 'draw',
                                    link: `contratos.html?contract=${ctrCode}&sign=1&role=OWNER`,
                                    role: 'OWNER',
                                    senderRole: 'TENANT',
                                    senderProfileId: firma.id_perfil
                                });
                            } else {
                                // La firma la realizó el propietario -> El destinatario es el INQUILINO
                                if (currentRole === 'OWNER') return;

                                const notifId = `notif_firma_owner_${contractIdNum}`;
                                if (NotificationManager._processedNotifIds.has(notifId)) return;

                                NotificationManager.receiveIncomingNotification({
                                    id: notifId,
                                    title: '✍️ ¡El propietario firmó el contrato!',
                                    message: `El propietario completó la firma del contrato ${ctrCode}. El documento se encuentra 100% sellado bajo Ley 25.506.`,
                                    type: 'contract',
                                    icon: 'verified_user',
                                    link: `contratos.html?contract=${ctrCode}&role=TENANT`,
                                    role: 'TENANT',
                                    senderRole: 'OWNER',
                                    senderProfileId: firma.id_perfil
                                });
                            }
                        })
                        // 4. Postgres Changes: Contrato
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'Contrato' }, (payload) => {
                            window.dispatchEvent(new CustomEvent('habitat:contract_updated', { detail: payload.new }));
                        })
                        // 5. Postgres Changes: Mensajes de Chat en Negociación de Contratos
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Mensaje_Contrato' }, async (payload) => {
                            const newMsg = payload.new;
                            if (!newMsg) return;

                            // Comprobar si el mensaje fue enviado por el usuario actual
                            let isMe = false;
                            try {
                                const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                                const myEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                                const myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;

                                if (myEmail && newMsg.remitente_email && myEmail === newMsg.remitente_email.toLowerCase().trim()) {
                                    isMe = true;
                                }
                                if (myProfileId && newMsg.id_perfil && String(myProfileId) === String(newMsg.id_perfil)) {
                                    isMe = true;
                                }
                                if (window.supabaseClient) {
                                    const { data: { session } } = await window.supabaseClient.auth.getSession();
                                    if (session?.user?.email && newMsg.remitente_email && session.user.email.toLowerCase().trim() === newMsg.remitente_email.toLowerCase().trim()) {
                                        isMe = true;
                                    }
                                }
                            } catch (e) {}

                            if (isMe) return; // No generar notificación de mi propio mensaje

                            const senderName = newMsg.remitente_nombre || (newMsg.remitente_rol ? `Usuario (${newMsg.remitente_rol})` : 'Nuevo mensaje');
                            const msgSnippet = newMsg.mensaje ? (newMsg.mensaje.length > 80 ? newMsg.mensaje.substring(0, 80) + '...' : newMsg.mensaje) : 'Nueva propuesta en el contrato';

                            let chatLink = 'administrador.html#chat-negociacion';
                            if (window.location.pathname.includes('panel-corredor')) {
                                chatLink = 'panel-corredor.html#chat-negociacion';
                            } else if (window.location.pathname.includes('tu-alquiler')) {
                                chatLink = 'tu-alquiler.html#chat-negociacion';
                            } else if (window.location.pathname.includes('administrador')) {
                                chatLink = 'administrador.html#chat-negociacion';
                            } else if (newMsg.contract_ref_id) {
                                chatLink = `contratos.html?id=${newMsg.contract_ref_id}&tab=chat`;
                            }

                            NotificationManager.receiveIncomingNotification({
                                id: `notif_msg_${newMsg.id_mensaje || Date.now()}`,
                                title: `💬 Mensaje de ${senderName}`,
                                message: msgSnippet,
                                type: 'chat',
                                icon: 'forum',
                                link: chatLink,
                                role: 'ALL'
                            });
                        })
                        .subscribe((status) => {
                            console.log('[Supabase Realtime Notifications Status]:', status);
                        });

                    this._supabaseChannel = channel;
                } catch (e) {
                    console.warn('[Supabase Realtime Sub Error]:', e);
                }
            } else {
                setTimeout(() => {
                    if (window.supabaseClient && !this._supabaseChannel) {
                        this.initRealtimeWebSockets();
                    }
                }, 300);
            }
        },

        markAsRead: function (notifId) {
            let allStored = [];
            try {
                const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) allStored = parsed;
                }
            } catch (e) { }

            const target = allStored.find(n => n.id === notifId);
            if (target) {
                target.read = true;
                this.saveAll(allStored);
            }
        },

        markAllAsRead: function () {
            let allStored = [];
            try {
                const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) allStored = parsed;
                }
            } catch (e) { }

            const activeRole = getActiveUserRole();
            allStored.forEach(n => {
                if (n.role === 'ALL' || n.role === activeRole) {
                    n.read = true;
                }
            });
            this.saveAll(allStored);
        },

        _activeToastKeys: new Set(),

        showToast: function (notif) {
            if (!notif || !notif.title) return;
            
            // Deduplicación estricta en memoria por clave para evitar toasts dobles por Realtime / Broadcast
            const toastKey = (notif.id || '') + '::' + (notif.title || '') + '::' + (notif.message || '').substring(0, 30);
            if (this._activeToastKeys.has(toastKey)) {
                return;
            }
            this._activeToastKeys.add(toastKey);
            setTimeout(() => {
                this._activeToastKeys.delete(toastKey);
            }, 10000);

            let container = document.getElementById('habitat-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'habitat-toast-container';
                container.className = 'fixed top-20 right-4 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm w-full font-body';
                document.body.appendChild(container);
            }

            // Si ya existe un toast visible con el mismo ID o mismo título en el contenedor, ignorar
            if (notif.id && container.querySelector(`[data-toast-id="${notif.id}"]`)) {
                return;
            }

            const toast = document.createElement('div');
            if (notif.id) toast.setAttribute('data-toast-id', notif.id);
            toast.className = 'pointer-events-auto transform transition-all duration-300 ease-out translate-y-[-20px] opacity-0 scale-95 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 flex gap-3.5 items-start text-zinc-900 dark:text-white border-l-4 border-l-primary dark:border-l-red-500';

            const esc = window.escapeHtml || (s => s);
            const safeTitle = esc(notif.title);
            const safeMsg = esc(notif.message);
            const safeIcon = esc(notif.icon || 'notifications');
            const safeLink = notif.link ? esc(notif.link) : '';

            toast.innerHTML = `
                <div class="w-9 h-9 rounded-xl bg-primary/10 dark:bg-red-950/60 text-primary dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-lg">${safeIcon}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="font-headline font-bold text-xs leading-snug text-zinc-900 dark:text-white">${safeTitle}</h4>
                        <button type="button" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-1 close-toast-btn cursor-pointer">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <p class="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">${safeMsg}</p>
                    ${safeLink && safeLink !== '#' ? `
                        <div class="mt-2.5">
                            <a href="${safeLink}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer">
                                <span>Ver y Firmar</span>
                                <span class="material-symbols-outlined text-xs">arrow_forward</span>
                            </a>
                        </div>
                    ` : ''}
                </div>
            `;

            container.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-[-20px]', 'opacity-0', 'scale-95');
                toast.classList.add('translate-y-0', 'opacity-100', 'scale-100');
            });

            const closeBtn = toast.querySelector('.close-toast-btn');
            const dismiss = () => {
                toast.classList.remove('translate-y-0', 'opacity-100', 'scale-100');
                toast.classList.add('translate-y-[-10px]', 'opacity-0', 'scale-95');
                setTimeout(() => toast.remove(), 300);
            };

            if (closeBtn) closeBtn.onclick = dismiss;
            setTimeout(dismiss, 7000);
        },

        updateBadge: function () {
            const count = this.getUnreadCount();
            const badgeEls = document.querySelectorAll('.notification-badge-counter');
            badgeEls.forEach(b => {
                if (count > 0) {
                    b.textContent = count > 9 ? '9+' : count;
                    b.classList.remove('hidden');
                    b.style.display = 'flex';
                } else {
                    b.classList.add('hidden');
                    b.style.display = 'none';
                }
            });
        },

        toggleDropdown: function (event, type = 'desktop') {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            const isMobile = type === 'mobile';
            const panel = isMobile 
                ? document.getElementById('habitat-notif-dropdown-panel-mobile') 
                : document.getElementById('habitat-notif-dropdown-panel');

            if (!panel) {
                return;
            }

            const isCurrentlyHidden = panel.classList.contains('hidden');

            document.querySelectorAll('#habitat-notif-dropdown-panel, #habitat-notif-dropdown-panel-mobile').forEach(p => {
                p.classList.add('hidden');
            });

            if (isCurrentlyHidden) {
                panel.classList.remove('hidden');
                this.renderDropdown();
            }
        },

        renderDropdown: function () {
            const targets = document.querySelectorAll('#notifications-dropdown-menu, #notifications-dropdown-menu-mobile, .notifications-dropdown-menu-target');
            if (!targets || targets.length === 0) return;

            const list = this.getAll();
            const unreadCount = list.filter(n => !n.read).length;

            targets.forEach(container => {
                if (list.length === 0) {
                    container.innerHTML = `
                        <div class="p-8 text-center text-zinc-400 space-y-2">
                            <span class="material-symbols-outlined text-3xl">notifications_off</span>
                            <p class="text-xs font-semibold">No tienes notificaciones por el momento</p>
                        </div>
                    `;
                    return;
                }

                container.innerHTML = `
                    <div class="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <h4 class="font-headline font-black text-sm text-zinc-900 dark:text-white">Notificaciones</h4>
                            ${unreadCount > 0 ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950/80 text-primary dark:text-red-400">${unreadCount} nuevas</span>` : ''}
                        </div>
                        ${unreadCount > 0 ? `
                            <button type="button" onclick="window.NotificationManager.markAllAsRead()" class="text-[11px] font-bold text-primary dark:text-red-400 hover:underline cursor-pointer">
                                Marcar leídas
                            </button>
                        ` : ''}
                    </div>
                    <div class="max-h-[380px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
                        ${list.map(n => {
                            const esc = window.escapeHtml || (s => s);
                            const safeNId = esc(n.id);
                            const safeNTitle = esc(n.title);
                            const safeNMsg = esc(n.message);
                            const safeNIcon = esc(n.icon || 'notifications');
                            const safeNLink = n.link ? esc(n.link) : '';
                            const dateStr = new Date(n.createdAt).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                            return `
                                <div onclick="window.NotificationManager.markAsRead('${safeNId}'); if('${safeNLink}' && '${safeNLink}' !== '#') window.location.href='${safeNLink}';" class="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex gap-3 items-start ${!n.read ? 'bg-red-50/40 dark:bg-red-950/20' : ''}">
                                    <div class="w-8 h-8 rounded-xl ${!n.read ? 'bg-primary text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'} flex items-center justify-center shrink-0 mt-0.5">
                                        <span class="material-symbols-outlined text-base">${safeNIcon}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between gap-1">
                                            <h5 class="font-headline font-bold text-xs text-zinc-900 dark:text-white truncate ${!n.read ? 'font-extrabold' : ''}">${safeNTitle}</h5>
                                            <span class="text-[10px] text-zinc-400 shrink-0 font-medium">${dateStr}</span>
                                        </div>
                                        <p class="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">${safeNMsg}</p>
                                        ${safeNLink && safeNLink !== '#' ? `
                                            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-red-400 mt-1.5 hover:underline">
                                                <span>Acceder</span>
                                                <span class="material-symbols-outlined text-xs">arrow_forward</span>
                                            </span>
                                        ` : ''}
                                    </div>
                                    ${!n.read ? `<span class="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5"></span>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="p-2.5 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-100 dark:border-zinc-800 text-center">
                        <a href="configuracion.html" class="text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
                            Preferencias de Notificación
                        </a>
                    </div>
                `;
            });

            this.updateBadge();
        },

        initUI: function () {
            // Vincular botones existentes
            const desktopBell = document.getElementById('habitat-notif-bell-btn');
            if (desktopBell && !desktopBell.__notifBound) {
                desktopBell.__notifBound = true;
                desktopBell.onclick = (e) => this.toggleDropdown(e, 'desktop');
            }

            const mobileBell = document.getElementById('habitat-notif-bell-btn-mobile');
            if (mobileBell && !mobileBell.__notifBound) {
                mobileBell.__notifBound = true;
                mobileBell.onclick = (e) => this.toggleDropdown(e, 'mobile');
            }

            // Inyectar en caso de que no existan en el navbar
            const containers = document.querySelectorAll('#desktop-auth-container, #mobile-auth-container');
            containers.forEach(container => {
                if (!container || container.querySelector('.habitat-notif-btn-wrapper')) return;

                const isMobile = container.id === 'mobile-auth-container';
                const wrapper = document.createElement('div');
                wrapper.className = isMobile
                    ? 'relative habitat-notif-btn-wrapper auth-ui-state logged-in hidden flex items-center mr-2 sm:mr-3.5'
                    : 'relative habitat-notif-btn-wrapper auth-ui-state logged-in hidden flex items-center mr-2';
                wrapper.innerHTML = isMobile ? `
                    <button type="button" id="habitat-notif-bell-btn-mobile" aria-label="Notificaciones" class="relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-base">notifications</span>
                        <span class="notification-badge-counter absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-black items-center justify-center shadow-xs hidden">0</span>
                    </button>
                    <div id="habitat-notif-dropdown-panel-mobile" class="absolute right-0 top-10 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hidden z-[99999] overflow-hidden">
                        <div id="notifications-dropdown-menu-mobile" class="notifications-dropdown-menu-target"></div>
                    </div>
                ` : `
                    <button type="button" id="habitat-notif-bell-btn" aria-label="Notificaciones" class="relative w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-lg xl:text-xl">notifications</span>
                        <span class="notification-badge-counter absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black items-center justify-center shadow-xs hidden">0</span>
                    </button>
                    <div id="habitat-notif-dropdown-panel" class="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hidden z-[99999] overflow-hidden">
                        <div id="notifications-dropdown-menu" class="notifications-dropdown-menu-target"></div>
                    </div>
                `;

                container.insertBefore(wrapper, container.firstChild);

                const btn = wrapper.querySelector('button');
                if (btn) {
                    btn.onclick = (e) => this.toggleDropdown(e, isMobile ? 'mobile' : 'desktop');
                }
            });

            // Cerrar al hacer click afuera
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.habitat-notif-btn-wrapper')) {
                    document.querySelectorAll('#habitat-notif-dropdown-panel, #habitat-notif-dropdown-panel-mobile').forEach(p => p.classList.add('hidden'));
                }
            });

            this.updateBadge();
            this.initRealtimeWebSockets();
        }
    };

    window.NotificationManager = NotificationManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NotificationManager.initUI());
    } else {
        NotificationManager.initUI();
    }

    window.addEventListener('focus', () => {
        if (window.NotificationManager) {
            window.NotificationManager.updateBadge();
            window.NotificationManager.renderDropdown();
        }
    });
})();
