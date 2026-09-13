/**
 * Vivat - Sistema Central de Notificaciones In-App en Tiempo Real
 * Gestiona alertas instantáneas en vivo mediante Supabase Realtime (WebSockets),
 * BroadcastChannel (cross-tab) y sincronización reactiva de eventos de almacenamiento.
 */

(function () {
    'use strict';

    const NOTIF_STORAGE_KEY = 'vivat_in_app_notifications';
    const BROADCAST_CHANNEL_NAME = 'vivat_notifications_realtime_channel';

    // Generar un ID único por pestaña para evitar loops de eco
    let TAB_ID = null;
    try {
        TAB_ID = sessionStorage.getItem('vivat_tab_session_id');
        if (!TAB_ID) {
            TAB_ID = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
            sessionStorage.setItem('vivat_tab_session_id', TAB_ID);
        }
    } catch(e) {
        TAB_ID = 'tab_' + Date.now();
    }

    const DEFAULT_NOTIFICATIONS = [
        {
            id: 'notif_welcome_01',
            title: '¡Bienvenido a Vivat! 🏠',
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
        const storedRole = localStorage.getItem('vivat_active_role') || localStorage.getItem('vivat_user_role') || localStorage.getItem('vivat_user_type');
        if (storedRole) {
            const up = storedRole.toUpperCase();
            if (up === 'INQUILINO' || up === 'TENANT') return 'TENANT';
            if (up === 'PROPIETARIO' || up === 'OWNER') return 'OWNER';
            if (up === 'CORREDOR' || up === 'BROKER') return 'BROKER';
        }
        return 'TENANT';
    }

    function getNotificationActionLabel(notif) {
        if (notif?.actionLabel) return String(notif.actionLabel);

        const type = String(notif?.type || '').toLowerCase();
        if (type === 'pago_informado') return 'Revisar pago';
        if (type.startsWith('pago_') || type === 'interes_perdonado') return 'Ver pago';
        if (type.startsWith('mantenimiento_')) return 'Ver ticket';
        if (type.startsWith('visita_') || type === 'visita') return 'Ver visita';
        if (type.startsWith('postulacion_') || type === 'application') return 'Ver postulación';
        if (type.startsWith('firma_') || type.startsWith('contrato_') || type === 'contract') return 'Ver contrato';
        return 'Ver detalle';
    }

    // Comprobar si el usuario actual es el destinatario de la notificación
    function isTargetRecipient(notif) {
        if (!notif) return false;
        const currentRole = getActiveUserRole();
        let uLocal = {};
        try {
            uLocal = JSON.parse(localStorage.getItem('vivat_user') || '{}');
        } catch (e) {}
        let myEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
        let myProfileId = uLocal.id_perfil || uLocal.profileId || uLocal.id;

        if (!myEmail && window.ContractsManager && typeof window.ContractsManager.resolveCurrentUserInfo === 'function') {
            try {
                const cUser = window.ContractsManager.resolveCurrentUserInfo();
                if (cUser?.email) myEmail = cUser.email.toLowerCase().trim();
                if (cUser?.profileId && !myProfileId) myProfileId = cUser.profileId;
            } catch(e) {}
        }

        // Si la notificación apunta a un perfil o email específico:
        if (notif.targetProfileId && myProfileId && String(notif.targetProfileId) !== String(myProfileId)) {
            return false;
        }
        if (notif.targetEmail && myEmail && notif.targetEmail.toLowerCase().trim() !== myEmail) {
            return false;
        }

        // Si es un mensaje de chat: nunca mostrar notificación si proviene de mí mismo
        if (notif.type === 'chat' || notif.type === 'message') {
            if (NotificationManager && typeof NotificationManager.isOwnMessage === 'function' && NotificationManager.isOwnMessage(notif.id || notif.messageId)) {
                return false;
            }
            if (notif.senderEmail && myEmail && notif.senderEmail.toLowerCase().trim() === myEmail) {
                return false;
            }
            if (notif.senderProfileId && myProfileId && String(notif.senderProfileId) === String(myProfileId)) {
                return false;
            }
            // Inquilino no recibe notificaciones de mensajes emitidos por Inquilino (y viceversa)
            if (notif.senderRole && notif.senderRole.toUpperCase() === currentRole) {
                return false;
            }
        }

        // Si viene remitente explícito y coincide con el usuario activo:
        const isSender = (notif.senderTabId && notif.senderTabId === TAB_ID) ||
                         (notif.senderEmail && myEmail && notif.senderEmail.toLowerCase().trim() === myEmail) ||
                         (notif.senderProfileId && myProfileId && String(notif.senderProfileId) === String(myProfileId)) ||
                         (NotificationManager && typeof NotificationManager.isOwnMessage === 'function' && NotificationManager.isOwnMessage(notif.id));

        // Si fui yo quien la envió, nunca auto-notificarme
        if (isSender) {
            if (notif.type === 'chat' || notif.type === 'message') {
                return false;
            }
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
        _mySentMessageIds: new Set(),

        registerOwnMessage: function (msgId) {
            if (!msgId) return;
            const raw = String(msgId);
            const cleanId = raw.replace('notif_msg_', '');
            this._mySentMessageIds.add(cleanId);
            this._mySentMessageIds.add(raw);
            this._processedNotifIds.add(`notif_msg_${cleanId}`);
            this._processedNotifIds.add(raw);
            try {
                const stored = JSON.parse(sessionStorage.getItem('vivat_my_sent_messages') || '[]');
                if (!stored.includes(cleanId)) {
                    stored.push(cleanId);
                    if (stored.length > 100) stored.shift();
                    sessionStorage.setItem('vivat_my_sent_messages', JSON.stringify(stored));
                }
            } catch (e) {}
        },

        isOwnMessage: function (msgId) {
            if (!msgId) return false;
            const raw = String(msgId);
            const cleanId = raw.replace('notif_msg_', '');
            if (this._mySentMessageIds.has(cleanId) || this._mySentMessageIds.has(raw)) {
                return true;
            }
            try {
                const stored = JSON.parse(sessionStorage.getItem('vivat_my_sent_messages') || '[]');
                if (stored.includes(cleanId) || stored.includes(raw)) {
                    this._mySentMessageIds.add(cleanId);
                    this._mySentMessageIds.add(raw);
                    return true;
                }
            } catch (e) {}
            return false;
        },

        initMySentMessages: function () {
            try {
                const stored = JSON.parse(sessionStorage.getItem('vivat_my_sent_messages') || '[]');
                if (Array.isArray(stored)) {
                    stored.forEach(id => {
                        this._mySentMessageIds.add(id);
                        this._processedNotifIds.add(`notif_msg_${id}`);
                    });
                }
            } catch (e) {}
        },

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

            return storedList.filter(n => isTargetRecipient(n));
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
            
            const generateUUID = () => {
                if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };
            
            const notifId = id || generateUUID();

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
                uLocal = JSON.parse(localStorage.getItem('vivat_user') || '{}');
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

            // A browser must not be able to forge a notification, select an
            // arbitrary recipient, or impersonate its sender. Durable and
            // cross-device notifications are created by trusted server flows;
            // this client notification remains local/realtime only.

            // 1. Enviar vía BroadcastChannel para otras pestañas abiertas
            if (broadcastChannel) {
                try {
                    broadcastChannel.postMessage({
                        type: 'VIVAT_REALTIME_NOTIF',
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
            window.dispatchEvent(new CustomEvent('vivat:application_updated', { detail: newNotif }));
            window.dispatchEvent(new CustomEvent('vivat:contract_updated', { detail: newNotif }));

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
            const senderTabId = payload.senderTabId || payload.notification?.senderTabId;
            const notif = payload.notification || payload;

            // Ignorar si provino de esta misma pestaña (evita loop de eco)
            if (senderTabId && senderTabId === TAB_ID) return;
            if (!notif || !notif.id) return;
            if (this._processedNotifIds.has(notif.id)) return;

            // Si es un mensaje de chat enviado por mí mismo en cualquier pestaña, silenciar
            if ((notif.type === 'chat' || notif.type === 'message') && this.isOwnMessage(notif.id)) {
                this._processedNotifIds.add(notif.id);
                return;
            }

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

            window.dispatchEvent(new CustomEvent('vivat:application_updated', { detail: notif }));
            window.dispatchEvent(new CustomEvent('vivat:contract_updated', { detail: notif }));
        },

        add: function (payload) {
            return this.createNotification(payload);
        },

        _supabaseChannel: null,

        broadcastSupabaseRealtime: function (notif) {
            if (this._supabaseChannel && typeof this._supabaseChannel.send === 'function') {
                try {
                    if (notif) notif.senderTabId = TAB_ID;
                    this._supabaseChannel.send({
                        type: 'broadcast',
                        event: 'vivat_notification',
                        payload: {
                            senderTabId: TAB_ID,
                            senderRole: notif.senderRole,
                            senderProfileId: notif.senderProfileId,
                            senderEmail: notif.senderEmail,
                            senderName: notif.senderName,
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
                    if (event.data && event.data.type === 'VIVAT_REALTIME_NOTIF') {
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
                    if (e.key === 'vivat_tenant_applications' || e.key === 'vivat_contracts') {
                        window.dispatchEvent(new CustomEvent('vivat:application_updated'));
                        window.dispatchEvent(new CustomEvent('vivat:contract_updated'));
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
                        const prev = existingChannels.find(c => c.topic === 'realtime:vivat-realtime-global-channel');
                        if (prev) {
                            try { window.supabaseClient.removeChannel(prev); } catch (e) {}
                        }
                    }

                    const channel = window.supabaseClient.channel('vivat-realtime-global-channel', {
                        config: { broadcast: { self: false } }
                    });
                    channel
                        // 1. Mensajes directos Broadcast
                        .on('broadcast', { event: 'vivat_notification' }, ({ payload }) => {
                            if (payload) {
                                this.receiveIncomingNotification(payload);
                            }
                        })
                        // 2. Postgres Changes: notificaciones persistentes.
                        // No se usa el payload directamente: se vuelve a leer por
                        // REST con la sesión actual, que aplica RLS y confirma que
                        // la notificación pertenece al perfil autenticado.
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Notificacion' }, async (payload) => {
                            const dbNotification = payload.new;
                            if (!dbNotification?.id_notificacion) return;

                            await NotificationManager.fetchFromDB(true);
                        })
                        // 3. Postgres Changes: Nueva Solicitud (Postulación)
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Solicitud' }, async (payload) => {
                            const newSol = payload.new;
                            if (!newSol) return;
                            console.log('[Supabase Realtime] Nueva Solicitud detectada:', newSol);
                            window.dispatchEvent(new CustomEvent('vivat:application_updated', { detail: newSol }));
                        })
                        // 4. Postgres Changes: Firmas de Contrato
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'Firma_contrato' }, async (payload) => {
                            const firma = payload.new;
                            if (!firma) return;
                            console.log('[Supabase Realtime] Evento Firma_contrato detectado:', firma);
                            window.dispatchEvent(new CustomEvent('vivat:contract_updated', { detail: firma }));
                        })
                        // 5. Postgres Changes: Contrato
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'Contrato' }, (payload) => {
                            window.dispatchEvent(new CustomEvent('vivat:contract_updated', { detail: payload.new }));
                        })
                        // 6. Postgres Changes: Mensajes de Chat en Negociación de Contratos
                        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Mensaje_Contrato' }, async (payload) => {
                            const newMsg = payload.new;
                            if (!newMsg) return;

                            // 1. Notificar siempre al visor de chat local para actualizar mensajes en vivo entre pestañas
                            window.dispatchEvent(new CustomEvent('vivat:new_chat_message', { detail: newMsg }));
                        })
                        .subscribe((status) => {
                            console.log('[Supabase Realtime Notifications Status]:', status);
                            if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
                                if (this._supabaseChannel === channel) {
                                    this._supabaseChannel = null;
                                }
                                if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && document.visibilityState !== 'hidden') {
                                    clearTimeout(this._reconnectTimer);
                                    this._reconnectTimer = setTimeout(() => {
                                        if (!this._supabaseChannel && document.visibilityState !== 'hidden') {
                                            console.log('[Supabase Realtime] Reintentando conexión tras error de canal...');
                                            this.initRealtimeWebSockets();
                                        }
                                    }, 4000);
                                }
                            }
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

        cleanupRealtime: function () {
            if (this._supabaseChannel) {
                try {
                    if (window.supabaseClient && typeof window.supabaseClient.removeChannel === 'function') {
                        window.supabaseClient.removeChannel(this._supabaseChannel);
                    }
                } catch (e) {}
                this._supabaseChannel = null;
            }
        },

        reconnectRealtime: function () {
            this.cleanupRealtime();
            this.initRealtimeWebSockets();
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
                
                if (window.supabaseClient) {
                    window.supabaseClient.from('Notificacion').update({ leida: true }).eq('id_notificacion', notifId).then();
                }
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
            let unreadIds = [];
            allStored.forEach(n => {
                if ((n.role === 'ALL' || n.role === activeRole) && !n.read) {
                    n.read = true;
                    unreadIds.push(n.id);
                }
            });
            this.saveAll(allStored);
            
            if (window.supabaseClient && unreadIds.length > 0) {
                window.supabaseClient.from('Notificacion').update({ leida: true }).in('id_notificacion', unreadIds).then();
            }
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

            let container = document.getElementById('vivat-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'vivat-toast-container';
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
            const safeActionLabel = esc(getNotificationActionLabel(notif));

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
                    ${safeLink && safeLink !== '#' && notif.type !== 'chat' ? `
                        <div class="mt-2.5">
                            <a href="${safeLink}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer">
                                <span>${safeActionLabel}</span>
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
                ? document.getElementById('vivat-notif-dropdown-panel-mobile') 
                : document.getElementById('vivat-notif-dropdown-panel');

            if (!panel) {
                return;
            }

            const isCurrentlyHidden = panel.classList.contains('hidden');

            document.querySelectorAll('#vivat-notif-dropdown-panel, #vivat-notif-dropdown-panel-mobile').forEach(p => {
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
                            const safeNActionLabel = esc(getNotificationActionLabel(n));
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
                                                <span>${safeNActionLabel}</span>
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

        fetchFromDB: async function (showLatestToast = false) {
            if (!window.supabaseClient) return;
            
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (!session) return;
                
                const { data: authData } = await window.supabaseClient.auth.getUser();
                const authUser = authData?.user;
                if (!authUser) return;
                const { data: profile, error: profileError } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil')
                    .eq('user_id', authUser.id)
                    .maybeSingle();
                if (profileError || !profile?.id_perfil) return;

                // Never derive authorization from a mutable role or localStorage.
                // Backend jobs must fan out broad announcements to individual
                // recipients before saving them.
                const query = window.supabaseClient
                    .from('Notificacion')
                    .select('*')
                    .eq('id_perfil_destino', profile.id_perfil)
                    .order('creado_en', { ascending: false })
                    .limit(40);
                
                const { data, error } = await query;

                if (error) {
                    console.error('[Notificaciones] Error al descargar de DB:', error);
                    return;
                }
                
                if (data && data.length > 0) {
                    let allStored = [];
                    try {
                        const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                        if (raw) {
                            const parsed = JSON.parse(raw);
                            if (Array.isArray(parsed)) allStored = parsed;
                        }
                    } catch (e) { }

                    let hasNew = false;
                    const freshNotifications = [];
                    data.reverse().forEach(dbn => {
                        const localFormat = {
                            id: dbn.id_notificacion,
                            title: dbn.titulo,
                            message: dbn.mensaje,
                            type: dbn.tipo,
                            icon: dbn.icono,
                            link: dbn.enlace,
                            role: dbn.rol_destino,
                            read: dbn.leida,
                            createdAt: dbn.creado_en,
                            senderRole: dbn.rol_emisor,
                            senderProfileId: dbn.id_perfil_emisor,
                            targetProfileId: dbn.id_perfil_destino
                        };
                        
                        // Authorization was enforced by the authenticated
                        // profile filter above (and again by RLS). Do not let
                        // mutable local role state hide or reclassify it.
                        const idx = allStored.findIndex(n => n.id === localFormat.id);
                        if (idx >= 0) {
                            if (allStored[idx].read !== localFormat.read) {
                                allStored[idx].read = localFormat.read;
                                hasNew = true;
                            }
                        } else {
                            allStored.unshift(localFormat);
                            if (!this._processedNotifIds.has(localFormat.id)) {
                                freshNotifications.push(localFormat);
                            }
                            this._processedNotifIds.add(localFormat.id);
                            hasNew = true;
                        }
                    });
                    
                    if (hasNew) {
                        allStored.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                        if (allStored.length > 40) allStored = allStored.slice(0, 40);
                        localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(allStored));
                        this.updateBadge();
                        this.renderDropdown();

                        if (showLatestToast && freshNotifications.length > 0) {
                            freshNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                            this.showToast(freshNotifications[0]);
                            playNotificationChime();
                        }
                    }
                }
            } catch (err) {
                console.error('[Notificaciones] Exception fetchFromDB:', err);
            }
        },

        initUI: function () {
            this.initMySentMessages();

            // Vincular botones existentes
            const desktopBell = document.getElementById('vivat-notif-bell-btn');
            if (desktopBell && !desktopBell.__notifBound) {
                desktopBell.__notifBound = true;
                desktopBell.onclick = (e) => this.toggleDropdown(e, 'desktop');
            }

            const mobileBell = document.getElementById('vivat-notif-bell-btn-mobile');
            if (mobileBell && !mobileBell.__notifBound) {
                mobileBell.__notifBound = true;
                mobileBell.onclick = (e) => this.toggleDropdown(e, 'mobile');
            }

            // Inyectar en caso de que no existan en el navbar
            const containers = document.querySelectorAll('#desktop-auth-container, #mobile-auth-container');
            containers.forEach(container => {
                if (!container || container.querySelector('.vivat-notif-btn-wrapper')) return;

                const isMobile = container.id === 'mobile-auth-container';
                const wrapper = document.createElement('div');
                wrapper.className = isMobile
                    ? 'relative vivat-notif-btn-wrapper auth-ui-state logged-in hidden flex items-center mr-2 sm:mr-3.5'
                    : 'relative vivat-notif-btn-wrapper auth-ui-state logged-in hidden flex items-center mr-2';
                wrapper.innerHTML = isMobile ? `
                    <button type="button" id="vivat-notif-bell-btn-mobile" aria-label="Notificaciones" class="relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-base">notifications</span>
                        <span class="notification-badge-counter absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-white text-[9px] font-black items-center justify-center shadow-xs hidden">0</span>
                    </button>
                    <div id="vivat-notif-dropdown-panel-mobile" class="absolute right-0 top-10 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hidden z-[99999] overflow-hidden">
                        <div id="notifications-dropdown-menu-mobile" class="notifications-dropdown-menu-target"></div>
                    </div>
                ` : `
                    <button type="button" id="vivat-notif-bell-btn" aria-label="Notificaciones" class="relative w-9 h-9 xl:w-10 xl:h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center transition-all cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-lg xl:text-xl">notifications</span>
                        <span class="notification-badge-counter absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-white text-[10px] font-black items-center justify-center shadow-xs hidden">0</span>
                    </button>
                    <div id="vivat-notif-dropdown-panel" class="absolute right-0 top-12 w-80 sm:w-96 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 hidden z-[99999] overflow-hidden">
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
                if (!e.target.closest('.vivat-notif-btn-wrapper')) {
                    document.querySelectorAll('#vivat-notif-dropdown-panel, #vivat-notif-dropdown-panel-mobile').forEach(p => p.classList.add('hidden'));
                }
            });

            this.updateBadge();
            this.initRealtimeWebSockets();
            this.fetchFromDB();
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
            // Recupera inserciones persistentes que hayan llegado mientras la
            // pestaña no tenía foco o el canal estaba reconectándose.
            window.NotificationManager.fetchFromDB();
            window.NotificationManager.updateBadge();
            window.NotificationManager.renderDropdown();
            if (!window.NotificationManager._supabaseChannel) {
                window.NotificationManager.initRealtimeWebSockets();
            }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && window.NotificationManager) {
            window.NotificationManager.fetchFromDB();
            if (!window.NotificationManager._supabaseChannel) {
                window.NotificationManager.initRealtimeWebSockets();
            }
        }
    });

    // Soporte para Back-Forward Cache (bfcache) de los navegadores
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && window.NotificationManager) {
            console.log('[Realtime Notifications] Página restaurada desde bfcache. Reconectando...');
            window.NotificationManager.reconnectRealtime();
        }
    });

    window.addEventListener('pagehide', () => {
        if (window.NotificationManager) {
            window.NotificationManager.cleanupRealtime();
        }
    });
})();
