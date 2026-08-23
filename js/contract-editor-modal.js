/**
 * ==============================================================================
 * HÁBITAT - CONTRACT EDITOR & SMART BUILDER MODAL (v2.0 Ultra-Premium)
 * ==============================================================================
 * Modal ejecutivo e interactivo para configurar el contrato de locación bajo DNU 70/2023
 * y Ley Nacional N° 25.506 de Firma Digital, o subir un contrato propio en PDF.
 */

(function () {
    'use strict';

    window.ContractEditorModal = {
        _currentOptions: null,
        _customFile: null,
        _activeTab: 'smart', // 'smart' | 'upload'
        _activeSection: 'comercial', // 'comercial' | 'garantias' | 'clausulas'

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
            modalContainer.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto';

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
            const defaultRent = Number(property.price || property.precio || contract.monthlyRent || 450000);

            modalContainer.innerHTML = `
                <div class="relative w-full max-w-6xl bg-white dark:bg-[#111114] border border-zinc-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] text-zinc-900 dark:text-zinc-100">
                    
                    <!-- Top Header Bar -->
                    <div class="px-6 py-4 bg-zinc-50/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0">
                        <div class="flex items-center gap-3.5 min-w-0">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#811b1e] to-[#a13333] text-white flex items-center justify-center shrink-0 shadow-md shadow-red-950/20">
                                <span class="material-symbols-outlined text-xl">gavel</span>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white leading-tight truncate">
                                        Editor de Contrato de Locación
                                    </h3>
                                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        Ley 25.506 & DNU 70/2023
                                    </span>
                                </div>
                                <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                    Inquilino: <strong class="text-zinc-800 dark:text-zinc-200">${tenantName}</strong> • ${propAddress}
                                </p>
                            </div>
                        </div>

                        <!-- Botón Cerrar -->
                        <button type="button" id="btn-close-contract-editor" class="w-8 h-8 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer">
                            <span class="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    <!-- Selector de Modo (Tabs) -->
                    <div class="px-6 pt-2.5 bg-zinc-100/70 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-white/5 flex gap-2 shrink-0">
                        <button type="button" id="tab-smart-contract" class="tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${this._activeTab === 'smart' ? 'border-primary text-primary dark:text-red-400 bg-white dark:bg-[#111114]' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                            <span class="material-symbols-outlined text-base">auto_awesome</span>
                            Contrato Modelo Hábitat (Smart Generator)
                        </button>
                        <button type="button" id="tab-upload-contract" class="tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all ${this._activeTab === 'upload' ? 'border-primary text-primary dark:text-red-400 bg-white dark:bg-[#111114]' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}">
                            <span class="material-symbols-outlined text-base">upload_file</span>
                            Subir Mi Propio Contrato (PDF / Word)
                        </button>
                    </div>

                    <!-- Modal Body / Content Grid -->
                    <div class="flex-1 overflow-y-auto p-4 sm:p-6">
                        
                        <!-- TAB 1: CONTRATO MODELO INTELIGENTE -->
                        <div id="content-smart-contract" class="${this._activeTab === 'smart' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start' : 'hidden'}">
                            
                            <!-- COLUMNA IZQUIERDA: CONTROLES DEL PROPIETARIO (6 Cols) -->
                            <div class="lg:col-span-6 space-y-4">
                                
                                <!-- Sección 1: Plazo, Precio y Ajustes -->
                                <div class="bg-zinc-50 dark:bg-zinc-900/70 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-4">
                                    <div class="flex items-center justify-between">
                                        <h4 class="font-headline font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                            <span class="w-6 h-6 rounded-lg bg-primary/10 dark:bg-red-950/50 text-primary dark:text-red-400 flex items-center justify-center text-xs font-black">1</span>
                                            Plazo, Precio y Ajuste Periódico
                                        </h4>
                                        <span class="text-[11px] font-bold text-zinc-400">DNU 70/2023</span>
                                    </div>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <!-- Duración -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Duración del Contrato</label>
                                            <select id="editor-duracion" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="24" selected>24 meses (Estándar)</option>
                                                <option value="12">12 meses (1 año)</option>
                                                <option value="36">36 meses (3 años)</option>
                                                <option value="6">Temporal (6 meses)</option>
                                                <option value="3">Temporal (3 meses)</option>
                                            </select>
                                        </div>

                                        <!-- Moneda -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Moneda del Contrato</label>
                                            <select id="editor-moneda" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="ARS" selected>Pesos Argentinos (ARS $)</option>
                                                <option value="USD">Dólares Estadounidenses (USD U$S)</option>
                                            </select>
                                        </div>

                                        <!-- Monto Inicial -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Precio Inicial Mensual</label>
                                            <div class="relative">
                                                <input type="number" id="editor-monto" value="${defaultRent}" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 pl-3 pr-8 font-black text-sm focus:ring-2 focus:ring-primary/20">
                                                <span id="editor-moneda-symbol" class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">$</span>
                                            </div>
                                        </div>

                                        <!-- Índice de Ajuste -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Índice de Actualización</label>
                                            <select id="editor-indice" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="IPC" selected>IPC (Precios al Consumidor)</option>
                                                <option value="ICL">ICL (Índice Locación BCRA)</option>
                                                <option value="CAC">CAC (Cámara de Construcción)</option>
                                                <option value="FIJO">Fijo en USD (Sin indexar)</option>
                                                <option value="ACUERDO">Aumento pactado fijo</option>
                                            </select>
                                        </div>

                                        <!-- Frecuencia de Ajuste -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Frecuencia de Ajuste</label>
                                            <select id="editor-frecuencia" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="3" selected>Trimestral (Cada 3 meses)</option>
                                                <option value="4">Cuatrimestral (Cada 4 meses)</option>
                                                <option value="6">Semestral (Cada 6 meses)</option>
                                                <option value="12">Anual (Cada 12 meses)</option>
                                            </select>
                                        </div>

                                        <!-- Día de Vencimiento -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Vencimiento de Pago</label>
                                            <select id="editor-dia-venc" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="5">Del 1 al 5 de cada mes</option>
                                                <option value="10" selected>Del 1 al 10 de cada mes</option>
                                                <option value="15">Del 1 al 15 de cada mes</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Sección 2: Cobro, Garantía y Penalidades -->
                                <div class="bg-zinc-50 dark:bg-zinc-900/70 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-4">
                                    <h4 class="font-headline font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-lg bg-primary/10 dark:bg-red-950/50 text-primary dark:text-red-400 flex items-center justify-center text-xs font-black">2</span>
                                        Medio de Cobro, Depósito y Penalidades
                                    </h4>

                                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                        <!-- Alias CBU -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Alias CBU / CVU de Cobro</label>
                                            <input type="text" id="editor-alias-cbu" value="HABITAT.ALQUILER.MP" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20">
                                        </div>

                                        <!-- Depósito en Garantía -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Monto Depósito de Garantía</label>
                                            <select id="editor-deposito" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="1_MES" selected>Equivalente a 1 mes de alquiler</option>
                                                <option value="1_MES_USD">1 mes en Dólares (USD)</option>
                                                <option value="2_MESES">Equivalente a 2 meses</option>
                                                <option value="SIN_DEPOSITO">Sin depósito (Respaldado x Seguro)</option>
                                            </select>
                                        </div>

                                        <!-- Tasa de Interés por Mora Diaria -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Interés Punitorio por Mora</label>
                                            <select id="editor-mora" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="0.5" selected>0.5% diario por mora</option>
                                                <option value="1.0">1.0% diario por mora</option>
                                                <option value="BNA">Tasa Activa Banco Nación</option>
                                            </select>
                                        </div>

                                        <!-- Expensas e Impuestos -->
                                        <div class="space-y-1">
                                            <label class="block font-bold text-zinc-700 dark:text-zinc-300">Expensas e Impuestos</label>
                                            <select id="editor-expensas" class="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl h-10 px-3 font-medium focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                                <option value="ORDINARIAS_INQ" selected>Inquilino: Ordinarias + Servicios</option>
                                                <option value="TOTALES_INQ">Inquilino: Todas las expensas</option>
                                                <option value="INCLUIDAS">Expensas incluidas en canon</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <!-- Sección 3: Cláusulas Legales y Convivencia -->
                                <div class="bg-zinc-50 dark:bg-zinc-900/70 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/5 space-y-3">
                                    <h4 class="font-headline font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white flex items-center gap-2">
                                        <span class="w-6 h-6 rounded-lg bg-primary/10 dark:bg-red-950/50 text-primary dark:text-red-400 flex items-center justify-center text-xs font-black">3</span>
                                        Cláusulas Legales y Convivencia
                                    </h4>

                                    <div class="space-y-2 text-xs">
                                        <!-- Mascotas -->
                                        <label class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg shrink-0">pets</span>
                                                <div class="min-w-0">
                                                    <p class="font-bold text-zinc-900 dark:text-white truncate">Permite Tenencia de Mascotas</p>
                                                    <p class="text-[10px] text-zinc-500 truncate">Mascotas domésticas con tenencia responsable.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" id="toggle-mascotas" checked class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer shrink-0">
                                        </label>

                                        <!-- Destino Vivienda -->
                                        <label class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg shrink-0">home</span>
                                                <div class="min-w-0">
                                                    <p class="font-bold text-zinc-900 dark:text-white truncate">Destino Exclusivo Vivienda Familiar</p>
                                                    <p class="text-[10px] text-zinc-500 truncate">Prohíbe uso comercial o profesional del inmueble.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" id="toggle-vivienda" checked class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer shrink-0">
                                        </label>

                                        <!-- Seguro Incendio -->
                                        <label class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0">shield</span>
                                                <div class="min-w-0">
                                                    <p class="font-bold text-zinc-900 dark:text-white truncate">Seguro de Incendio Obligatorio</p>
                                                    <p class="text-[10px] text-zinc-500 truncate">Póliza de seguro a favor del locador.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" id="toggle-seguro" checked class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer shrink-0">
                                        </label>

                                        <!-- Prohibición Subalquiler -->
                                        <label class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg shrink-0">block</span>
                                                <div class="min-w-0">
                                                    <p class="font-bold text-zinc-900 dark:text-white truncate">Prohibición de Sublocación (Art. 1213 CCyCN)</p>
                                                    <p class="text-[10px] text-zinc-500 truncate">Prohíbe ceder o subarrendar a terceros.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" id="toggle-subalquiler" checked class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer shrink-0">
                                        </label>

                                        <!-- Rescisión Anticipada -->
                                        <label class="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 cursor-pointer hover:border-primary/50 transition-all">
                                            <div class="flex items-center gap-2.5 min-w-0 pr-2">
                                                <span class="material-symbols-outlined text-purple-600 dark:text-purple-400 text-lg shrink-0">contract_delete</span>
                                                <div class="min-w-0">
                                                    <p class="font-bold text-zinc-900 dark:text-white truncate">Rescisión Anticipada (Art. 1221 CCyCN)</p>
                                                    <p class="text-[10px] text-zinc-500 truncate">Notificación con 1 mes de preaviso e indemnización.</p>
                                                </div>
                                            </div>
                                            <input type="checkbox" id="toggle-rescision" checked class="w-4 h-4 text-primary rounded focus:ring-primary cursor-pointer shrink-0">
                                        </label>
                                    </div>
                                </div>

                            </div>

                            <!-- COLUMNA DERECHA: HOJA LEGAL DIGITAL EN VIVO (6 Cols) -->
                            <div class="lg:col-span-6 flex flex-col space-y-2 sticky top-0">
                                <div class="flex items-center justify-between text-xs px-1">
                                    <span class="font-headline font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Borrador Oficial del Instrumento Legal
                                    </span>
                                    <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        Actualización en Vivo
                                    </span>
                                </div>

                                <!-- Hoja Estilo Papel Legal -->
                                <div class="bg-white dark:bg-[#1a1a1f] border border-zinc-300 dark:border-zinc-700/80 rounded-2xl p-6 sm:p-7 shadow-lg overflow-y-auto max-h-[580px] space-y-4 text-zinc-800 dark:text-zinc-200 text-xs leading-relaxed font-serif" id="contract-live-preview-box">
                                    <!-- Se renderiza dinámicamente con _updateLivePreview -->
                                </div>
                            </div>

                        </div>

                        <!-- TAB 2: SUBIR CONTRATO PROPIO -->
                        <div id="content-upload-contract" class="${this._activeTab === 'upload' ? 'space-y-5 max-w-3xl mx-auto py-4' : 'hidden'}">
                            <div class="bg-zinc-50 dark:bg-zinc-900/60 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-white/5 space-y-5">
                                <div class="flex items-start gap-4">
                                    <div class="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-[#A13333]/20 text-primary dark:text-[#A13333] flex items-center justify-center shrink-0">
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
                                <div id="drop-zone-custom-contract" class="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-primary dark:hover:border-primary rounded-2xl p-8 sm:p-10 text-center transition-all bg-white dark:bg-zinc-800/50 cursor-pointer flex flex-col items-center justify-center gap-3 group">
                                    <input type="file" id="input-file-custom-contract" accept=".pdf,.doc,.docx" class="hidden">
                                    <div class="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 group-hover:scale-110 group-hover:text-primary transition-all flex items-center justify-center shadow-inner">
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
                    <div class="px-6 py-4 bg-zinc-50/90 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between gap-4 shrink-0 flex-wrap">
                        <div class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg">verified_user</span>
                            <span>Custodia e Inmutabilidad en <strong>Supabase Storage Privado</strong></span>
                        </div>

                        <div class="flex items-center gap-3">
                            <button type="button" id="btn-cancel-contract-editor" class="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                                Cancelar
                            </button>
                            <button type="button" id="btn-confirm-contract-editor" class="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-xs sm:text-sm shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2 cursor-pointer">
                                <span class="material-symbols-outlined text-base">check_circle</span>
                                <span>Aceptar Postulante y Proceder a la Firma</span>
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
                tabSmart.className = 'tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-primary text-primary dark:text-red-400 bg-white dark:bg-[#111114]';
                tabUpload.className = 'tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
                contentSmart.className = 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start';
                contentUpload.className = 'hidden';
            });

            tabUpload?.addEventListener('click', () => {
                self._activeTab = 'upload';
                tabUpload.className = 'tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-primary text-primary dark:text-red-400 bg-white dark:bg-[#111114]';
                tabSmart.className = 'tab-btn px-4 py-2.5 rounded-t-xl font-headline font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300';
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

            ['editor-duracion', 'editor-moneda', 'editor-indice', 'editor-frecuencia', 'editor-monto', 'editor-dia-venc',
             'editor-alias-cbu', 'editor-deposito', 'editor-mora', 'editor-expensas',
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

            // Confirmar y Proceder a la Firma
            document.getElementById('btn-confirm-contract-editor')?.addEventListener('click', async () => {
                const btn = document.getElementById('btn-confirm-contract-editor');
                btn.disabled = true;
                btn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">sync</span> Procesando Contrato...';

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
                <div class="border-b-2 border-[#811b1e] pb-3 text-center mb-4">
                    <p class="font-headline font-black text-sm text-[#811b1e] tracking-wide uppercase">CONTRATO DE LOCACIÓN INMOBILIARIA DIGITAL</p>
                    <p class="text-[10px] text-zinc-500 font-sans mt-0.5">Identificador Legal: CTR-2026-OFICIAL • Conforme Ley Nacional N° 25.506 y DNU 70/2023</p>
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
                    <strong>TERCERA (CANON LOCATIVO Y ACTUALIZACIÓN):</strong> El precio del alquiler se fija en la suma inicial de <strong class="text-[#811b1e] dark:text-red-400">${montoFmt}</strong> mensuales. Dicho importe se actualizará de forma obligatoria cada <strong>${frecuencia} meses</strong> aplicando la variación porcentual del índice oficial <strong>${indice}</strong>.
                </p>

                <p class="text-justify">
                    <strong>CUARTA (LUGAR Y FORMA DE PAGO):</strong> El pago del alquiler deberá efectuarse del 1 al día <strong>${diaVenc}</strong> de cada mes calendario mediante transferencia bancaria a la cuenta bancaria / Alias CBU: <strong class="font-mono">${aliasCbu}</strong>. En caso de mora, se devengará un interés punitorio del <strong>${moraSel}% por cada día de atraso</strong>.
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

                <p class="text-justify border-t border-zinc-200 dark:border-zinc-800 pt-3">
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
