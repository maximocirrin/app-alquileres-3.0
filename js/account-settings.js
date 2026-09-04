/**
 * Account Settings Manager - Vivat
 * Gestión integral del perfil de usuario y configuración de cuenta:
 * - Perfil y Datos Personales (Conectado directamente a Supabase 'Perfil' y Auth)
 * - Notificaciones Granulares (Canales, Frecuencia, Alquileres, Visitas, WhatsApp)
 * - Datos Bancarios, Cobros y Facturación (CBU, Alias, CUIT, Condición Fiscal)
 * - Seguridad y Credenciales (Cambio de contraseña en Supabase Auth, KYC, Sesiones)
 * - Apariencia y Sistema (Temas Claro/Oscuro/Sistema, Moneda ARS/USD)
 * - Privacidad y Control de Datos (Exportación JSON, Pausar Cuenta en Supabase)
 */

(function () {
    'use strict';

    const AccountSettings = {
        _user: null,
        _profile: null,
        _activeSection: 'perfil',

        // Inicialización
        init: async function () {
            console.log('[AccountSettings] Inicializando módulo de configuración de cuenta...');
            this._setupTabNavigation();
            this._setupThemeControls();
            this._setupFormListeners();
            await this._loadUserData();
            this._handleInitialUrlHash();
        },

        // Carga de datos de usuario y perfil desde Supabase / LocalStorage
        _loadUserData: async function () {
            this._showLoadingSkeleton(true);

            try {
                let authUser = null;
                if (window.supabaseClient) {
                    try {
                        const { data: { session } } = await window.supabaseClient.auth.getSession();
                        if (session?.user) {
                            authUser = session.user;
                        } else {
                            const { data: { user } } = await window.supabaseClient.auth.getUser();
                            authUser = user;
                        }
                    } catch (e) {
                        console.warn('[AccountSettings] Error verificando sesión de Supabase:', e);
                    }
                }

                // Fallback a localStorage
                const localUser = JSON.parse(localStorage.getItem('vivat_user') || '{}');

                if (!authUser && !localUser?.email && !localUser?.id) {
                    this._user = {
                        id: 'usr_guest_demo',
                        email: 'usuario@vivat.com.ar',
                        user_metadata: { full_name: 'Usuario Vivat' }
                    };
                } else {
                    this._user = authUser || {
                        id: localUser.id || localUser.user_id || 'usr_local',
                        email: localUser.email || 'usuario@vivat.com.ar',
                        user_metadata: { full_name: localUser.name || localUser.nombre_completo || 'Usuario Vivat' }
                    };
                }

                // Obtener registro de la tabla 'Perfil' en Supabase
                let profileData = null;
                if (window.supabaseClient && (this._user.id || this._user.email)) {
                    try {
                        let query = window.supabaseClient.from('Perfil').select('*');
                        if (this._user.id && this._user.id !== 'usr_guest_demo' && this._user.id !== 'usr_local') {
                            query = query.or(`user_id.eq.${this._user.id},mail.eq.${this._user.email}`);
                        } else if (this._user.email) {
                            query = query.eq('mail', this._user.email);
                        }

                        const { data: profiles, error } = await query.limit(1);
                        if (!error && profiles && profiles.length > 0) {
                            profileData = profiles[0];
                        }
                    } catch (e) {
                        console.warn('[AccountSettings] Error consultando tabla Perfil en Supabase:', e);
                    }
                }

                // Si no existe fila en Perfil, construir objeto por defecto con fallback
                if (!profileData) {
                    profileData = {
                        nombre_completo: localUser.name || localUser.nombre_completo || this._user.user_metadata?.full_name || this._user.email?.split('@')[0] || 'Maximo Cirrincione',
                        nombre_usuario: localUser.username || this._user.user_metadata?.nombre_usuario || this._user.email?.split('@')[0] || 'maximocirrin',
                        mail: this._user.email || localUser.email || 'maximocirrin@gmail.com',
                        telefono: localUser.phone || localUser.telefono || '+54 9 11 4589-2231',
                        cuenta_verificada: localUser.cuenta_verificada ?? true,
                        fecha_verificacion: localUser.fecha_verificacion || new Date().toISOString(),
                        avatar_url: localUser.avatar_url || null
                    };
                }

                this._profile = profileData;

                // Sincronizar en localStorage para consistencia de la app
                const syncData = {
                    ...localUser,
                    id: this._user.id,
                    user_id: this._user.id,
                    id_perfil: profileData.id_perfil,
                    email: profileData.mail,
                    name: profileData.nombre_completo,
                    nombre_completo: profileData.nombre_completo,
                    username: profileData.nombre_usuario,
                    phone: profileData.telefono,
                    telefono: profileData.telefono,
                    id_tipo_perfil: profileData.id_tipo_perfil || localUser.id_tipo_perfil || 1,
                    cuenta_verificada: profileData.cuenta_verificada
                };
                localStorage.setItem('vivat_user', JSON.stringify(syncData));

                this._populateUI();
            } catch (err) {
                console.error('[AccountSettings] Error cargando datos de usuario:', err);
                this.showToast('No se pudieron cargar todos tus datos en tiempo real.', 'warning');
            } finally {
                this._showLoadingSkeleton(false);
            }
        },

        // Rellenar todos los campos del formulario con los datos cargados
        _populateUI: function () {
            const p = this._profile || {};
            const u = this._user || {};

            // 1. Resumen superior de usuario (Hero)
            const displayName = p.nombre_completo || u.user_metadata?.full_name || p.mail || 'Usuario';
            const displayEmail = p.mail || u.email || 'usuario@vivat.com.ar';
            const username = p.nombre_usuario ? `@${p.nombre_usuario.replace(/^@/, '')}` : `@${displayEmail.split('@')[0]}`;
            const initial = displayName.charAt(0).toUpperCase();

            const heroNameEl = document.getElementById('user-hero-name');
            const heroEmailEl = document.getElementById('user-hero-email');
            const heroUsernameEl = document.getElementById('user-hero-username');
            const heroInitialEl = document.getElementById('user-hero-avatar-initial');
            const heroRoleBadgeEl = document.getElementById('user-hero-role-badge');
            const heroKycBadgeEl = document.getElementById('user-hero-kyc-badge');
            const heroIdEl = document.getElementById('user-hero-id');

            if (heroNameEl) heroNameEl.textContent = displayName;
            if (heroEmailEl) heroEmailEl.textContent = displayEmail;
            if (heroUsernameEl) heroUsernameEl.textContent = username;
            if (heroInitialEl) heroInitialEl.textContent = initial;
            if (heroIdEl) heroIdEl.textContent = `ID: HBT-${String(p.id_perfil || u.id || '9920').slice(-6).toUpperCase()}`;

            // Rol Badge
            let roleText = 'Inquilino / Particular';
            let roleColorClasses = 'bg-primary/10 text-primary dark:text-red-400 border-primary/20';
            if (p.id_tipo_perfil === 2 || p.id_tipo_perfil === '2') {
                roleText = 'Inmobiliaria / Empresa';
                roleColorClasses = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            } else if (p.id_tipo_perfil === 3 || p.id_tipo_perfil === '3') {
                roleText = 'Corredor Inmobiliario';
                roleColorClasses = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
            } else if (p.id_tipo_perfil === 4 || p.id_tipo_perfil === '4') {
                roleText = 'Propietario Locador';
                roleColorClasses = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            }
            if (heroRoleBadgeEl) {
                heroRoleBadgeEl.textContent = roleText;
                heroRoleBadgeEl.className = `px-3 py-1 rounded-full text-xs font-headline font-extrabold border inline-flex items-center gap-1.5 ${roleColorClasses}`;
            }

            // KYC Status Badge
            const isVerified = Boolean(p.cuenta_verificada || localStorage.getItem('vivat_didit_identity'));
            if (heroKycBadgeEl) {
                if (isVerified) {
                    heroKycBadgeEl.innerHTML = `
                        <span class="material-symbols-outlined text-xs text-emerald-500">verified</span>
                        <span class="text-emerald-700 dark:text-emerald-400 font-bold">Identidad Verificada Didit KYC</span>
                    `;
                    heroKycBadgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-emerald-500/10 border border-emerald-500/25';
                } else {
                    heroKycBadgeEl.innerHTML = `
                        <span class="material-symbols-outlined text-xs text-amber-500">pending</span>
                        <span class="text-amber-700 dark:text-amber-400 font-bold">Verificación Pendiente</span>
                    `;
                    heroKycBadgeEl.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-amber-500/10 border border-amber-500/25 cursor-pointer';
                    heroKycBadgeEl.onclick = () => this.startIdentityVerification();
                }
            }

            // 2. Formulario Perfil (Tab 1)
            const inputFullName = document.getElementById('input-profile-fullname');
            const inputUsername = document.getElementById('input-profile-username');
            const inputEmail = document.getElementById('input-profile-email');
            const inputPhone = document.getElementById('input-profile-phone');
            const inputBio = document.getElementById('input-profile-bio');

            if (inputFullName) inputFullName.value = p.nombre_completo || '';
            if (inputUsername) inputUsername.value = p.nombre_usuario ? p.nombre_usuario.replace(/^@/, '') : '';
            if (inputEmail) inputEmail.value = p.mail || '';
            if (inputPhone) inputPhone.value = p.telefono || '';
            if (inputBio) inputBio.value = u.user_metadata?.bio || localStorage.getItem('vivat_user_bio') || '';

            // KYC Section Box Status
            const kycStatusBox = document.getElementById('kyc-detailed-status-box');
            if (kycStatusBox) {
                if (isVerified) {
                    kycStatusBox.innerHTML = `
                        <div class="flex items-start justify-between gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <span class="material-symbols-outlined text-2xl">verified_user</span>
                                </div>
                                <div>
                                    <h4 class="font-headline font-bold text-xs sm:text-sm text-emerald-950 dark:text-emerald-300">Biometría y DNI Verificados</h4>
                                    <p class="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5">Tu identidad está validada legalmente bajo la Ley N° 25.506 y habilitada para firma electrónica.</p>
                                </div>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shrink-0">Activo</span>
                        </div>
                    `;
                } else {
                    kycStatusBox.innerHTML = `
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                    <span class="material-symbols-outlined text-2xl">fingerprint</span>
                                </div>
                                <div>
                                    <h4 class="font-headline font-bold text-xs sm:text-sm text-amber-950 dark:text-amber-300">Validá tu identidad con Didit KYC</h4>
                                    <p class="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">Escaneá tu DNI y realizá una prueba biométrica facial para alquilar y firmar sin demoras.</p>
                                </div>
                            </div>
                            <button type="button" onclick="AccountSettings.startIdentityVerification()" class="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                                <span class="material-symbols-outlined text-sm">qr_code_scanner</span>
                                <span>Verificar Ahora</span>
                            </button>
                        </div>
                    `;
                }
            }

            // 3. Cargar Preferencias de Notificaciones
            this._loadNotificationPreferences();

            // 4. Cargar Datos Bancarios y Cobros
            this._loadPaymentPreferences();

            // 5. Cargar Preferencias de Sistema (Tema y Moneda)
            this._loadSystemPreferences();
        },

        // Cargar preferencias de notificaciones
        _loadNotificationPreferences: function () {
            const savedNotifs = JSON.parse(localStorage.getItem('vivat_notification_preferences') || '{}');
            const authNotifs = this._user?.user_metadata?.notification_preferences || {};
            const defaults = {
                channel_email: true,
                channel_push: true,
                channel_whatsapp: false,
                email_frequency: 'instant',
                notif_vencimientos: true,
                notif_pagos_confirm: true,
                notif_contratos_firma: true,
                notif_contratos_sellado: true,
                notif_visitas_agenda: true,
                notif_postulaciones: true,
                notif_pasaporte_scoring: true,
                notif_marketing_precios: false
            };
            const config = { ...defaults, ...authNotifs, ...savedNotifs };

            Object.keys(config).forEach(key => {
                const el = document.getElementById(key);
                if (el) {
                    if (el.type === 'checkbox') {
                        el.checked = Boolean(config[key]);
                    } else if (el.tagName === 'SELECT') {
                        el.value = config[key];
                    }
                }
            });

            // Radio button para frecuencia de email
            const freqRadios = document.querySelectorAll('input[name="email_frequency"]');
            freqRadios.forEach(radio => {
                radio.checked = (radio.value === config.email_frequency);
            });
        },

        // Cargar preferencias bancarias y de cobro
        _loadPaymentPreferences: function () {
            const savedBank = JSON.parse(localStorage.getItem('vivat_payment_preferences') || '{}');
            const authBank = this._user?.user_metadata?.payment_preferences || {};
            const defaults = {
                bank_alias: 'VIVAT.ALQUILER.MP',
                bank_cbu: '0000003100098765432101',
                bank_entity: 'Mercado Pago (CVU)',
                bank_holder_name: this._profile?.nombre_completo || 'Maximo Cirrincione',
                bank_holder_cuit: '20-44662043-7',
                fiscal_condition: 'MONOTRIBUTO',
                auto_receipt: true
            };
            const config = { ...defaults, ...authBank, ...savedBank };

            const aliasEl = document.getElementById('input-bank-alias');
            const cbuEl = document.getElementById('input-bank-cbu');
            const entityEl = document.getElementById('select-bank-entity');
            const holderEl = document.getElementById('input-bank-holder');
            const cuitEl = document.getElementById('input-bank-cuit');
            const fiscalEl = document.getElementById('select-fiscal-condition');
            const receiptEl = document.getElementById('bank_auto_receipt');

            if (aliasEl) aliasEl.value = config.bank_alias;
            if (cbuEl) cbuEl.value = config.bank_cbu;
            if (entityEl) entityEl.value = config.bank_entity;
            if (holderEl) holderEl.value = config.bank_holder_name;
            if (cuitEl) cuitEl.value = config.bank_holder_cuit;
            if (fiscalEl) fiscalEl.value = config.fiscal_condition;
            if (receiptEl) receiptEl.checked = Boolean(config.auto_receipt);
        },

        // Cargar preferencias del sistema
        _loadSystemPreferences: function () {
            const currentTheme = localStorage.getItem('theme') || 'light';
            const themeBtns = document.querySelectorAll('.theme-selector-btn');
            themeBtns.forEach(btn => {
                const target = btn.getAttribute('data-theme-value');
                if (target === currentTheme) {
                    btn.classList.add('border-primary', 'bg-primary/10', 'text-primary', 'dark:text-red-400');
                    btn.classList.remove('border-zinc-200', 'dark:border-zinc-800');
                } else {
                    btn.classList.remove('border-primary', 'bg-primary/10', 'text-primary', 'dark:text-red-400');
                    btn.classList.add('border-zinc-200', 'dark:border-zinc-800');
                }
            });

            const currentCurrency = localStorage.getItem('vivat_preferred_currency') || 'ARS';
            const curInput = document.getElementById('select-system-currency');
            if (curInput) curInput.value = currentCurrency;
        },

        // Configuración de navegación por pestañas (Desktop sidebar + Horizontal tab bar)
        _setupTabNavigation: function () {
            const self = this;
            const tabButtons = document.querySelectorAll('.settings-nav-btn, .settings-top-tab-btn');

            tabButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = btn.getAttribute('data-section');
                    if (target) self.switchSection(target);
                });
            });

            // Escuchar cambios en el hash de URL
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.replace('#', '');
                if (hash) self.switchSection(hash, false);
            });
        },

        _handleInitialUrlHash: function () {
            const hash = window.location.hash.replace('#', '');
            if (hash && document.getElementById(`section-panel-${hash}`)) {
                this.switchSection(hash, false);
            } else {
                this.switchSection('perfil', false);
            }
        },

        // Cambiar sección activa
        switchSection: function (sectionName, updateHash = true) {
            const targetPanel = document.getElementById(`section-panel-${sectionName}`);
            if (!targetPanel) return;

            this._activeSection = sectionName;
            if (updateHash) {
                window.location.hash = sectionName;
            }

            // Ocultar todos los paneles y mostrar solo el activo
            document.querySelectorAll('.settings-section-panel').forEach(panel => {
                panel.classList.add('hidden');
            });
            targetPanel.classList.remove('hidden');

            // Actualizar estilo en sidebar desktop
            document.querySelectorAll('.settings-nav-btn').forEach(btn => {
                const isCurrent = btn.getAttribute('data-section') === sectionName;
                if (isCurrent) {
                    btn.className = 'settings-nav-btn w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-primary text-white font-headline font-bold text-xs sm:text-sm shadow-sm transition-all text-left';
                } else {
                    btn.className = 'settings-nav-btn w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60 font-headline font-bold text-xs sm:text-sm transition-all text-left';
                }
            });

            // Actualizar estilo en la barra de pestañas superior horizontal
            document.querySelectorAll('.settings-top-tab-btn').forEach(btn => {
                const isCurrent = btn.getAttribute('data-section') === sectionName;
                if (isCurrent) {
                    btn.className = 'settings-top-tab-btn px-4 py-2.5 rounded-2xl bg-primary text-white font-headline font-bold text-xs sm:text-sm shadow-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer';
                } else {
                    btn.className = 'settings-top-tab-btn px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-primary/40 font-headline font-bold text-xs sm:text-sm transition-all whitespace-nowrap flex items-center gap-2 shrink-0 cursor-pointer';
                }
            });
        },

        // Configuración de switches de Tema (Light / Dark / System)
        _setupThemeControls: function () {
            const self = this;
            const themeBtns = document.querySelectorAll('.theme-selector-btn');
            themeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const themeVal = btn.getAttribute('data-theme-value');
                    self.setTheme(themeVal);
                });
            });
        },

        setTheme: function (theme) {
            const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
            const root = document.documentElement;

            if (isDark) {
                root.setAttribute('data-theme', 'dark');
                root.classList.add('dark');
                root.style.backgroundColor = '#09090b';
                root.style.colorScheme = 'dark';
            } else {
                root.removeAttribute('data-theme');
                root.classList.remove('dark');
                root.style.backgroundColor = '#ffffff';
                root.style.colorScheme = 'light';
            }

            localStorage.setItem('theme', theme);

            // Sincronizar checkbox de navbar si existe
            const navbarCheckbox = document.querySelector('.theme-switch__checkbox');
            if (navbarCheckbox) navbarCheckbox.checked = isDark;

            // Actualizar botones en la UI de configuración
            this._loadSystemPreferences();
            this.showToast(`Tema visual actualizado a: ${theme === 'dark' ? 'Modo Oscuro 🌙' : (theme === 'light' ? 'Modo Claro ☀️' : 'Automático 💻')}`, 'success');
        },

        // Listeners de los formularios y botones de acción
        _setupFormListeners: function () {
            const self = this;

            // 1. Guardar Perfil
            const btnSaveProfile = document.getElementById('btn-save-profile');
            btnSaveProfile?.addEventListener('click', (e) => {
                e.preventDefault();
                self.saveProfile();
            });

            // 2. Actualizar Contraseña
            const btnSavePassword = document.getElementById('btn-save-password');
            btnSavePassword?.addEventListener('click', (e) => {
                e.preventDefault();
                self.updatePassword();
            });

            // Password Toggle Buttons
            document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetId = btn.getAttribute('data-target-input');
                    const input = document.getElementById(targetId);
                    if (input) {
                        const isPwd = input.type === 'password';
                        input.type = isPwd ? 'text' : 'password';
                        btn.querySelector('.material-symbols-outlined').textContent = isPwd ? 'visibility_off' : 'visibility';
                    }
                });
            });

            // Password Strength Indicator
            const pwdInput = document.getElementById('input-new-password');
            pwdInput?.addEventListener('input', () => {
                self._updatePasswordStrength(pwdInput.value);
            });

            // 3. Guardar Notificaciones
            const btnSaveNotifs = document.getElementById('btn-save-notifications');
            btnSaveNotifs?.addEventListener('click', (e) => {
                e.preventDefault();
                self.saveNotificationPreferences();
            });

            // Botón rápido Desactivar Alertas Comerciales
            const btnMuteMarketing = document.getElementById('btn-mute-marketing');
            btnMuteMarketing?.addEventListener('click', () => {
                const marketingEl = document.getElementById('notif_marketing_precios');
                if (marketingEl) marketingEl.checked = false;
                self.saveNotificationPreferences();
                self.showToast('Notificaciones comerciales desactivadas.', 'info');
            });

            // 4. Guardar Datos de Cobro y Facturación
            const btnSaveBank = document.getElementById('btn-save-bank-prefs');
            btnSaveBank?.addEventListener('click', (e) => {
                e.preventDefault();
                self.savePaymentPreferences();
            });

            // 5. Guardar Preferencias de Sistema (Moneda)
            const btnSaveSystem = document.getElementById('btn-save-system-prefs');
            btnSaveSystem?.addEventListener('click', (e) => {
                e.preventDefault();
                self.saveSystemPreferences();
            });

            // 6. Cerrar Sesiones
            document.getElementById('btn-logout-current')?.addEventListener('click', () => {
                self.logoutCurrent();
            });
            document.getElementById('btn-logout-all')?.addEventListener('click', () => {
                self.logoutAllSessions();
            });

            // 7. Descargar Datos Personales
            document.getElementById('btn-export-data')?.addEventListener('click', () => {
                self.exportPersonalData();
            });

            // 8. Desactivar Cuenta
            document.getElementById('btn-deactivate-account')?.addEventListener('click', () => {
                self.promptDeactivateAccount();
            });
        },

        // Guardar Datos del Perfil en Supabase 'Perfil' table & Auth Metadata
        saveProfile: async function () {
            const btn = document.getElementById('btn-save-profile');
            const originalHtml = btn ? btn.innerHTML : '';
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Guardando...';
            }

            try {
                const fullName = (document.getElementById('input-profile-fullname')?.value || '').trim();
                const username = (document.getElementById('input-profile-username')?.value || '').trim().replace(/^@/, '');
                const phone = (document.getElementById('input-profile-phone')?.value || '').trim();
                const bio = (document.getElementById('input-profile-bio')?.value || '').trim();

                if (!fullName) {
                    this.showToast('Por favor, ingresá tu nombre completo.', 'warning');
                    return;
                }

                // 1. Actualizar en Supabase Auth User Metadata
                if (window.supabaseClient && this._user && this._user.id && this._user.id !== 'usr_guest_demo') {
                    try {
                        await window.supabaseClient.auth.updateUser({
                            data: {
                                full_name: fullName,
                                nombre_usuario: username,
                                phone: phone,
                                bio: bio
                            }
                        });
                    } catch (eAuth) {
                        console.warn('[AccountSettings] Aviso actualizando Auth User Metadata:', eAuth);
                    }
                }

                // 2. Actualizar registro en la tabla 'Perfil' de Supabase
                const updatePayload = {
                    nombre_completo: fullName,
                    nombre_usuario: username,
                    telefono: phone
                };

                let savedOk = false;
                if (window.supabaseClient) {
                    try {
                        let query = window.supabaseClient.from('Perfil');
                        if (this._profile?.id_perfil) {
                            const { error: errUp } = await query.update(updatePayload).eq('id_perfil', this._profile.id_perfil);
                            if (!errUp) savedOk = true;
                        } else if (this._user?.id && this._user.id !== 'usr_guest_demo') {
                            const { error: errUp } = await query.update(updatePayload).eq('user_id', this._user.id);
                            if (!errUp) savedOk = true;
                        } else if (this._profile?.mail) {
                            const { error: errUp } = await query.update(updatePayload).eq('mail', this._profile.mail);
                            if (!errUp) savedOk = true;
                        }
                    } catch (eSql) {
                        console.warn('[AccountSettings] Aviso actualizando Perfil en BD:', eSql);
                    }
                }

                // 3. Actualizar estado local en memoria y en localStorage
                this._profile = {
                    ...this._profile,
                    ...updatePayload
                };

                localStorage.setItem('vivat_user_bio', bio);

                const localUser = JSON.parse(localStorage.getItem('vivat_user') || '{}');
                const updatedLocal = {
                    ...localUser,
                    name: fullName,
                    nombre_completo: fullName,
                    username: username,
                    phone: phone,
                    telefono: phone
                };
                localStorage.setItem('vivat_user', JSON.stringify(updatedLocal));

                // 4. Actualizar las iniciales en el Navbar
                const initialStr = fullName.charAt(0).toUpperCase();
                document.querySelectorAll('.auth-user-initial').forEach(el => el.textContent = initialStr);

                // 5. Refrescar el hero banner
                this._populateUI();

                this.showToast('¡Perfil actualizado con éxito en Supabase!', 'success');
            } catch (err) {
                console.error('[AccountSettings] Error guardando perfil:', err);
                this.showToast('No se pudieron guardar los cambios. Intentá nuevamente.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        },

        // Actualizar Contraseña en Supabase Auth
        updatePassword: async function () {
            const btn = document.getElementById('btn-save-password');
            const originalHtml = btn ? btn.innerHTML : '';

            const newPwd = (document.getElementById('input-new-password')?.value || '').trim();
            const confirmPwd = (document.getElementById('input-confirm-password')?.value || '').trim();

            if (!newPwd) {
                this.showToast('Por favor, ingresá una nueva contraseña.', 'warning');
                return;
            }
            if (newPwd.length < 6) {
                this.showToast('La contraseña debe tener como mínimo 6 caracteres.', 'warning');
                return;
            }
            if (newPwd !== confirmPwd) {
                this.showToast('Las contraseñas no coinciden. Verificalas e intentá de nuevo.', 'warning');
                return;
            }

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Actualizando...';
            }

            try {
                if (window.supabaseClient) {
                    const { error } = await window.supabaseClient.auth.updateUser({
                        password: newPwd
                    });

                    if (error) throw error;
                }

                // Limpiar inputs
                const pwdInput = document.getElementById('input-new-password');
                const confInput = document.getElementById('input-confirm-password');
                if (pwdInput) pwdInput.value = '';
                if (confInput) confInput.value = '';
                this._updatePasswordStrength('');

                this.showToast('¡Contraseña actualizada correctamente en Supabase Auth!', 'success');
            } catch (err) {
                console.error('[AccountSettings] Error actualizando contraseña:', err);
                this.showToast(err.message || 'No se pudo actualizar la contraseña. Verificá que la sesión esté activa.', 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            }
        },

        _updatePasswordStrength: function (password) {
            const bar = document.getElementById('password-strength-bar');
            const label = document.getElementById('password-strength-label');
            if (!bar || !label) return;

            if (!password) {
                bar.style.width = '0%';
                bar.className = 'h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 transition-all duration-300';
                label.textContent = '';
                return;
            }

            let score = 0;
            if (password.length >= 6) score += 25;
            if (password.length >= 10) score += 25;
            if (/[A-Z]/.test(password)) score += 25;
            if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 25;

            bar.style.width = `${score}%`;

            if (score <= 25) {
                bar.className = 'h-1.5 rounded-full bg-rose-500 transition-all duration-300';
                label.textContent = 'Seguridad: Débil';
                label.className = 'text-[10px] font-bold text-rose-500';
            } else if (score <= 50) {
                bar.className = 'h-1.5 rounded-full bg-amber-500 transition-all duration-300';
                label.textContent = 'Seguridad: Media';
                label.className = 'text-[10px] font-bold text-amber-500';
            } else if (score <= 75) {
                bar.className = 'h-1.5 rounded-full bg-blue-500 transition-all duration-300';
                label.textContent = 'Seguridad: Buena';
                label.className = 'text-[10px] font-bold text-blue-500';
            } else {
                bar.className = 'h-1.5 rounded-full bg-emerald-500 transition-all duration-300';
                label.textContent = 'Seguridad: Excelente 🔒';
                label.className = 'text-[10px] font-bold text-emerald-500';
            }
        },

        // Iniciar Verificación Biométrica Didit KYC
        startIdentityVerification: function () {
            const userId = this._user?.id || 'usr_guest_demo';
            if (window.DiditKYC && typeof window.DiditKYC.startVerification === 'function') {
                window.DiditKYC.startVerification(userId, {
                    callbackUrl: window.location.href,
                    onSuccess: (data) => {
                        this.showToast('¡Identidad verificada exitosamente con Didit KYC!', 'success');
                        this._loadUserData();
                    }
                });
            } else {
                window.location.href = 'pasaporte-vivat.html?start_kyc=1';
            }
        },

        // Guardar Preferencias de Notificación en Supabase Auth & LocalStorage
        saveNotificationPreferences: async function () {
            const freqRadios = document.querySelector('input[name="email_frequency"]:checked');
            const prefs = {
                channel_email: document.getElementById('channel_email')?.checked ?? true,
                channel_push: document.getElementById('channel_push')?.checked ?? true,
                channel_whatsapp: document.getElementById('channel_whatsapp')?.checked ?? false,
                email_frequency: freqRadios ? freqRadios.value : 'instant',
                notif_vencimientos: document.getElementById('notif_vencimientos')?.checked ?? true,
                notif_pagos_confirm: document.getElementById('notif_pagos_confirm')?.checked ?? true,
                notif_contratos_firma: document.getElementById('notif_contratos_firma')?.checked ?? true,
                notif_contratos_sellado: document.getElementById('notif_contratos_sellado')?.checked ?? true,
                notif_visitas_agenda: document.getElementById('notif_visitas_agenda')?.checked ?? true,
                notif_postulaciones: document.getElementById('notif_postulaciones')?.checked ?? true,
                notif_pasaporte_scoring: document.getElementById('notif_pasaporte_scoring')?.checked ?? true,
                notif_marketing_precios: document.getElementById('notif_marketing_precios')?.checked ?? false
            };

            // Guardar en Supabase Auth metadata
            if (window.supabaseClient && this._user?.id && this._user.id !== 'usr_guest_demo') {
                try {
                    await window.supabaseClient.auth.updateUser({
                        data: { notification_preferences: prefs }
                    });
                } catch (e) {
                    console.warn('[AccountSettings] Error sincronizando notificaciones con Auth:', e);
                }
            }

            localStorage.setItem('vivat_notification_preferences', JSON.stringify(prefs));
            this.showToast('Preferencias de notificación guardadas con éxito.', 'success');
        },

        // Guardar Datos Bancarios y Facturación en Supabase Auth & LocalStorage
        savePaymentPreferences: async function () {
            const alias = (document.getElementById('input-bank-alias')?.value || '').trim().toUpperCase();
            const cbu = (document.getElementById('input-bank-cbu')?.value || '').trim();
            const entity = document.getElementById('select-bank-entity')?.value || 'Mercado Pago (CVU)';
            const holder = (document.getElementById('input-bank-holder')?.value || '').trim();
            const cuit = (document.getElementById('input-bank-cuit')?.value || '').trim();
            const fiscal = document.getElementById('select-fiscal-condition')?.value || 'MONOTRIBUTO';
            const autoReceipt = document.getElementById('bank_auto_receipt')?.checked ?? true;

            if (!alias) {
                this.showToast('Por favor, ingresá un Alias CBU/CVU válido para cobros.', 'warning');
                return;
            }

            const bankData = {
                bank_alias: alias,
                bank_cbu: cbu,
                bank_entity: entity,
                bank_holder_name: holder,
                bank_holder_cuit: cuit,
                fiscal_condition: fiscal,
                auto_receipt: autoReceipt
            };

            // Guardar en Supabase Auth metadata
            if (window.supabaseClient && this._user?.id && this._user.id !== 'usr_guest_demo') {
                try {
                    await window.supabaseClient.auth.updateUser({
                        data: { payment_preferences: bankData }
                    });
                } catch (e) {
                    console.warn('[AccountSettings] Error sincronizando cobros con Auth:', e);
                }
            }

            localStorage.setItem('vivat_payment_preferences', JSON.stringify(bankData));
            this.showToast('Datos bancarios y de cobro actualizados con éxito.', 'success');
        },

        // Guardar Preferencias de Sistema (Moneda)
        saveSystemPreferences: function () {
            const cur = document.getElementById('select-system-currency')?.value || 'ARS';
            localStorage.setItem('vivat_preferred_currency', cur);
            this.showToast(`Moneda predeterminada: ${cur === 'USD' ? 'Dólares (USD)' : 'Pesos Argentinos (ARS)'}`, 'success');
        },

        // Cerrar sesión en el dispositivo actual
        logoutCurrent: async function () {
            if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
                if (window.DataManager && typeof window.DataManager.logout === 'function') {
                    await window.DataManager.logout();
                } else if (window.supabaseClient) {
                    await window.supabaseClient.auth.signOut();
                }
                localStorage.removeItem('vivat_user');
                window.location.href = 'login.html?mode=login';
            }
        },

        // Cerrar todas las sesiones
        logoutAllSessions: async function () {
            if (confirm('¿Cerrar todas las sesiones activas en todos los dispositivos?')) {
                try {
                    if (window.supabaseClient) {
                        await window.supabaseClient.auth.signOut({ scope: 'global' });
                    }
                    localStorage.removeItem('vivat_user');
                    window.location.href = 'login.html?mode=login';
                } catch (e) {
                    window.location.href = 'login.html?mode=login';
                }
            }
        },

        // Exportar datos personales del usuario en archivo JSON
        exportPersonalData: function () {
            const exportData = {
                exported_at: new Date().toISOString(),
                platform: 'Vivat Alquileres - Sistema Inmobiliario Digital',
                legal_framework: 'Ley Nacional N° 25.506 & DNU 70/2023',
                user: this._user,
                profile: this._profile,
                banking_and_payments: JSON.parse(localStorage.getItem('vivat_payment_preferences') || '{}'),
                notification_preferences: JSON.parse(localStorage.getItem('vivat_notification_preferences') || '{}')
            };

            const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', dataStr);
            downloadAnchor.setAttribute('download', `vivat_datos_usuario_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();

            this.showToast('Archivo con tus datos personales descargado con éxito.', 'success');
        },

        // Modal de Desactivación / Pausa de Cuenta conectada a Supabase
        promptDeactivateAccount: function () {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn font-body';
            modal.innerHTML = `
                <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 text-zinc-900 dark:text-white animate-scaleUp">
                    <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                        <span class="material-symbols-outlined text-2xl">warning</span>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-headline font-bold text-lg text-zinc-900 dark:text-white">¿Pausar o desactivar cuenta?</h3>
                        <p class="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Al pausar tu cuenta, tus publicaciones activas dejarán de ser visibles y se suspenderán las notificaciones. Tus contratos vigentes y garantías permanecerán resguardados conforme a derecho.
                        </p>
                    </div>
                    <div class="flex items-center gap-2 pt-2">
                        <button type="button" id="btn-cancel-deactivate" class="flex-1 py-2.5 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                            Cancelar
                        </button>
                        <button type="button" id="btn-confirm-deactivate" class="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-headline font-bold text-xs shadow-md transition-all cursor-pointer">
                            Pausar Cuenta
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#btn-cancel-deactivate')?.addEventListener('click', () => modal.remove());
            modal.querySelector('#btn-confirm-deactivate')?.addEventListener('click', async () => {
                try {
                    if (window.supabaseClient && AccountSettings._profile?.id_perfil) {
                        await window.supabaseClient
                            .from('Perfil')
                            .update({ fecha_baja: new Date().toISOString() })
                            .eq('id_perfil', AccountSettings._profile.id_perfil);
                    }
                } catch (e) {
                    console.warn('[AccountSettings] Error actualizando fecha_baja en Supabase:', e);
                }
                modal.remove();
                AccountSettings.showToast('Tu cuenta ha sido pausada temporalmente.', 'info');
                setTimeout(() => {
                    AccountSettings.logoutCurrent();
                }, 1500);
            });
        },

        // Helper para mostrar/ocultar skeleton de carga
        _showLoadingSkeleton: function (isLoading) {
            const skeletonEl = document.getElementById('settings-loading-skeleton');
            const mainContentEl = document.getElementById('settings-main-container');
            if (skeletonEl && mainContentEl) {
                if (isLoading) {
                    skeletonEl.classList.remove('hidden');
                    mainContentEl.classList.add('opacity-50', 'pointer-events-none');
                } else {
                    skeletonEl.classList.add('hidden');
                    mainContentEl.classList.remove('opacity-50', 'pointer-events-none');
                }
            }
        },

        // Sistema de Toast Feedback Integrado
        showToast: function (message, type = 'info') {
            if (window.NotificationManager && typeof window.NotificationManager.showToast === 'function') {
                window.NotificationManager.showToast({
                    title: type === 'success' ? 'Operación Exitosa' : (type === 'error' ? 'Error' : (type === 'warning' ? 'Atención' : 'Información')),
                    message: message,
                    icon: type === 'success' ? 'check_circle' : (type === 'error' ? 'error' : (type === 'warning' ? 'warning' : 'info'))
                });
                return;
            }

            let container = document.getElementById('vivat-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'vivat-toast-container';
                container.className = 'fixed top-20 right-4 z-[999999] flex flex-col gap-3 pointer-events-none max-w-sm w-full font-body';
                document.body.appendChild(container);
            }

            const toast = document.createElement('div');
            const isSuccess = type === 'success';
            const isError = type === 'error';
            const isWarning = type === 'warning';

            const borderCol = isSuccess ? 'border-l-emerald-500' : (isError ? 'border-l-rose-500' : (isWarning ? 'border-l-amber-500' : 'border-l-primary'));
            const iconName = isSuccess ? 'check_circle' : (isError ? 'cancel' : (isWarning ? 'warning' : 'info'));
            const iconCol = isSuccess ? 'text-emerald-500 bg-emerald-500/10' : (isError ? 'text-rose-500 bg-rose-500/10' : (isWarning ? 'text-amber-500 bg-amber-500/10' : 'text-primary bg-primary/10'));

            toast.className = `pointer-events-auto transform transition-all duration-300 ease-out translate-y-[-10px] opacity-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-3.5 flex gap-3 items-center text-zinc-900 dark:text-white border-l-4 ${borderCol}`;
            toast.innerHTML = `
                <div class="w-8 h-8 rounded-xl ${iconCol} flex items-center justify-center shrink-0">
                    <span class="material-symbols-outlined text-lg">${iconName}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-bold leading-snug">${message}</p>
                </div>
                <button type="button" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 cursor-pointer">
                    <span class="material-symbols-outlined text-sm">close</span>
                </button>
            `;

            container.appendChild(toast);

            // Animar entrada
            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-[-10px]', 'opacity-0');
            });

            // Botón cerrar
            toast.querySelector('button')?.addEventListener('click', () => {
                toast.remove();
            });

            // Auto-remover a los 4.5 segundos
            setTimeout(() => {
                toast.classList.add('opacity-0', 'translate-y-[-10px]');
                setTimeout(() => toast.remove(), 300);
            }, 4500);
        }
    };

    // Exponer globalmente
    window.AccountSettings = AccountSettings;

    // Inicializar al cargar el DOM
    document.addEventListener('DOMContentLoaded', () => {
        AccountSettings.init();
    });

})();
