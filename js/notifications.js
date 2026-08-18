/**
 * Habitat - Sistema Central de Notificaciones In-App
 * Gestiona alertas en tiempo real, notificaciones de aceptación de postulaciones,
 * recordatorios de firma de contratos biométricos y avisos del propietario/inquilino.
 */

(function () {
    'use strict';

    const NOTIF_STORAGE_KEY = 'habitat_in_app_notifications';

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

    const NotificationManager = {
        getAll: function () {
            try {
                const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch (e) { }
            return [...DEFAULT_NOTIFICATIONS];
        },

        saveAll: function (list) {
            try {
                localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
            } catch (e) { }
            this.updateBadge();
        },

        getByRole: function (role) {
            const all = this.getAll();
            if (!role || role === 'ALL') return all;
            return all.filter(n => n.role === 'ALL' || n.role === role || (role === 'TENANT' && n.role === 'TENANT') || (role === 'OWNER' && n.role === 'OWNER'));
        },

        getUnreadCount: function (role) {
            const list = this.getByRole(role);
            return list.filter(n => !n.read).length;
        },

        createNotification: function ({ title, message, type = 'contract', link = '#', role = 'ALL', icon = null }) {
            const list = this.getAll();

            let resolvedIcon = icon;
            if (!resolvedIcon) {
                if (type === 'contract' || message.toLowerCase().includes('firm') || title.toLowerCase().includes('firm')) {
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

            const newNotif = {
                id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                title,
                message,
                type,
                icon: resolvedIcon,
                link,
                role,
                read: false,
                createdAt: new Date().toISOString()
            };

            // Evitar duplicados idénticos recientes
            const existingDuplicate = list.find(n => n.title === title && (!n.read || (Date.now() - new Date(n.createdAt).getTime()) < 15000));
            if (!existingDuplicate) {
                list.unshift(newNotif);
                this.saveAll(list);
                this.showToast(newNotif);
            }

            return newNotif;
        },

        markAsRead: function (notifId) {
            const list = this.getAll();
            const target = list.find(n => n.id === notifId);
            if (target) {
                target.read = true;
                this.saveAll(list);
                this.renderDropdown();
            }
        },

        markAllAsRead: function () {
            const list = this.getAll();
            list.forEach(n => n.read = true);
            this.saveAll(list);
            this.renderDropdown();
        },

        showToast: function (notif) {
            let container = document.getElementById('habitat-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'habitat-toast-container';
                container.className = 'fixed top-20 right-4 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm w-full font-body';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            toast.className = 'pointer-events-auto transform transition-all duration-300 ease-out translate-y-[-20px] opacity-0 scale-95 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 flex gap-3.5 items-start text-zinc-900 dark:text-white border-l-4 border-l-primary dark:border-l-red-500';

            toast.innerHTML = `
                <div class="w-9 h-9 rounded-xl bg-primary/10 dark:bg-red-950/60 text-primary dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                    <span class="material-symbols-outlined text-lg">${notif.icon || 'notifications'}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <h4 class="font-headline font-bold text-xs leading-snug text-zinc-900 dark:text-white">${notif.title}</h4>
                        <button type="button" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs p-1 close-toast-btn cursor-pointer">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                    <p class="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">${notif.message}</p>
                    ${notif.link && notif.link !== '#' ? `
                        <div class="mt-2.5">
                            <a href="${notif.link}" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-container text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer">
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
                console.warn("Habitat Notifications: Panel not found for type", type);
                return;
            }

            const isCurrentlyHidden = panel.classList.contains('hidden');

            // Close all dropdowns first
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
                            const dateStr = new Date(n.createdAt).toLocaleDateString('es-AR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
                            return `
                                <div onclick="window.NotificationManager.markAsRead('${n.id}'); if('${n.link}' && '${n.link}' !== '#') window.location.href='${n.link}';" class="p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer flex gap-3 items-start ${!n.read ? 'bg-red-50/40 dark:bg-red-950/20' : ''}">
                                    <div class="w-8 h-8 rounded-xl ${!n.read ? 'bg-primary text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'} flex items-center justify-center shrink-0 mt-0.5">
                                        <span class="material-symbols-outlined text-base">${n.icon || 'notifications'}</span>
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center justify-between gap-1">
                                            <h5 class="font-headline font-bold text-xs text-zinc-900 dark:text-white truncate ${!n.read ? 'font-extrabold' : ''}">${n.title}</h5>
                                            <span class="text-[10px] text-zinc-400 shrink-0 font-medium">${dateStr}</span>
                                        </div>
                                        <p class="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">${n.message}</p>
                                        ${n.link && n.link !== '#' ? `
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

        syncSystemAlerts: function () {
            // Sincronizar postulaciones aceptadas pendientes de firma
            try {
                const rawApps = localStorage.getItem('habitat_tenant_applications');
                if (rawApps) {
                    const apps = JSON.parse(rawApps);
                    apps.forEach(app => {
                        if (['aceptada', 'aprobada'].includes(String(app.status || '').toLowerCase())) {
                            const contractId = app.contract_id || `CTR-2026-${String(app.id).replace(/\D/g, '').slice(-4) || '1042'}`;
                            const title = `¡Postulación Aprobada! Firma tu Contrato ✍️`;
                            const message = `El propietario aceptó tu postulación para "${app.property_title}". Ya puedes realizar tu verificación biométrica y firmar el contrato.`;
                            const link = `contratos.html?contract=${contractId}&sign=1&role=TENANT`;

                            const list = this.getAll();
                            if (!list.some(n => n.title === title || n.link === link)) {
                                this.createNotification({
                                    title,
                                    message,
                                    type: 'contract',
                                    link,
                                    role: 'TENANT',
                                    icon: 'draw'
                                });
                            }
                        }
                    });
                }
            } catch (e) { }
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

            // Fallback: Si la navbar estática no tiene el botón, inyectarlo dinámicamente
            const containers = document.querySelectorAll('#desktop-auth-container, #mobile-auth-container');
            containers.forEach(container => {
                if (!container || container.querySelector('.habitat-notif-btn-wrapper')) return;

                const isMobile = container.id === 'mobile-auth-container';
                const wrapper = document.createElement('div');
                wrapper.className = 'relative habitat-notif-btn-wrapper flex items-center mr-2';
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

            // Cerrar al click afuera
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.habitat-notif-btn-wrapper')) {
                    document.querySelectorAll('#habitat-notif-dropdown-panel, #habitat-notif-dropdown-panel-mobile').forEach(p => p.classList.add('hidden'));
                }
            });

            this.syncSystemAlerts();
            this.updateBadge();
        }
    };

    window.NotificationManager = NotificationManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => NotificationManager.initUI());
    } else {
        NotificationManager.initUI();
    }

    // Re-check badge every time window gets focus
    window.addEventListener('focus', () => {
        if (window.NotificationManager) {
            window.NotificationManager.syncSystemAlerts();
            window.NotificationManager.updateBadge();
        }
    });
})();
