/**
 * ==============================================================================
 * HÁBITAT - CONTRACT EDITOR & SMART BUILDER MODAL (v3.1 Ultra-Modern)
 * ==============================================================================
 * Modal ejecutivo, minimalista y ultra-moderno para configurar contratos
 * bajo DNU 70/2023 y Ley Nacional N° 25.506 de Firma Digital con Didit KYC.
 */

(function () {
    'use strict';

    window.ContractEditorModal = {
        _currentOptions: null,
        _customFile: null,
        _activeTab: 'smart', // 'smart' | 'upload'

        /**
         * Abre el modal del editor de contratos
         */
        open: function (options = {}) {
            const contract = options.contract || {};
            const isSigned = contract.status === 'SIGNED_AND_SEALED' || contract.tenant?.hasSigned || contract.owner?.hasSigned;

            if (isSigned) {
                if (window.ToastManager) {
                    window.ToastManager.show({
                        title: '🔒 Contrato Bloqueado e Inmutable',
                        message: 'Este contrato ya cuenta con firmas digitales registradas y sus términos se encuentran sellados bajo la Ley 25.506.',
                        type: 'warning'
                    });
                } else {
                    alert('Este contrato ya cuenta con firmas digitales registradas y sus términos se encuentran sellados.');
                }
                return;
            }

            this._currentOptions = options;
            this._customFile = null;
            this._activeTab = options.initialTab || 'smart';

            let existingModal = document.getElementById('contract-editor-modal-container');
            if (existingModal) existingModal.remove();

            const modalContainer = document.createElement('div');
            modalContainer.id = 'contract-editor-modal-container';
            modalContainer.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-body overflow-y-auto';

            const applicant = options.applicant || {};
            const property = options.property || {};

            const tenantName = applicant.tenant_name || applicant.name || contract.tenant?.name || 'Bruno Cirrincione Ornstein';
            const tenantDni = applicant.tenant_dni || applicant.dni || contract.tenant?.dni || '46.665.957';
            const tenantCuil = applicant.tenant_cuit || applicant.cuit || (tenantDni ? `20-${tenantDni.replace(/\D/g,'')}-7` : '20-46665957-7');
            const tenantEmail = applicant.tenant_email || applicant.email || contract.tenant?.email || 'nunimamu@gmail.com';
            
            const ownerName = property.owner_name || contract.owner?.name || 'Maximo Cirrincione Ornstein';
            const ownerDni = property.owner_dni || contract.owner?.dni || '44.662.043';
            const ownerCuil = property.owner_cuit || contract.owner?.cuil || (ownerDni ? `20-${ownerDni.replace(/\D/g,'')}-7` : '20-44662043-7');
            const ownerEmail = property.owner_email || contract.owner?.email || 'maximocirrin@gmail.com';

            const propTitle = property.title || contract.title || 'Propiedad en Alquiler';
            const propAddress = property.address || (property.calle ? `${property.calle} ${property.numero || ''}`.trim() : '') || contract.propertyAddress || 'Av. San Martín 1250, Mendoza';
            const defaultRent = Number(contract.monthlyRent || property.price || property.precio || 450000);
            const defaultCurrency = contract.currency || 'ARS';
            const defaultDuration = String(contract.durationMonths || 24);
            const defaultIndex = contract.adjustmentIndex || 'IPC';
            const defaultFrequency = String(contract.adjustmentFrequencyMonths || 3);
            const defaultDueDay = String(contract.paymentDueDay || 10);
            const defaultAlias = contract.aliasCbu || 'HABITAT.ALQUILER.MP';

            modalContainer.innerHTML = `
                <div class="relative w-full max-w-6xl bg-white dark:bg-[#0c0d14] border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] text-zinc-900 dark:text-zinc-100">
                    
                    <!-- Top Minimalist Header -->
                    <div class="px-6 py-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#811b1e] to-[#a13333] text-white flex items-center justify-center shrink-0 shadow-sm shadow-red-950/20">
                                <span class="material-symbols-outlined text-2xl">edit_document</span>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white leading-tight truncate">
                                        Editor de Contrato de Locación
                                    </h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                        Ley 25.506 • DNU 70/2023
                                    </span>
                                </div>
                                <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                    Inquilino: <strong class="text-zinc-800 dark:text-zinc-200">${tenantName}</strong> • 📍 ${propAddress}
                                </p>
                            </div>
                        </div>

                        <!-- Botón Cerrar -->
                        <button type="button" id="btn-close-contract-editor" class="w-9 h-9 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer" title="Cerrar">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <!-- Mode Selector Tab Pills -->
                    <div class="px-6 pt-3 bg-zinc-50/80 dark:bg-zinc-900/40 border-b border-zinc-200/80 dark:border-zinc-800 flex gap-2 shrink-0">
                        <button type="button" id="tab-smart-contract" class="tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${this._activeTab === 'smart' ? 'border-primary text-primary dark:text-red-400 bg-white dark:bg-[#0c0d14]' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                            <span class="material-symbols-outlined text-base">auto_awesome</span>
                            <span>Generador Inteligente Hábitat</span>
                        </button>
                        <button type="button" id="tab-upload-contract" class="tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${this._activeTab === 'upload' ? 'border-primary text-primary dark:text-red-400 bg-white dark:bg-[#0c0d14]' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                            <span class="material-symbols-outlined text-base">upload_file</span>
                            <span>Subir Documento Propio (PDF / DOCX)</span>
                        </button>
                    </div>

                    <!-- Modal Body Content Grid -->
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-50/50 dark:bg-[#090a0f]">
                        
                        <!-- TAB 1: SMART CONTRACT BUILDER -->
                        <div id="content-smart-contract" class="${this._activeTab === 'smart' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'hidden'}">
                            
                            <!-- COLUMNA IZQUIERDA: CONTROLES MODERNOS (6 Cols) -->
                            <div class="lg:col-span-6 space-y-4">
                                
                                <!-- Card 1: Canon & Moneda (Hero Input Sin Doble Borde) -->
                                <div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3.5 shadow-xs">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xl text-primary dark:text-red-400">payments</span>
                                            <div>
                                                <h4 class="font-headline font-bold text-sm text-zinc-900 dark:text-white">Precio Inicial y Moneda</h4>
                                                <p class="text-[11px] text-zinc-400">Canon mensual acordado para el contrato</p>
                                            </div>
                                        </div>

                                        <!-- Currency Switcher Pills -->
                                        <div class="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700/60 shadow-xs" id="currency-switcher-container">
                                            <button type="button" data-currency="ARS" class="currency-chip px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${defaultCurrency === 'ARS' ? 'bg-primary text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">ARS ($)</button>
                                            <button type="button" data-currency="USD" class="currency-chip px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${defaultCurrency === 'USD' ? 'bg-primary text-white shadow-xs' : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'}">USD (U$S)</button>
                                            <input type="hidden" id="editor-moneda" value="${defaultCurrency}">
                                        </div>
                                    </div>

                                    <!-- Clean Flex Monetary Input (Un Solo Borde) -->
                                    <div class="flex items-center bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl h-12 px-4 focus-within:bg-white dark:focus-within:bg-zinc-800 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                        <span id="editor-moneda-symbol" class="text-zinc-500 dark:text-zinc-400 font-headline font-black text-lg mr-2.5 select-none shrink-0">${defaultCurrency === 'USD' ? 'USD' : '$'}</span>
                                        <input 
                                            type="number" 
                                            id="editor-monto" 
                                            value="${defaultRent}" 
                                            placeholder="0"
                                            style="border: none !important; outline: none !important; box-shadow: none !important; background: transparent !important;"
                                            class="w-full text-zinc-900 dark:text-white font-headline font-black text-xl tracking-tight p-0"
                                        >
                                    </div>
                                </div>

                                <!-- Card 2: Duración del Contrato -->
                                <div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-xs">
                                    <div class="flex items-center justify-between">
                                        <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                            <span class="material-symbols-outlined text-sm text-primary">schedule</span>
                                            <span>Duración del Plazo</span>
                                        </label>
                                        <span class="text-[10px] text-zinc-400 font-medium">Pacto libre entre partes</span>
                                    </div>
                                    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2" id="duracion-chips-container">
                                        <button type="button" data-val="12" class="duration-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '12' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">12 meses</button>
                                        <button type="button" data-val="24" class="duration-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '24' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">24 meses <span class="block text-[9px] opacity-75">Estándar</span></button>
                                        <button type="button" data-val="36" class="duration-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '36' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">36 meses</button>
                                        <button type="button" data-val="6" class="duration-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '6' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">6 meses</button>
                                        <button type="button" data-val="3" class="duration-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDuration === '3' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">3 meses</button>
                                        <input type="hidden" id="editor-duracion" value="${defaultDuration}">
                                    </div>
                                </div>

                                <!-- Card 3: Actualización Periódica (Índice y Frecuencia) -->
                                <div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4 shadow-xs">
                                    <div class="space-y-2">
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">trending_up</span>
                                                <span>Índice de Actualización</span>
                                            </label>
                                            <span class="text-[10px] text-zinc-400">Variación oficial</span>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="indice-chips-container">
                                            <button type="button" data-val="IPC" class="index-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'IPC' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>IPC</span>
                                                <span class="block text-[9px] opacity-75">Consumidor</span>
                                            </button>
                                            <button type="button" data-val="ICL" class="index-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'ICL' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>ICL</span>
                                                <span class="block text-[9px] opacity-75">BCRA</span>
                                            </button>
                                            <button type="button" data-val="CAC" class="index-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'CAC' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>CAC</span>
                                                <span class="block text-[9px] opacity-75">Construcción</span>
                                            </button>
                                            <button type="button" data-val="FIJO" class="index-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultIndex === 'FIJO' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">
                                                <span>Fijo</span>
                                                <span class="block text-[9px] opacity-75">Sin indexar</span>
                                            </button>
                                            <input type="hidden" id="editor-indice" value="${defaultIndex}">
                                        </div>
                                    </div>

                                    <div class="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">update</span>
                                                <span>Frecuencia de Ajuste</span>
                                            </label>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="frecuencia-chips-container">
                                            <button type="button" data-val="3" class="frec-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '3' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Trimestral (3m)</button>
                                            <button type="button" data-val="4" class="frec-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '4' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Cuatrimestral (4m)</button>
                                            <button type="button" data-val="6" class="frec-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '6' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Semestral (6m)</button>
                                            <button type="button" data-val="12" class="frec-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultFrequency === '12' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Anual (12m)</button>
                                            <input type="hidden" id="editor-frecuencia" value="${defaultFrequency}">
                                        </div>
                                    </div>
                                </div>

                                <!-- Card 4: Cobro, Cuenta, Depósito y Expensas (Chips Estilo Foto 1) -->
                                <div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-4 shadow-xs">
                                    <div class="flex items-center gap-2">
                                        <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center">
                                            <span class="material-symbols-outlined text-base">account_balance</span>
                                        </div>
                                        <div>
                                            <h4 class="font-headline font-bold text-sm text-zinc-900 dark:text-white">Cuenta de Cobro & Vencimiento</h4>
                                            <p class="text-[11px] text-zinc-400">Datos bancarios y día límite de pago mensual</p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <!-- Alias CBU / CVU -->
                                        <div class="space-y-2">
                                            <div class="flex items-center justify-between">
                                                <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                    <span class="material-symbols-outlined text-sm text-primary">qr_code_2</span>
                                                    <span>Alias CBU / CVU</span>
                                                </label>
                                                <span class="text-[10px] text-zinc-400">Transferencias</span>
                                            </div>
                                            <input 
                                                type="text" 
                                                id="editor-alias-cbu" 
                                                value="${defaultAlias}" 
                                                placeholder="HABITAT.ALQUILER.MP"
                                                class="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl h-10 px-3.5 font-mono font-bold text-xs text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-800 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                            >
                                        </div>

                                        <!-- Día Límite de Pago -->
                                        <div class="space-y-2">
                                            <div class="flex items-center justify-between">
                                                <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                    <span class="material-symbols-outlined text-sm text-primary">event_available</span>
                                                    <span>Día de Vencimiento</span>
                                                </label>
                                                <span class="text-[10px] text-zinc-400">Plazo mensual</span>
                                            </div>
                                            <div class="grid grid-cols-3 gap-2" id="dia-venc-chips-container">
                                                <button type="button" data-val="5" class="dia-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '5' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 5</button>
                                                <button type="button" data-val="10" class="dia-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '10' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 10 <span class="block text-[9px] opacity-75">Estándar</span></button>
                                                <button type="button" data-val="15" class="dia-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${defaultDueDay === '15' ? 'bg-primary text-white border-primary shadow-xs' : 'border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50'}">Día 15</button>
                                                <input type="hidden" id="editor-dia-venc" value="${defaultDueDay}">
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Depósito en Garantía (Segmented Chips Estilo Foto 1) -->
                                    <div class="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">lock</span>
                                                <span>Depósito en Garantía</span>
                                            </label>
                                            <span class="text-[10px] text-zinc-400">Resguardo locativo</span>
                                        </div>
                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" id="deposito-chips-container">
                                            <button type="button" data-val="1_MES" class="deposito-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer bg-primary text-white border-primary shadow-xs">
                                                <span>1 Mes (ARS)</span>
                                                <span class="block text-[9px] opacity-75">Recomendado</span>
                                            </button>
                                            <button type="button" data-val="1_MES_USD" class="deposito-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50">
                                                <span>1 Mes (USD)</span>
                                                <span class="block text-[9px] opacity-75">Moneda extranjera</span>
                                            </button>
                                            <button type="button" data-val="2_MESES" class="deposito-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50">
                                                <span>2 Meses</span>
                                                <span class="block text-[9px] opacity-75">Doble garantía</span>
                                            </button>
                                            <button type="button" data-val="SIN_DEPOSITO" class="deposito-chip py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50">
                                                <span>Sin Depósito</span>
                                                <span class="block text-[9px] opacity-75">Pasaporte Hábitat</span>
                                            </button>
                                            <input type="hidden" id="editor-deposito" value="1_MES">
                                        </div>
                                    </div>

                                    <!-- Régimen de Expensas (Segmented Chips Estilo Foto 1) -->
                                    <div class="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                                <span class="material-symbols-outlined text-sm text-primary">receipt_long</span>
                                                <span>Régimen de Expensas e Impuestos</span>
                                            </label>
                                        </div>
                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" id="expensas-chips-container">
                                            <button type="button" data-val="ORDINARIAS_INQ" class="expensas-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer bg-primary text-white border-primary shadow-xs">
                                                <span>Ordinarias x Inquilino</span>
                                                <span class="block text-[9px] opacity-75">Extraordinarias x Locador</span>
                                            </button>
                                            <button type="button" data-val="TOTALES_INQ" class="expensas-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50">
                                                <span>Totales x Inquilino</span>
                                                <span class="block text-[9px] opacity-75">Ordinarias + Extraord.</span>
                                            </button>
                                            <button type="button" data-val="INCLUIDAS" class="expensas-chip py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50">
                                                <span>Incluidas en Canon</span>
                                                <span class="block text-[9px] opacity-75">A cargo del Locador</span>
                                            </button>
                                            <input type="hidden" id="editor-expensas" value="ORDINARIAS_INQ">
                                        </div>
                                    </div>
                                    <input type="hidden" id="editor-mora" value="0.5">
                                </div>

                                <!-- Card 5: Cláusulas Especiales (Diseño Unificado Cohesivo Estilo Foto 1) -->
                                <div class="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-3 shadow-xs">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <span class="material-symbols-outlined text-xl text-primary dark:text-red-400">policy</span>
                                            <div>
                                                <h4 class="font-headline font-bold text-sm text-zinc-900 dark:text-white">Cláusulas y Permisos Especiales</h4>
                                                <p class="text-[11px] text-zinc-400">Personaliza las condiciones contractuales</p>
                                            </div>
                                        </div>
                                        <span class="text-[10px] text-zinc-400 font-medium">Ley 25.506 & CCyCN</span>
                                    </div>

                                    <div class="space-y-2 text-xs">
                                        <!-- Mascotas -->
                                        <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">pets</span>
                                                <div class="min-w-0">
                                                    <span class="font-bold text-zinc-900 dark:text-white block">Permitir Mascotas</span>
                                                    <span class="text-[11px] text-zinc-500 dark:text-zinc-400">Tenencia responsable de animales domésticos</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-mascotas" checked class="sr-only peer">
                                                <div class="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Destino Vivienda -->
                                        <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">home</span>
                                                <div class="min-w-0">
                                                    <span class="font-bold text-zinc-900 dark:text-white block">Destino Exclusivo Vivienda Familiar</span>
                                                    <span class="text-[11px] text-zinc-500 dark:text-zinc-400">Prohíbe uso comercial o profesional del inmueble</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-vivienda" checked class="sr-only peer">
                                                <div class="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Seguro Incendio -->
                                        <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">shield</span>
                                                <div class="min-w-0">
                                                    <span class="font-bold text-zinc-900 dark:text-white block">Seguro de Incendio Obligatorio</span>
                                                    <span class="text-[11px] text-zinc-500 dark:text-zinc-400">Póliza de seguro a favor del locador</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-seguro" checked class="sr-only peer">
                                                <div class="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Prohibición Subalquiler -->
                                        <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">block</span>
                                                <div class="min-w-0">
                                                    <span class="font-bold text-zinc-900 dark:text-white block">Prohibición de Sublocación (Art. 1213 CCyCN)</span>
                                                    <span class="text-[11px] text-zinc-500 dark:text-zinc-400">Prohíbe ceder o subarrendar el inmueble a terceros</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-subalquiler" checked class="sr-only peer">
                                                <div class="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>

                                        <!-- Rescisión Anticipada -->
                                        <div class="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-xl text-primary dark:text-red-400 shrink-0">contract_delete</span>
                                                <div class="min-w-0">
                                                    <span class="font-bold text-zinc-900 dark:text-white block">Rescisión Anticipada (Art. 1221 CCyCN)</span>
                                                    <span class="text-[11px] text-zinc-500 dark:text-zinc-400">Notificación previa con 1 mes de antelación</span>
                                                </div>
                                            </div>
                                            <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                                <input type="checkbox" id="toggle-rescision" checked class="sr-only peer">
                                                <div class="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- COLUMNA DERECHA: HOJA LEGAL DIGITAL EN VIVO (6 Cols) -->
                            <div class="lg:col-span-6 flex flex-col space-y-2 sticky top-0">
                                <div class="flex items-center justify-between text-xs px-1">
                                    <span class="font-headline font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Vista Previa del Documento Legal
                                    </span>
                                    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                                        Actualización en Vivo
                                    </span>
                                </div>

                                <!-- Hoja Estilo Papel Legal -->
                                <div class="bg-white dark:bg-[#12131a] border border-zinc-300/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl overflow-y-auto max-h-[600px] space-y-4 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-mono" id="contract-live-preview-box">
                                    <!-- Se renderiza dinámicamente con _updateLivePreview -->
                                </div>
                            </div>

                        </div>

                        <!-- TAB 2: SUBIR CONTRATO PROPIO -->
                        <div id="content-upload-contract" class="${this._activeTab === 'upload' ? 'space-y-5 max-w-3xl mx-auto py-4' : 'hidden'}">
                            <div class="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 space-y-5 shadow-xs">
                                <div class="flex items-start gap-4">
                                    <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                        <span class="material-symbols-outlined text-2xl">cloud_upload</span>
                                    </div>
                                    <div>
                                        <h4 class="font-headline font-bold text-base text-zinc-900 dark:text-white">Subí tu propio documento de contrato</h4>
                                        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                                            Si ya contás con un modelo redactado por tu escribanía o abogado en formato PDF o Word, podés cargarlo aquí. El sistema lo vinculará automáticamente al proceso de firma biométrica facial (Didit KYC) y sellado criptográfico TSA bajo Ley 25.506.
                                        </p>
                                    </div>
                                </div>

                                <!-- Drag & Drop Zone -->
                                <div id="drop-zone-custom-contract" class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary rounded-3xl p-8 sm:p-12 text-center transition-all bg-zinc-50 dark:bg-zinc-800/40 cursor-pointer flex flex-col items-center justify-center gap-3 group">
                                    <input type="file" id="input-file-custom-contract" accept=".pdf,.doc,.docx" class="hidden">
                                    <div class="w-14 h-14 rounded-2xl bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 group-hover:scale-110 group-hover:text-primary transition-all flex items-center justify-center shadow-xs">
                                        <span class="material-symbols-outlined text-3xl">upload_file</span>
                                    </div>
                                    <div>
                                        <p class="font-headline font-bold text-sm text-zinc-800 dark:text-zinc-200">
                                            Hacé clic para seleccionar o arrastrá tu contrato aquí
                                        </p>
                                        <p class="text-xs text-zinc-400 mt-1">Formatos soportados: PDF, DOCX (Máximo 25 MB)</p>
                                    </div>
                                </div>

                                <!-- File Preview Box -->
                                <div id="custom-file-preview" class="hidden p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <span class="material-symbols-outlined text-emerald-600 text-3xl shrink-0">picture_as_pdf</span>
                                        <div class="min-w-0">
                                            <p id="custom-file-name" class="font-headline font-bold text-emerald-900 dark:text-emerald-300 truncate text-sm">contrato_personalizado.pdf</p>
                                            <p id="custom-file-info" class="text-emerald-700 dark:text-emerald-400 text-xs">Listo para firma biométrica y resguardo en Supabase Storage</p>
                                        </div>
                                    </div>
                                    <button type="button" id="btn-remove-custom-file" class="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl font-bold transition-colors cursor-pointer">
                                        Cambiar archivo
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Bottom Action Footer Bar -->
                    <div class="px-6 py-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 shrink-0 flex-wrap">
                        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">verified_user</span>
                            <span>Custodia e Inmutabilidad con <strong>Firma Biométrica Didit</strong></span>
                        </div>

                        <div class="flex items-center gap-3">
                            <button type="button" id="btn-cancel-contract-editor" class="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                                Cancelar
                            </button>
                            <button type="button" id="btn-confirm-contract-editor" class="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-white font-headline font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-base">check_circle</span>
                                <span>Aplicar Condiciones al Contrato</span>
                            </button>
                        </div>
                    </div>

                </div>
            `;

            document.body.appendChild(modalContainer);

            this._setupEvents(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress, defaultRent);
            this._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
        },

        close: function () {
            const modal = document.getElementById('contract-editor-modal-container');
            if (modal) modal.remove();
        },

        _setupEvents: function (tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress, defaultRent) {
            const self = this;

            // Cerrar
            document.getElementById('btn-close-contract-editor')?.addEventListener('click', () => self.close());
            document.getElementById('btn-cancel-contract-editor')?.addEventListener('click', () => self.close());

            // Tabs
            const tabSmart = document.getElementById('tab-smart-contract');
            const tabUpload = document.getElementById('tab-upload-contract');
            const contentSmart = document.getElementById('content-smart-contract');
            const contentUpload = document.getElementById('content-upload-contract');

            tabSmart?.addEventListener('click', () => {
                self._activeTab = 'smart';
                tabSmart.className = 'tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-primary text-primary dark:text-red-400 bg-white dark:bg-[#0c0d14]';
                tabUpload.className = 'tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
                contentSmart.className = 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start';
                contentUpload.className = 'hidden';
            });

            tabUpload?.addEventListener('click', () => {
                self._activeTab = 'upload';
                tabUpload.className = 'tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-primary text-primary dark:text-red-400 bg-white dark:bg-[#0c0d14]';
                tabSmart.className = 'tab-btn px-4 py-2.5 rounded-t-2xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
                contentUpload.className = 'space-y-5 max-w-3xl mx-auto py-4';
                contentSmart.className = 'hidden';
            });

            // Reactividad de Inputs para Previsualización en Vivo
            const triggerPreview = () => {
                const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
                const sym = document.getElementById('editor-moneda-symbol');
                if (sym) sym.textContent = moneda === 'USD' ? 'USD' : '$';
                self._updateLivePreview(tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress);
            };

            // Currency Chips
            const curContainer = document.getElementById('currency-switcher-container');
            const curChips = curContainer?.querySelectorAll('.currency-chip');
            const curInput = document.getElementById('editor-moneda');
            curChips?.forEach(chip => {
                chip.addEventListener('click', () => {
                    const cur = chip.getAttribute('data-currency');
                    if (curInput) curInput.value = cur;
                    curChips.forEach(c => {
                        c.className = 'currency-chip px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer text-zinc-600 dark:text-zinc-400 hover:text-zinc-900';
                    });
                    chip.className = 'currency-chip px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer bg-primary text-white shadow-xs';
                    triggerPreview();
                });
            });

            // Helper for chip groups
            function setupChipGroup(containerId, inputId, chipClass) {
                const container = document.getElementById(containerId);
                const input = document.getElementById(inputId);
                if (!container || !input) return;

                const chips = container.querySelectorAll('.' + chipClass);
                chips.forEach(chip => {
                    chip.addEventListener('click', () => {
                        const val = chip.getAttribute('data-val');
                        input.value = val;
                        chips.forEach(c => {
                            c.className = `${chipClass} py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:border-primary/50`;
                        });
                        chip.className = `${chipClass} py-2 px-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer bg-primary text-white border-primary shadow-xs`;
                        triggerPreview();
                    });
                });
            }

            setupChipGroup('duracion-chips-container', 'editor-duracion', 'duration-chip');
            setupChipGroup('indice-chips-container', 'editor-indice', 'index-chip');
            setupChipGroup('frecuencia-chips-container', 'editor-frecuencia', 'frec-chip');
            setupChipGroup('dia-venc-chips-container', 'editor-dia-venc', 'dia-chip');
            setupChipGroup('deposito-chips-container', 'editor-deposito', 'deposito-chip');
            setupChipGroup('expensas-chips-container', 'editor-expensas', 'expensas-chip');

            // Form inputs & Toggles
            ['editor-monto', 'editor-alias-cbu',
             'toggle-mascotas', 'toggle-vivienda', 'toggle-seguro', 'toggle-subalquiler', 'toggle-rescision'
            ].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('input', triggerPreview);
                    el.addEventListener('change', triggerPreview);
                }
            });

            // Carga de Archivo Propio (Drag & Drop)
            const dropZone = document.getElementById('drop-zone-custom-contract');
            const fileInput = document.getElementById('input-file-custom-contract');
            const previewBox = document.getElementById('custom-file-preview');
            const fileNameEl = document.getElementById('custom-file-name');
            const fileInfoEl = document.getElementById('custom-file-info');
            const btnRemove = document.getElementById('btn-remove-custom-file');

            dropZone?.addEventListener('click', () => fileInput?.click());

            dropZone?.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('border-primary', 'bg-primary/5');
            });
            dropZone?.addEventListener('dragleave', () => {
                dropZone.classList.remove('border-primary', 'bg-primary/5');
            });
            dropZone?.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('border-primary', 'bg-primary/5');
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFile(e.dataTransfer.files[0]);
                }
            });

            fileInput?.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                }
            });

            btnRemove?.addEventListener('click', (e) => {
                e.stopPropagation();
                self._customFile = null;
                previewBox.classList.add('hidden');
                dropZone.classList.remove('hidden');
                if (fileInput) fileInput.value = '';
            });

            async function handleFile(file) {
                self._customFile = file;
                const sizeKb = Math.round(file.size / 1024);
                fileNameEl.textContent = file.name;
                fileInfoEl.textContent = `Tamaño: ${sizeKb} KB • Archivo listo para custodia criptográfica`;
                dropZone.classList.add('hidden');
                previewBox.classList.remove('hidden');
            }

            // Confirmar y Aplicar
            document.getElementById('btn-confirm-contract-editor')?.addEventListener('click', async () => {
                const btn = document.getElementById('btn-confirm-contract-editor');
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Aplicando Términos...';

                const terms = self._collectTerms();

                if (typeof self._currentOptions?.onConfirm === 'function') {
                    await self._currentOptions.onConfirm(terms);
                } else {
                    const appId = self._currentOptions?.applicant?.id;
                    let targetContractId = 'CTR-2026-0043';
                    if (window.DataManager && window.DataManager.acceptApplication && appId) {
                        try {
                            const res = await window.DataManager.acceptApplication(appId, terms);
                            if (res && res.contractId) targetContractId = res.contractId;
                        } catch (e) {
                            console.warn("Aviso guardando términos:", e);
                        }
                    }
                    self.close();
                    window.location.href = `contratos.html?contract=${targetContractId}&sign=1&role=OWNER`;
                }
            });
        },

        _collectTerms: function () {
            const isUpload = this._activeTab === 'upload';
            const duracion = parseInt(document.getElementById('editor-duracion')?.value || 24, 10);
            const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
            const indice = document.getElementById('editor-indice')?.value || 'IPC';
            const frecuencia = parseInt(document.getElementById('editor-frecuencia')?.value || 3, 10);
            const monto = parseFloat(document.getElementById('editor-monto')?.value || 450000);
            const diaVenc = parseInt(document.getElementById('editor-dia-venc')?.value || 10, 10);
            const aliasCbu = document.getElementById('editor-alias-cbu')?.value || 'HABITAT.ALQUILER.MP';
            const deposito = document.getElementById('editor-deposito')?.value || '1_MES';
            const mora = parseFloat(document.getElementById('editor-mora')?.value || 0.5);
            const expensas = document.getElementById('editor-expensas')?.value || 'ORDINARIAS_INQ';

            const clauses = {
                mascotas: document.getElementById('toggle-mascotas')?.checked ?? true,
                viviendaExclusiva: document.getElementById('toggle-vivienda')?.checked ?? true,
                seguroIncendio: document.getElementById('toggle-seguro')?.checked ?? true,
                prohibirSubalquiler: document.getElementById('toggle-subalquiler')?.checked ?? true,
                rescisionAnticipada: document.getElementById('toggle-rescision')?.checked ?? true,
                moneda: moneda,
                depositoModalidad: deposito,
                tasaMoraDiaria: mora,
                regimenExpensas: expensas
            };

            return {
                mode: isUpload ? 'custom_file' : 'smart_model',
                customFile: this._customFile,
                currency: moneda,
                durationMonths: duracion,
                adjustmentIndex: indice,
                adjustmentFrequencyMonths: frecuencia,
                monthlyRent: monto,
                paymentDueDay: diaVenc,
                aliasCbu: aliasCbu,
                clauses: clauses
            };
        },

        _updateLivePreview: function (tenantName, tenantDni, tenantCuil, tenantEmail, ownerName, ownerDni, ownerCuil, ownerEmail, propAddress) {
            const previewEl = document.getElementById('contract-live-preview-box');
            if (!previewEl) return;

            const duracion = document.getElementById('editor-duracion')?.value || 24;
            const moneda = document.getElementById('editor-moneda')?.value || 'ARS';
            const indice = document.getElementById('editor-indice')?.value || 'IPC';
            const frecuencia = document.getElementById('editor-frecuencia')?.value || 3;
            const montoRaw = document.getElementById('editor-monto')?.value || 450000;
            const sym = moneda === 'USD' ? 'USD ' : '$ ';
            const montoFmt = sym + Number(montoRaw).toLocaleString('es-AR') + (moneda === 'USD' ? ' (Dólares)' : ' (Pesos Argentinos)');
            const diaVenc = document.getElementById('editor-dia-venc')?.value || 10;
            const aliasCbu = document.getElementById('editor-alias-cbu')?.value || 'HABITAT.ALQUILER.MP';
            const depositoSel = document.getElementById('editor-deposito')?.value || '1_MES';
            const moraSel = document.getElementById('editor-mora')?.value || '0.5';
            const expensasSel = document.getElementById('editor-expensas')?.value || 'ORDINARIAS_INQ';

            const allowPets = document.getElementById('toggle-mascotas')?.checked;
            const onlyResidential = document.getElementById('toggle-vivienda')?.checked;
            const needInsurance = document.getElementById('toggle-seguro')?.checked;
            const noSublease = document.getElementById('toggle-subalquiler')?.checked;
            const allowEarlyTermination = document.getElementById('toggle-rescision')?.checked;

            const today = new Date().toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });

            let depositoTxt = 'equivalente a UN (1) mes de canon locativo inicial';
            if (depositoSel === '1_MES_USD') depositoTxt = 'en Dólares Estadounidenses (USD) equivalente al valor inicial acordado';
            if (depositoSel === '2_MESES') depositoTxt = 'equivalente a DOS (2) meses de canon locativo';
            if (depositoSel === 'SIN_DEPOSITO') depositoTxt = 'respaldado íntegramente mediante Pasaporte Hábitat / Seguro de Caución sin integración de efectivo';

            let expensasTxt = 'Las expensas comunes ordinarias y los consumos de servicios (energía eléctrica, gas natural, agua potable, telecomunicaciones) serán por cuenta exclusiva del LOCATARIO. Las expensas extraordinarias e impuestos sobre el inmueble serán a cargo del LOCADOR.';
            if (expensasSel === 'TOTALES_INQ') expensasTxt = 'La totalidad de las expensas (ordinarias y extraordinarias) y servicios serán solventadas por EL LOCATARIO.';
            if (expensasSel === 'INCLUIDAS') expensasTxt = 'Las expensas e impuestos se encuentran incluidos dentro del monto del canon locativo mensual.';

            previewEl.innerHTML = `
                <div class="border-b-2 border-primary pb-3 text-center mb-4 space-y-1">
                    <p class="font-headline font-black text-sm text-primary dark:text-red-400 tracking-wider uppercase">CONTRATO DE LOCACIÓN INMOBILIARIA CON FIRMA ELECTRÓNICA</p>
                    <p class="text-[10px] text-zinc-500 font-sans">Identificador Oficial Hábitat: CTR-2026-OFICIAL • Conforme Ley Nacional N° 25.506 y DNU 70/2023</p>
                </div>

                <p class="text-justify">
                    <strong>PARTES INTERVINIENTES:</strong> En la República Argentina, entre <strong>${ownerName}</strong> (DNI ${ownerDni}, CUIL ${ownerCuil}, Email: ${ownerEmail}), en adelante <strong>"EL LOCADOR"</strong>; y por la otra <strong>${tenantName}</strong> (DNI ${tenantDni}, CUIL ${tenantCuil}, Email: ${tenantEmail}), en adelante <strong>"EL LOCATARIO"</strong>, convienen en celebrar el presente contrato de locación:
                </p>

                <p class="text-justify">
                    <strong>PRIMERA (OBJETO):</strong> EL LOCADOR cede en locación a EL LOCATARIO, y éste acepta, el inmueble ubicado en <strong>${propAddress}</strong>.${onlyResidential ? ' Dicho inmueble tendrá como <strong>destino exclusivo el de vivienda familiar y permanente</strong>, quedando expresamente prohibido su cambio de destino o explotación comercial.' : ' Con destino habitacional conforme a derecho.'}
                </p>

                <p class="text-justify">
                    <strong>SEGUNDA (PLAZO):</strong> El plazo contractual se pacta libremente entre las partes en <strong>${duracion} meses corridos</strong>, comenzando su vigencia el día <strong>${today}</strong>.
                </p>

                <p class="text-justify">
                    <strong>TERCERA (CANON LOCATIVO Y ACTUALIZACIÓN):</strong> El precio del alquiler se fija en la suma inicial de <strong class="text-primary dark:text-red-400">${montoFmt}</strong> mensuales. Dicho importe se actualizará de forma obligatoria cada <strong>${frecuencia} meses</strong> aplicando la variación porcentual del índice oficial <strong>${indice}</strong>.
                </p>

                <p class="text-justify">
                    <strong>CUARTA (LUGAR Y FORMA DE PAGO):</strong> El pago del alquiler deberá efectuarse del 1 al día <strong>${diaVenc}</strong> de cada mes calendario mediante transferencia bancaria a la cuenta bancaria / Alias CBU: <strong class="font-mono text-emerald-600 dark:text-emerald-400">${aliasCbu}</strong>. En caso de mora, se devengará un interés punitorio del <strong>${moraSel}% por cada día de atraso</strong>.
                </p>

                <p class="text-justify">
                    <strong>QUINTA (EXPENSAS, SERVICIOS E IMPUESTOS):</strong> ${expensasTxt}
                </p>

                <p class="text-justify">
                    <strong>SEXTA (DEPÓSITO EN GARANTÍA):</strong> EL LOCATARIO entrega a EL LOCADOR la suma ${depositoTxt}, suma que será restituida al finalizar la locación previa verificación del estado de conservación del inmueble y entrega de llaves.
                </p>

                ${allowPets ? `
                <p class="text-justify">
                    <strong>SÉPTIMA (TENENCIA DE MASCOTAS):</strong> Se autoriza la tenencia de animales domésticos en la propiedad bajo exclusiva responsabilidad del LOCATARIO por los daños, ruidos o eventuales deterioros que pudieran ocasionar.
                </p>
                ` : `
                <p class="text-justify">
                    <strong>SÉPTIMA (MASCOTAS):</strong> Queda terminantemente prohibida la tenencia o permanencia de animales de cualquier especie en el inmueble arrendado.
                </p>
                `}

                ${needInsurance ? `
                <p class="text-justify">
                    <strong>OCTAVA (SEGURO CONTRA INCENDIO):</strong> EL LOCATARIO se obliga a contratar y mantener vigente durante todo el plazo contractual una póliza de seguro contra incendio y responsabilidad civil sobre la propiedad, designando al LOCADOR como beneficiario.
                </p>
                ` : ''}

                ${noSublease ? `
                <p class="text-justify">
                    <strong>NOVENA (PROHIBICIÓN DE CESIÓN Y SUBLOCACIÓN):</strong> Queda expresamente prohibida la cesión total o parcial del presente contrato, el subarriendo total o parcial y el préstamo de uso del inmueble a terceros bajo apercibimiento de rescisión culposa (Art. 1213 CCyCN).
                </p>
                ` : ''}

                ${allowEarlyTermination ? `
                <p class="text-justify">
                    <strong>DÉCIMA (RESCISIÓN ANTICIPADA):</strong> EL LOCATARIO podrá rescindir el presente contrato en cualquier momento transcurridos los primeros seis meses de vigencia, notificando fehacientemente al LOCADOR con al menos un mes de anticipación conforme a las pautas del Art. 1221 del Código Civil y Comercial de la Nación.
                </p>
                ` : ''}

                <p class="text-justify border-t border-zinc-200 dark:border-zinc-800 pt-3 text-[11px] text-zinc-500">
                    <strong>DÉCIMA PRIMERA (FIRMA ELECTRÓNICA Y BIOMETRÍA DIDIT):</strong> Las partes prestan su expreso e irrevocable consentimiento para la suscripción del presente contrato mediante <strong>Firma Electrónica, Verificación Biométrica Facial en Vivo (Didit KYC) y Sello de Tiempo TSA RFC 3161</strong>, reconociéndole plena validez legal, eficacia probatoria y fuerza ejecutoria bajo la <strong>Ley Nacional N° 25.506</strong>.
                </p>
            `;
        }
    };

    // Auto-disponible globalmente
    window.openContractEditorModal = function (options) {
        window.ContractEditorModal.open(options);
    };

})();
