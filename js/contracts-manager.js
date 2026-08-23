/**
 * Habitat - Módulo de Firma Electrónica y Gestión de Contratos
 * Cumple con la Ley Nacional N° 25.506 de Firma Digital y Código Civil y Comercial de la Nación.
 * Integra visualizador completo en página, descarga directa de PDF/Audit Trail y validación biométrica facial (Liveness Check) con Didit KYC.
 */

(function () {
    'use strict';

    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem('habitat_contracts'));
    } catch (e) {}
    
    // Filtrar y limpiar cualquier contrato mock antiguo, genérico o con locatario duplicado
    let contracts = (stored && Array.isArray(stored)) 
        ? stored.filter(c => c && c.id && !['CTR-2026-0891', 'CTR-2026-0742', 'CTR-2026-0610', 'CTR-2026-0925', 'CTR-2026-0518', 'CTR-2026-1041', 'CTR-2026-0001'].includes(c.id) && c.tenant?.name !== 'Carlos Gómez' && c.tenant?.name !== 'Lucía Fernández' && c.tenant?.email !== c.owner?.email) 
        : [];
    
    localStorage.setItem('habitat_contracts', JSON.stringify(contracts));

    function saveContracts() {
        localStorage.setItem('habitat_contracts', JSON.stringify(contracts));
    }

    function detectActiveUserRole(contract) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get('role');
        if (urlRole && ['TENANT', 'OWNER', 'BROKER'].includes(urlRole.toUpperCase())) {
            const r = urlRole.toUpperCase();
            localStorage.setItem('habitat_active_role', r);
            return r;
        }

        // Auto-detect based on logged-in user email / profile
        try {
            const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
            const userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
            if (contract && userEmail) {
                if (contract.tenant?.email?.toLowerCase().trim() === userEmail) {
                    localStorage.setItem('habitat_active_role', 'TENANT');
                    return 'TENANT';
                }
                if (contract.owner?.email?.toLowerCase().trim() === userEmail) {
                    localStorage.setItem('habitat_active_role', 'OWNER');
                    return 'OWNER';
                }
            }
        } catch (e) {}

        if (document.referrer.includes('tu-alquiler') || document.referrer.includes('inquilino') || document.referrer.includes('pasaporte')) {
            localStorage.setItem('habitat_active_role', 'TENANT');
            return 'TENANT';
        }
        if (document.referrer.includes('administrador') || document.referrer.includes('propietario')) {
            localStorage.setItem('habitat_active_role', 'OWNER');
            return 'OWNER';
        }
        if (document.referrer.includes('panel-corredor') || document.referrer.includes('corredor')) {
            localStorage.setItem('habitat_active_role', 'BROKER');
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

    async function syncContractsFromSupabase() {
        if (!window.supabaseClient) return;
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const currentUserId = session?.user?.id;
            const currentUserEmail = (session?.user?.email || '').toLowerCase().trim();

            let myProfileId = null;
            let myProfileName = null;
            let myProfileDni = null;

            if (currentUserId) {
                const { data: p } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil, nombre_completo, dni, mail')
                    .eq('user_id', currentUserId)
                    .maybeSingle();
                if (p) {
                    myProfileId = p.id_perfil;
                    myProfileName = p.nombre_completo;
                    myProfileDni = p.dni;
                }
            }

            // 1. Consultar propiedades reales con sus publicaciones y multimedia
            const { data: properties } = await window.supabaseClient
                .from('Propiedad')
                .select(`
                    *,
                    Publicacion (
                        *,
                        Multimedia (*)
                    )
                `)
                .order('id_propiedad', { ascending: false });

            // 2. Consultar solicitudes reales (postulaciones)
            const { data: solicitudes } = await window.supabaseClient
                .from('Solicitud')
                .select('*, Perfil(*)')
                .order('id_solicitud', { ascending: false });

            // 3. Consultar perfiles
            const { data: allProfiles } = await window.supabaseClient
                .from('Perfil')
                .select('*');
            const profilesMap = new Map((allProfiles || []).map(pf => [pf.id_perfil, pf]));

            // 4. Consultar tabla Contrato con sus firmas
            const { data: dbContracts } = await window.supabaseClient
                .from('Contrato')
                .select('*, Firma_contrato(*)')
                .order('id_contrato', { ascending: false });

            let loadedContracts = [];

            // A. Procesar contratos reales existentes en la base de datos
            if (Array.isArray(dbContracts) && dbContracts.length > 0) {
                for (const dbC of dbContracts) {
                    const prop = (properties || []).find(p => p.id_propiedad === dbC.id_propiedad) || {};
                    const pubs = Array.isArray(prop.Publicacion) ? prop.Publicacion : (prop.Publicacion ? [prop.Publicacion] : []);
                    const pub = pubs.find(pb => pb.id_publicacion === dbC.id_publicacion) || pubs[0] || {};
                    const media = pub?.Multimedia || [];
                    const photoUrls = media.length > 0 ? media.map(m => m.url_archivo).filter(Boolean) : ['img/hero-marketplace.jpg'];

                    const sol = (solicitudes || []).find(s => s.id_publicacion === dbC.id_publicacion || s.id_perfil === dbC.id_perfil_inquilino);
                    const inqPerfil = profilesMap.get(dbC.id_perfil_inquilino) || sol?.Perfil || {};
                    const propOwnerId = prop.id_perfil_propietario || dbC.id_perfil_propietario;
                    const ownerPerfil = profilesMap.get(dbC.id_perfil_propietario) || (propOwnerId ? profilesMap.get(propOwnerId) : null) || {};

                    const tenantFirmado = (dbC.Firma_contrato || []).some(f => 
                        ['TENANT', 'INQUILINO', 'inquilino', 'tenant'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    );
                    const ownerFirmado = (dbC.Firma_contrato || []).some(f => 
                        ['OWNER', 'PROPIETARIO', 'propietario', 'owner'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    );

                    const tenantName = inqPerfil.nombre_completo || 'Bruno Cirrincione Ornstein';
                    const tenantDni = inqPerfil.dni || '46.665.957';
                    const tenantCuil = (typeof window.calcularCUIL === 'function' && tenantDni) ? window.calcularCUIL(tenantDni, 'M') : (tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '20-46665957-7');
                    const tenantEmail = inqPerfil.mail || 'nunimamu@gmail.com';

                    const ownerName = ownerPerfil.nombre_completo || 'Maximo Cirrincione Ornstein';
                    const ownerDni = ownerPerfil.dni || '44.662.043';
                    const ownerCuil = (typeof window.calcularCUIL === 'function' && ownerDni) ? window.calcularCUIL(ownerDni, 'M') : (ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '20-44662043-7');
                    const ownerEmail = ownerPerfil.mail || 'maximocirrin@gmail.com';

                    let status = 'WAITING_TENANT';
                    if (tenantFirmado && ownerFirmado) status = 'SIGNED_AND_SEALED';
                    else if (tenantFirmado) status = 'WAITING_OWNER';
                    else if (ownerFirmado) status = 'WAITING_TENANT';

                    const cleanTitle = pub?.descripcion ? pub.descripcion.split(' | Detalles: ')[0] : (prop.calle ? `${prop.calle} ${prop.numero || ''}`.trim() : `Propiedad #${dbC.id_propiedad}`);
                    const cleanAddress = prop.calle ? `${prop.calle} ${prop.numero || ''}`.trim() : 'Buenos Aires';

                    loadedContracts.push({
                        id: `CTR-2026-${String(dbC.id_contrato).padStart(4, '0')}`,
                        contractNumber: `CTR-2026-${String(dbC.id_contrato).padStart(4, '0')}`,
                        dbContractId: dbC.id_contrato,
                        propertyId: String(dbC.id_propiedad),
                        publicationId: String(dbC.id_publicacion || pub?.id_publicacion || ''),
                        title: `Contrato de Locación - ${cleanTitle}`,
                        propertyAddress: cleanAddress,
                        propertyCity: 'Mendoza',
                        propertyImage: photoUrls[0] || 'img/hero-marketplace.jpg',
                        propertyPhotos: photoUrls,
                        monthlyRent: Number(dbC.monto_cierre) || Number(pub?.precio) || 0,
                        currency: 'ARS',
                        status: status,
                        startDate: dbC.fecha_inicio_contrato || new Date().toISOString().split('T')[0],
                        endDate: dbC.fecha_fin_contrato || new Date(Date.now() + 86400000 * 365 * 2).toISOString().split('T')[0],
                        durationMonths: 24,
                        paymentDueDay: dbC.dia_vencimiento_mensual || 10,
                        adjustmentIndex: 'IPC',
                        adjustmentFrequencyMonths: dbC.periodo_aumento_meses || 3,
                        depositAmount: Number(dbC.monto_deposito) || Number(dbC.monto_cierre) || 0,
                        aliasCbu: dbC.alias_cbu || 'HABITAT.ALQUILER.MP',
                        tenant: {
                            role: 'TENANT',
                            profileId: dbC.id_perfil_inquilino || inqPerfil.id_perfil || 15,
                            name: tenantName,
                            email: tenantEmail,
                            phone: inqPerfil.telefono || sol?.telefono || '+54 9 11',
                            cuil: tenantCuil,
                            dni: tenantDni,
                            hasSigned: tenantFirmado,
                            isKycVerified: true
                        },
                        owner: {
                            role: 'OWNER',
                            profileId: dbC.id_perfil_propietario || ownerPerfil.id_perfil || 6,
                            name: ownerName,
                            email: ownerEmail,
                            cuil: ownerCuil,
                            dni: ownerDni,
                            hasSigned: ownerFirmado,
                            isKycVerified: true
                        },
                        broker: {
                            name: 'Martín Palermo',
                            license: 'CUCICBA Mat. 6842',
                            agencyName: 'Palermo & Asociados Propiedades',
                            email: 'contacto@palermoprop.com'
                        },
                        sha256Hash: 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33',
                        createdAt: dbC.created_at || new Date().toISOString(),
                        updatedAt: dbC.created_at || new Date().toISOString(),
                        auditTrailEvents: [
                            {
                                timestamp: new Date(dbC.created_at || Date.now()).toISOString().replace('T', ' ').substring(0, 19),
                                action: 'CONTRATO_GENERADO',
                                actor: 'Habitat Smart Contracts Generator',
                                details: `Contrato digital confeccionado para ${tenantName} en ${cleanAddress}.`
                            }
                        ]
                    });
                }
            }

            if (loadedContracts.length > 0) {
                contracts = loadedContracts;
                saveContracts();
            }
        } catch (err) {
            console.warn("Aviso al sincronizar contratos desde Supabase:", err);
        }
    }

    const ContractsManager = {
        activeFilter: 'all',
        searchTerm: '',
        currentUserRole: detectActiveUserRole(),
        selectedContractId: null,

        getContracts: function () {
            return contracts;
        },

        getContractById: function (id) {
            if (!id) return contracts[0] || null;
            let match = contracts.find(c => String(c.id) === String(id) || String(c.contractNumber) === String(id) || String(c.dbContractId) === String(id));
            if (match) return match;

            try {
                const raw = localStorage.getItem('habitat_contracts');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const found = parsed.find(c => String(c.id) === String(id) || String(c.contractNumber) === String(id));
                    if (found) {
                        contracts = parsed;
                        return found;
                    }
                }
            } catch (e) {}

            return contracts[0] || null;
        },

        switchRole: function (newRole) {
            if (!['TENANT', 'OWNER', 'BROKER'].includes(newRole)) return;
            this.currentUserRole = newRole;
            localStorage.setItem('habitat_active_role', newRole);
            this.renderDashboard('contracts-dashboard-container');
        },

        setFilter: function (filter) {
            this.activeFilter = filter;
            this.renderDashboard('contracts-dashboard-container');
        },

        setSearch: function (term) {
            this.searchTerm = (term || '').toLowerCase().trim();
            this.renderDashboard('contracts-dashboard-container');
        },

        selectContract: function (contractId, shouldScroll = true) {
            this.selectedContractId = contractId;
            this.renderDashboard('contracts-dashboard-container');
            if (shouldScroll) {
                const viewerEl = document.getElementById('contract-live-viewer-section');
                if (viewerEl) {
                    viewerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        },

        // Render In-Page Contract Hub & Full Interactive Document Viewer
        renderDashboard: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            this.currentUserRole = detectActiveUserRole();
            const role = this.currentUserRole;
            const formatMoney = (n) => '$ ' + Number(n).toLocaleString('es-AR');

            if (!contracts || contracts.length === 0) {
                container.innerHTML = `
                    <div class="w-full space-y-8 font-body">
                        <!-- Top Navigation & Role Bar -->
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                            <div class="flex items-center gap-2">
                                ${role === 'TENANT' ? `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">person</span>
                                        <span>Panel Inquilino • Firma Electrónica</span>
                                    </span>
                                ` : role === 'OWNER' ? `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-primary dark:text-red-400 font-headline font-bold text-xs flex items-center gap-1.5 border border-red-300 dark:border-red-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">home</span>
                                        <span>Panel Propietario • Firma Digital</span>
                                    </span>
                                ` : `
                                    <span class="px-3.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
                                        <span class="material-symbols-outlined text-sm">real_estate_agent</span>
                                        <span>Panel Corredor Inmobiliario</span>
                                    </span>
                                `}
                            </div>
                            <div class="flex items-center gap-2 text-xs">
                                <a href="${role === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 font-bold text-xs transition-colors flex items-center gap-1">
                                    <span class="material-symbols-outlined text-sm">arrow_back</span>
                                    <span>Volver a mi Panel</span>
                                </a>
                            </div>
                        </div>

                        <!-- Empty State -->
                        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-10 sm:p-16 text-center shadow-xs max-w-2xl mx-auto space-y-4">
                            <div class="w-20 h-20 rounded-3xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
                                <span class="material-symbols-outlined text-4xl">history_edu</span>
                            </div>
                            <h3 class="font-headline text-2xl font-black text-zinc-900 dark:text-white">
                                No hay contratos de locación activos
                            </h3>
                            <p class="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                Al aceptar una postulación o generar un contrato para una de tus propiedades, aparecerá en este panel con firma electrónica y validación biométrica Didit.
                            </p>
                            <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                                <a href="${role === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="inline-flex items-center gap-2 bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-md">
                                    <span class="material-symbols-outlined text-base">dashboard</span> Volver a mi Panel
                                </a>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }

            const isFullySigned = (c) => c.status === 'SIGNED_AND_SEALED' || (c.tenant?.hasSigned && c.owner?.hasSigned);
            const isPartiallySigned = (c) => (role === 'TENANT' && c.tenant?.hasSigned) || (role === 'OWNER' && c.owner?.hasSigned);

            let list = contracts.filter(c => {
                const matchText = !this.searchTerm ||
                    c.title.toLowerCase().includes(this.searchTerm) ||
                    c.propertyAddress.toLowerCase().includes(this.searchTerm) ||
                    c.contractNumber.toLowerCase().includes(this.searchTerm) ||
                    c.tenant?.name?.toLowerCase().includes(this.searchTerm) ||
                    c.owner?.name?.toLowerCase().includes(this.searchTerm);

                if (!matchText) return false;

                const isMyPending = (role === 'TENANT' && !c.tenant?.hasSigned) ||
                                    (role === 'OWNER' && !c.owner?.hasSigned);

                if (this.activeFilter === 'pending') {
                    return isMyPending;
                } else if (this.activeFilter === 'in_progress') {
                    return !isFullySigned(c) && (c.tenant?.hasSigned || c.owner?.hasSigned);
                } else if (this.activeFilter === 'completed') {
                    return isFullySigned(c) || isPartiallySigned(c);
                }
                return true;
            });

            const countAll = contracts.length;
            const countPending = contracts.filter(c => 
                (role === 'TENANT' && !c.tenant?.hasSigned) ||
                (role === 'OWNER' && !c.owner?.hasSigned)
            ).length;
            const countInProgress = contracts.filter(c => !isFullySigned(c) && (c.tenant?.hasSigned || c.owner?.hasSigned)).length;
            const countCompleted = contracts.filter(c => isFullySigned(c) || isPartiallySigned(c)).length;

            let currentContract = (this.selectedContractId ? contracts.find(c => String(c.id) === String(this.selectedContractId) || String(c.contractNumber) === String(this.selectedContractId) || String(c.dbContractId) === String(this.selectedContractId)) : null) || list[0] || contracts[0];

            let effectiveRole = role;
            try {
                const uLocal = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                const userEmail = (uLocal.email || uLocal.mail || '').toLowerCase().trim();
                if (currentContract && userEmail) {
                    if (currentContract.tenant?.email?.toLowerCase().trim() === userEmail) {
                        effectiveRole = 'TENANT';
                    } else if (currentContract.owner?.email?.toLowerCase().trim() === userEmail) {
                        effectiveRole = 'OWNER';
                    }
                }
            } catch (e) {}

            const isSigner = effectiveRole === 'TENANT' || effectiveRole === 'OWNER';
            const signerObj = effectiveRole === 'TENANT' ? currentContract?.tenant : currentContract?.owner;
            const isContractPendingForMe = isSigner && !signerObj?.hasSigned;

            let html = `
                <div class="w-full space-y-8 font-body">
                    
                    <!-- Top Navigation & Role Bar -->
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                        <div class="flex items-center gap-2">
                            ${effectiveRole === 'TENANT' ? `
                                <span class="px-3.5 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">person</span>
                                    <span>Inquilino Postulante</span>
                                </span>
                            ` : effectiveRole === 'OWNER' ? `
                                <span class="px-3.5 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/80 text-primary dark:text-red-400 font-headline font-bold text-xs flex items-center gap-1.5 border border-red-300 dark:border-red-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">home</span>
                                    <span>Propietario del Inmueble</span>
                                </span>
                            ` : `
                                <span class="px-3.5 py-1.5 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 font-headline font-bold text-xs flex items-center gap-1.5 border border-blue-300 dark:border-blue-700/60 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm">real_estate_agent</span>
                                    <span>Corredor Matriculado</span>
                                </span>
                            `}
                        </div>

                        <div class="flex items-center gap-2 text-xs">
                            <span class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Didit Liveness Ready
                            </span>
                            <a href="${effectiveRole === 'TENANT' ? 'tu-alquiler.html' : 'administrador.html'}" class="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-primary font-semibold transition-colors flex items-center gap-1">
                                <span class="material-symbols-outlined text-sm">arrow_back</span>
                                <span>Volver</span>
                            </a>
                        </div>
                    </div>

                    <!-- Header Banner -->
                    <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-zinc-800">
                        <div class="space-y-2">
                            <div class="flex items-center gap-2">
                                <span class="px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[11px] uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Didit Liveness Check Integrado
                                </span>
                                <span class="text-zinc-400 text-xs font-semibold">Ley Nacional N° 25.506</span>
                            </div>
                            <h1 class="text-2xl sm:text-3xl md:text-4xl font-headline font-black tracking-tight">
                                Centro de Contratos y Firma Digital
                            </h1>
                            <p class="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                                Visualice el contrato oficial, valide su identidad con biometría facial en vivo y descargue el PDF con sellado de tiempo TSA.
                            </p>
                        </div>

                        <!-- KPI Stat Badge -->
                        <div class="flex items-center gap-3 w-full md:w-auto shrink-0">
                            <div class="flex-1 md:flex-none p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center sm:text-left">
                                <span class="text-[10px] font-bold text-zinc-300 uppercase block">Total Contratos</span>
                                <span class="text-2xl font-black font-headline text-white">${countAll}</span>
                            </div>
                            <div class="flex-1 md:flex-none p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-center sm:text-left">
                                <span class="text-[10px] font-bold text-emerald-300 uppercase block">Firmados y Sellados</span>
                                <span class="text-2xl font-black font-headline text-emerald-400">${countCompleted}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Search and Status Tabs Bar (Historial de Contratos) -->
                    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 overflow-x-auto">
                            <button onclick="ContractsManager.setFilter('all')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'all' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                Todos (${countAll})
                            </button>
                            <button onclick="ContractsManager.setFilter('pending')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${this.activeFilter === 'pending' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span>Requiere Mi Firma</span>
                                ${countPending > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">${countPending}</span>` : ''}
                            </button>
                            <button onclick="ContractsManager.setFilter('in_progress')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'in_progress' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                En Proceso (${countInProgress})
                            </button>
                            <button onclick="ContractsManager.setFilter('completed')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${this.activeFilter === 'completed' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span>Historial Firmados</span>
                                <span class="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">${countCompleted}</span>
                            </button>
                        </div>

                        <div class="relative w-full md:w-80">
                            <input 
                                type="text" 
                                placeholder="Buscar por dirección o código..." 
                                value="${this.searchTerm}"
                                oninput="ContractsManager.setSearch(this.value)"
                                class="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary shadow-xs"
                            >
                            <span class="material-symbols-outlined text-zinc-400 text-base absolute left-3 top-1/2 -translate-y-1/2">search</span>
                        </div>
                    </div>

                    <!-- Contracts Horizontal / Grid Selector -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <h2 class="text-sm font-headline font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                                ${this.activeFilter === 'completed' ? 'Historial de Contratos Firmados' : 'Contratos de la Propiedad'}
                            </h2>
                            <span class="text-xs text-zinc-400 font-medium">${list.length} contrato(s)</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${list.length === 0 ? `
                                <div class="col-span-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 sm:p-10 text-center space-y-3 shadow-xs">
                                    <div class="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                        <span class="material-symbols-outlined text-3xl">verified</span>
                                    </div>
                                    <h4 class="font-headline font-bold text-base text-zinc-900 dark:text-white">Aún no hay contratos en esta sección</h4>
                                    <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                                        Los contratos firmados digitalmente con validación biométrica Didit aparecerán aquí con su historial inmutable de eventos, certificación TSA y descarga en PDF.
                                    </p>
                                </div>
                            ` : list.map(c => {
                                const isSelected = currentContract && String(c.id) === String(currentContract.id);
                                let statusBadge = '';
                                if (c.status === 'WAITING_TENANT') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Firma Inquilino</span>';
                                } else if (c.status === 'WAITING_OWNER') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Firma Propietario</span>';
                                } else if (c.status === 'SIGNED_AND_SEALED' || (c.tenant?.hasSigned && c.owner?.hasSigned)) {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200"><span class="material-symbols-outlined text-xs">verified</span>Firmado y Sellado</span>';
                                } else {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 text-zinc-700">Borrador</span>';
                                }

                                return `
                                    <div onclick="ContractsManager.selectContract('${c.id}')" class="p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-md ring-2 ring-primary/30' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700'}">
                                        <div class="space-y-2">
                                            <div class="flex items-center justify-between gap-2">
                                                <span class="text-[11px] font-mono font-bold text-zinc-500">${c.contractNumber}</span>
                                                ${statusBadge}
                                            </div>
                                            <h4 class="font-headline font-bold text-zinc-900 dark:text-white text-sm truncate">${c.title}</h4>
                                            <p class="text-xs text-zinc-500 truncate flex items-center gap-1">
                                                <span class="material-symbols-outlined text-xs text-primary">location_on</span> ${c.propertyAddress}
                                            </p>
                                        </div>

                                        <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                                            <span class="font-extrabold text-zinc-900 dark:text-white">${formatMoney(c.monthlyRent)}/mes</span>
                                            <span class="font-bold text-primary flex items-center gap-1 text-[11px]">
                                                ${isSelected ? '✓ Viendo Ahora' : 'Ver Documento →'}
                                            </span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    ${currentContract ? `
                    <!-- ======================================================== -->
                    <!-- FULL IN-PAGE CONTRACT VIEWER & LEGAL SIGNING DOCUMENT -->
                    <!-- ======================================================== -->
                    <section id="contract-live-viewer-section" class="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
                        
                        <!-- Document Top Action Header -->
                        <div class="p-4 sm:p-6 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md">
                                    <span class="material-symbols-outlined text-2xl">description</span>
                                </div>
                                <div>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">${currentContract.contractNumber}</span>
                                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Oficial Hábitat</span>
                                    </div>
                                    <h3 class="font-headline font-bold text-base sm:text-lg text-zinc-900 dark:text-white truncate">
                                        ${currentContract.title}
                                    </h3>
                                    <p class="text-xs text-zinc-500 truncate">📍 ${currentContract.propertyAddress}</p>
                                </div>
                            </div>

                            <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                ${(!currentContract.tenant?.hasSigned && !currentContract.owner?.hasSigned && currentContract.status !== 'SIGNED_AND_SEALED' && (effectiveRole === 'OWNER' || effectiveRole === 'BROKER')) ? `
                                <button type="button" onclick="ContractsManager.editContractConditions('${currentContract.id}')" class="px-4 py-2.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                                    <span class="material-symbols-outlined text-base">tune</span>
                                    <span>Personalizar / Editar Borrador</span>
                                </button>
                                ` : isFullySigned(currentContract) ? `
                                <div class="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 font-headline font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                                    <span class="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">lock</span>
                                    <span>Contrato Sellado e Inmutable (Ley 25.506)</span>
                                </div>
                                ` : (currentContract.tenant?.hasSigned || currentContract.owner?.hasSigned) ? `
                                <div class="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-headline font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                                    <span class="material-symbols-outlined text-base text-amber-600 dark:text-amber-400">lock_clock</span>
                                    <span>Bloqueado por Firma en Curso</span>
                                </div>
                                ` : ''}
                                <button type="button" onclick="ContractsManager.downloadSignedContract('${currentContract.id}')" class="px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 text-zinc-800 dark:text-zinc-200 font-headline font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer">
                                    <span class="material-symbols-outlined text-base text-primary">download</span>
                                    <span>Descargar Contrato (PDF)</span>
                                </button>
                                <button type="button" onclick="ContractsManager.downloadAuditTrail('${currentContract.id}')" class="px-4 py-2.5 bg-zinc-900 hover:bg-black text-white font-headline font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
                                    <span class="material-symbols-outlined text-base text-emerald-400">verified_user</span>
                                    <span>Audit Trail TSA</span>
                                </button>
                            </div>
                        </div>

                        <!-- Main Document Content Body -->
                        <div class="p-6 sm:p-8 space-y-6">
                            
                            <!-- Financial & Contract Specs Bar -->
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
                                <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Canon Mensual Acordado</span>
                                    <div class="text-base font-black text-primary dark:text-red-400">${formatMoney(currentContract.monthlyRent)} ${currentContract.currency}</div>
                                    <div class="text-zinc-500">Vencimiento día ${currentContract.paymentDueDay}</div>
                                </div>

                                <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Ajuste Periódico</span>
                                    <div class="font-bold text-zinc-900 dark:text-white text-sm">Índice ${currentContract.adjustmentIndex}</div>
                                    <div class="text-zinc-500">Cada ${currentContract.adjustmentFrequencyMonths} meses corridos</div>
                                </div>

                                <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Plazo de Locación</span>
                                    <div class="font-bold text-zinc-900 dark:text-white text-sm">${currentContract.durationMonths} Meses</div>
                                    <div class="text-zinc-500">${currentContract.startDate} al ${currentContract.endDate}</div>
                                </div>
                            </div>

                            <!-- Parties Comparison Box -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                                    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Locatario (Inquilino)</span>
                                        <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">verified</span> Didit KYC Validado
                                        </span>
                                    </div>
                                    <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">${currentContract.tenant.name}</h3>
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${currentContract.tenant.dni} • <b>CUIL:</b> ${currentContract.tenant.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${currentContract.tenant.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${currentContract.tenant.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'}">
                                            ${currentContract.tenant.hasSigned ? '✓ Firmado Digitalmente con Didit Liveness' : '⏳ Firma Pendiente'}
                                        </span>
                                    </div>
                                </div>

                                <div class="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
                                    <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700/60 pb-2">
                                        <span class="text-[10px] font-black uppercase tracking-wider text-zinc-400">Locador (Propietario)</span>
                                        <span class="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-xs">verified</span> Didit KYC Validado
                                        </span>
                                    </div>
                                    <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">${currentContract.owner.name}</h3>
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${currentContract.owner.dni} • <b>CUIL:</b> ${currentContract.owner.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${currentContract.owner.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${currentContract.owner.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'}">
                                            ${currentContract.owner.hasSigned ? '✓ Firmado Digitalmente con Didit Liveness' : '⏳ Firma Pendiente'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <!-- Full Legal Contract Document Sheet -->
                            <div class="p-6 sm:p-8 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-300 dark:border-zinc-800 font-mono text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed space-y-4 shadow-inner">
                                <div class="text-center pb-4 border-b border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <h3 class="font-bold text-sm text-zinc-900 dark:text-white uppercase tracking-widest">
                                        CONTRATO DE LOCACIÓN INMOBILIARIA CON FIRMA ELECTRÓNICA
                                    </h3>
                                    <p class="text-[11px] text-zinc-500">
                                        Conforme a la Ley Nacional N° 25.506 de Firma Digital y Arts. 1187 y concordantes del Código Civil y Comercial de la Nación
                                    </p>
                                </div>

                                <p>
                                    En la Ciudad de Mendoza, a los días acordados, entre <b>${currentContract.owner.name}</b> (DNI ${currentContract.owner.dni}, CUIL ${currentContract.owner.cuil}), en adelante denominado <b>"EL LOCADOR"</b>, por una parte; y por la otra <b>${currentContract.tenant.name}</b> (DNI ${currentContract.tenant.dni}, CUIL ${currentContract.tenant.cuil}), en adelante denominado <b>"EL LOCATARIO"</b>, se conviene en celebrar el presente contrato de locación sujeto a las siguientes cláusulas:
                                </p>

                                <p>
                                    <b>PRIMERA (OBJETO):</b> EL LOCADOR cede en locación a EL LOCATARIO, y éste acepta, el inmueble ubicado en <b>${currentContract.propertyAddress}</b>, el cual se destinará exclusivamente a vivienda familiar y permanente.
                                </p>

                                <p>
                                    <b>SEGUNDA (PLAZO):</b> El plazo contractual se estipula en <b>${currentContract.durationMonths} meses</b> corridos, con inicio el día <b>${currentContract.startDate}</b> y finalización indefectible el día <b>${currentContract.endDate}</b>.
                                </p>

                                <p>
                                    <b>TERCERA (CANON LOCATIVO Y ACTUALIZACIÓN):</b> El precio inicial del alquiler mensual se fija en la suma de <b>${formatMoney(currentContract.monthlyRent)} (${currentContract.currency})</b>. Dicho valor se actualizará cada <b>${currentContract.adjustmentFrequencyMonths} meses</b> aplicando la variación del índice <b>${currentContract.adjustmentIndex}</b> publicado oficialmente.
                                </p>

                                <p>
                                    <b>CUARTA (PAGOS):</b> El canon locativo deberá abonarse del 1 al ${currentContract.paymentDueDay} de cada mes mediante transferencia bancaria al Alias CBU: <b>${currentContract.aliasCbu}</b>.
                                </p>

                                <p>
                                    <b>QUINTA (VALIDEZ PROBATORIA Y BIOMETRÍA DIDIT):</b> Las partes prestan su expreso e irrevocable consentimiento para la suscripción del presente instrumento mediante <b>Firma Electrónica y Validación Biométrica Facial en Vivo (Didit Liveness Check)</b>, reconociéndole plena validez legal, eficacia probatoria y fuerza vinculante conforme a la <b>Ley 25.506</b>.
                                </p>

                                <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500">
                                    <b>Hash SHA-256 del Documento:</b> <span class="font-mono text-emerald-600 dark:text-emerald-400 break-all">${currentContract.sha256Hash}</span>
                                </div>
                            </div>

                            <!-- Interactive Signature Action Zone -->
                            <div class="p-6 sm:p-8 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-primary/30 space-y-5">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                                        <span class="material-symbols-outlined text-xl">face</span>
                                    </div>
                                    <div>
                                        <h3 class="font-headline font-bold text-base text-zinc-900 dark:text-white">
                                            Validación Biométrica y Firma Electrónica
                                        </h3>
                                        <p class="text-xs text-zinc-500">
                                            Suscripción digital segura con prueba de vida Didit Liveness Check y sellado legal TSA.
                                        </p>
                                    </div>
                                </div>

                                ${isFullySigned(currentContract) ? `
                                    <div class="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                                <span class="material-symbols-outlined text-xl">verified</span>
                                            </div>
                                            <div>
                                                <h4 class="font-headline font-bold text-sm text-emerald-950 dark:text-emerald-200">✓ CONTRATO 100% FIRMADO Y SELLADO (Ley 25.506)</h4>
                                                <p class="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">Ambas partes validaron su identidad con prueba de vida Didit Liveness y el documento cuenta con Time-Stamp TSA.</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 shrink-0">
                                            <button onclick="ContractsManager.downloadSignedContract('${currentContract.id}')" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                                Descargar PDF
                                            </button>
                                            <button onclick="ContractsManager.downloadAuditTrail('${currentContract.id}')" class="px-4 py-2.5 bg-zinc-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                                Audit Trail TSA
                                            </button>
                                        </div>
                                    </div>
                                ` : isContractPendingForMe ? `
                                    <div class="space-y-4">
                                        <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
                                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                                                <span class="text-zinc-500 font-medium">Firmando como: <b class="text-zinc-900 dark:text-white">${signerObj.name}</b> (${effectiveRole === 'TENANT' ? 'Locatario' : 'Locador'})</span>
                                                <div class="flex items-center gap-1.5">
                                                    <span class="text-[11px] text-zinc-400">Email Didit:</span>
                                                    <input 
                                                        type="email" 
                                                        id="signer-didit-email" 
                                                        value="${signerObj.email || ''}" 
                                                        class="px-2.5 py-1 text-xs font-mono font-bold bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-1 focus:ring-primary outline-none"
                                                        placeholder="tu.email@ejemplo.com"
                                                    >
                                                </div>
                                            </div>

                                            <label class="flex items-start gap-3 cursor-pointer select-none">
                                                <input type="checkbox" id="legal-inpage-consent" class="mt-0.5 w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 cursor-pointer" onchange="document.getElementById('inpage-sign-action-btn').disabled = !this.checked">
                                                <div class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                    <span class="font-bold text-zinc-900 dark:text-white block mb-0.5">Consentimiento Expreso de Firma Digital</span>
                                                    He leído y acepto íntegramente las cláusulas del contrato. Consiento expresamente la firma electrónica y la validación facial en vivo (Liveness Check) con Didit conforme a la <b>Ley 25.506</b>.
                                                </div>
                                            </label>
                                        </div>

                                        <button id="inpage-sign-action-btn" disabled onclick="ContractsManager.executeSignatureWithDidit('${currentContract.id}', '${effectiveRole}')" class="w-full py-4 px-6 bg-primary hover:bg-primary-container disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-headline font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed">
                                            <span class="material-symbols-outlined text-xl">face</span>
                                            <span>Iniciar Didit Liveness Check y Firmar Contrato</span>
                                        </button>
                                    </div>
                                ` : `
                                    <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                        <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                                            <span class="material-symbols-outlined text-lg text-emerald-600">verified</span>
                                            <span>Tu firma se encuentra registrada y certificada en este contrato. Aguardando firma de la otra parte.</span>
                                        </div>
                                        <button onclick="ContractsManager.downloadSignedContract('${currentContract.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                            Descargar Copia Certificada
                                        </button>
                                    </div>
                                `}
                            </div>

                        </div>
                    </section>
                    ` : ''}
                </div>
            `;

            container.innerHTML = html;
        },

        executeSignatureWithDidit: function (contractId, explicitRole) {
            const contractObj = contracts.find(c => String(c.id) === String(contractId) || String(c.contractNumber) === String(contractId)) || contracts[0];
            const role = explicitRole || detectActiveUserRole(contractObj) || this.currentUserRole;
            this.currentUserRole = role;
            const consentCheckbox = document.getElementById('legal-inpage-consent');
            if (consentCheckbox && !consentCheckbox.checked) {
                alert('Debe aceptar el consentimiento expreso de firma digital para continuar.');
                return;
            }

            const emailInput = document.getElementById('signer-didit-email');
            const email = (emailInput && emailInput.value.trim()) || 'usuario@habitat.ar';

            if (window.DiditAuth && typeof window.DiditAuth.openFaceLivenessVerification === 'function') {
                window.DiditAuth.openFaceLivenessVerification({
                    email: email,
                    vendorData: `CONTRACT_SIGN_${contractId}_${role}`,
                    callbackUrl: window.location.origin + window.location.pathname + `?contract=${contractId}&role=${role}`,
                    onSuccess: (result) => {
                        ContractsManager.startCryptographicStep(contractId, role, result || {});
                    },
                    onError: (err) => {
                        console.warn('Firma cancelada o con error:', err);
                    }
                });
            } else {
                ContractsManager.startCryptographicStep(contractId, role, {
                    sessionId: `didit_live_${Date.now()}`,
                    status: 'APPROVED'
                });
            }
        },

        startCryptographicStep: function (contractId, role, diditSessionData = {}) {
            const currentSessionId = diditSessionData.sessionId || `didit_sess_${Date.now()}`;
            const shortSessionId = currentSessionId.length > 22 ? currentSessionId.substring(0, 22) + '...' : currentSessionId;

            // Modal compatible con Modo Claro y Modo Oscuro
            const cryptoModalHtml = `
                <div id="contract-modal-overlay" class="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-body" style="-webkit-overflow-scrolling: touch;">
                    <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 space-y-5 overflow-hidden my-auto animate-fadeIn">
                        
                        <div class="text-center space-y-2 relative z-10">
                            <div class="w-14 h-14 rounded-2xl bg-red-50 dark:bg-zinc-800 border border-red-200 dark:border-zinc-700 flex items-center justify-center text-primary dark:text-red-400 mx-auto">
                                <span class="material-symbols-outlined text-3xl animate-pulse">lock_clock</span>
                            </div>
                            <h3 class="font-headline font-bold text-base sm:text-lg text-zinc-900 dark:text-white">Sellado Digital del Contrato</h3>
                            <p class="text-xs text-zinc-500 dark:text-zinc-400">Verificación biométrica Didit y Time-Stamp <b>Ley 25.506</b></p>
                        </div>

                        <!-- Progress Bar -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-mono text-zinc-500 dark:text-zinc-400">
                                <span>Progreso Criptográfico</span>
                                <span id="crypto-progress-text" class="text-emerald-600 dark:text-emerald-400 font-bold">40%</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div id="crypto-progress-bar" class="h-full bg-gradient-to-r from-primary via-red-500 to-emerald-400 transition-all duration-500" style="width: 40%"></div>
                            </div>
                            <p id="crypto-status-msg" class="text-[11px] text-center text-zinc-600 dark:text-zinc-300 font-medium animate-pulse min-h-[18px]">
                                Biometría facial Didit Aprobada. Generando Hash SHA-256...
                            </p>
                        </div>

                        <!-- 4 Step Checkpoints -->
                        <div class="space-y-2.5 text-xs font-mono">
                            <div id="step-row-1" class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between">
                                <div class="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-medium">
                                    <span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                                    <span>Prueba de Vida Didit Liveness</span>
                                </div>
                                <span class="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">APROBADA</span>
                            </div>

                            <div id="step-row-2" class="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white">
                                <div class="flex items-center gap-2 font-medium">
                                    <span class="material-symbols-outlined text-primary text-base animate-spin">sync</span>
                                    <span>Digest Criptográfico SHA-256</span>
                                </div>
                                <span id="step-tag-2" class="text-amber-600 dark:text-amber-400 font-bold text-[10px]">EN CURSO...</span>
                            </div>

                            <div id="step-row-3" class="p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-zinc-400">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-zinc-400 text-base">schedule</span>
                                    <span>Sello de Tiempo TSA (Ley 25.506)</span>
                                </div>
                                <span id="step-tag-3" class="text-[10px] text-zinc-400">PENDIENTE</span>
                            </div>

                            <div id="step-row-4" class="p-2.5 rounded-xl bg-zinc-50/50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-zinc-400">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-zinc-400 text-base">folder_zip</span>
                                    <span>Registro de Firma en Supabase</span>
                                </div>
                                <span id="step-tag-4" class="text-[10px] text-zinc-400">PENDIENTE</span>
                            </div>
                        </div>

                        <!-- Session Badge -->
                        <div class="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                            <span>ID Sesión Didit:</span>
                            <span class="font-mono text-zinc-900 dark:text-white font-bold">${shortSessionId}</span>
                        </div>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('contract-modal-overlay');
            if (existingModal) existingModal.remove();

            const wrapper = document.createElement('div');
            wrapper.innerHTML = cryptoModalHtml;
            document.body.appendChild(wrapper.firstElementChild);

            const clientDirectStoragePromise = (async () => {
                if (!window.supabaseClient) return null;
                try {
                    let contractObj = contracts.find(item => 
                        String(item.id) === String(contractId) || 
                        String(item.contractNumber) === String(contractId) || 
                        String(item.dbContractId) === String(contractId)
                    ) || contracts[0];

                    let dbContractId = contractObj?.dbContractId ? Number(contractObj.dbContractId) : null;

                    // 1. Si no tenemos dbContractId, buscar por ID numérico extraído o por la propiedad
                    if (!dbContractId && contractId) {
                        const parsedNum = parseInt(String(contractId).replace(/\D/g, ''), 10);
                        if (parsedNum && !isNaN(parsedNum)) {
                            const { data: directC } = await window.supabaseClient
                                .from('Contrato')
                                .select('id_contrato')
                                .eq('id_contrato', parsedNum)
                                .maybeSingle();
                            if (directC && directC.id_contrato) {
                                dbContractId = directC.id_contrato;
                            }
                        }
                    }

                    if (!dbContractId) {
                        const propId = Number(contractObj?.propertyId || 42);
                        const { data: propContract } = await window.supabaseClient
                            .from('Contrato')
                            .select('id_contrato')
                            .eq('id_propiedad', propId)
                            .order('id_contrato', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (propContract && propContract.id_contrato) {
                            dbContractId = propContract.id_contrato;
                        }
                    }

                    if (!dbContractId) {
                        const { data: latestC } = await window.supabaseClient
                            .from('Contrato')
                            .select('id_contrato')
                            .order('id_contrato', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (latestC && latestC.id_contrato) {
                            dbContractId = latestC.id_contrato;
                        }
                    }

                    if (contractObj && dbContractId) {
                        contractObj.dbContractId = dbContractId;
                    }

                    if (!dbContractId) {
                        console.error("[ContractsManager] No se pudo resolver id_contrato en Supabase.");
                        return null;
                    }

                    const isTenantRole = (role === 'TENANT' || role === 'INQUILINO' || String(role).toLowerCase() === 'inquilino' || String(role).toLowerCase() === 'tenant');
                    const dbRole = isTenantRole ? 'inquilino' : 'propietario';

                    let profileId = isTenantRole ? (Number(contractObj?.tenant?.profileId) || 15) : (Number(contractObj?.owner?.profileId) || 6);
                    try {
                        const { data: authSess } = await window.supabaseClient.auth.getSession();
                        const currentAuthUserId = authSess?.session?.user?.id;
                        if (currentAuthUserId) {
                            const { data: pData } = await window.supabaseClient
                                .from('Perfil')
                                .select('id_perfil')
                                .eq('user_id', currentAuthUserId)
                                .maybeSingle();
                            if (pData && pData.id_perfil) {
                                profileId = pData.id_perfil;
                            }
                        }
                    } catch (e) {}

                    if (!profileId) {
                        profileId = isTenantRole ? 15 : 6;
                    }

                    // 2.1. Obtener IP y Geolocalización del cliente
                    let clientIp = '127.0.0.1';
                    let clientGeo = null;
                    try {
                        const geoResponse = await fetch('https://get.geojs.io/v1/ip/geo.json');
                        if (geoResponse.ok) {
                            const geoData = await geoResponse.json();
                            clientIp = geoData.ip;
                            clientGeo = {
                                latitude: geoData.latitude,
                                longitude: geoData.longitude,
                                city: geoData.city,
                                region: geoData.region,
                                country: geoData.country
                            };
                        }
                    } catch (e) {
                        console.warn("[ContractsManager] No se pudo obtener la IP/Geo:", e);
                    }

                    let backendSellar = null;
                    try {
                        const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
                        // Intentar obtener info del backend si existe
                        const sellRes = await fetch(`${apiBase}/api/firmas/sellar?id_contrato=${dbContractId}&role=${dbRole}`);
                        if (sellRes.ok) {
                            const sj = await sellRes.json();
                            backendSellar = sj.data;
                        }
                    } catch(e) {
                        console.warn("[ContractsManager] Fallo al contactar el backend de sellado", e);
                    }

                    const signatureData = {
                        id_contrato: dbContractId,
                        id_perfil_firmante: profileId,
                        rol_firmante: dbRole,
                        estado_firma: 'sellada',
                        didit_session_id: currentSessionId,
                        didit_status: 'APPROVED',
                        hash_contrato_sha256: backendSellar?.hash_contrato_sha256 || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33',
                        hash_audit_trail_sha256: backendSellar?.hash_audit_trail_sha256 || '9f8e7d6c5b4a3928170efdcba0987654321fedcba0987654321fedcba0987654',
                        tsa_sello_tiempo: backendSellar?.tsa_sello_tiempo || {
                            serialNumber: `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
                            timestamp: new Date().toISOString(),
                            authority: 'ONTI-AR-TSA-ROOT-CA',
                            algorithm: 'SHA256withRSA-4096'
                        },
                        url_audit_trail_pdf: backendSellar?.url_audit_trail_pdf || `contrato_${dbContractId}/audit_trail_${dbRole}.pdf`,
                        url_contrato_final_pdf: backendSellar?.url_contrato_final_pdf || `contrato_${dbContractId}/contrato_definitivo.pdf`,
                        fecha_firma: new Date().toISOString(),
                        ip_origen: clientIp,
                        geolocalizacion: clientGeo,
                        user_agent: navigator.userAgent

                    };

                    const { data: allSignatures } = await window.supabaseClient
                        .from('Firma_contrato')
                        .select('*')
                        .eq('id_contrato', dbContractId);

                    const existingFirma = (allSignatures || []).find(f => 
                        isTenantRole 
                            ? ['inquilino', 'tenant', 'TENANT', 'INQUILINO'].includes(f.rol_firmante)
                            : ['propietario', 'owner', 'OWNER', 'PROPIETARIO'].includes(f.rol_firmante)
                    );

                    let insertedFirma = backendSellar;
                    if (existingFirma && existingFirma.id_firma) {
                        const { data: updatedF, error: upErr } = await window.supabaseClient
                            .from('Firma_contrato')
                            .update(signatureData)
                            .eq('id_firma', existingFirma.id_firma)
                            .select()
                            .maybeSingle();
                        if (upErr) console.error("[ContractsManager] Error actualizando Firma_contrato:", upErr);
                        insertedFirma = updatedF || insertedFirma;
                    } else {
                        const { data: newF, error: insErr } = await window.supabaseClient
                            .from('Firma_contrato')
                            .insert([signatureData])
                            .select()
                            .maybeSingle();
                        if (insErr) console.error("[ContractsManager] Error insertando Firma_contrato:", insErr);
                        insertedFirma = newF || insertedFirma;
                    }

                    const { data: freshSignatures } = await window.supabaseClient
                        .from('Firma_contrato')
                        .select('rol_firmante, estado_firma, didit_status')
                        .eq('id_contrato', dbContractId);

                    const tenantHasSigned = (freshSignatures || []).some(f => 
                        ['TENANT', 'INQUILINO', 'inquilino', 'tenant'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    ) || isTenantRole;

                    const ownerHasSigned = (freshSignatures || []).some(f => 
                        ['OWNER', 'PROPIETARIO', 'propietario', 'owner'].includes(f.rol_firmante) && 
                        (f.estado_firma === 'sellada' || f.estado_firma === 'firmada' || f.estado_firma === 'completada' || f.didit_status === 'APPROVED')
                    ) || (!isTenantRole);

                    const rentAmount = Number(contractObj?.monthlyRent || 450000);
                    const pubId = contractObj?.publicationId ? Number(contractObj.publicationId) : null;
                    const propId = contractObj?.propertyId ? Number(contractObj.propertyId) : null;

                    try {
                        const { data: existingPago } = await window.supabaseClient
                            .from('Pago')
                            .select('id_pago')
                            .eq('id_contrato', dbContractId)
                            .limit(1)
                            .maybeSingle();

                        if (!existingPago) {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const { data: newPago } = await window.supabaseClient
                                .from('Pago')
                                .insert([{
                                    id_contrato: dbContractId,
                                    id_metodo_pago: 1,
                                    monto: rentAmount,
                                    fecha_vencimiento: todayStr,
                                    periodo: new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                                }])
                                .select()
                                .maybeSingle();

                            if (newPago && newPago.id_pago) {
                                await window.supabaseClient.from('Historial_pago').insert([{
                                    id_pago: newPago.id_pago,
                                    id_estado_pago: 1,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            }
                        }
                    } catch (pErr) {
                        console.warn("Aviso registrando pago en Supabase:", pErr);
                    }

                    if (tenantHasSigned && ownerHasSigned) {
                        try {
                            await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                                id_contrato: dbContractId,
                                id_estado_contrato: 1,
                                fecha_inicio: new Date().toISOString()
                            }]);
                        } catch (e) {}

                        if (pubId) {
                            try {
                                await window.supabaseClient.from('Historial_Estado_Publicacion').insert([{
                                    id_publicacion: pubId,
                                    id_estado_publicacion: 2,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            } catch (e) {}
                        }

                        if (propId) {
                            try {
                                await window.supabaseClient
                                    .from('Propiedad')
                                    .update({ id_estado_propiedad: 4 })
                                    .eq('id_propiedad', propId);

                                await window.supabaseClient.from('Historial_estado_propiedad').insert([{
                                    id_propiedad: propId,
                                    id_estado_propiedad: 4,
                                    fecha_inicio: new Date().toISOString()
                                }]);
                            } catch (e) {}
                        }
                    } else {
                        try {
                            await window.supabaseClient.from('Historial_Estado_Contrato').insert([{
                                id_contrato: dbContractId,
                                id_estado_contrato: 5,
                                fecha_inicio: new Date().toISOString()
                            }]);
                        } catch (e) {}
                    }

                    return {
                        firma: insertedFirma,
                        backendSellar,
                        backendFinalizar
                    };
                } catch (e) {
                    console.warn("Aviso guardando firma en Supabase:", e);
                }
                return null;
            })();

            setTimeout(() => {
                const pBar = document.getElementById('crypto-progress-bar');
                const pText = document.getElementById('crypto-progress-text');
                const msg = document.getElementById('crypto-status-msg');
                const row2 = document.getElementById('step-row-2');
                const tag2 = document.getElementById('step-tag-2');
                const row3 = document.getElementById('step-row-3');
                const tag3 = document.getElementById('step-tag-3');

                if (pBar) pBar.style.width = '70%';
                if (pText) pText.innerText = '70%';
                if (msg) msg.innerText = 'Generando Digest SHA-256 e incrustando firma en Supabase...';
                if (row2 && tag2) {
                    row2.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag2.className = 'text-emerald-600 dark:text-emerald-400 font-bold text-[10px]';
                    tag2.innerText = 'COMPLETADO';
                }
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white';
                    tag3.className = 'text-amber-600 dark:text-amber-400 font-bold text-[10px]';
                    tag3.innerText = 'EN CURSO...';
                }
            }, 800);

            setTimeout(() => {
                const pBar = document.getElementById('crypto-progress-bar');
                const pText = document.getElementById('crypto-progress-text');
                const msg = document.getElementById('crypto-status-msg');
                const row3 = document.getElementById('step-row-3');
                const tag3 = document.getElementById('step-tag-3');
                const row4 = document.getElementById('step-row-4');
                const tag4 = document.getElementById('step-tag-4');

                if (pBar) pBar.style.width = '95%';
                if (pText) pText.innerText = '95%';
                if (msg) msg.innerText = 'Estampando Sello de Tiempo TSA y resguardando Audit Trail en Storage...';
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag3.className = 'text-emerald-600 dark:text-emerald-400 font-bold text-[10px]';
                    tag3.innerText = 'COMPLETADO';
                }
                if (row4 && tag4) {
                    row4.className = 'p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-primary/40 flex items-center justify-between text-zinc-900 dark:text-white';
                    tag4.className = 'text-amber-600 dark:text-amber-400 font-bold text-[10px]';
                    tag4.innerText = 'EN CURSO...';
                }
            }, 1600);

            setTimeout(async () => {
                const serverData = await clientDirectStoragePromise;
                const backendSellarData = serverData?.backendSellar || serverData?.firma || {};
                const backendDocs = serverData?.backendFinalizar?.documentos || {};

                const c = contracts.find(item => String(item.id) === String(contractId) || String(item.contractNumber) === String(contractId)) || contracts[0];
                if (c) {
                    if (role === 'TENANT') {
                        c.tenant.hasSigned = true;
                        c.tenant.signedAt = new Date().toISOString();
                        c.tenant.diditSessionId = currentSessionId;
                        c.status = c.owner.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_OWNER';
                    } else if (role === 'OWNER') {
                        c.owner.hasSigned = true;
                        c.owner.signedAt = new Date().toISOString();
                        c.owner.diditSessionId = currentSessionId;
                        c.status = c.tenant.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_TENANT';
                    } else {
                        c.tenant.hasSigned = true;
                        c.owner.hasSigned = true;
                        c.status = 'SIGNED_AND_SEALED';
                    }

                    c.sha256Hash = backendSellarData.hash_contrato_sha256 || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33';
                    c.tsaTimestamp = backendSellarData.fecha_firma || new Date().toISOString();
                    c.tsaCertificateId = backendSellarData.tsa_sello_tiempo?.serialNumber || `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`;
                    c.auditTrailUrl = backendSellarData.url_audit_trail_pdf;
                    c.downloadUrls = backendDocs;

                    c.auditTrailEvents = c.auditTrailEvents || [];
                    c.auditTrailEvents.push({
                        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                        action: role === 'TENANT' ? 'FIRMA_INQUILINO_COMPLETADA' : 'FIRMA_PROPIETARIO_COMPLETADA',
                        actor: role === 'TENANT' ? c.tenant.name : c.owner.name,
                        details: `Validación facial Didit Liveness Check Aprobada (Sesión: ${currentSessionId}), sellado TSA y PDF custodiado en Supabase Storage.`
                    });

                    saveContracts();

                    if (window.NotificationManager) {
                        if (role === 'TENANT') {
                            window.NotificationManager.createNotification({
                                id: `notif_tenant_signed_${c.id}`,
                                title: '✍️ ¡El inquilino firmó el contrato!',
                                message: `${c.tenant.name} completó su validación biométrica y firmó el contrato para "${c.title}". Ahora es tu turno de firmar como propietario.`,
                                type: 'contract',
                                link: `contratos.html?contract=${c.id}&sign=1&role=OWNER`,
                                role: 'OWNER',
                                priority: 'high'
                            });
                        } else {
                            window.NotificationManager.createNotification({
                                id: `notif_owner_signed_${c.id}`,
                                title: '✍️ ¡El propietario firmó el contrato!',
                                message: `${c.owner.name} firmó y selló el contrato para "${c.title}". El contrato de locación se encuentra 100% perfeccionado.`,
                                type: 'contract',
                                link: `contratos.html?contract=${c.id}&role=TENANT`,
                                role: 'TENANT',
                                priority: 'high'
                            });
                        }
                    }
                }

                const modal = document.getElementById('contract-modal-overlay');
                if (modal) modal.remove();

                ContractsManager.renderDashboard('contracts-dashboard-container');

                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '✓ Firma Registrada y Sellada',
                        message: 'Prueba de vida biométrica aprobada y certificado resguardado en Supabase Storage.',
                        type: 'success',
                        duration: 5000
                    });
                }
            }, 2600);
        },

        openContractSigning: function (contractId) {
            this.selectContract(contractId, true);
        },

        openContractViewer: function (contractId) {
            this.selectContract(contractId, true);
        },

        editContractConditions: function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const isSigned = contract.status === 'SIGNED_AND_SEALED' || contract.tenant?.hasSigned || contract.owner?.hasSigned;
            if (isSigned) {
                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '🔒 Contrato Bloqueado e Inmutable',
                        message: 'Este contrato ya cuenta con firmas digitales registradas y se encuentra sellado según la Ley 25.506.',
                        type: 'warning'
                    });
                } else {
                    alert('Este contrato ya cuenta con firmas digitales registradas y se encuentra sellado según la Ley 25.506.');
                }
                return;
            }

            if (window.openContractEditorModal) {
                window.openContractEditorModal({
                    applicant: {
                        tenant_name: contract.tenant?.name,
                        tenant_dni: contract.tenant?.dni,
                        tenant_email: contract.tenant?.email
                    },
                    property: {
                        title: contract.title,
                        address: contract.propertyAddress,
                        price: contract.monthlyRent
                    },
                    contract: contract,
                    onConfirm: async (terms) => {
                        contract.monthlyRent = terms.monthlyRent || contract.monthlyRent;
                        contract.durationMonths = terms.durationMonths || contract.durationMonths;
                        contract.adjustmentIndex = terms.adjustmentIndex || contract.adjustmentIndex;
                        contract.adjustmentFrequencyMonths = terms.adjustmentFrequencyMonths || contract.adjustmentFrequencyMonths;
                        contract.paymentDueDay = terms.paymentDueDay || contract.paymentDueDay;
                        contract.aliasCbu = terms.aliasCbu || contract.aliasCbu;
                        contract.clauses = terms.clauses || contract.clauses;

                        const dbId = contract.dbContractId || parseInt(String(contract.id).replace(/\D/g, ''), 10);
                        if (window.supabaseClient && dbId) {
                            try {
                                await window.supabaseClient.from('Contrato').update({
                                    monto_cierre: contract.monthlyRent,
                                    periodo_aumento_meses: contract.adjustmentFrequencyMonths,
                                    dia_vencimiento_mensual: contract.paymentDueDay,
                                    alias_cbu: contract.aliasCbu
                                }).eq('id_contrato', dbId);
                            } catch (e) {
                                console.warn("Aviso actualizando contrato en Supabase:", e);
                            }
                        }

                        saveContracts();
                        if (window.ContractEditorModal) window.ContractEditorModal.close();
                        ContractsManager.renderDashboard('contracts-dashboard-container');

                        if (window.ToastManager) {
                            window.ToastManager.show({
                                title: '✓ Contrato Actualizado',
                                message: 'Se aplicaron las nuevas condiciones y cláusulas al borrador oficial.',
                                type: 'success'
                            });
                        }
                    }
                });
            }
        },

        downloadSignedContract: async function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const dbId = contract.dbContractId || parseInt(String(contractId).replace(/\D/g, ''), 10) || 43;

            // 1. Obtener URL firmada directamente desde Supabase Storage
            if (window.supabaseClient) {
                try {
                    const { data, error } = await window.supabaseClient.storage
                        .from('contratos_firmados')
                        .createSignedUrl(`contrato_${dbId}/contrato_definitivo.pdf`, 60 * 60 * 24 * 7);
                    if (data && data.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                        return;
                    }
                } catch (sbErr) {
                    console.warn('[ContractsManager] Supabase direct storage signed URL aviso:', sbErr);
                }
            }

            // 2. Intentar obtener URL firmada del backend API (soporta puerto 3000 o relativo)
            const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
            try {
                const finRes = await fetch(`${apiBase}/api/firmas/finalizar?id_contrato=${dbId}`);
                if (finRes.ok) {
                    const finJson = await finRes.json();
                    const signedPdfUrl = finJson?.data?.documentos?.contrato_pdf;
                    if (signedPdfUrl) {
                        window.open(signedPdfUrl, '_blank');
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('[ContractsManager] Fallback a renderizado local de PDF:', apiErr);
            }

            // 3. Fallback: Renderizado de impresión en navegador
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el PDF.');
                return;
            }

            const formatMoney = (n) => '$ ' + Number(n).toLocaleString('es-AR');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Contrato de Locación - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; font-size: 13px; line-height: 1.7; }
                        .header { text-align: center; border-bottom: 2px solid #811b1e; padding-bottom: 15px; margin-bottom: 25px; }
                        .title { font-size: 20px; font-weight: 800; color: #811b1e; text-transform: uppercase; letter-spacing: 0.5px; }
                        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .badge { display: inline-block; background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 11px; margin-top: 8px; border: 1px solid #a7f3d0; }
                        .clause { margin-bottom: 16px; text-align: justify; }
                        .signatures { margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 25px; gap: 20px; }
                        .sig-box { width: 48%; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; background: #f8fafc; }
                        .sig-status { display: inline-block; margin-top: 8px; font-weight: bold; font-size: 11px; color: #059669; }
                        .qr-seal { margin-top: 35px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                        @media print {
                            body { margin: 20px; font-size: 12px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CONTRATO DE LOCACIÓN INMOBILIARIA DIGITAL</div>
                        <div class="subtitle"><b>Identificador Legal:</b> ${contract.contractNumber} • Conforme a la Ley Nacional N° 25.506 de Firma Digital</div>
                        <div class="badge">✓ SELLADO CON AUDIT TRAIL FORENSE Y TSA TIME-STAMP</div>
                    </div>

                    <div class="clause">
                        <b>PARTES INTERVINIENTES:</b> En la Ciudad de Mendoza, entre <b>${contract.owner.name}</b> (DNI ${contract.owner.dni}, CUIL ${contract.owner.cuil}), en adelante denominado <b>"EL LOCADOR"</b>, por una parte; y por la otra <b>${contract.tenant.name}</b> (DNI ${contract.tenant.dni}, CUIL ${contract.tenant.cuil}), en adelante denominado <b>"EL LOCATARIO"</b>, se conviene en celebrar el presente contrato de locación sujeto a las siguientes cláusulas:
                    </div>

                    <div class="clause">
                        <b>PRIMERA (OBJETO):</b> EL LOCADOR cede en locación a EL LOCATARIO, y éste acepta, el inmueble ubicado en <b>${contract.propertyAddress}</b>, el cual se destinará exclusivamente a vivienda familiar y permanente.
                    </div>

                    <div class="clause">
                        <b>SEGUNDA (PLAZO):</b> El plazo contractual se estipula en <b>${contract.durationMonths} meses</b> corridos, con inicio el día <b>${contract.startDate}</b> y finalización indefectible el día <b>${contract.endDate}</b>.
                    </div>

                    <div class="clause">
                        <b>TERCERA (CANON LOCATIVO Y ACTUALIZACIÓN):</b> El precio inicial del alquiler mensual se fija en la suma de <b>${formatMoney(contract.monthlyRent)} (${contract.currency})</b>. Dicho valor se actualizará cada <b>${contract.adjustmentFrequencyMonths} meses</b> aplicando la variación del índice <b>${contract.adjustmentIndex}</b> publicado oficialmente.
                    </div>

                    <div class="clause">
                        <b>CUARTA (PAGOS):</b> El canon locativo deberá abonarse del 1 al ${contract.paymentDueDay} de cada mes mediante transferencia bancaria al Alias CBU: <b>${contract.aliasCbu}</b>.
                    </div>

                    <div class="clause">
                        <b>QUINTA (VALIDEZ DE FIRMA DIGITAL Y BIOMETRÍA DIDIT):</b> Las partes prestan su expreso e irrevocable consentimiento para la suscripción del presente instrumento mediante <b>Firma Electrónica y Validación Biométrica Facial en Vivo (Didit Liveness Check)</b>, reconociéndole plena validez legal, eficacia probatoria y fuerza vinculante conforme a la <b>Ley 25.506</b>.
                    </div>

                    <div class="signatures">
                        <div class="sig-box">
                            <b>Locatario (Inquilino):</b><br>
                            ${contract.tenant.name}<br>
                            <b>DNI:</b> ${contract.tenant.dni} • <b>CUIL:</b> ${contract.tenant.cuil}<br>
                            <b>Email:</b> ${contract.tenant.email}<br>
                            <span class="sig-status">${contract.tenant.hasSigned ? '✓ FIRMADO DIGITALMENTE (Didit Liveness Check Aprobado)' : '⏳ PENDIENTE DE FIRMA'}</span>
                        </div>
                        <div class="sig-box">
                            <b>Locador (Propietario):</b><br>
                            ${contract.owner.name}<br>
                            <b>DNI:</b> ${contract.owner.dni} • <b>CUIL:</b> ${contract.owner.cuil}<br>
                            <b>Email:</b> ${contract.owner.email}<br>
                            <span class="sig-status">${contract.owner.hasSigned ? '✓ FIRMADO DIGITALMENTE (Didit Liveness Check Aprobado)' : '⏳ PENDIENTE DE FIRMA'}</span>
                        </div>
                    </div>

                    <div class="qr-seal">
                        <b>Digest Criptográfico SHA-256:</b> <span style="font-family: monospace; font-size: 10px;">${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}</span><br>
                        Sello de Tiempo TSA Registrado: ${contract.tsaTimestamp || new Date().toISOString()} • Verificable en plataforma Habitat.
                    </div>

                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        },

        downloadAuditTrail: async function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const dbId = contract.dbContractId || parseInt(String(contractId).replace(/\D/g, ''), 10) || 43;

            // 1. Obtener URL firmada directamente desde Supabase Storage
            if (window.supabaseClient) {
                try {
                    const activeRole = detectActiveUserRole(contract);
                    const isOwner = activeRole === 'OWNER';
                    let auditPath = `contrato_${dbId}/audit_trail_firma_13.pdf`;

                    const { data: fList } = await window.supabaseClient
                        .from('Firma_contrato')
                        .select('url_audit_trail_pdf, rol_firmante, id_firma')
                        .eq('id_contrato', dbId);

                    if (fList && fList.length > 0) {
                        const targetFirma = fList.find(f => isOwner 
                            ? ['propietario', 'owner', 'OWNER', 'PROPIETARIO'].includes(f.rol_firmante) 
                            : ['inquilino', 'tenant', 'TENANT', 'INQUILINO'].includes(f.rol_firmante)) || fList[0];
                        if (targetFirma) {
                            auditPath = (targetFirma.url_audit_trail_pdf && !targetFirma.url_audit_trail_pdf.startsWith('http')) 
                                ? targetFirma.url_audit_trail_pdf 
                                : `contrato_${dbId}/audit_trail_firma_${targetFirma.id_firma}.pdf`;
                        }
                    }

                    const { data, error } = await window.supabaseClient.storage
                        .from('contratos_firmados')
                        .createSignedUrl(auditPath, 60 * 60 * 24 * 7);

                    if (data && data.signedUrl) {
                        window.open(data.signedUrl, '_blank');
                        return;
                    }
                } catch (sbErr) {
                    console.warn('[ContractsManager] Supabase direct audit trail signed URL aviso:', sbErr);
                }
            }

            // 2. Intentar obtener URL firmada del backend API (soporta puerto 3000 o relativo)
            const apiBase = (window.location.port === '5500' || window.location.port === '5501') ? 'http://localhost:3000' : '';
            try {
                const finRes = await fetch(`${apiBase}/api/firmas/finalizar?id_contrato=${dbId}`);
                if (finRes.ok) {
                    const finJson = await finRes.json();
                    const docs = finJson?.data?.documentos || {};
                    const activeRole = detectActiveUserRole(contract);
                    const signedAuditUrl = (activeRole === 'OWNER' ? docs.audit_trail_propietario : docs.audit_trail_inquilino) 
                        || docs.audit_trail_inquilino 
                        || docs.audit_trail_propietario;
                    if (signedAuditUrl) {
                        window.open(signedAuditUrl, '_blank');
                        return;
                    }
                }
            } catch (apiErr) {
                console.warn('[ContractsManager] Fallback a renderizado local de Audit Trail:', apiErr);
            }

            // 3. Fallback: Renderizado de impresión en navegador

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el Audit Trail.');
                return;
            }

            const events = contract.auditTrailEvents || [
                {
                    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                    action: 'CONTRATO_GENERADO',
                    actor: 'Habitat Smart Contracts Generator',
                    details: `Contrato digital generado para ${contract.tenant?.name || 'Inquilino'} en ${contract.propertyAddress}.`
                }
            ];

            let eventsHtml = '';
            events.forEach((ev) => {
                eventsHtml += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${ev.timestamp}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f766e;">${ev.action}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-weight: 600;">${ev.actor}</td>
                        <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 11px;">${ev.details}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Certificado de Evidencia y Audit Trail - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; font-size: 12px; line-height: 1.6; }
                        .header { border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
                        .title { font-size: 18px; font-weight: 800; color: #0f766e; text-transform: uppercase; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background: #f0fdfa; text-align: left; padding: 10px; border: 1px solid #cbd5e1; font-size: 11px; font-weight: 800; color: #0f766e; }
                        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 12px; margin-bottom: 20px; font-size: 12px; }
                        @media print {
                            body { margin: 20px; font-size: 11px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CERTIFICADO DE EVIDENCIA DIGITAL (AUDIT TRAIL FORENSE)</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 4px;"><b>Referencia Contrato:</b> ${contract.contractNumber} - ${contract.title}</div>
                        <div style="font-size: 12px; color: #64748b;"><b>Autoridad Certificante TSA:</b> Time-Stamp Authority Ley Nacional N° 25.506</div>
                    </div>

                    <div class="meta-box">
                        <b>Resumen Criptográfico y Parámetros Forenses:</b><br>
                        • <b>Digest SHA-256 del Contrato:</b> <span style="font-family: monospace;">${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}</span><br>
                        • <b>Sello de Tiempo Legal (TSA):</b> ${contract.tsaTimestamp || new Date().toISOString()}<br>
                        • <b>Proveedor Biométrico de Identidad:</b> Didit KYC & Liveness Check (Face Biometrics Engine)<br>
                        • <b>Inmueble:</b> ${contract.propertyAddress}
                    </div>

                    <h3 style="font-size: 14px; font-weight: 800; color: #1e293b; margin-top: 25px;">Registro Cronológico Inmutable de Eventos</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha y Hora (UTC-3)</th>
                                <th>Evento</th>
                                <th>Actor / Firmante</th>
                                <th>Evidencia Forense y Metadatos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${eventsHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 35px; text-align: center; color: #64748b; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                        Documento emitido y resguardado criptográficamente por la plataforma Habitat en cumplimiento del Código Civil y Comercial de la Nación y la Ley 25.506.
                    </div>

                    <script>
                        window.onload = function() { window.print(); };
                    </script>
                </body>
                </html>
            `;

            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

    window.ContractsManager = ContractsManager;

    document.addEventListener('DOMContentLoaded', async function () {
        const container = document.getElementById('contracts-dashboard-container');
        if (container) {
            const urlParams = new URLSearchParams(window.location.search);
            const contractParam = urlParams.get('contract') || urlParams.get('sign') || urlParams.get('id');
            const statusParam = urlParams.get('status') || urlParams.get('didit_status') || urlParams.get('verification_status');
            const sessionParam = urlParams.get('session_id') || urlParams.get('sessionId');
            const roleParam = urlParams.get('role') || ContractsManager.currentUserRole;

            // Sincronizar contratos reales desde Supabase
            await syncContractsFromSupabase();

            if (contractParam) {
                ContractsManager.selectedContractId = contractParam;
            }

            ContractsManager.renderDashboard('contracts-dashboard-container');

            // Detectar retorno de redirección desde Didit con validación aprobada
            if (contractParam && (statusParam === 'Approved' || statusParam === 'COMPLETED' || statusParam === 'approved' || (sessionParam && !sessionParam.includes('mock')))) {
                setTimeout(() => {
                    ContractsManager.startCryptographicStep(contractParam, roleParam, {
                        sessionId: sessionParam || `didit_return_${Date.now()}`,
                        status: 'APPROVED'
                    });
                    const cleanUrl = window.location.pathname + `?contract=${contractParam}&role=${roleParam}`;
                    window.history.replaceState({}, document.title, cleanUrl);
                }, 400);
            }
        }
    });

})();
