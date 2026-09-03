/**
 * Habitat - Wizard de Configuración y Generación de Alquileres
 * Diseñado con la misma estructura, estética inmersiva y componentes que el
 * wizard de publicación de propiedades (publish-property-view.html).
 */

(function () {
    'use strict';

    window.RentalConfigWizard = {
        _currentProp: null,
        _currentStep: 1,
        _indicesData: null,
        _acceptedTenant: null,
        _tenantSource: 'accepted', // 'accepted' | 'manual' | 'pending'

        /**
         * Abre el Wizard inmersivo a pantalla completa
         * @param {Object} propertyData - Datos de la publicación o propiedad
         * @param {Object} options - Opciones adicionales (ej: { tenant: applicantData })
         */
        open: async function (propertyData = {}, options = {}) {
            this._currentProp = propertyData;
            this._currentStep = 1;
            this._acceptedTenant = null;
            this._tenantSource = 'manual';
            this._isBroker = Boolean(options.isBroker || options.role === 'BROKER' || window.location.pathname.includes('corredor'));

            // 1. Cargar índices oficiales vigentes si no están en caché
            if (!this._indicesData && window.DataManager?.getLatestIndices) {
                try {
                    this._indicesData = await window.DataManager.getLatestIndices();
                } catch (e) {
                    console.warn('[RentalWizard] Error obteniendo índices:', e);
                }
            }

            // 2. Si se pasó un inquilino explícito (ej: al aceptar postulación)
            const explicitTenant = options.tenant || propertyData.tenant || propertyData.applicant;
            if (explicitTenant) {
                const dniVal = explicitTenant.tenant_dni || explicitTenant.dni || '38.123.456';
                this._acceptedTenant = {
                    name: explicitTenant.tenant_name || explicitTenant.applicant_name || explicitTenant.name || 'Inquilino Aceptado',
                    email: explicitTenant.tenant_email || explicitTenant.applicant_email || explicitTenant.email || 'inquilino@habitat.ar',
                    phone: explicitTenant.tenant_phone || explicitTenant.phone || '+54 9 261 400-0000',
                    dni: dniVal,
                    cuil: explicitTenant.tenant_cuil || explicitTenant.cuil || (dniVal ? `20-${String(dniVal).replace(/\D/g, '')}-7` : '20-38123456-7'),
                    applicationId: explicitTenant.id || explicitTenant.id_solicitud
                };
                this._tenantSource = 'accepted';
            } else {
                // 3. Buscar si hay una postulación aceptada para esta propiedad
                await this._lookupAcceptedTenant(propertyData);
            }

            this._removeExisting();

            const wizardEl = document.createElement('section');
            wizardEl.id = 'rental-config-wizard-view';
            wizardEl.className = 'fixed inset-0 z-[200] overflow-y-auto bg-background dark:bg-[#0c0c0e] font-body w-full min-h-screen text-on-background dark:text-[#f1f1f1] transition-opacity duration-300 flex flex-col';

            wizardEl.innerHTML = this._buildWizardHTML();
            document.body.appendChild(wizardEl);
            document.body.classList.add('overflow-hidden');

            this._setupEventListeners();
            this._updateStepView();
            this._updateLiveCalculation();
            window.scrollTo(0, 0);
        },

        close: function () {
            this._removeExisting();
            document.body.classList.remove('overflow-hidden');
        },

        _removeExisting: function () {
            const existing = document.getElementById('rental-config-wizard-view');
            if (existing) existing.remove();
            const promptModal = document.getElementById('rental-post-publish-prompt-modal');
            if (promptModal) promptModal.remove();
            const acceptModal = document.getElementById('rental-post-accept-prompt-modal');
            if (acceptModal) acceptModal.remove();
        },

        /**
         * Diálogo modal inmediatamente posterior a la aceptación de un inquilino
         */
        promptPostAccept: function (applicantData = {}, propertyData = {}, options = {}) {
            this._removeExisting();

            const app = applicantData;
            const p = propertyData;
            const tenantName = app.tenant_name || app.applicant_name || app.name || 'Inquilino';
            const tenantEmail = app.tenant_email || app.applicant_email || app.email || '';
            const tenantPhone = app.tenant_phone || app.phone || '';

            const propTitle = p.title || p.titulo || app.property_title || 'Propiedad en Alquiler';
            const propAddress = p.address || p.calle || app.property_address || 'Mendoza, Argentina';
            const price = Number(p.price || p.precio || app.property_price || app.propertyPrice || 380000);
            const photo = (p.images && p.images[0]) || (p.photos && p.photos[0]) || 'img/hero-marketplace.jpg';

            const modal = document.createElement('div');
            modal.id = 'rental-post-accept-prompt-modal';
            modal.className = 'fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-body text-zinc-900 dark:text-zinc-100 animate-fade-in';

            modal.innerHTML = `
                <div class="relative w-full max-w-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6" onclick="event.stopPropagation()">
                    
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span class="material-symbols-outlined text-2xl">verified</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <span class="text-xs font-headline font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                ¡Postulación Aceptada con Éxito!
                            </span>
                            <h3 class="font-headline text-xl sm:text-2xl font-extrabold text-on-background dark:text-[#f1f1f1] leading-snug mt-0.5">
                                ¿Deseas configurar y generar el alquiler ahora?
                            </h3>
                        </div>
                    </div>

                    <p class="text-sm text-secondary dark:text-[#c7c6c6] leading-relaxed">
                        Has aprobado a <b>${tenantName}</b>. Solo faltan definir el índice de ajuste oficial (IPC/ICL) y las condiciones de cobro para habilitar el seguimiento financiero y la emisión del contrato digital.
                    </p>

                    <!-- Ficha Resumen Inquilino + Propiedad -->
                    <div class="p-4 bg-zinc-50 dark:bg-[#1a1a1e] rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                ${tenantName.charAt(0)}
                            </div>
                            <div class="min-w-0 flex-1">
                                <h4 class="font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1] truncate">${tenantName}</h4>
                                <p class="text-xs text-secondary dark:text-[#c7c6c6] truncate">${tenantEmail} ${tenantPhone ? '• ' + tenantPhone : ''}</p>
                            </div>
                            <span class="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                Aceptado
                            </span>
                        </div>
                        <div class="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs text-secondary dark:text-[#c7c6c6]">
                            <span class="truncate max-w-[220px]">📍 ${propTitle}</span>
                            <span class="font-mono font-bold text-on-background dark:text-[#f1f1f1] shrink-0">$ ${price.toLocaleString('es-AR')}/mes</span>
                        </div>
                    </div>

                    <!-- Botones de Acción -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button type="button" id="btn-accept-prompt-later" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-headline font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center">
                            Hacerlo más tarde
                        </button>
                        <button type="button" id="btn-accept-prompt-now" class="px-6 py-3 bg-primary hover:bg-primary-hover dark:bg-[#A13333] text-white font-headline font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                            <span class="material-symbols-outlined text-base">add_home_work</span>
                            <span>Generar Alquiler Ahora</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('btn-accept-prompt-later')?.addEventListener('click', () => {
                modal.remove();
            });

            document.getElementById('btn-accept-prompt-now')?.addEventListener('click', () => {
                modal.remove();
                this.open(propertyData, { tenant: applicantData, ...options });
            });
        },

        /**
         * Busca postulantes aceptados para la propiedad
         */
        _lookupAcceptedTenant: async function (prop) {
            const propId = String(prop.id || prop.id_propiedad || prop.property_id || '');
            const pubId = String(prop.id_publicacion || prop.publication_id || '');

            let allApps = [];
            if (window.DataManager?.getApplications) {
                try {
                    allApps = await window.DataManager.getApplications();
                } catch (e) {}
            }
            if (!allApps || allApps.length === 0) {
                try {
                    const raw = localStorage.getItem('habitat_tenant_applications');
                    if (raw) allApps = JSON.parse(raw);
                } catch (e) {}
            }

            if (Array.isArray(allApps)) {
                const match = allApps.find(a => {
                    const aPid = String(a.property_id || a.propertyId || a.id_propiedad || '');
                    const aPub = String(a.publication_id || a.publicationId || a.id_publicacion || '');
                    const isSameProp = (propId && (aPid === propId || aPub === propId)) || (pubId && (aPub === pubId || aPid === pubId));
                    return isSameProp && (a.status === 'aceptada' || a.status === 'approved');
                });

                if (match) {
                    this._acceptedTenant = {
                        name: match.tenant_name || match.applicant_name || match.name || 'Inquilino Aceptado',
                        email: match.tenant_email || match.applicant_email || match.email || 'inquilino@habitat.ar',
                        phone: match.tenant_phone || match.phone || '+54 9 261 400-0000',
                        dni: match.tenant_dni || match.dni || '38.123.456',
                        cuil: match.tenant_cuil || match.cuil || (match.dni ? `20-${match.dni.replace(/\D/g, '')}-7` : '20-38123456-7'),
                        applicationId: match.id || match.id_solicitud
                    };
                    this._tenantSource = 'accepted';
                }
            }
        },

        /**
         * Diálogo de confirmación post-publicación
         */
        promptPostPublish: function (propertyData = {}) {
            this._removeExisting();

            const p = propertyData;
            const title = p.title || p.titulo || 'Tu nueva propiedad';
            const address = p.address || p.calle || p.calleAltura || 'Mendoza, Argentina';
            const price = Number(p.price || p.precio || p.monthly_rent || 0);
            const photo = (p.images && p.images[0]) || (p.photos && p.photos[0]) || 'img/hero-marketplace.jpg';

            const modal = document.createElement('div');
            modal.id = 'rental-post-publish-prompt-modal';
            modal.className = 'fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md font-body text-zinc-900 dark:text-zinc-100 animate-fade-in';

            modal.innerHTML = `
                <div class="relative w-full max-w-lg bg-white dark:bg-[#121214] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6" onclick="event.stopPropagation()">
                    
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                            <span class="material-symbols-outlined text-2xl">verified</span>
                        </div>
                        <div class="min-w-0 flex-1">
                            <span class="text-xs font-headline font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                                ¡Aviso publicado en Marketplace!
                            </span>
                            <h3 class="font-headline text-xl sm:text-2xl font-extrabold text-on-background dark:text-[#f1f1f1] leading-snug mt-0.5">
                                ¿Deseas activar la gestión del alquiler?
                            </h3>
                        </div>
                    </div>

                    <p class="text-sm text-secondary dark:text-[#c7c6c6] leading-relaxed">
                        Solo faltan un par de datos (índice oficial de ajuste, duración del contrato y día de cobro) para habilitar el seguimiento financiero, cálculo de aumentos y emisión de contratos digitales.
                    </p>

                    <div class="p-3.5 bg-zinc-50 dark:bg-[#1a1a1e] rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3.5">
                        <img src="${photo}" alt="${title}" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="min-w-0 flex-1">
                            <h4 class="font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1] truncate">${title}</h4>
                            <p class="text-xs text-secondary dark:text-[#c7c6c6] truncate">${address}</p>
                            <span class="text-sm font-headline font-extrabold text-primary dark:text-[#A13333] font-mono block mt-0.5">
                                $ ${price > 0 ? price.toLocaleString('es-AR') : '380.000'} / mes
                            </span>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <button type="button" id="btn-prompt-later" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-headline font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center">
                            Hacerlo más tarde
                        </button>
                        <button type="button" id="btn-prompt-now" class="px-6 py-3 bg-primary hover:bg-primary-hover dark:bg-[#A13333] text-white font-headline font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                            <span>Configurar Alquiler</span>
                            <span class="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('btn-prompt-later')?.addEventListener('click', () => {
                modal.remove();
                sessionStorage.removeItem('just_published_property');
            });

            document.getElementById('btn-prompt-now')?.addEventListener('click', () => {
                modal.remove();
                sessionStorage.removeItem('just_published_property');
                this.open(propertyData);
            });
        },

        _buildWizardHTML: function () {
            const p = this._currentProp || {};
            const title = p.title || p.titulo || 'Propiedad en Alquiler';
            const address = p.address || p.calle || p.calleAltura || 'Mendoza, Argentina';
            const price = Number(p.price || p.precio || p.monthly_rent || 380000);
            const expensas = Number(p.expensas || p.expensas_mensuales || p.expenses || 45000);
            const todayStr = new Date().toISOString().split('T')[0];
            const hasAccepted = Boolean(this._acceptedTenant);
            const isUsd = (p.currency === 'USD' || p.moneda === 'USD' || this._options?.currency === 'USD');
            const currSym = isUsd ? 'USD $' : '$';

            return `
                <style>
                    /* Quitar flechitas de incremento (spinners) en inputs de tipo número */
                    #rental-config-wizard-modal input[type="number"]::-webkit-outer-spin-button,
                    #rental-config-wizard-modal input[type="number"]::-webkit-inner-spin-button {
                        -webkit-appearance: none !important;
                        margin: 0 !important;
                    }
                    #rental-config-wizard-modal input[type="number"] {
                        -moz-appearance: textfield !important;
                        appearance: textfield !important;
                    }
                    /* Forzar padding-left para prefijo monetario y evitar cualquier sobreescritura de @tailwindcss/forms */
                    #rental-config-wizard-modal #rw-canon,
                    #rental-config-wizard-modal #rw-monto-expensas {
                        padding-left: 3rem !important;
                    }
                    #rental-config-wizard-modal #rw-canon.is-usd,
                    #rental-config-wizard-modal #rw-monto-expensas.is-usd {
                        padding-left: 5rem !important;
                    }
                </style>

                <!-- Floating Cancel Button Identical to Publish Wizard -->
                <div class="fixed top-4 left-6 z-50">
                    <button id="rw-btn-floating-cancel" type="button" onclick="RentalConfigWizard.close()"
                        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:text-primary dark:hover:text-white shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-lg">close</span>
                        <span class="font-headline font-bold text-xs sm:text-sm">Cancelar</span>
                    </button>
                </div>

                <div class="flex flex-1 pt-12 sm:pt-14">
                    <!-- Main Content Area Identical to Publish Wizard -->
                    <main class="flex-1 w-full p-6 md:p-12 pb-32">
                        <div class="max-w-4xl mx-auto">
                            
                            <!-- Header de Progreso & Títulos -->
                            <div class="mb-8 md:mb-12">
                                
                                <!-- Mobile-Only Progress Header -->
                                <div class="sm:hidden mb-6 space-y-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-headline font-bold uppercase tracking-wider text-primary dark:text-[#A13333] bg-primary/10 dark:bg-[#A13333]/10 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-[#A13333]/20 shadow-sm" id="rw-mobile-step-badge">
                                            Paso 1 de 3 &bull; Canon & Ajuste
                                        </span>
                                        <span class="text-xs font-headline font-extrabold text-on-background dark:text-[#f1f1f1] bg-zinc-200/60 dark:bg-[#282828] px-3 py-1 rounded-lg" id="rw-mobile-step-percent">
                                            33%
                                        </span>
                                    </div>
                                    <div class="w-full bg-zinc-200/60 dark:bg-[#282828] h-2.5 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-white/5">
                                        <div id="rw-mobile-progress-bar" class="bg-primary dark:bg-[#A13333] h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(161,51,51,0.5)]" style="width: 33.33%;"></div>
                                    </div>
                                </div>

                                <!-- Tablet & Desktop Progress Bar with Circles -->
                                <div class="flex items-start justify-between gap-1.5 md:gap-3 overflow-x-auto pb-2 no-scrollbar w-full max-sm:hidden mb-8">
                                    
                                    <!-- Step 1 Indicator -->
                                    <div class="flex flex-col items-center gap-1.5 shrink-0" id="rw-step-ind-1">
                                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(161,51,51,0.4)]">1</div>
                                        <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-xs sm:text-sm text-center">Canon & Ajuste</span>
                                    </div>
                                    <div id="rw-line-1" class="flex-1 min-w-[30px] max-w-[120px] border-t-2 border-zinc-200 dark:border-[#282828] transition-colors duration-300 mt-4"></div>

                                    <!-- Step 2 Indicator -->
                                    <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="rw-step-ind-2">
                                        <div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-[#282828] text-on-background dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0">2</div>
                                        <span class="font-headline font-bold text-secondary dark:text-[#c7c6c6] whitespace-nowrap text-xs sm:text-sm text-center">Plazos & Cobranza</span>
                                    </div>
                                    <div id="rw-line-2" class="flex-1 min-w-[30px] max-w-[120px] border-t-2 border-zinc-200 dark:border-[#282828] transition-colors duration-300 mt-4"></div>

                                    <!-- Step 3 Indicator -->
                                    <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="rw-step-ind-3">
                                        <div class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-[#282828] text-on-background dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0">3</div>
                                        <span class="font-headline font-bold text-secondary dark:text-[#c7c6c6] whitespace-nowrap text-xs sm:text-sm text-center">Asignación Inquilino</span>
                                    </div>
                                </div>

                                <h1 id="rw-main-title" class="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-on-background dark:text-[#f1f1f1] tracking-tight mb-3 transition-opacity duration-300">
                                    ¡Configuremos el alquiler!
                                </h1>
                                <div class="flex flex-wrap items-center justify-between gap-4">
                                    <p id="rw-subtitle" class="text-secondary dark:text-[#c7c6c6] font-body text-base md:text-lg transition-opacity duration-300">
                                        ${title} • ${address}
                                    </p>
                                    <span class="inline-flex items-center gap-1.5 text-xs font-headline font-semibold text-secondary dark:text-[#c7c6c6] bg-zinc-100 dark:bg-[#1f1f23] px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-white/10 shadow-xs">
                                        <span class="text-primary dark:text-[#A13333] font-extrabold text-sm leading-none">*</span> Los campos con asterisco son obligatorios
                                    </span>
                                </div>
                            </div>

                            <!-- Contenedor Principal de Formularios con el mismo marco del Wizard de Publicación -->
                            <div class="bg-white dark:bg-[#121214] p-6 sm:p-8 md:p-10 rounded-2xl border border-zinc-200/80 dark:border-white/5 mb-8 relative shadow-sm">
                                
                                <!-- PASO 1: CANON Y AJUSTE OFICIAL -->
                                <div id="rw-panel-step-1" class="space-y-8">
                                    
                                    <!-- Monto y Moneda -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Canon Inicial Mensual <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="relative flex items-center">
                                                <span id="rw-canon-currency-prefix" class="absolute left-4 font-mono font-bold text-secondary dark:text-[#c7c6c6] text-base md:text-lg select-none pointer-events-none">${currSym}</span>
                                                <input type="number" id="rw-canon" value="${price}" required
                                                    style="padding-left: ${isUsd ? '5rem' : '3rem'} !important;"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 ${isUsd ? 'is-usd' : ''} pr-4 font-body text-base md:text-lg font-mono font-bold focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                            </div>
                                        </div>

                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Moneda del Contrato <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="relative">
                                                <select id="rw-moneda" class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors cursor-pointer">
                                                    <option value="ARS" ${!isUsd ? 'selected' : ''}>ARS (Pesos Argentinos - $)</option>
                                                    <option value="USD" ${isUsd ? 'selected' : ''}>USD (Dólares Estadounidenses - USD $)</option>
                                                </select>
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Índice Oficial (Radio Cards) -->
                                    <div class="space-y-3">
                                        <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                            Índice Oficial de Reajuste <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                        </label>
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-index-choice" value="IPC" checked class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm md:text-base text-on-background dark:text-[#f1f1f1]">IPC (INDEC)</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">Inflación mensual publicada por el INDEC.</p>
                                                </div>
                                            </label>

                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-index-choice" value="ICL" class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm md:text-base text-on-background dark:text-[#f1f1f1]">ICL (BCRA)</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">Índice diario de locaciones publicado por el BCRA.</p>
                                                </div>
                                            </label>

                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-index-choice" value="FIJO" class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm md:text-base text-on-background dark:text-[#f1f1f1]">Ajuste Fijo</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">Porcentaje o suma acordada entre partes.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <!-- Caja Desplegable: Ajuste Fijo Pactado -->
                                    <div id="rw-fixed-adjustment-box" class="p-5 rounded-2xl bg-zinc-50 dark:bg-[#16161a] border border-zinc-200 dark:border-zinc-800 space-y-4 hidden animate-fade-in">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span class="material-symbols-outlined text-primary dark:text-[#A13333]">trending_up</span>
                                                <h4 class="font-headline font-bold text-sm md:text-base text-on-background dark:text-[#f1f1f1]">Configuración de Ajuste Fijo Pactado</h4>
                                            </div>
                                            <span class="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold">Acuerdo entre Partes</span>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div class="space-y-2">
                                                <label class="block text-xs font-bold text-secondary dark:text-[#c7c6c6]">Tipo de Ajuste Fijo</label>
                                                <div class="relative">
                                                    <select id="rw-fixed-adj-type" class="w-full bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 px-3 pr-8 text-sm focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333]">
                                                        <option value="PERCENT" selected>Porcentaje Fijo Escalado (%)</option>
                                                        <option value="AMOUNT">Monto Fijo Sumado ($ o USD)</option>
                                                        <option value="NONE">Sin Aumento (Monto Invariable)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="space-y-2" id="rw-fixed-val-container">
                                                <label class="block text-xs font-bold text-secondary dark:text-[#c7c6c6]" id="rw-fixed-val-label">Valor del Aumento por Período</label>
                                                <div class="relative flex items-center">
                                                    <input type="number" id="rw-fixed-val" value="15" min="0" step="0.5" class="w-full bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 px-3 font-mono font-bold text-sm pr-12 focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                                    <span id="rw-fixed-val-unit" class="absolute right-3 text-xs font-bold text-secondary font-mono pointer-events-none">%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p class="text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">Este incremento fijo se aplicará de forma periódica según los meses que elijas debajo en la frecuencia de actualización.</p>
                                    </div>

                                    <!-- Frecuencia de Actualización -->
                                    <div class="space-y-3">
                                        <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                            Frecuencia de Actualización <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                        </label>
                                        <div class="relative">
                                            <select id="rw-frecuencia" class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors cursor-pointer">
                                                <option value="3" selected>Cada 3 meses (Trimestral - Recomendado)</option>
                                                <option value="4">Cada 4 meses (Cuatrimestral)</option>
                                                <option value="6">Cada 6 meses (Semestral)</option>
                                                <option value="12">Cada 12 meses (Anual)</option>
                                            </select>
                                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                <span class="material-symbols-outlined">expand_more</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Tarjeta de Cálculo Oficial en Vivo -->
                                    <div class="p-5 rounded-2xl bg-zinc-100/90 dark:bg-[#18181c] border border-zinc-200 dark:border-white/5 space-y-3">
                                        <div class="flex items-center justify-between flex-wrap gap-2">
                                            <div class="flex items-center gap-2">
                                                <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-xl">analytics</span>
                                                <span class="font-headline font-bold text-xs sm:text-sm uppercase tracking-wider text-secondary dark:text-[#c7c6c6]">Proyección de Primer Ajuste</span>
                                            </div>
                                            <span id="rw-tasa-badge" class="px-3 py-1 rounded-full text-xs font-black font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                +7,2% estimada
                                            </span>
                                        </div>
                                        <div class="flex items-baseline justify-between pt-1">
                                            <div>
                                                <span class="text-xs text-secondary dark:text-[#c7c6c6] block">Canon proyectado al próximo período:</span>
                                                <span id="rw-projected-rent" class="text-2xl sm:text-3xl font-mono font-extrabold text-on-background dark:text-[#f1f1f1]">
                                                    $ 0
                                                </span>
                                            </div>
                                            <span id="rw-preview-crit" class="text-[11px] text-secondary dark:text-[#c7c6c6] font-mono text-right max-w-[200px] truncate">
                                                IPC INDEC oficial
                                            </span>
                                        </div>
                                    </div>

                                </div>

                                <!-- PASO 2: PLAZOS, CONDICIONES DE MORA Y COBRO -->
                                <div id="rw-panel-step-2" class="space-y-8 hidden">
                                    
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Duración Específica del Contrato -->
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Duración del Contrato <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="space-y-2">
                                                <div class="relative flex items-center">
                                                    <input type="number" id="rw-duracion" value="24" min="1" max="120" placeholder="24" required
                                                        class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-16 font-body text-base md:text-lg font-mono font-bold focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                                    <span class="absolute right-4 text-xs font-headline font-extrabold uppercase tracking-wider text-secondary dark:text-[#c7c6c6] select-none pointer-events-none">Meses</span>
                                                </div>
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <button type="button" data-months="12" class="rw-duracion-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer">12 Meses</button>
                                                    <button type="button" data-months="24" class="rw-duracion-chip px-3 py-1.5 text-xs rounded-xl bg-primary dark:bg-[#A13333] text-white border border-primary dark:border-[#A13333] font-black shadow-xs transition-all cursor-pointer">24 Meses (Estándar)</button>
                                                    <button type="button" data-months="36" class="rw-duracion-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer">36 Meses</button>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Fecha de Inicio -->
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Fecha de Inicio <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="relative">
                                                <input type="date" id="rw-fecha-inicio" value="${todayStr}" required
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <!-- Día Específico de Vencimiento de Pago -->
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Día de Vencimiento de Pago <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="space-y-2">
                                                <div class="relative flex items-center">
                                                    <input type="number" id="rw-dia-venc" value="10" min="1" max="31" placeholder="10" required
                                                        class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-28 font-body text-base md:text-lg font-mono font-bold focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                                    <span class="absolute right-4 text-xs font-headline font-extrabold uppercase tracking-wider text-secondary dark:text-[#c7c6c6] select-none pointer-events-none">de cada mes</span>
                                                </div>
                                                <div class="flex items-center gap-2 flex-wrap">
                                                    <button type="button" data-day="5" class="rw-dia-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer">Día 5</button>
                                                    <button type="button" data-day="10" class="rw-dia-chip px-3 py-1.5 text-xs rounded-xl bg-primary dark:bg-[#A13333] text-white border border-primary dark:border-[#A13333] font-black shadow-xs transition-all cursor-pointer">Día 10 (Estándar)</button>
                                                    <button type="button" data-day="15" class="rw-dia-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer">Día 15</button>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Interés Punitorio Diario por Mora <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                            </label>
                                            <div class="relative">
                                                <select id="rw-tasa-punitoria" class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors cursor-pointer">
                                                    <option value="0.5" selected>0,5% diario (15% mensual - Estándar)</option>
                                                    <option value="0.3">0,3% diario (9% mensual)</option>
                                                    <option value="0.2">0,2% diario (6% mensual)</option>
                                                    <option value="1.0">1,0% diario (30% mensual)</option>
                                                </select>
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Expensas Ordinarias Estimadas
                                            </label>
                                            <div class="relative flex items-center">
                                                <span id="rw-expensas-currency-prefix" class="absolute left-4 font-mono font-bold text-secondary dark:text-[#c7c6c6] text-base select-none pointer-events-none">${currSym}</span>
                                                <input type="number" id="rw-monto-expensas" value="${expensas}"
                                                    style="padding-left: ${isUsd ? '5rem' : '3rem'} !important;"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 ${isUsd ? 'is-usd' : ''} pr-4 font-body text-base font-mono font-bold focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                            </div>
                                        </div>

                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Depósito en Garantía
                                            </label>
                                            <div class="relative">
                                                <select id="rw-deposito-tipo" class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors cursor-pointer">
                                                    <option value="1_MES" selected>1 Mes de canon locativo</option>
                                                    <option value="2_MESES">2 Meses de canon locativo</option>
                                                    <option value="USD_500">USD 500 (Dólares billete)</option>
                                                    <option value="SIN_DEPOSITO">Sin depósito previo</option>
                                                </select>
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 ${this._isBroker ? 'md:grid-cols-2' : ''} gap-6">
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Alias CBU / CVU para Cobro
                                            </label>
                                            <div class="relative">
                                                <input type="text" id="rw-alias-cbu" placeholder="HABITAT.COBROS.MP" value="HABITAT.ALQUILER.MP"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base font-mono focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                        </div>

                                        ${this._isBroker ? `
                                        <div class="space-y-3">
                                            <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                                Comisión de Administración Inmobiliaria
                                            </label>
                                            <div class="relative">
                                                <select id="rw-comision" class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors cursor-pointer">
                                                    <option value="4.15" selected>4,15% mensual (Administración estándar)</option>
                                                    <option value="5.0">5,0% mensual (Gestión completa)</option>
                                                    <option value="3.0">3,0% mensual (Tarifa preferencial)</option>
                                                    <option value="0">0% (Sin retención)</option>
                                                </select>
                                                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                        </div>
                                        ` : `
                                        <input type="hidden" id="rw-comision" value="0">
                                        `}
                                    </div>

                                </div>

                                <!-- PASO 3: ASIGNACIÓN DE INQUILINO -->
                                <div id="rw-panel-step-3" class="space-y-8 hidden">
                                    <div class="space-y-3">
                                        <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">
                                            Origen del Inquilino <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                        </label>
                                        
                                        <!-- Selector de Pestañas con estilo idéntico al Wizard de Publicación -->
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            ${hasAccepted ? `
                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-tenant-source" value="accepted" checked class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1]">Postulación Aceptada</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6]">Inquilino verificado que aprobaste en la plataforma.</p>
                                                </div>
                                            </label>
                                            ` : ''}

                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-tenant-source" value="manual" ${!hasAccepted ? 'checked' : ''} class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1]">Alquilado por fuera</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6]">Ingreso manual de los datos del locatario externo.</p>
                                                </div>
                                            </label>

                                            <label class="cursor-pointer relative block h-full">
                                                <input type="radio" name="rw-tenant-source" value="pending" class="peer sr-only">
                                                <div class="h-full p-4 rounded-xl bg-zinc-100 dark:bg-[#202024] border-2 border-transparent peer-checked:border-primary peer-checked:dark:border-[#A13333] peer-checked:bg-white peer-checked:dark:bg-[#16161a] transition-all flex flex-col justify-between space-y-2">
                                                    <div class="flex items-center justify-between">
                                                        <span class="font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1]">Pendiente de asignar</span>
                                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-lg opacity-0 peer-checked:opacity-100">check_circle</span>
                                                    </div>
                                                    <p class="text-xs text-secondary dark:text-[#c7c6c6]">Activar el alquiler ahora y vincular el inquilino luego.</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <!-- VISTA: Postulante Aceptado -->
                                    <div id="rw-tenant-box-accepted" class="${this._tenantSource === 'accepted' ? '' : 'hidden'}">
                                        ${hasAccepted ? `
                                        <div class="p-6 rounded-2xl bg-zinc-50 dark:bg-[#1a1a1e] border border-zinc-200 dark:border-zinc-800 space-y-4">
                                            <div class="flex items-center justify-between flex-wrap gap-3">
                                                <div class="flex items-center gap-3">
                                                    <div class="w-12 h-12 rounded-full bg-primary/10 dark:bg-[#A13333]/20 text-primary dark:text-red-400 flex items-center justify-center font-headline font-bold text-base">
                                                        ${(this._acceptedTenant.name || 'I').charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 class="font-headline font-bold text-base text-on-background dark:text-[#f1f1f1]">${this._acceptedTenant.name}</h4>
                                                        <p class="text-xs text-secondary dark:text-[#c7c6c6]">DNI ${this._acceptedTenant.dni} • CUIL ${this._acceptedTenant.cuil}</p>
                                                    </div>
                                                </div>
                                                <span class="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    Postulación Aprobada
                                                </span>
                                            </div>
                                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-secondary dark:text-[#c7c6c6] pt-3 border-t border-zinc-200 dark:border-zinc-800">
                                                <div>📧 Email: <b class="text-on-background dark:text-[#f1f1f1]">${this._acceptedTenant.email}</b></div>
                                                <div>📱 Teléfono: <b class="text-on-background dark:text-[#f1f1f1]">${this._acceptedTenant.phone}</b></div>
                                            </div>
                                        </div>
                                        ` : ''}
                                    </div>

                                    <!-- VISTA: Carga Manual -->
                                    <div id="rw-tenant-box-manual" class="space-y-6 ${this._tenantSource === 'manual' ? '' : 'hidden'}">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="space-y-3">
                                                <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base">
                                                    Nombre y Apellido del Inquilino <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                                </label>
                                                <input type="text" id="rw-tenant-name" placeholder="Ej: Santiago Morales"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                            <div class="space-y-3">
                                                <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base">
                                                    DNI / CUIT <span class="text-primary dark:text-[#A13333] font-extrabold ml-0.5">*</span>
                                                </label>
                                                <input type="text" id="rw-tenant-dni" placeholder="Ej: 36.124.890"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="space-y-3">
                                                <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base">
                                                    Correo Electrónico
                                                </label>
                                                <input type="email" id="rw-tenant-email" placeholder="santiago@email.com"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                            <div class="space-y-3">
                                                <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base">
                                                    Teléfono / WhatsApp
                                                </label>
                                                <input type="tel" id="rw-tenant-phone" placeholder="+54 9 261 411-2233"
                                                    class="w-full appearance-none bg-zinc-100 dark:bg-[#202024] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-[#A13333] transition-colors">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- VISTA: Pendiente -->
                                    <div id="rw-tenant-box-pending" class="p-5 rounded-2xl bg-zinc-50 dark:bg-[#1a1a1e] border border-zinc-200 dark:border-zinc-800 text-sm text-secondary dark:text-[#c7c6c6] ${this._tenantSource === 'pending' ? '' : 'hidden'}">
                                        El alquiler se creará activo en tu panel para el seguimiento del cronograma e índices oficiales. El inquilino figurará como <i>«Pendiente de asignar»</i> hasta que vincules uno.
                                    </div>

                                    <!-- Leyenda de Separación de Pasos -->
                                    <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs text-secondary dark:text-[#c7c6c6]">
                                        <span class="material-symbols-outlined text-primary dark:text-[#A13333] text-base">info</span>
                                        <span><b>Paso independiente:</b> La activación del alquiler y la redacción del contrato digital son procesos separados. Podrás redactar o firmar el contrato cuando quieras.</span>
                                    </div>

                                </div>

                                <!-- PASO 4: PANTALLA DE ÉXITO CON LAS DOS ACCIONES SEPARADAS -->
                                <div id="rw-panel-step-4" class="space-y-8 hidden text-center py-6">
                                    <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg">
                                        <span class="material-symbols-outlined text-3xl">check_circle</span>
                                    </div>

                                    <div class="space-y-2">
                                        <h2 class="text-3xl font-headline font-extrabold text-on-background dark:text-[#f1f1f1]">
                                            ¡Alquiler generado exitosamente!
                                        </h2>
                                        <p class="text-base text-secondary dark:text-[#c7c6c6] max-w-md mx-auto">
                                            La propiedad ya forma parte de tu cartera de alquileres activos con el cálculo oficial de reajustes.
                                        </p>
                                    </div>

                                    <div id="rw-success-summary" class="p-6 bg-zinc-50 dark:bg-[#1a1a1e] rounded-2xl border border-zinc-200 dark:border-zinc-800 text-left text-sm max-w-md mx-auto space-y-2.5">
                                        <!-- Resumen inyectado dinámicamente -->
                                    </div>

                                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4 max-w-md mx-auto pt-2">
                                        <button type="button" id="rw-btn-goto-panel"
                                            class="flex-1 py-3 px-6 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-headline font-bold text-on-background dark:text-[#f1f1f1] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined text-lg">payments</span>
                                            <span>Ver en Alquileres</span>
                                        </button>
                                        <button type="button" id="rw-btn-open-editor"
                                            class="flex-1 py-3 px-6 bg-primary hover:bg-primary-hover dark:bg-[#A13333] text-white text-sm font-headline font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                                            <span class="material-symbols-outlined text-lg">gavel</span>
                                            <span>Redactar Contrato</span>
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </main>
                </div>

                <!-- Unified Bottom Action Bar Identical to Publish Wizard -->
                <nav id="rw-bottom-bar"
                    class="fixed bottom-0 left-0 w-full flex justify-between items-center h-20 px-6 sm:px-12 pb-safe bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl z-[150] border-t border-zinc-200 dark:border-zinc-800 shadow-2xl">
                    <div class="max-w-4xl mx-auto w-full flex items-center justify-between gap-4">
                        <button id="rw-btn-back" type="button"
                            class="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 hover:text-primary dark:hover:text-white transition-colors active:scale-95 shrink-0 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 cursor-pointer hidden">
                            <span class="material-symbols-outlined text-xl">arrow_back</span>
                            <span class="font-headline text-xs sm:text-sm font-bold">Atrás</span>
                        </button>

                        <div class="flex-1"></div>

                        <div class="flex items-center gap-3">
                            <button type="button" onclick="RentalConfigWizard.close()"
                                class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-headline font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                                <span>Guardar y salir</span>
                            </button>

                            <button id="rw-btn-next" type="button"
                                class="flex items-center justify-center bg-primary dark:bg-[#A13333] !text-white rounded-xl px-8 sm:px-10 py-3 active:scale-95 transition-all shadow-lg font-headline font-bold text-xs sm:text-sm cursor-pointer hover:opacity-95">
                                <span>Continuar</span>
                            </button>
                        </div>
                    </div>
                </nav>

                <!-- Modal Loader Animado al Crear/Activar Alquiler -->
                <div id="rw-loading-overlay" class="hidden fixed inset-0 z-[250] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4 animate-fade-in text-white">
                    <div class="w-16 h-16 rounded-2xl bg-primary/20 dark:bg-[#A13333]/20 border border-primary/40 dark:border-[#A13333]/40 flex items-center justify-center shadow-2xl">
                        <span class="material-symbols-outlined text-3xl animate-spin text-primary dark:text-[#A13333]">sync</span>
                    </div>
                    <div class="space-y-1">
                        <h3 class="font-headline font-extrabold text-lg sm:text-xl text-white">Generando y Activando Alquiler</h3>
                        <p class="text-xs sm:text-sm text-zinc-300 dark:text-zinc-400 max-w-sm">Configurando condiciones pactadas, vinculando inquilino y preparando calendario de cobros...</p>
                    </div>
                </div>
            `;
        },

        _setupEventListeners: function () {
            const btnNext = document.getElementById('rw-btn-next');
            const btnBack = document.getElementById('rw-btn-back');
            const inputCanon = document.getElementById('rw-canon');
            const selectMoneda = document.getElementById('rw-moneda');
            const selectFrecuencia = document.getElementById('rw-frecuencia');
            const fixedTypeSelect = document.getElementById('rw-fixed-adj-type');
            const fixedValInput = document.getElementById('rw-fixed-val');
            const duracionInput = document.getElementById('rw-duracion');
            const diaVencInput = document.getElementById('rw-dia-venc');

            if (btnNext) btnNext.onclick = () => this._handleNextStep();
            if (btnBack) btnBack.onclick = () => this._handleBackStep();

            if (inputCanon) inputCanon.oninput = () => this._updateLiveCalculation();

            if (duracionInput) {
                duracionInput.oninput = () => {
                    this._updateDurationChips(duracionInput.value);
                    this._updateLiveCalculation();
                };
            }

            if (diaVencInput) {
                diaVencInput.oninput = () => {
                    this._updateDiaVencChips(diaVencInput.value);
                    this._updateLiveCalculation();
                };
            }

            document.querySelectorAll('.rw-duracion-chip').forEach(btn => {
                btn.onclick = () => {
                    const months = btn.getAttribute('data-months');
                    const durInput = document.getElementById('rw-duracion');
                    if (durInput) {
                        durInput.value = months;
                        durInput.dispatchEvent(new Event('input'));
                    }
                    this._updateDurationChips(months);
                };
            });

            document.querySelectorAll('.rw-dia-chip').forEach(btn => {
                btn.onclick = () => {
                    const day = btn.getAttribute('data-day');
                    const diaInput = document.getElementById('rw-dia-venc');
                    if (diaInput) {
                        diaInput.value = day;
                        diaInput.dispatchEvent(new Event('input'));
                    }
                    this._updateDiaVencChips(day);
                };
            });

            // Inicializar estados visuales de los chips
            this._updateDurationChips(duracionInput ? duracionInput.value : 24);
            this._updateDiaVencChips(diaVencInput ? diaVencInput.value : 10);

            if (selectMoneda) {
                selectMoneda.onchange = (e) => {
                    const val = e.target.value;
                    const isUsd = val === 'USD';
                    const sym = isUsd ? 'USD $' : '$';
                    const prefixEl = document.getElementById('rw-canon-currency-prefix');
                    const expensasPrefixEl = document.getElementById('rw-expensas-currency-prefix');
                    if (prefixEl) prefixEl.textContent = sym;
                    if (expensasPrefixEl) expensasPrefixEl.textContent = sym;

                    const canonEl = document.getElementById('rw-canon');
                    const expensasEl = document.getElementById('rw-monto-expensas');
                    const padLeft = isUsd ? '5rem' : '3rem';
                    if (canonEl) {
                        canonEl.style.setProperty('padding-left', padLeft, 'important');
                        canonEl.classList.toggle('is-usd', isUsd);
                    }
                    if (expensasEl) {
                        expensasEl.style.setProperty('padding-left', padLeft, 'important');
                        expensasEl.classList.toggle('is-usd', isUsd);
                    }

                    const fixedUnit = document.getElementById('rw-fixed-val-unit');
                    if (fixedUnit && document.getElementById('rw-fixed-adj-type')?.value === 'AMOUNT') {
                        fixedUnit.textContent = sym;
                    }
                    this._updateLiveCalculation();
                };
            }

            if (selectFrecuencia) selectFrecuencia.onchange = () => this._updateLiveCalculation();

            if (fixedTypeSelect) {
                fixedTypeSelect.onchange = (e) => {
                    const container = document.getElementById('rw-fixed-val-container');
                    const unitEl = document.getElementById('rw-fixed-val-unit');
                    const labelEl = document.getElementById('rw-fixed-val-label');
                    const isUsd = document.getElementById('rw-moneda')?.value === 'USD';
                    const currSym = isUsd ? 'USD $' : '$';

                    if (e.target.value === 'NONE') {
                        if (container) container.classList.add('hidden');
                    } else {
                        if (container) container.classList.remove('hidden');
                        if (e.target.value === 'PERCENT') {
                            if (unitEl) unitEl.textContent = '%';
                            if (labelEl) labelEl.textContent = 'Porcentaje de aumento por período';
                        } else {
                            if (unitEl) unitEl.textContent = currSym;
                            if (labelEl) labelEl.textContent = 'Monto fijo sumado por período';
                        }
                    }
                    this._updateLiveCalculation();
                };
            }

            if (fixedValInput) fixedValInput.oninput = () => this._updateLiveCalculation();

            document.querySelectorAll('input[name="rw-index-choice"]').forEach(radio => {
                radio.onchange = (e) => {
                    const fixedBox = document.getElementById('rw-fixed-adjustment-box');
                    if (fixedBox) {
                        fixedBox.classList.toggle('hidden', e.target.value !== 'FIJO');
                    }
                    this._updateLiveCalculation();
                };
            });

            document.querySelectorAll('input[name="rw-tenant-source"]').forEach(radio => {
                radio.onchange = (e) => {
                    this._tenantSource = e.target.value;
                    const bAcc = document.getElementById('rw-tenant-box-accepted');
                    const bMan = document.getElementById('rw-tenant-box-manual');
                    const bPen = document.getElementById('rw-tenant-box-pending');
                    if (bAcc) bAcc.classList.toggle('hidden', this._tenantSource !== 'accepted');
                    if (bMan) bMan.classList.toggle('hidden', this._tenantSource !== 'manual');
                    if (bPen) bPen.classList.toggle('hidden', this._tenantSource !== 'pending');
                };
            });
        },

        _updateDurationChips: function (val) {
            const numVal = parseInt(val, 10);
            document.querySelectorAll('.rw-duracion-chip').forEach(btn => {
                const chipMonths = parseInt(btn.getAttribute('data-months'), 10);
                if (chipMonths === numVal) {
                    btn.className = 'rw-duracion-chip px-3 py-1.5 text-xs rounded-xl bg-primary dark:bg-[#A13333] text-white border border-primary dark:border-[#A13333] font-black shadow-xs transition-all cursor-pointer';
                } else {
                    btn.className = 'rw-duracion-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer';
                }
            });
        },

        _updateDiaVencChips: function (val) {
            const numVal = parseInt(val, 10);
            document.querySelectorAll('.rw-dia-chip').forEach(btn => {
                const chipDay = parseInt(btn.getAttribute('data-day'), 10);
                if (chipDay === numVal) {
                    btn.className = 'rw-dia-chip px-3 py-1.5 text-xs rounded-xl bg-primary dark:bg-[#A13333] text-white border border-primary dark:border-[#A13333] font-black shadow-xs transition-all cursor-pointer';
                } else {
                    btn.className = 'rw-dia-chip px-3 py-1.5 text-xs rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-transparent font-bold transition-all cursor-pointer';
                }
            });
        },

        _updateStepView: function () {
            const p1 = document.getElementById('rw-panel-step-1');
            const p2 = document.getElementById('rw-panel-step-2');
            const p3 = document.getElementById('rw-panel-step-3');
            const p4 = document.getElementById('rw-panel-step-4');
            const bottomBar = document.getElementById('rw-bottom-bar');

            const btnBack = document.getElementById('rw-btn-back');
            const btnNext = document.getElementById('rw-btn-next');

            const mobileBadge = document.getElementById('rw-mobile-step-badge');
            const mobilePercent = document.getElementById('rw-mobile-step-percent');
            const mobileProgressBar = document.getElementById('rw-mobile-progress-bar');

            const mainTitle = document.getElementById('rw-main-title');

            if (this._currentStep === 4) {
                if (p1) p1.classList.add('hidden');
                if (p2) p2.classList.add('hidden');
                if (p3) p3.classList.add('hidden');
                if (p4) p4.classList.remove('hidden');
                if (bottomBar) bottomBar.classList.add('hidden');
                if (mainTitle) mainTitle.textContent = '¡Todo listo!';
                window.scrollTo(0, 0);
                return;
            }

            if (bottomBar) bottomBar.classList.remove('hidden');
            if (p4) p4.classList.add('hidden');

            if (p1) p1.classList.toggle('hidden', this._currentStep !== 1);
            if (p2) p2.classList.toggle('hidden', this._currentStep !== 2);
            if (p3) p3.classList.toggle('hidden', this._currentStep !== 3);

            if (this._currentStep === 2) {
                const durVal = document.getElementById('rw-duracion')?.value || 24;
                const diaVal = document.getElementById('rw-dia-venc')?.value || 10;
                this._updateDurationChips(durVal);
                this._updateDiaVencChips(diaVal);
            }

            if (btnBack) {
                btnBack.classList.toggle('hidden', this._currentStep === 1);
            }

            // Actualizar títulos e indicadores de paso
            const titles = [
                '¡Configuremos el canon y ajuste oficial!',
                'Plazos, mora y condiciones de cobro',
                'Asignación del inquilino'
            ];
            if (mainTitle) mainTitle.textContent = titles[this._currentStep - 1] || 'Configurar Alquiler';

            const pct = Math.round((this._currentStep / 3) * 100);
            if (mobilePercent) mobilePercent.textContent = `${pct}%`;
            if (mobileProgressBar) mobileProgressBar.style.width = `${pct}%`;
            if (mobileBadge) {
                const stepNames = ['Canon & Ajuste', 'Plazos & Cobro', 'Inquilino'];
                mobileBadge.textContent = `Paso ${this._currentStep} de 3 • ${stepNames[this._currentStep - 1]}`;
            }

            // Desktop circles
            for (let i = 1; i <= 3; i++) {
                const ind = document.getElementById(`rw-step-ind-${i}`);
                const line = document.getElementById(`rw-line-${i}`);
                if (!ind) continue;
                const circle = ind.querySelector('div');
                const label = ind.querySelector('span');

                if (i <= this._currentStep) {
                    ind.classList.remove('opacity-50');
                    if (circle) circle.className = 'w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 shadow-[0_0_15px_rgba(161,51,51,0.4)]';
                    if (label) label.className = 'font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-xs sm:text-sm text-center';
                } else {
                    ind.classList.add('opacity-50');
                    if (circle) circle.className = 'w-8 h-8 rounded-full bg-zinc-200 dark:bg-[#282828] text-on-background dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0';
                    if (label) label.className = 'font-headline font-bold text-secondary dark:text-[#c7c6c6] whitespace-nowrap text-xs sm:text-sm text-center';
                }

                if (line) {
                    if (i < this._currentStep) {
                        line.className = 'flex-1 min-w-[30px] max-w-[120px] border-t-2 border-primary dark:border-[#A13333] transition-colors duration-300 mt-4';
                    } else {
                        line.className = 'flex-1 min-w-[30px] max-w-[120px] border-t-2 border-zinc-200 dark:border-[#282828] transition-colors duration-300 mt-4';
                    }
                }
            }

            if (btnNext) {
                if (this._currentStep === 3) {
                    btnNext.innerHTML = '<span>Confirmar y Activar Alquiler</span>';
                } else {
                    btnNext.innerHTML = '<span>Continuar</span>';
                }
            }

            window.scrollTo(0, 0);
        },

        _handleNextStep: function () {
            if (this._currentStep < 3) {
                this._currentStep++;
                this._updateStepView();
            } else {
                this._finishAndCreateRental();
            }
        },

        _handleBackStep: function () {
            if (this._currentStep > 1) {
                this._currentStep--;
                this._updateStepView();
            }
        },

        _updateLiveCalculation: function () {
            const canon = Number(document.getElementById('rw-canon')?.value || 0);
            const moneda = document.getElementById('rw-moneda')?.value || 'ARS';
            const currSymbol = moneda === 'USD' ? 'USD $' : '$';
            const indice = document.querySelector('input[name="rw-index-choice"]:checked')?.value || 'IPC';
            const freq = Number(document.getElementById('rw-frecuencia')?.value || 3);

            const badgeEl = document.getElementById('rw-tasa-badge');
            const rentEl = document.getElementById('rw-projected-rent');
            const critEl = document.getElementById('rw-preview-crit');

            if (indice === 'FIJO') {
                const adjType = document.getElementById('rw-fixed-adj-type')?.value || 'PERCENT';
                const fixedVal = Number(document.getElementById('rw-fixed-val')?.value || 0);

                let projected = canon;
                if (adjType === 'PERCENT') {
                    projected = Math.round(canon * (1 + fixedVal / 100));
                    if (badgeEl) badgeEl.textContent = `+${fixedVal}% fijo pactado`;
                    if (critEl) critEl.textContent = `Ajuste fijo acordado cada ${freq} meses`;
                } else if (adjType === 'AMOUNT') {
                    projected = canon + fixedVal;
                    if (badgeEl) badgeEl.textContent = `+${currSymbol} ${fixedVal.toLocaleString('es-AR')} fijo`;
                    if (critEl) critEl.textContent = `Suma fija agregada cada ${freq} meses`;
                } else {
                    if (badgeEl) badgeEl.textContent = 'Monto congelado';
                    if (critEl) critEl.textContent = 'Sin aumentos durante el contrato';
                }

                if (rentEl) rentEl.textContent = `${currSymbol} ${projected.toLocaleString('es-AR')}`;
                return;
            }

            let rate = 7.2;
            let critText = 'Últimos índices oficiales publicados INDEC';

            if (indice === 'IPC') {
                rate = freq >= 6
                    ? (this._indicesData?.ipc?.tasaSugeridaSemestral || 14.8)
                    : (this._indicesData?.ipc?.tasaSugeridaTrimestral || 7.2);
                if (this._indicesData?.ipc?.periodoTrimestralTexto) {
                    critText = freq >= 6
                        ? `Tomando: ${this._indicesData.ipc.periodoSemestralTexto}`
                        : `Tomando: ${this._indicesData.ipc.periodoTrimestralTexto}`;
                }
            } else {
                rate = freq >= 6
                    ? (this._indicesData?.icl?.tasaSugeridaSemestral || 13.9)
                    : (this._indicesData?.icl?.tasaSugeridaTrimestral || 6.8);
                critText = 'Cotización diaria oficial BCRA';
            }

            const projected = Math.round(canon * (1 + rate / 100));

            if (badgeEl) badgeEl.textContent = `+${Number(rate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% estimada`;
            if (rentEl) rentEl.textContent = `${currSymbol} ${projected.toLocaleString('es-AR')}`;
            if (critEl) critEl.textContent = critText;
        },

        _finishAndCreateRental: async function () {
            // 0. Mostrar loader animado inmediatamente
            const loaderEl = document.getElementById('rw-loading-overlay');
            if (loaderEl) loaderEl.classList.remove('hidden');

            const p = this._currentProp || {};
            const canon = Number(document.getElementById('rw-canon')?.value || 380000);
            const moneda = document.getElementById('rw-moneda')?.value || 'ARS';
            const currSymbol = moneda === 'USD' ? 'USD $' : '$';
            const indice = document.querySelector('input[name="rw-index-choice"]:checked')?.value || 'IPC';
            const frecuencia = Number(document.getElementById('rw-frecuencia')?.value || 3);
            const duracion = Number(document.getElementById('rw-duracion')?.value || 24);
            const fechaInicio = document.getElementById('rw-fecha-inicio')?.value || new Date().toISOString().split('T')[0];
            const diaVenc = Number(document.getElementById('rw-dia-venc')?.value || 10);
            const tasaPunitoria = Number(document.getElementById('rw-tasa-punitoria')?.value || 0.5);
            const aliasCbu = document.getElementById('rw-alias-cbu')?.value || 'HABITAT.ALQUILER.MP';
            const comision = this._isBroker ? Number(document.getElementById('rw-comision')?.value || 4.15) : 0;
            const montoExpensas = Number(document.getElementById('rw-monto-expensas')?.value || 45000);
            const tipoDeposito = document.getElementById('rw-deposito-tipo')?.value || '1_MES';

            const fixedAdjType = document.getElementById('rw-fixed-adj-type')?.value || 'PERCENT';
            const fixedAdjVal = Number(document.getElementById('rw-fixed-val')?.value || 0);

            let tenantName = 'Pendiente de Inquilino';
            let tenantEmail = 'pendiente@habitat.ar';
            let tenantDni = '';
            let tenantPhone = '';
            let tenantCuil = '';

            if (this._tenantSource === 'accepted' && this._acceptedTenant) {
                tenantName = this._acceptedTenant.name;
                tenantEmail = this._acceptedTenant.email;
                tenantDni = this._acceptedTenant.dni;
                tenantPhone = this._acceptedTenant.phone;
                tenantCuil = this._acceptedTenant.cuil;
            } else if (this._tenantSource === 'manual') {
                tenantName = (document.getElementById('rw-tenant-name')?.value || '').trim() || 'Inquilino Externo';
                tenantEmail = (document.getElementById('rw-tenant-email')?.value || '').trim() || 'inquilino@email.com';
                tenantDni = (document.getElementById('rw-tenant-dni')?.value || '').trim() || '34.567.890';
                tenantPhone = (document.getElementById('rw-tenant-phone')?.value || '').trim() || '+54 9 261 400-0000';
                tenantCuil = `20-${tenantDni.replace(/\D/g, '') || '34567890'}-7`;
            }

            const propTitle = p.title || p.titulo || `Propiedad en ${p.address || p.calle || 'Alquiler'}`;
            const propAddress = p.address || p.calle || p.calleAltura || 'Mendoza, Argentina';
            const propPhotos = (p.images && p.images.length > 0) ? p.images : ((p.photos && p.photos.length > 0) ? p.photos : ['img/hero-marketplace.jpg']);

            const contractId = `CTR-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
            const endDate = new Date(new Date(fechaInicio).getTime() + 86400000 * 30 * duracion).toISOString().split('T')[0];

            let depositVal = canon;
            if (tipoDeposito === '2_MESES') depositVal = canon * 2;
            if (tipoDeposito === 'USD_500') depositVal = 500;
            if (tipoDeposito === 'SIN_DEPOSITO') depositVal = 0;

            const newContract = {
                id: contractId,
                contractNumber: contractId,
                propertyId: String(p.id || p.property_id || contractId),
                property_id: String(p.id || p.property_id || contractId),
                title: `Contrato de Locación - ${propTitle}`,
                property_title: propTitle,
                property_address: propAddress,
                propertyAddress: propAddress,
                propertyImage: propPhotos[0],
                propertyPhotos: propPhotos,
                monthly_rent: canon,
                monthlyRent: canon,
                currency: moneda,
                status: 'WAITING_TENANT',
                start_date: fechaInicio,
                startDate: fechaInicio,
                end_date: endDate,
                endDate: endDate,
                durationMonths: duracion,
                payment_due_day: diaVenc,
                paymentDueDay: diaVenc,
                adjustment_index: indice,
                adjustmentIndex: indice,
                adjustment_fixed_type: fixedAdjType,
                adjustment_fixed_val: fixedAdjVal,
                adjustment_frequency_months: frecuencia,
                adjustmentFrequencyMonths: frecuencia,
                punitive_daily_rate: tasaPunitoria,
                punitiveDailyRate: tasaPunitoria,
                broker_commission_percent: comision,
                brokerCommissionPercent: comision,
                expenses_amount: montoExpensas,
                expenses: montoExpensas,
                alias_cbu: aliasCbu,
                aliasCbu: aliasCbu,
                deposit_amount: depositVal,
                depositAmount: depositVal,
                tenant: {
                    name: tenantName,
                    email: tenantEmail,
                    phone: tenantPhone,
                    dni: tenantDni,
                    cuil: tenantCuil
                },
                tenant_name: tenantName,
                tenant_email: tenantEmail,
                tenant_phone: tenantPhone,
                owner: {
                    name: 'Propietario Verificado',
                    email: 'propietario@habitat.ar',
                    dni: '30.123.456'
                }
            };

            // 1. Guardar en localStorage
            try {
                let list = [];
                const raw = localStorage.getItem('habitat_contracts');
                if (raw) list = JSON.parse(raw);
                list = list.filter(c => String(c.propertyId) !== String(newContract.propertyId) && String(c.property_id) !== String(newContract.propertyId));
                list.unshift(newContract);
                localStorage.setItem('habitat_contracts', JSON.stringify(list));
            } catch (e) {
                console.warn('[RentalWizard] Error guardando en localStorage:', e);
            }

            // 2. Si hay cliente de Supabase, persistir en Contrato
            if (window.supabaseClient && p.id_propiedad) {
                try {
                    await window.supabaseClient.from('Contrato').insert([{
                        id_propiedad: p.id_propiedad,
                        id_publicacion: p.id_publicacion || null,
                        id_perfil_propietario: p.id_perfil_propietario || 6,
                        id_perfil_inquilino: 5,
                        id_tipo_garantia: 1,
                        id_moneda: moneda === 'USD' ? 2 : 1,
                        id_Indice: indice === 'IPC' ? 1 : 2,
                        fecha_firma_contrato: new Date().toISOString().split('T')[0],
                        fecha_inicio_contrato: fechaInicio,
                        fecha_fin_contrato: endDate,
                        monto_cierre: canon,
                        descuentos_aplicados: 0,
                        periodo_aumento_meses: frecuencia,
                        dia_vencimiento_mensual: diaVenc,
                        monto_deposito: depositVal,
                        deposito_devuelto: false,
                        tasa_punitoria_diaria: tasaPunitoria,
                        alias_cbu: aliasCbu
                    }]);
                } catch (dbErr) {
                    console.warn('[RentalWizard] Error guardando en Supabase Contrato:', dbErr);
                }
            }

            // Breve espera para que el usuario aprecie el loader y el proceso se complete de forma limpia
            await new Promise(r => setTimeout(r, 650));

            // 3. Ocultar loader y notificar
            if (loaderEl) loaderEl.classList.add('hidden');
            if (window.ToastManager) {
                window.ToastManager.show({
                    title: '¡Alquiler Activado!',
                    message: `Se configuró el alquiler de "${propTitle}".`,
                    type: 'success'
                });
            }

            // 4. Cerrar el wizard
            this.close();

            // 5. Redirección condicional según rol (Corredor vs Propietario)
            if (this._isBroker) {
                if (typeof window.selectBrokerRentalContract === 'function') {
                    window.selectBrokerRentalContract(contractId);
                }
                if (typeof window.switchBrokerTab === 'function') {
                    window.switchBrokerTab('alquileres');
                } else {
                    window.location.hash = 'alquileres';
                }
            } else {
                if (typeof window.selectOwnerActiveContract === 'function') {
                    window.selectOwnerActiveContract(contractId);
                }
                if (typeof window.switchViewTab === 'function') {
                    await window.switchViewTab('alquiler-activo');
                } else {
                    window.location.hash = 'alquiler-activo';
                }
            }
        }
    };

    /**
     * Función global para abrir el Editor Notarial de Contratos en cualquier momento
     */
    window.openContractEditorForRental = function (contractId) {
        let list = [];
        try {
            const raw = localStorage.getItem('habitat_contracts');
            if (raw) list = JSON.parse(raw);
        } catch (e) {}

        const targetStr = String(contractId || '').toLowerCase();
        const targetNum = parseInt(String(contractId).replace(/\D/g, ''), 10);

        // 1. Buscar en window.ownerActiveContractsMock (panel propietario)
        let c = null;
        if (window.ownerActiveContractsMock && Array.isArray(window.ownerActiveContractsMock)) {
            c = window.ownerActiveContractsMock.find(item => item && (
                String(item.id || '').toLowerCase() === targetStr ||
                String(item.contractNumber || '').toLowerCase() === targetStr ||
                String(item.dbContractId || '') === targetStr ||
                (targetNum && Number(item.dbContractId) === targetNum) ||
                (item.propertyId && String(item.propertyId) === targetStr)
            ));
        }

        // 2. Buscar en window.brokerActiveRentalsMock (panel corredor)
        if (!c && window.brokerActiveRentalsMock && Array.isArray(window.brokerActiveRentalsMock)) {
            c = window.brokerActiveRentalsMock.find(item => item && (
                String(item.id || '').toLowerCase() === targetStr ||
                String(item.contractCode || '').toLowerCase() === targetStr ||
                String(item.dbContractId || '') === targetStr ||
                (targetNum && Number(item.dbContractId) === targetNum)
            ));
        }

        // 3. Buscar en list (localStorage)
        if (!c && Array.isArray(list)) {
            c = list.find(item => item && (
                String(item.id || '').toLowerCase() === targetStr ||
                String(item.contractNumber || '').toLowerCase() === targetStr ||
                String(item.dbContractId || '') === targetStr ||
                (targetNum && Number(item.dbContractId) === targetNum) ||
                (item.propertyId && String(item.propertyId) === targetStr)
            ));
        }

        if (!c && list.length > 0) c = list[0];

        if (!c) {
            if (window.ToastManager) {
                window.ToastManager.show({
                    title: 'Alquiler no encontrado',
                    message: 'No se pudo localizar la información del alquiler seleccionado.',
                    type: 'warning'
                });
            }
            return;
        }

        const editorOptions = {
            contract: c,
            property: {
                id: c.propertyId || c.property_id,
                title: c.property_title || c.title || 'Propiedad en Alquiler',
                address: c.property_address || c.propertyAddress || 'Mendoza, Argentina',
                price: c.monthly_rent || c.monthlyRent || 380000,
                currency: c.currency || 'ARS',
                expenses: c.expenses_amount || c.expenses || 45000,
                photos: c.propertyPhotos || [c.propertyImage || 'img/hero-marketplace.jpg']
            },
            applicant: {
                tenant_name: c.tenant?.name || c.tenant_name || '',
                tenant_email: c.tenant?.email || c.tenant_email || '',
                tenant_dni: c.tenant?.dni || c.tenant_dni || '',
                tenant_phone: c.tenant?.phone || c.tenant_phone || ''
            },
            onConfirm: async (terms) => {
                c.has_contract = true;
                c.hasContract = true;
                c.customClauses = terms.customClauses || [];
                c.clauses = terms.clauses || {};
                c.monthly_rent = terms.monthlyRent || c.monthly_rent;
                c.monthlyRent = terms.monthlyRent || c.monthlyRent;
                c.status = 'WAITING_TENANT';

                // 1. Guardar en localStorage
                try {
                    let raw = localStorage.getItem('habitat_contracts');
                    let stored = raw ? JSON.parse(raw) : [];
                    const idx = stored.findIndex(item => item && (
                        String(item.id) === String(c.id) || 
                        String(item.contractNumber) === String(c.contractNumber || c.id) ||
                        (c.dbContractId && String(item.dbContractId) === String(c.dbContractId))
                    ));
                    if (idx >= 0) {
                        stored[idx] = { ...stored[idx], ...c, has_contract: true, hasContract: true };
                    } else {
                        stored.unshift({ ...c, has_contract: true, hasContract: true });
                    }
                    localStorage.setItem('habitat_contracts', JSON.stringify(stored));
                } catch(e) {}

                // 2. Persistir en Supabase si es contrato de base de datos
                if (window.supabaseClient && c.dbContractId) {
                    try {
                        await window.supabaseClient.from('Contrato').update({
                            clausulas_adicionales: terms.clauses || {},
                            monto_cierre: terms.monthlyRent || c.monthly_rent,
                            periodo_aumento_meses: terms.adjustmentFrequencyMonths || c.adjustment_frequency_months || 3,
                            dia_vencimiento_mensual: terms.paymentDueDay || c.payment_due_day || 10
                        }).eq('id_contrato', c.dbContractId);
                    } catch(dbErr) {
                        console.warn('[openContractEditorForRental] Aviso actualizando Contrato Supabase:', dbErr);
                    }
                }

                if (window.ContractEditorModal?.close) {
                    window.ContractEditorModal.close();
                }

                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '¡Contrato Generado con Éxito!',
                        message: 'El contrato digital ha sido generado y vinculado a este alquiler.',
                        type: 'success'
                    });
                }

                if (typeof window.loadOwnerActiveRental === 'function') {
                    window.loadOwnerActiveRental();
                } else if (typeof window.renderBrokerActiveRental === 'function') {
                    window.renderBrokerActiveRental();
                }
            }
        };

        if (window.ContractEditorModal?.open) {
            window.ContractEditorModal.open(editorOptions);
        } else if (typeof window.openContractEditorModal === 'function') {
            window.openContractEditorModal(editorOptions);
        }
    };

})();
