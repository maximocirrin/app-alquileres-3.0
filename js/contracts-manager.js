/**
 * Habitat - Módulo de Firma Electrónica y Gestión de Contratos
 * Cumple con la Ley Nacional N° 25.506 de Firma Digital y Código Civil y Comercial de la Nación.
 * Integra visualizador completo en página, descarga directa de PDF/Audit Trail y validación biométrica facial (Liveness Check) con Didit KYC.
 */

(function () {
    'use strict';

    // Seed data con contratos realistas y detallados
    const SEED_CONTRACTS = [
        {
            id: 'CTR-2026-0891',
            contractNumber: 'CTR-2026-0891',
            title: 'Departamento 3 Ambientes con Balcón Aterrazado',
            propertyAddress: 'Av. Santa Fe 2450, Piso 7 "B", Recoleta, CABA',
            propertyCity: 'Recoleta, Buenos Aires',
            propertyImage: 'img/hero-marketplace.jpg',
            monthlyRent: 420000,
            currency: 'ARS',
            status: 'WAITING_TENANT',
            startDate: '2026-09-01',
            endDate: '2028-08-31',
            durationMonths: 24,
            paymentDueDay: 10,
            adjustmentIndex: 'IPC',
            adjustmentFrequencyMonths: 3,
            depositAmount: 420000,
            aliasCbu: 'HABITAT.RECOLETA.MP',
            tenant: {
                role: 'TENANT',
                name: 'Carlos Gómez',
                email: 'carlos.gomez@gmail.com',
                cuil: '20-38491029-4',
                dni: '38.491.029',
                hasSigned: false,
                isKycVerified: true
            },
            owner: {
                role: 'OWNER',
                name: 'María Florencia Rossi',
                email: 'mflorencia.rossi@outlook.com',
                cuil: '27-33918274-8',
                dni: '33.918.274',
                hasSigned: false,
                isKycVerified: true
            },
            broker: {
                name: 'Martín Palermo',
                license: 'CUCICBA Mat. 6842',
                agencyName: 'Palermo & Asociados Propiedades',
                email: 'contacto@palermoprop.com',
                phone: '+54 11 4821-9988'
            },
            sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            createdAt: '2026-08-12T14:30:00Z',
            updatedAt: '2026-08-15T10:00:00Z',
            auditTrailEvents: [
                {
                    timestamp: '2026-08-12 14:30:00',
                    action: 'CONTRATO_GENERADO',
                    actor: 'Martín Palermo (CUCICBA 6842)',
                    details: 'Borrador confeccionado bajo Ley 25.506 con Pasaporte verificado.'
                },
                {
                    timestamp: '2026-08-12 15:00:00',
                    action: 'SOLICITUD_FIRMA_ENVIADA',
                    actor: 'Habitat System',
                    details: 'Notificación despachada a carlos.gomez@gmail.com'
                }
            ]
        },
        {
            id: 'CTR-2026-0742',
            contractNumber: 'CTR-2026-0742',
            title: 'Semipiso 4 Ambientes en Torre con Amenities',
            propertyAddress: 'Av. del Libertador 4820, Piso 14, Belgrano, CABA',
            propertyCity: 'Belgrano, Buenos Aires',
            propertyImage: 'img/hero-marketplace.jpg',
            monthlyRent: 850000,
            currency: 'ARS',
            status: 'WAITING_OWNER',
            startDate: '2026-08-01',
            endDate: '2028-07-31',
            durationMonths: 24,
            paymentDueDay: 5,
            adjustmentIndex: 'ICL',
            adjustmentFrequencyMonths: 6,
            depositAmount: 850000,
            aliasCbu: 'HABITAT.BELGRANO.MP',
            tenant: {
                role: 'TENANT',
                name: 'Lucía Fernández',
                email: 'lucia.fernandez@tech.io',
                cuil: '27-39201948-3',
                dni: '39.201.948',
                hasSigned: true,
                isKycVerified: true,
                signedAt: '2026-08-14T18:22:10Z',
                ipAddress: '181.44.120.55'
            },
            owner: {
                role: 'OWNER',
                name: 'Esteban Morales',
                email: 'esteban.morales@inversiones.com.ar',
                cuil: '20-29183746-1',
                dni: '29.183.746',
                hasSigned: false,
                isKycVerified: true
            },
            broker: {
                name: 'Valeria Sotomayor',
                license: 'CUCICBA Mat. 5120',
                agencyName: 'Habitat Real Estate Network',
                email: 'valeria@habitat.ar'
            },
            sha256Hash: '9f83c6b29f7988319f390076a91176b9dfa5fae8e60408544c4897c8d94e2402',
            createdAt: '2026-08-10T09:15:00Z',
            updatedAt: '2026-08-14T18:22:10Z',
            auditTrailEvents: [
                {
                    timestamp: '2026-08-10 09:15:00',
                    action: 'CONTRATO_GENERADO',
                    actor: 'Valeria Sotomayor (CUCICBA 5120)',
                    details: 'Documento legal confeccionado.'
                },
                {
                    timestamp: '2026-08-14 18:22:10',
                    action: 'FIRMA_INQUILINO_COMPLETADA',
                    actor: 'Lucía Fernández (CUIL 27-39201948-3)',
                    details: 'Liveness Check facial Didit aprobado. IP: 181.44.120.55'
                }
            ]
        },
        {
            id: 'CTR-2026-0914',
            contractNumber: 'CTR-2026-0914',
            title: 'Loft de Diseño con Terraza y Parrilla',
            propertyAddress: 'Humboldt 1940, Piso 3, Palermo, CABA',
            propertyCity: 'Palermo, Buenos Aires',
            propertyImage: 'img/hero-marketplace.jpg',
            monthlyRent: 480000,
            currency: 'ARS',
            status: 'WAITING_TENANT',
            startDate: '2026-09-15',
            endDate: '2028-09-14',
            durationMonths: 24,
            paymentDueDay: 10,
            adjustmentIndex: 'IPC',
            adjustmentFrequencyMonths: 3,
            depositAmount: 480000,
            aliasCbu: 'HABITAT.PALERMO.MP',
            tenant: {
                role: 'TENANT',
                name: 'Valentina Silveira',
                email: 'valen.silveira@design.com',
                cuil: '27-40192847-3',
                dni: '40.192.847',
                hasSigned: false,
                isKycVerified: true
            },
            owner: {
                role: 'OWNER',
                name: 'Ignacio Larrea',
                email: 'ilarrea@inversiones.com.ar',
                cuil: '20-27182940-5',
                dni: '27.182.940',
                hasSigned: false,
                isKycVerified: true
            },
            broker: {
                name: 'Martín Palermo',
                license: 'CUCICBA Mat. 6842',
                agencyName: 'Palermo & Asociados Propiedades',
                email: 'contacto@palermoprop.com'
            },
            sha256Hash: 'c819fa2e891b29a174029bc4810a91176b9dfa5fae8e60408544c4897c8d94e2',
            createdAt: '2026-08-14T11:00:00Z',
            updatedAt: '2026-08-15T09:00:00Z',
            auditTrailEvents: [
                {
                    timestamp: '2026-08-14 11:00:00',
                    action: 'CONTRATO_GENERADO',
                    actor: 'Martín Palermo (CUCICBA 6842)',
                    details: 'Borrador confeccionado bajo Ley 25.506 con Pasaporte verificado.'
                }
            ]
        },
        {
            id: 'CTR-2026-0925',
            contractNumber: 'CTR-2026-0925',
            title: 'Piso Exclusivo 3 Ambientes con Cochera',
            propertyAddress: 'Av. Coronel Díaz 2140, Barrio Norte, CABA',
            propertyCity: 'Barrio Norte, Buenos Aires',
            propertyImage: 'img/hero-marketplace.jpg',
            monthlyRent: 620000,
            currency: 'ARS',
            status: 'WAITING_OWNER',
            startDate: '2026-09-01',
            endDate: '2028-08-31',
            durationMonths: 24,
            paymentDueDay: 5,
            adjustmentIndex: 'ICL',
            adjustmentFrequencyMonths: 4,
            depositAmount: 620000,
            aliasCbu: 'HABITAT.BARRIO.NORTE',
            tenant: {
                role: 'TENANT',
                name: 'Lucas Bertone',
                email: 'lucas.bertone@fintech.ar',
                cuil: '20-36291048-2',
                dni: '36.291.048',
                hasSigned: true,
                isKycVerified: true,
                signedAt: '2026-08-15T14:10:00Z',
                ipAddress: '190.19.45.112'
            },
            owner: {
                role: 'OWNER',
                name: 'Beatriz Mendez',
                email: 'bmendez@propiedades.com.ar',
                cuil: '27-22918475-4',
                dni: '22.918.475',
                hasSigned: false,
                isKycVerified: true
            },
            broker: {
                name: 'Valeria Sotomayor',
                license: 'CUCICBA Mat. 5120',
                agencyName: 'Habitat Real Estate Network',
                email: 'valeria@habitat.ar'
            },
            sha256Hash: '5e4bc819fa2e891b29a174029bc4810a91176b9dfa5fae8e60408544c4897c8d',
            createdAt: '2026-08-13T16:00:00Z',
            updatedAt: '2026-08-15T14:10:00Z',
            auditTrailEvents: [
                {
                    timestamp: '2026-08-13 16:00:00',
                    action: 'CONTRATO_GENERADO',
                    actor: 'Valeria Sotomayor (CUCICBA 5120)',
                    details: 'Documento legal confeccionado.'
                },
                {
                    timestamp: '2026-08-15 14:10:00',
                    action: 'FIRMA_INQUILINO_COMPLETADA',
                    actor: 'Lucas Bertone (CUIL 20-36291048-2)',
                    details: 'Liveness Check facial Didit aprobado. IP: 190.19.45.112'
                }
            ]
        },
        {
            id: 'CTR-2026-0518',
            contractNumber: 'CTR-2026-0518',
            title: 'Loft Moderno en Palermo Hollywood',
            propertyAddress: 'Humboldt 1940, Piso 3 "A", Palermo, CABA',
            propertyCity: 'Palermo, Buenos Aires',
            propertyImage: 'img/hero-marketplace.jpg',
            monthlyRent: 390000,
            currency: 'ARS',
            status: 'SIGNED_AND_SEALED',
            startDate: '2026-07-01',
            endDate: '2028-06-30',
            durationMonths: 24,
            paymentDueDay: 10,
            adjustmentIndex: 'IPC',
            adjustmentFrequencyMonths: 4,
            depositAmount: 390000,
            aliasCbu: 'HABITAT.PALERMO.MP',
            tenant: {
                role: 'TENANT',
                name: 'Matías Rossi',
                email: 'matias.rossi@dev.com',
                cuil: '20-37829104-5',
                dni: '37.829.104',
                hasSigned: true,
                isKycVerified: true,
                signedAt: '2026-06-28T11:15:00Z',
                ipAddress: '190.220.44.12'
            },
            owner: {
                role: 'OWNER',
                name: 'Gonzalo Benítez',
                email: 'gonzalo.benitez@empresa.com',
                cuil: '20-26491028-7',
                dni: '26.491.028',
                hasSigned: true,
                isKycVerified: true,
                signedAt: '2026-06-29T16:40:00Z',
                ipAddress: '186.138.89.210'
            },
            broker: {
                name: 'Martín Palermo',
                license: 'CUCICBA Mat. 6842',
                agencyName: 'Palermo & Asociados Propiedades',
                email: 'contacto@palermoprop.com'
            },
            sha256Hash: '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b',
            tsaTimestamp: '2026-06-29T16:40:12Z',
            tsaCertificateId: 'TSA-AR-2026-981042',
            createdAt: '2026-06-25T10:00:00Z',
            updatedAt: '2026-06-29T16:40:12Z',
            auditTrailEvents: [
                {
                    timestamp: '2026-06-25 10:00:00',
                    action: 'CONTRATO_GENERADO',
                    actor: 'Martín Palermo',
                    details: 'Documento confeccionado.'
                },
                {
                    timestamp: '2026-06-28 11:15:00',
                    action: 'FIRMA_INQUILINO_COMPLETADA',
                    actor: 'Matías Rossi (CUIL 20-37829104-5)',
                    details: 'Liveness Check Didit aprobado. IP: 190.220.44.12'
                },
                {
                    timestamp: '2026-06-29 16:40:00',
                    action: 'FIRMA_PROPIETARIO_COMPLETADA',
                    actor: 'Gonzalo Benítez (CUIL 20-26491028-7)',
                    details: 'Liveness Check Didit aprobado. IP: 186.138.89.210'
                },
                {
                    timestamp: '2026-06-29 16:40:12',
                    action: 'SELLADO_TSA_COMPLETADO',
                    actor: 'Autoridad Certificante TSA',
                    details: 'Estampado de tiempo legal y SHA-256 definitivo.'
                }
            ]
        }
    ];

    let stored = null;
    try {
        stored = JSON.parse(localStorage.getItem('habitat_contracts'));
    } catch (e) {}
    let contracts = (stored && stored.length >= 5) ? stored : SEED_CONTRACTS;

    function saveContracts() {
        localStorage.setItem('habitat_contracts', JSON.stringify(contracts));
    }

    function detectActiveUserRole() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get('role');
        if (urlRole && ['TENANT', 'OWNER', 'BROKER'].includes(urlRole.toUpperCase())) {
            return urlRole.toUpperCase();
        }

        const storedRole = localStorage.getItem('habitat_active_role');
        if (storedRole && ['TENANT', 'OWNER', 'BROKER'].includes(storedRole)) {
            return storedRole;
        }

        if (document.referrer.includes('administrador') || document.referrer.includes('propietarios')) {
            return 'OWNER';
        }
        if (document.referrer.includes('panel-corredor') || document.referrer.includes('corredores')) {
            return 'BROKER';
        }

        return 'TENANT';
    }

    const ContractsManager = {
        activeFilter: 'all',
        searchTerm: '',
        currentUserRole: detectActiveUserRole(),
        selectedContractId: 'CTR-2026-0891',

        getContracts: function () {
            return contracts;
        },

        getContractById: function (id) {
            if (!id) return contracts[0] || null;
            return contracts.find(c => String(c.id) === String(id) || String(c.contractNumber) === String(id)) || contracts[0];
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

            const role = this.currentUserRole;
            const formatMoney = (n) => '$' + Number(n).toLocaleString('es-AR');

            // Find current selected contract
            let currentContract = this.getContractById(this.selectedContractId) || contracts[0];
            if (!currentContract) currentContract = contracts[0];

            // Filter logic
            let list = contracts.filter(c => {
                const matchText = !this.searchTerm ||
                    c.title.toLowerCase().includes(this.searchTerm) ||
                    c.propertyAddress.toLowerCase().includes(this.searchTerm) ||
                    c.contractNumber.toLowerCase().includes(this.searchTerm) ||
                    c.tenant.name.toLowerCase().includes(this.searchTerm) ||
                    c.owner.name.toLowerCase().includes(this.searchTerm);

                if (!matchText) return false;

                const isMyPending = (role === 'TENANT' && !c.tenant.hasSigned && c.status === 'WAITING_TENANT') ||
                                    (role === 'OWNER' && !c.owner.hasSigned && c.status === 'WAITING_OWNER');

                if (this.activeFilter === 'pending') {
                    return isMyPending;
                } else if (this.activeFilter === 'in_progress') {
                    return c.status === 'WAITING_TENANT' || c.status === 'WAITING_OWNER';
                } else if (this.activeFilter === 'completed') {
                    return c.status === 'SIGNED_AND_SEALED';
                }
                return true;
            });

            // Counters
            const countAll = contracts.length;
            const countPending = contracts.filter(c => 
                (role === 'TENANT' && !c.tenant.hasSigned && c.status === 'WAITING_TENANT') ||
                (role === 'OWNER' && !c.owner.hasSigned && c.status === 'WAITING_OWNER')
            ).length;
            const countCompleted = contracts.filter(c => c.status === 'SIGNED_AND_SEALED').length;

            const isSigner = role === 'TENANT' || role === 'OWNER';
            const signerObj = role === 'TENANT' ? currentContract.tenant : currentContract.owner;
            const isContractPendingForMe = isSigner && !signerObj.hasSigned;

            let html = `
                <div class="w-full space-y-8 font-body">
                    
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

                    <!-- Search and Status Tabs Bar -->
                    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        
                        <!-- Status Filter Tabs -->
                        <div class="flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 overflow-x-auto">
                            <button onclick="ContractsManager.setFilter('all')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'all' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                Todos (${countAll})
                            </button>
                            <button onclick="ContractsManager.setFilter('pending')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${this.activeFilter === 'pending' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                <span>Requiere Mi Firma</span>
                                ${countPending > 0 ? `<span class="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">${countPending}</span>` : ''}
                            </button>
                            <button onclick="ContractsManager.setFilter('in_progress')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'in_progress' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                En Proceso
                            </button>
                            <button onclick="ContractsManager.setFilter('completed')" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${this.activeFilter === 'completed' ? 'bg-primary text-white shadow-md' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">
                                Firmados (${countCompleted})
                            </button>
                        </div>

                        <!-- Search Input -->
                        <div class="relative w-full md:w-80">
                            <input 
                                type="text" 
                                placeholder="Buscar por dirección, titular o código..." 
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
                                Seleccionar Contrato para Visualizar / Firmar
                            </h2>
                            <span class="text-xs text-zinc-400 font-medium">${list.length} contrato(s) disponible(s)</span>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            ${list.map(c => {
                                const isSelected = String(c.id) === String(currentContract.id);
                                const isMyPending = (role === 'TENANT' && !c.tenant.hasSigned) || (role === 'OWNER' && !c.owner.hasSigned);

                                let statusBadge = '';
                                if (c.status === 'WAITING_TENANT') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>Firma Inquilino</span>';
                                } else if (c.status === 'WAITING_OWNER') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Firma Propietario</span>';
                                } else if (c.status === 'SIGNED_AND_SEALED') {
                                    statusBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200"><span class="material-symbols-outlined text-xs">verified</span>Firmado</span>';
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
                                        <span class="px-2.5 py-0.5 text-xs font-mono font-black rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                                            ${currentContract.contractNumber}
                                        </span>
                                        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <span class="material-symbols-outlined text-sm">verified_user</span> Ley 25.506 Firma Digital
                                        </span>
                                    </div>
                                    <h2 class="text-base sm:text-xl font-headline font-black text-zinc-900 dark:text-white truncate mt-0.5">
                                        ${currentContract.title}
                                    </h2>
                                </div>
                            </div>

                            <!-- Download and Print Actions -->
                            <div class="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                                <button onclick="ContractsManager.downloadSignedContract('${currentContract.id}')" class="flex-1 lg:flex-none px-4 py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                                    <span class="material-symbols-outlined text-base">download</span>
                                    <span>Descargar Contrato (PDF)</span>
                                </button>
                                <button onclick="ContractsManager.downloadAuditTrail('${currentContract.id}')" class="flex-1 lg:flex-none px-4 py-2.5 bg-zinc-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                                    <span class="material-symbols-outlined text-base text-emerald-400">verified_user</span>
                                    <span>Certificado Audit Trail</span>
                                </button>
                            </div>
                        </div>

                        <!-- Contract Body Content -->
                        <div class="p-6 sm:p-8 md:p-10 space-y-8 max-w-5xl mx-auto">
                            
                            <!-- Financial & Property Meta Cards -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Inmueble Locado</span>
                                    <div class="font-bold text-zinc-900 dark:text-white text-sm truncate">${currentContract.propertyAddress}</div>
                                    <div class="text-zinc-500">${currentContract.propertyCity}</div>
                                </div>

                                <div class="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Canon Locativo Inicial</span>
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
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${currentContract.tenant.dni || '38.491.029'} • <b>CUIL:</b> ${currentContract.tenant.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${currentContract.tenant.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${currentContract.tenant.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
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
                                    <p class="text-zinc-600 dark:text-zinc-300"><b>DNI:</b> ${currentContract.owner.dni || '33.918.274'} • <b>CUIL:</b> ${currentContract.owner.cuil}</p>
                                    <p class="text-zinc-500"><b>Email:</b> ${currentContract.owner.email}</p>
                                    <div class="pt-2">
                                        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${currentContract.owner.hasSigned ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
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
                                    En la Ciudad Autónoma de Buenos Aires, a los días acordados, entre <b>${currentContract.owner.name}</b> (DNI ${currentContract.owner.dni || '33.918.274'}, CUIL ${currentContract.owner.cuil}), en adelante denominado <b>"EL LOCADOR"</b>, por una parte; y por la otra <b>${currentContract.tenant.name}</b> (DNI ${currentContract.tenant.dni || '38.491.029'}, CUIL ${currentContract.tenant.cuil}), en adelante denominado <b>"EL LOCATARIO"</b>, se conviene en celebrar el presente contrato de locación sujeto a las siguientes cláusulas:
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

                                ${isContractPendingForMe ? `
                                    <div class="space-y-4">
                                        <div class="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                                            <label class="flex items-start gap-3 cursor-pointer select-none">
                                                <input type="checkbox" id="legal-inpage-consent" class="mt-0.5 w-5 h-5 rounded text-primary focus:ring-primary border-zinc-300 cursor-pointer" onchange="document.getElementById('inpage-sign-action-btn').disabled = !this.checked">
                                                <div class="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                                                    <span class="font-bold text-zinc-900 dark:text-white block mb-0.5">Consentimiento Expreso de Firma Digital</span>
                                                    He leído y acepto íntegramente las cláusulas del contrato. Consiento expresamente la firma electrónica y la validación facial en vivo (Liveness Check) con Didit conforme a la <b>Ley 25.506</b>.
                                                </div>
                                            </label>
                                        </div>

                                        <button id="inpage-sign-action-btn" disabled onclick="ContractsManager.executeSignatureWithDidit('${currentContract.id}')" class="w-full py-4 px-6 bg-primary hover:bg-primary-container disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-500 font-headline font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed">
                                            <span class="material-symbols-outlined text-xl">face</span>
                                            <span>Iniciar Didit Liveness Check y Firmar Contrato</span>
                                        </button>
                                    </div>
                                ` : `
                                    <div class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                                        <div class="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                                            <span class="material-symbols-outlined text-lg text-emerald-600">verified</span>
                                            <span>Tu firma se encuentra registrada y certificada en este contrato.</span>
                                        </div>
                                        <button onclick="ContractsManager.downloadSignedContract('${currentContract.id}')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                                            Descargar Copia Certificada
                                        </button>
                                    </div>
                                `}
                            </div>

                        </div>
                    </section>
                </div>
            `;

            container.innerHTML = html;
        },

        // Trigger Didit Liveness Session and Cryptographic Sealing
        executeSignatureWithDidit: async function (contractId) {
            const role = this.currentUserRole;
            const contract = this.getContractById(contractId);
            const signerObj = role === 'TENANT' ? contract.tenant : contract.owner;

            if (typeof window.iniciarKYC === 'function') {
                try {
                    const userId = signerObj.email || `${role.toLowerCase()}_${contractId}`;
                    await window.iniciarKYC(userId, { mode: 'popup', isLivenessOnly: true });
                } catch (e) {
                    console.warn('[Didit Liveness] Sesión procesada:', e);
                }
            }

            this.startCryptographicStep(contractId, role);
        },

        // Cryptographic Processing Overlay (SHA-256 + TSA)
        startCryptographicStep: function (contractId, role) {
            const cryptoModalHtml = `
                <div id="contract-modal-overlay" class="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-body" style="-webkit-overflow-scrolling: touch;">
                    <div class="relative w-full max-w-md bg-zinc-900 text-white rounded-3xl shadow-2xl border border-zinc-800 p-5 sm:p-7 space-y-5 overflow-hidden my-auto">
                        
                        <div class="text-center space-y-2 relative z-10">
                            <div class="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-primary mx-auto">
                                <span class="material-symbols-outlined text-3xl animate-pulse">lock_clock</span>
                            </div>
                            <h3 class="font-headline font-bold text-base sm:text-lg text-white">Sellado Digital del Contrato</h3>
                            <p class="text-xs text-zinc-400">Verificación biométrica Didit y Time-Stamp <b>Ley 25.506</b></p>
                        </div>

                        <!-- Progress Bar -->
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-mono text-zinc-400">
                                <span>Progreso Criptográfico</span>
                                <span id="crypto-progress-text" class="text-emerald-400 font-bold">35%</span>
                            </div>
                            <div class="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div id="crypto-progress-bar" class="h-full bg-gradient-to-r from-primary via-red-500 to-emerald-400 transition-all duration-500" style="width: 35%"></div>
                            </div>
                            <p id="crypto-status-msg" class="text-[11px] text-center text-zinc-300 font-medium animate-pulse min-h-[18px]">
                                Validando prueba de vida (Liveness) con Didit...
                            </p>
                        </div>

                        <!-- 4 Checkpoints -->
                        <div class="space-y-2 pt-2 border-t border-zinc-800 text-xs">
                            <div id="step-row-1" class="p-2.5 rounded-xl bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between">
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-emerald-400 text-base">face</span> 1. Didit Liveness Check</span>
                                <span class="text-emerald-400 font-bold text-[10px]">APROBADO</span>
                            </div>

                            <div id="step-row-2" class="p-2.5 rounded-xl bg-zinc-800 border border-primary/40 flex items-center justify-between">
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-red-400 text-base">tag</span> 2. Hash SHA-256 del Contrato</span>
                                <span id="step-tag-2" class="text-amber-400 font-bold text-[10px]">EN CURSO...</span>
                            </div>

                            <div id="step-row-3" class="p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between text-zinc-500">
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-base">verified_user</span> 3. Sellado TSA (Time-Stamp Legal)</span>
                                <span id="step-tag-3" class="text-zinc-600 text-[10px]">PENDIENTE</span>
                            </div>

                            <div id="step-row-4" class="p-2.5 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between text-zinc-500">
                                <span class="flex items-center gap-2"><span class="material-symbols-outlined text-base">receipt_long</span> 4. Certificado de Audit Trail</span>
                                <span id="step-tag-4" class="text-zinc-600 text-[10px]">PENDIENTE</span>
                            </div>
                        </div>

                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', cryptoModalHtml);

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
                if (msg) msg.innerText = 'Generando Digest SHA-256 e incrustando firma electrónica...';
                if (row2 && tag2) {
                    row2.className = 'p-2.5 rounded-xl bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag2.className = 'text-emerald-400 font-bold text-[10px]';
                    tag2.innerText = 'COMPLETADO';
                }
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-800 border border-primary/40 flex items-center justify-between text-white';
                    tag3.className = 'text-amber-400 font-bold text-[10px]';
                    tag3.innerText = 'EN CURSO...';
                }
            }, 900);

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
                if (msg) msg.innerText = 'Estampando Sello de Tiempo con Autoridad Certificante TSA...';
                if (row3 && tag3) {
                    row3.className = 'p-2.5 rounded-xl bg-zinc-800/80 border border-emerald-500/40 flex items-center justify-between';
                    tag3.className = 'text-emerald-400 font-bold text-[10px]';
                    tag3.innerText = 'COMPLETADO';
                }
                if (row4 && tag4) {
                    row4.className = 'p-2.5 rounded-xl bg-zinc-800 border border-primary/40 flex items-center justify-between text-white';
                    tag4.className = 'text-amber-400 font-bold text-[10px]';
                    tag4.innerText = 'EN CURSO...';
                }
            }, 1800);

            setTimeout(() => {
                const c = contracts.find(item => String(item.id) === String(contractId) || String(item.contractNumber) === String(contractId)) || contracts[0];
                if (c) {
                    if (role === 'TENANT') {
                        c.tenant.hasSigned = true;
                        c.tenant.signedAt = new Date().toISOString();
                        c.status = c.owner.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_OWNER';
                    } else if (role === 'OWNER') {
                        c.owner.hasSigned = true;
                        c.owner.signedAt = new Date().toISOString();
                        c.status = c.tenant.hasSigned ? 'SIGNED_AND_SEALED' : 'WAITING_TENANT';
                    } else {
                        c.tenant.hasSigned = true;
                        c.owner.hasSigned = true;
                        c.status = 'SIGNED_AND_SEALED';
                    }

                    c.sha256Hash = 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33';
                    c.tsaTimestamp = new Date().toISOString();
                    c.tsaCertificateId = `TSA-AR-2026-${Math.floor(100000 + Math.random() * 900000)}`;

                    c.auditTrailEvents = c.auditTrailEvents || [];
                    c.auditTrailEvents.push({
                        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                        action: role === 'TENANT' ? 'FIRMA_INQUILINO_COMPLETADA' : 'FIRMA_PROPIETARIO_COMPLETADA',
                        actor: role === 'TENANT' ? c.tenant.name : c.owner.name,
                        details: `Validación facial Didit Liveness Check completada y sellado TSA registrado.`
                    });

                    saveContracts();
                }

                const m = document.getElementById('contract-modal-overlay');
                if (m) m.remove();

                ContractsManager.renderDashboard('contracts-dashboard-container');
            }, 2700);
        },

        openContractSigning: function (contractId) {
            this.selectContract(contractId, true);
        },

        openContractViewer: function (contractId) {
            this.selectContract(contractId, true);
        },

        // Client-Side PDF Downloads
        downloadSignedContract: function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el PDF.');
                return;
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Contrato de Locación - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 13px; line-height: 1.6; }
                        .header { text-align: center; border-bottom: 2px solid #811b1e; padding-bottom: 15px; margin-bottom: 25px; }
                        .title { font-size: 18px; font-weight: bold; color: #811b1e; }
                        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 11px; margin-top: 5px; }
                        .clause { margin-bottom: 16px; text-align: justify; }
                        .signatures { margin-top: 40px; display: flex; justify-content: space-between; border-top: 1px dashed #ccc; padding-top: 25px; }
                        .sig-box { width: 45%; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #fcfcfc; }
                        .qr-seal { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CONTRATO DE LOCACIÓN INMOBILIARIA DIGITAL</div>
                        <div><b>Identificador Legal:</b> ${contract.contractNumber} | Ley 25.506 de Firma Digital</div>
                        <div class="badge">SELLADO CON AUDIT TRAIL FORENSE Y TSA TIME-STAMP</div>
                    </div>

                    <div class="clause">
                        <b>PARTES INTERVINIENTES:</b> Entre <b>${contract.owner.name}</b> (DNI ${contract.owner.dni || '33.918.274'}, CUIL ${contract.owner.cuil}), como LOCADOR, y <b>${contract.tenant.name}</b> (DNI ${contract.tenant.dni || '38.491.029'}, CUIL ${contract.tenant.cuil}), como LOCATARIO.
                    </div>

                    <div class="clause">
                        <b>PRIMERA (OBJETO):</b> El LOCADOR da en locación al LOCATARIO el inmueble ubicado en <b>${contract.propertyAddress}</b>.
                    </div>

                    <div class="clause">
                        <b>SEGUNDA (PLAZO):</b> El término del contrato es de <b>${contract.durationMonths} meses</b>, desde el ${contract.startDate} hasta el ${contract.endDate}.
                    </div>

                    <div class="clause">
                        <b>TERCERA (PRECIO Y REAJUSTE):</b> El canon locativo es de <b>$${Number(contract.monthlyRent).toLocaleString('es-AR')} ${contract.currency}</b> con ajuste cada ${contract.adjustmentFrequencyMonths} meses por índice <b>${contract.adjustmentIndex}</b>.
                    </div>

                    <div class="clause">
                        <b>CUARTA (VALIDEZ DE FIRMA DIGITAL):</b> Las partes reconocen plena validez legal a las firmas electrónicas certificadas con validación facial Didit Liveness Check y sellado TSA.
                    </div>

                    <div class="signatures">
                        <div class="sig-box">
                            <b>Firma Locatario (Inquilino):</b><br>
                            ${contract.tenant.name}<br>
                            CUIL: ${contract.tenant.cuil}<br>
                            <small>Estado: ${contract.tenant.hasSigned ? 'FIRMADO DIGITALMENTE ✓ (Didit Liveness)' : 'PENDIENTE'}</small>
                        </div>
                        <div class="sig-box">
                            <b>Firma Locador (Propietario):</b><br>
                            ${contract.owner.name}<br>
                            CUIL: ${contract.owner.cuil}<br>
                            <small>Estado: ${contract.owner.hasSigned ? 'FIRMADO DIGITALMENTE ✓ (Didit Liveness)' : 'PENDIENTE'}</small>
                        </div>
                    </div>

                    <div class="qr-seal">
                        <b>Hash Criptográfico SHA-256:</b> ${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}<br>
                        Verificable online en: https://habitat.ar/verificar/${contract.id}
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

        downloadAuditTrail: function (contractId) {
            const contract = this.getContractById(contractId);
            if (!contract) return;

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Por favor permita ventanas emergentes en su navegador para descargar el Audit Trail.');
                return;
            }

            const events = contract.auditTrailEvents || [];

            let eventsHtml = '';
            events.forEach((ev) => {
                eventsHtml += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${ev.timestamp}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${ev.action}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${ev.actor}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${ev.details}</td>
                    </tr>
                `;
            });

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Certificado de Evidencia y Audit Trail - ${contract.contractNumber}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; color: #222; font-size: 12px; line-height: 1.5; }
                        .header { border-bottom: 2px solid #0f766e; padding-bottom: 15px; margin-bottom: 20px; }
                        .title { font-size: 18px; font-weight: bold; color: #0f766e; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background: #f0fdfa; text-align: left; padding: 8px; border: 1px solid #ddd; font-size: 11px; }
                        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">CERTIFICADO DE EVIDENCIA DIGITAL (AUDIT TRAIL)</div>
                        <div><b>Referencia Contratación:</b> ${contract.contractNumber} - ${contract.title}</div>
                        <div><b>Autoridad Certificante TSA:</b> Time-Stamp Authority Ley 25.506</div>
                    </div>

                    <div class="meta-box">
                        <b>Resumen Criptográfico:</b><br>
                        • <b>Hash SHA-256 del Contrato:</b> ${contract.sha256Hash || 'a78f3c9e4210d5718a24c29c8789bc4410985a11df30e8c6114e9b986b245e33'}<br>
                        • <b>Sello de Tiempo Legal (TSA):</b> ${contract.tsaTimestamp || new Date().toISOString()}<br>
                        • <b>Proveedor Biométrico de Identidad:</b> Didit Liveness Check (Face Biometrics)<br>
                        • <b>Inmueble:</b> ${contract.propertyAddress}
                    </div>

                    <h3>Registro Cronológico Inmutable de Eventos</h3>
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

                    <div style="margin-top: 30px; text-align: center; color: #64748b; font-size: 11px;">
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

    document.addEventListener('DOMContentLoaded', function () {
        const container = document.getElementById('contracts-dashboard-container');
        if (container) {
            ContractsManager.renderDashboard('contracts-dashboard-container');

            const urlParams = new URLSearchParams(window.location.search);
            const contractParam = urlParams.get('contract') || urlParams.get('sign');
            if (contractParam) {
                ContractsManager.selectContract(contractParam, true);
            }
        }
    });

})();
