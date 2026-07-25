(function() {
    var div = document.createElement('div');
    div.innerHTML = `<section id="publish-property-view"
        class="bg-background dark:bg-[#0c0c0e] font-body w-full min-h-screen z-[100] transition-opacity duration-300 hidden">
        <!-- TopAppBar -->
        <header
            class="fixed top-0 w-full z-50 bg-surface/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-[0_12px_40px_0_rgba(0,0,0,0.4)] no-border tonal-transition border-b border-outline-variant/30 dark:border-white/5">
            <div class="flex justify-between items-center px-6 h-16 w-full">
                <div class="flex items-center gap-4">
                    <button id="btn-back-from-publish"
                        class="flex items-center gap-1 text-primary dark:text-red-500 hover:opacity-80 transition-opacity scale-95 transition-transform duration-200">
                        <span class="material-symbols-outlined" id="btn-back-icon">close</span>
                        <span id="btn-back-text" class="font-body font-bold text-sm">Cancelar</span>
                    </button>
                </div>

                <div class="flex items-center">
                    <div
                        class="w-10 h-10 rounded-full bg-surface-container-high dark:bg-[#282828] flex items-center justify-center overflow-hidden">
                        <span class="material-symbols-outlined text-on-surface dark:text-[#f1f1f1]">person</span>
                    </div>
                </div>
            </div>
        </header>
        <div class="flex flex-1 pt-16">
            <!-- Main Content Area -->
            <main class="flex-1 w-full p-6 md:p-12 pb-32">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8 md:mb-12">
                        <!-- Responsive Progress Indicator System -->
                        <div class="mb-8 w-full">
                            <!-- Mobile-Only Progress Header (< sm / smartphones) -->
                            <div class="sm:hidden mb-6 space-y-3">
                                <div class="flex items-center justify-between">
                                    <span class="text-xs font-headline font-bold uppercase tracking-wider text-primary dark:text-red-500 bg-primary/10 dark:bg-red-500/10 px-3.5 py-1.5 rounded-full border border-primary/20 dark:border-red-500/20 shadow-sm" id="mobile-step-badge">
                                        Paso 1 de 6 &bull; Principales
                                    </span>
                                    <span class="text-xs font-headline font-extrabold text-on-background dark:text-[#f1f1f1] bg-surface-container-high dark:bg-[#282828] px-3 py-1 rounded-lg" id="mobile-step-percent">
                                        17%
                                    </span>
                                </div>
                                <div class="w-full bg-surface-container-high dark:bg-[#282828] h-2.5 rounded-full overflow-hidden p-0.5 border border-outline-variant/20 dark:border-white/5">
                                    <div id="mobile-progress-bar" class="bg-primary dark:bg-red-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(161,51,51,0.5)]" style="width: 16.66%;"></div>
                                </div>
                            </div>

                            <!-- Tablet & Desktop Classic Progress Bar with Circles (>= sm) -->
                            <div class="flex items-start justify-between gap-1.5 md:gap-3 overflow-x-auto pb-2 no-scrollbar w-full max-sm:hidden"
                                id="publish-progress-indicator">
                                <div class="flex flex-col items-center gap-1.5 shrink-0" id="progress-step-1">
                                    <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">1</div>
                                    <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-xs sm:text-sm text-center">Principales</span>
                                </div>
                                <div id="progress-line-1" class="flex-1 min-w-[15px] max-w-[60px] border-t-2 border-primary dark:border-red-500 transition-colors duration-300 mt-4"></div>

                                <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="progress-step-2">
                                    <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">2</div>
                                    <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">Multimedia</span>
                                </div>
                                <div id="progress-line-2" class="flex-1 min-w-[15px] max-w-[60px] border-t-2 border-surface-dim dark:border-[#1e1e1e] transition-colors duration-300 mt-4"></div>

                                <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="progress-step-3">
                                    <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">3</div>
                                    <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">Extras</span>
                                </div>
                                <div id="progress-line-3" class="flex-1 min-w-[15px] max-w-[60px] border-t-2 border-surface-dim dark:border-[#1e1e1e] transition-colors duration-300 mt-4"></div>

                                <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="progress-step-4">
                                    <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">4</div>
                                    <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">Preferencias</span>
                                </div>
                                <div id="progress-line-4" class="flex-1 min-w-[15px] max-w-[60px] border-t-2 border-surface-dim dark:border-[#1e1e1e] transition-colors duration-300 mt-4"></div>

                                <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="progress-step-5">
                                    <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">5</div>
                                    <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">Visitas</span>
                                </div>
                                <div id="progress-line-5" class="flex-1 min-w-[15px] max-w-[60px] border-t-2 border-surface-dim dark:border-[#1e1e1e] transition-colors duration-300 mt-4"></div>

                                <div class="flex flex-col items-center gap-1.5 shrink-0 opacity-50" id="progress-step-6">
                                    <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">6</div>
                                    <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">Publicar</span>
                                </div>
                            </div>
                        </div>
                        <h1 id="publish-main-title"
                            class="text-4xl md:text-5xl font-headline font-extrabold text-on-background dark:text-[#f1f1f1] tracking-tight mb-4 transition-opacity duration-300">
                            ¡Empecemos a crear tu aviso!</h1>
                        <p id="paso-subtitle"
                            class="text-secondary dark:text-[#c7c6c6] font-body text-lg transition-opacity duration-300">
                            ¿Qué querés publicar?</p>
                    </div>

                    <div id="wizard-step-1-container"
                        class="transition-all duration-500 ease-in-out transform origin-top opacity-100 scale-100 h-auto overflow-visible">
                        <div
                            class="bg-surface-container-lowest dark:bg-[#0c0c0e] p-8 rounded-xl border border-outline-variant/30 dark:border-white/5 mb-8 relative">
                            <!-- Sub-navigation tabs -->
                            <div class="flex gap-8 mb-10 overflow-x-auto pb-2">
                                <button id="tab-operacion"
                                    class="font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap active-tab pointer-events-none">Operación
                                    y tipo de propiedad</button>
                                <button id="tab-ubicacion"
                                    class="font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none">Ubicación</button>
                                <button id="tab-caracteristicas"
                                    class="font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none">Características</button>
                            </div>
                            <div id="step-operacion" class="block">
                                <form id="form-principales" class="space-y-8" novalidate>
                                    <!-- Tipo de operación -->
                                    <div class="space-y-4">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Tipo
                                            de operación *</label>
                                        <div class="grid grid-cols-1 gap-4 max-w-xs">
                                            <label class="cursor-pointer relative block h-full">
                                                <input checked="" class="peer sr-only" name="operacion" type="radio" value="alquiler" />
                                                <div
                                                    class="h-full p-4 rounded-xl bg-surface-container-high dark:bg-[#282828] border-2 border-primary dark:border-red-500 bg-surface-container-lowest dark:bg-[#0c0c0e] transition-all text-center flex items-center justify-between px-6">
                                                    <span
                                                        class="font-headline font-bold text-primary dark:text-red-500 text-base">Alquiler</span>
                                                    <span
                                                        class="material-symbols-outlined text-primary dark:text-red-500"
                                                        style="font-variation-settings: 'FILL' 1;">check_circle</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                    <!-- Tipo de propiedad -->
                                    <div class="space-y-4">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Tipo
                                            de propiedad *</label>
                                        <div class="relative">
                                            <select id="tipo-propiedad" required
                                                class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] ![background-image:none] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-12 font-body text-sm md:text-base truncate focus:ring-1 focus:ring-primary dark:focus:ring-red-500 transition-colors cursor-pointer">
                                                <option disabled="" selected="" value="" class="bg-white dark:bg-[#1a1a1e] text-gray-400 dark:text-[#888]">Selecciona el tipo de propiedad
                                                </option>
                                                <option value="casa">Casa</option>
                                                <option value="consultorio">Consultorio</option>
                                                <option value="deposito">Depósito</option>
                                                <option value="edificio">Edificio</option>
                                                <option value="fondo-de-comercio">Fondo de comercio</option>
                                                <option value="cochera">Cochera</option>
                                                <option value="hotel">Hotel</option>
                                                <option value="local-comercial">Local comercial</option>
                                                <option value="oficina-comercial">Oficina comercial</option>
                                                <option value="ph">PH</option>
                                                <option value="quinta-vacacional">Quinta vacacional</option>
                                                <option value="rancho">Rancho</option>
                                                <option value="terreno">Terreno</option>
                                            </select>
                                            <div
                                                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                <span class="material-symbols-outlined">expand_more</span>
                                            </div>
                                        </div>
                                        <p id="error-tipo"
                                            class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                            Completa este campo</p>
                                    </div>
                                    <!-- Subtipo de propiedad -->
                                    <div class="space-y-4">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Subtipo
                                            de propiedad</label>
                                        <div class="relative">
                                            <select id="subtipo-propiedad" disabled
                                                class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] ![background-image:none] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 pr-12 font-body text-sm md:text-base truncate focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                                <option disabled="" selected="" value="">Selecciona un subtipo
                                                    (opcional)</option>
                                            </select>
                                            <div
                                                class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                <span class="material-symbols-outlined">expand_more</span>
                                            </div>
                                        </div>
                                        <p id="error-subtipo"
                                            class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                            Completa este campo</p>
                                    </div>
                                </form>
                            </div>

                            <!-- Paso 2: Ubicación (Inicialmente Oculto) -->
                            <div id="step-ubicacion" class="hidden">
                                <form id="form-ubicacion" class="space-y-8" novalidate>
                                    <!-- Calle y altura -->
                                    <div class="space-y-4">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Calle
                                            y altura *</label>
                                        <div class="relative">
                                            <input type="text" id="calle-altura" required
                                                placeholder="Ej: Av. del Libertador 1000"
                                                class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 font-body text-sm md:text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors placeholder:text-secondary/50 dark:placeholder:text-[#c7c6c6]/50">
                                        </div>
                                        <p id="error-calle"
                                            class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                            Completa este campo</p>
                                    </div>

                                    <!-- Provincia y Ciudad -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div class="space-y-4">
                                            <label
                                                class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Provincia
                                                *</label>
                                            <div class="relative">
                                                <select id="provincia" required
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] ![background-image:none] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 pr-12 font-body text-sm md:text-base truncate focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors cursor-pointer">
                                                    <option disabled selected value="">Selecciona la provincia</option>
                                                    <option value="buenos-aires">Buenos Aires</option>
                                                    <option value="caba">Ciudad Autónoma de Buenos Aires</option>
                                                    <option value="catamarca">Catamarca</option>
                                                    <option value="chaco">Chaco</option>
                                                    <option value="chubut">Chubut</option>
                                                    <option value="cordoba">Córdoba</option>
                                                    <option value="corrientes">Corrientes</option>
                                                    <option value="entre-rios">Entre Ríos</option>
                                                    <option value="formosa">Formosa</option>
                                                    <option value="jujuy">Jujuy</option>
                                                    <option value="la-pampa">La Pampa</option>
                                                    <option value="la-rioja">La Rioja</option>
                                                    <option value="mendoza">Mendoza</option>
                                                    <option value="misiones">Misiones</option>
                                                    <option value="neuquen">Neuquén</option>
                                                    <option value="rio-negro">Río Negro</option>
                                                    <option value="salta">Salta</option>
                                                    <option value="san-juan">San Juan</option>
                                                    <option value="san-luis">San Luis</option>
                                                    <option value="santa-cruz">Santa Cruz</option>
                                                    <option value="santa-fe">Santa Fe</option>
                                                    <option value="santiago-del-estero">Santiago del Estero</option>
                                                    <option value="tierra-del-fuego">Tierra del Fuego, Antártida e Islas
                                                        del Atlántico Sur</option>
                                                    <option value="tucuman">Tucumán</option>
                                                </select>
                                                <div
                                                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                            <p id="error-provincia"
                                                class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                Completa este campo</p>
                                        </div>

                                        <div class="space-y-4">
                                            <label
                                                class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Departamento
                                                *</label>
                                            <div class="relative">
                                                <select id="ciudad" disabled required
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] ![background-image:none] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 pr-12 font-body text-sm md:text-base truncate focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                                    <option disabled selected value="">Selecciona el departamento
                                                    </option>
                                                </select>
                                                <div
                                                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                            <p id="error-ciudad"
                                                class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                Completa este campo</p>
                                        </div>
                                    </div>



                                    <!-- Google Map Interactive -->
                                    <div class="mt-8">
                                        <div class="flex items-center gap-2 mb-4 px-1">
                                            <span
                                                class="material-symbols-outlined text-on-background dark:text-[#f1f1f1] text-xl"
                                                style="font-variation-settings: 'FILL' 0;">location_on</span>
                                            <span id="map-address-label"
                                                class="font-body text-secondary dark:text-[#c7c6c6] text-sm md:text-base">olegario
                                                v andrade 724, Ciudad de Mendoza, Mendoza</span>
                                        </div>

                                        <div id="real-map-container"
                                            class="rounded-xl overflow-hidden bg-surface-container dark:bg-[#282828] h-[300px] border border-outline-variant/30 dark:border-white/5 relative z-0">
                                            <!-- Leaflet map will render here -->
                                        </div>
                                    </div>
                                </form>
                            </div>

                            <!-- Paso 3: Características (Inicialmente Oculto) -->
                            <div id="step-caracteristicas" class="hidden">
                                <form id="form-caracteristicas" class="space-y-12" novalidate>

                                    <!-- Contadores -->
                                    <div class="space-y-6">
                                        <div class="flex items-center justify-between">
                                            <label
                                                class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Ambientes
                                                <span
                                                    class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span></label>
                                            <div
                                                class="flex items-center gap-2 md:gap-4 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5 shrink-0 flex-none">
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('ambientes-new'); input.value = Math.max(0, parseInt(input.value || 0) - 1)"><span
                                                        class="material-symbols-outlined">remove</span></button>
                                                <input type="number" id="ambientes-new"
                                                    class="!w-8 !min-w-[2rem] !max-w-[2rem] text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-lg focus:ring-0 select-none shrink-0 flex-none"
                                                    value="0" readonly>
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('ambientes-new'); input.value = parseInt(input.value || 0) + 1"><span
                                                        class="material-symbols-outlined">add</span></button>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between">
                                            <label
                                                class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Dormitorios
                                                <span
                                                    class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span></label>
                                            <div
                                                class="flex items-center gap-2 md:gap-4 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5 shrink-0 flex-none">
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('dormitorios-new'); input.value = Math.max(0, parseInt(input.value || 0) - 1)"><span
                                                        class="material-symbols-outlined">remove</span></button>
                                                <input type="number" id="dormitorios-new"
                                                    class="!w-8 !min-w-[2rem] !max-w-[2rem] text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-lg focus:ring-0 select-none shrink-0 flex-none"
                                                    value="0" readonly>
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('dormitorios-new'); input.value = parseInt(input.value || 0) + 1"><span
                                                        class="material-symbols-outlined">add</span></button>
                                            </div>
                                        </div>
                                        <div class="flex items-center justify-between">
                                            <label
                                                class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Baños
                                                <span
                                                    class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span></label>
                                            <div
                                                class="flex items-center gap-2 md:gap-4 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5 shrink-0 flex-none">
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('banos-new'); input.value = Math.max(0, parseInt(input.value || 0) - 1)"><span
                                                        class="material-symbols-outlined">remove</span></button>
                                                <input type="number" id="banos-new"
                                                    class="!w-8 !min-w-[2rem] !max-w-[2rem] text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-lg focus:ring-0 select-none shrink-0 flex-none"
                                                    value="0" readonly>
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('banos-new'); input.value = parseInt(input.value || 0) + 1"><span
                                                        class="material-symbols-outlined">add</span></button>
                                            </div>
                                        </div>

                                        <div class="flex items-center justify-between">
                                            <label
                                                class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Cocheras
                                                <span
                                                    class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span></label>
                                            <div
                                                class="flex items-center gap-2 md:gap-4 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5 shrink-0 flex-none">
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('cocheras-new'); input.value = Math.max(0, parseInt(input.value || 0) - 1)"><span
                                                        class="material-symbols-outlined">remove</span></button>
                                                <input type="number" id="cocheras-new"
                                                    class="!w-8 !min-w-[2rem] !max-w-[2rem] text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-lg focus:ring-0 select-none shrink-0 flex-none"
                                                    value="0" readonly>
                                                <button type="button"
                                                    class="!w-10 !h-10 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors shrink-0 flex-none"
                                                    onclick="const input = document.getElementById('cocheras-new'); input.value = parseInt(input.value || 0) + 1"><span
                                                        class="material-symbols-outlined">add</span></button>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Superficie -->
                                    <div class="space-y-4 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">Superficie</label>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div class="space-y-2">
                                                <label
                                                    class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Superficie
                                                    cubierta *</label>
                                                <div
                                                    class="flex bg-surface-container-high dark:bg-[#282828] rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-red-500">
                                                    <div
                                                        class="bg-surface-container dark:bg-[#1e1e1e] px-4 flex items-center justify-center border-r border-outline-variant/30 dark:border-white/5 text-secondary dark:text-[#c7c6c6] font-body text-sm min-w-[60px]">
                                                        m2</div>
                                                    <input type="number" id="sup-cubierta" required
                                                        class="flex-1 appearance-none bg-transparent border-none text-on-background dark:text-[#f1f1f1] h-14 px-4 font-body text-base focus:ring-0 placeholder:text-secondary/50"
                                                        placeholder="0">
                                                </div>
                                                <p id="error-sup-cubierta"
                                                    class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                    Completa este campo</p>
                                            </div>
                                            <div class="space-y-2">
                                                <label
                                                    class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Superficie
                                                    total *</label>
                                                <div
                                                    class="flex bg-surface-container-high dark:bg-[#282828] rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-red-500">
                                                    <div
                                                        class="bg-surface-container dark:bg-[#1e1e1e] px-4 flex items-center justify-center border-r border-outline-variant/30 dark:border-white/5 text-secondary dark:text-[#c7c6c6] font-body text-sm min-w-[60px]">
                                                        m2</div>
                                                    <input type="number" id="sup-total" required
                                                        class="flex-1 appearance-none bg-transparent border-none text-on-background dark:text-[#f1f1f1] h-14 px-4 font-body text-base focus:ring-0 placeholder:text-secondary/50"
                                                        placeholder="0">
                                                </div>
                                                <p id="error-sup-total"
                                                    class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                    Completa este campo</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Antigüedad -->
                                    <div class="space-y-4 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">Antigüedad</label>
                                        <div class="flex flex-col gap-4">
                                            <div class="checkbox-wrapper w-max">
                                                <input type="radio" id="antiguedad-estrenar" name="antiguedad"
                                                    value="estrenar">
                                                <label class="terms-label" for="antiguedad-estrenar">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                        viewBox="0 0 200 200" class="checkbox-svg">
                                                        <mask fill="white" id="path-1-inside-1_estrenar">
                                                            <rect height="200" width="200" rx="30"></rect>
                                                        </mask>
                                                        <rect mask="url(#path-1-inside-1_estrenar)" stroke-width="40"
                                                            class="checkbox-box" height="200" width="200" rx="30">
                                                        </rect>
                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64"
                                                            class="checkbox-tick"></path>
                                                    </svg>
                                                    <span
                                                        class="font-body font-normal text-secondary dark:text-[#c7c6c6] text-lg whitespace-nowrap ml-3">A
                                                        estrenar</span>
                                                </label>
                                            </div>
                                            <div class="checkbox-wrapper w-max">
                                                <input type="radio" id="antiguedad-anios" name="antiguedad"
                                                    value="anios">
                                                <label class="terms-label" for="antiguedad-anios">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                        viewBox="0 0 200 200" class="checkbox-svg">
                                                        <mask fill="white" id="path-1-inside-1_anios">
                                                            <rect height="200" width="200" rx="30"></rect>
                                                        </mask>
                                                        <rect mask="url(#path-1-inside-1_anios)" stroke-width="40"
                                                            class="checkbox-box" height="200" width="200" rx="30">
                                                        </rect>
                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64"
                                                            class="checkbox-tick"></path>
                                                    </svg>
                                                    <span
                                                        class="font-body font-normal text-secondary dark:text-[#c7c6c6] text-lg whitespace-nowrap ml-3">Años
                                                        de antigüedad</span>
                                                </label>
                                            </div>
                                            <div class="checkbox-wrapper w-max">
                                                <input type="radio" id="antiguedad-remodelado" name="antiguedad"
                                                    value="remodelado">
                                                <label class="terms-label" for="antiguedad-remodelado">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                        viewBox="0 0 200 200" class="checkbox-svg">
                                                        <mask fill="white" id="path-1-inside-1_remodelado">
                                                            <rect height="200" width="200" rx="30"></rect>
                                                        </mask>
                                                        <rect mask="url(#path-1-inside-1_remodelado)"
                                                            stroke-width="40" class="checkbox-box" height="200"
                                                            width="200" rx="30"></rect>
                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64"
                                                            class="checkbox-tick"></path>
                                                    </svg>
                                                    <span
                                                        class="font-body font-normal text-secondary dark:text-[#c7c6c6] text-lg whitespace-nowrap ml-3">Remodelado</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Precio -->
                                    <div class="space-y-4 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">Precio
                                            del alquiler *</label>
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div class="relative md:col-span-1">
                                                <select id="moneda" required
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] ![background-image:none] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 pr-12 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors cursor-pointer">
                                                    <option value="USD">USD - Dólares</option>
                                                    <option value="ARS" selected>ARS - Pesos Argentinos</option>
                                                </select>
                                                <div
                                                    class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-secondary dark:text-[#c7c6c6]">
                                                    <span class="material-symbols-outlined">expand_more</span>
                                                </div>
                                            </div>
                                            <div class="relative md:col-span-2">
                                                <input type="number" id="precio" required placeholder="Ej: 150000"
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors placeholder:text-secondary/50">
                                                <p id="error-precio"
                                                    class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                    Completa este campo</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Expensas -->
                                    <div class="space-y-4 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">Expensas
                                            <span
                                                class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span></label>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                            <div>
                                                <input type="number" id="expensas" placeholder="Monto mensual en $"
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors placeholder:text-secondary/50">
                                            </div>
                                            <div class="checkbox-wrapper w-max">
                                                <input type="checkbox" id="expensas-incluidas" name="expensas-incluidas">
                                                <label class="terms-label" for="expensas-incluidas">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                                                        viewBox="0 0 200 200" class="checkbox-svg">
                                                        <mask fill="white" id="path-1-inside-1_expensas">
                                                            <rect height="200" width="200" rx="30"></rect>
                                                        </mask>
                                                        <rect mask="url(#path-1-inside-1_expensas)" stroke-width="40"
                                                            class="checkbox-box" height="200" width="200" rx="30">
                                                        </rect>
                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64"
                                                            class="checkbox-tick"></path>
                                                    </svg>
                                                    <span
                                                        class="font-body font-normal text-secondary dark:text-[#c7c6c6] text-lg whitespace-nowrap ml-3">Expensas incluidas</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Descripción -->
                                    <div class="space-y-4 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                        <label
                                            class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">Título
                                            y Descripción del aviso *</label>
                                        <div class="space-y-4">
                                            <div>
                                                <label
                                                    class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm mb-2">Título
                                                    del aviso *</label>
                                                <input type="text" id="titulo-aviso" required
                                                    placeholder="Ej: Excelente departamento de 2 ambientes con balcón"
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-sm h-14 px-4 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors placeholder:text-secondary/50">
                                                <p id="error-titulo"
                                                    class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                    Completa este campo</p>
                                            </div>
                                            <div>
                                                <label
                                                    class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm mb-2">Descripción
                                                    detallada *</label>
                                                <textarea id="descripcion-aviso" required rows="6"
                                                    placeholder="Contá las mejores características de la propiedad, estado, ubicación, etc..."
                                                    class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-sm p-4 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary transition-colors placeholder:text-secondary/50"></textarea>
                                                <p id="error-descripcion"
                                                    class="hidden text-primary dark:text-red-500 text-sm font-body mt-1">
                                                    Completa este campo</p>
                                            </div>
                                        </div>
                                    </div>

                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Paso 2: Multimedia (Fotos y Videos) -->
                    <div id="wizard-step-2-container"
                        class="hidden opacity-0 translate-y-8 scale-95 h-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform origin-top w-full max-w-4xl mx-auto pb-24 md:pb-8">
                        <div
                            class="bg-surface/50 dark:bg-[#121212]/50 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-outline-variant/30 dark:border-white/5 shadow-2xl">
                            <form id="form-multimedia" class="space-y-12">

                                <!-- Sección Fotos -->
                                <div class="space-y-6">
                                    <div>
                                        <h3
                                            class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl md:text-2xl">
                                            Fotos de la propiedad</h3>
                                        <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm md:text-base mt-1">
                                            Cargá entre 5 y 50 fotos. Se admiten los formatos jpg, jpeg, png y webp.</p>
                                    </div>

                                    <!-- Dropzone para fotos -->
                                    <div id="dropzone-fotos"
                                        class="border-2 border-dashed border-outline-variant/40 dark:border-white/10 hover:border-primary dark:hover:border-red-500/50 rounded-2xl p-8 text-center bg-surface-container-lowest/50 dark:bg-[#0c0c0e]/50 transition-all duration-300 cursor-pointer group">
                                        <input type="file" id="input-fotos" multiple accept="image/*" class="hidden">
                                        <div class="flex flex-col items-center justify-center gap-3">
                                            <div
                                                class="w-16 h-16 rounded-full bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <span class="material-symbols-outlined text-3xl">add_a_photo</span>
                                            </div>
                                            <div>
                                                <p
                                                    class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base">
                                                    Arrastrá y soltá tus fotos aquí</p>
                                                <p
                                                    class="font-body text-secondary dark:text-[#c7c6c6] text-sm mt-0.5">
                                                    o <span
                                                        class="text-primary dark:text-red-500 font-semibold underline underline-offset-2">explorá
                                                        tus archivos</span></p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Grilla de fotos cargadas -->
                                    <div id="preview-fotos-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 empty:hidden">
                                        <!-- Las previews de fotos se insertarán aquí dinámicamente -->
                                    </div>
                                </div>

                                <!-- Sección Video -->
                                <div class="space-y-6 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                    <div>
                                        <h3
                                            class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl md:text-2xl">
                                            Video de la propiedad <span
                                                class="text-secondary dark:text-[#c7c6c6] text-base font-normal">(opcional)</span>
                                        </h3>
                                        <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm md:text-base mt-1">
                                            Podés agregar un enlace de YouTube o Vimeo.</p>
                                    </div>

                                    <div class="relative">
                                        <input type="url" id="video-url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border border-outline-variant/30 dark:border-white/10 text-on-background dark:text-[#f1f1f1] rounded-xl h-14 pl-12 pr-4 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary dark:focus:outline-red-500 transition-colors placeholder:text-secondary/50">
                                        <span
                                            class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-secondary dark:text-[#c7c6c6]">play_circle</span>
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>

                    <!-- Paso 3: Extras (Comodidades y Adicionales) -->
                    <div id="wizard-step-3-container"
                        class="hidden opacity-0 translate-y-8 scale-95 h-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform origin-top w-full max-w-4xl mx-auto pb-24 md:pb-8">
                        <div
                            class="bg-surface/50 dark:bg-[#121212]/50 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-outline-variant/30 dark:border-white/5 shadow-2xl">
                            <form id="form-extras" class="space-y-10">

                                <!-- Buscador y Chips -->
                                <div class="space-y-4">
                                    <label class="block font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg">Buscá y agregá amenities y características</label>
                                    <div class="relative">
                                        <input type="text" placeholder="Ej. Pileta, Aire acondicionado, Garita de seguridad..."
                                            class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border border-outline-variant/30 dark:border-white/10 text-on-background dark:text-[#f1f1f1] rounded-xl h-14 pl-4 pr-12 font-body text-base focus:ring-0 focus:bg-surface-container-lowest focus:outline focus:outline-1 focus:outline-primary dark:focus:outline-red-500 transition-colors placeholder:text-secondary/50">
                                        <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-secondary dark:text-[#c7c6c6]">search</span>
                                    </div>
                                    <!-- Contenedor de Chips Seleccionados -->
                                    <div id="selected-features-container" class="flex flex-wrap gap-3 mt-4 empty:hidden">
                                        <!-- Los chips se insertarán aquí dinámicamente -->
                                    </div>
                                </div>

                                <!-- Acordeones por Categoría -->
                                <div class="space-y-0 border border-outline-variant/30 dark:border-white/10 rounded-2xl overflow-hidden bg-surface-container-lowest dark:bg-[#0c0c0e]">

                                    <!-- 1. Interior Amenities -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-interior', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">home_pin</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Amenities de Interior</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-interior" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 space-y-8 bg-surface-container-lowest dark:bg-[#0c0c0e]">

                                                    <!-- Sub-sección: Lavandería -->
                                                    <div class="space-y-3">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Lavandería</span>
                                                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="lav-incluido" name="lavarropas-incluido" type="checkbox">
                                                                <label class="terms-label" for="lav-incluido">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_lav_inc"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_lav_inc)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Lavarropas incluido</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="lav-compartida" name="lavanderia-compartida" type="checkbox">
                                                                <label class="terms-label" for="lav-compartida">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_lav_comp"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_lav_comp)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Compartida o en edificio</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="lav-notiene" name="sin-lavanderia" type="checkbox">
                                                                <label class="terms-label" for="lav-notiene">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_lav_notiene"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_lav_notiene)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">No tiene lavandería</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Sub-sección: Calefacción -->
                                                    <div class="space-y-3 pt-4 border-t border-outline-variant/20 dark:border-white/5">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Calefacción</span>
                                                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-4 gap-x-4">
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="calefaccion-central" name="calefaccion-central" type="checkbox">
                                                                <label class="terms-label" for="calefaccion-central">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_cal_cent"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_cal_cent)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Calefacción Central</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="calefaccion-electrica" name="calefaccion-electrica" type="checkbox">
                                                                <label class="terms-label" for="calefaccion-electrica">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_cal_elec"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_cal_elec)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Eléctrica</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="calefaccion-gas" name="calefaccion-gas" type="checkbox">
                                                                <label class="terms-label" for="calefaccion-gas">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_cal_gas"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_cal_gas)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Gas</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="calefaccion-estufa" name="calefaccion-estufa" type="checkbox">
                                                                <label class="terms-label" for="calefaccion-estufa">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_cal_estufa"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_cal_estufa)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Estufa</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Sub-sección: Electrodomésticos -->
                                                    <div class="space-y-3 pt-4 border-t border-outline-variant/20 dark:border-white/5">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Electrodomésticos</span>
                                                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="lavaplatos" name="lavaplatos" type="checkbox">
                                                                <label class="terms-label" for="lavaplatos">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_lavaplatos"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_lavaplatos)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Lavaplatos</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="aire-acondicionado" name="aire-acondicionado" type="checkbox">
                                                                <label class="terms-label" for="aire-acondicionado">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_aire"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_aire)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Aire acondicionado</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="microondas" name="microondas" type="checkbox">
                                                                <label class="terms-label" for="microondas">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_micro"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_micro)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Microondas</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="horno" name="horno" type="checkbox">
                                                                <label class="terms-label" for="horno">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_horno"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_horno)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Horno</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="heladera" name="heladera" type="checkbox">
                                                                <label class="terms-label" for="heladera">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_heladera"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_heladera)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Heladera</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="tv" name="tv" type="checkbox">
                                                                <label class="terms-label" for="tv">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_tv"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_tv)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">TV</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Sub-sección: Tipo de Piso -->
                                                    <div class="space-y-3 pt-4 border-t border-outline-variant/20 dark:border-white/5">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Piso</span>
                                                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4">
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="piso-alfombra" name="piso-alfombra" type="checkbox">
                                                                <label class="terms-label" for="piso-alfombra">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_p_alf"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_p_alf)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Alfombra</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="piso-madera" name="piso-madera" type="checkbox">
                                                                <label class="terms-label" for="piso-madera">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_p_mad"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_p_mad)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">De Madera</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="piso-baldosa" name="piso-baldosa" type="checkbox">
                                                                <label class="terms-label" for="piso-baldosa">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_p_bal"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_p_bal)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Baldosa</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Sub-sección: Otros -->
                                                    <div class="space-y-3 pt-4 border-t border-outline-variant/20 dark:border-white/5">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Otros</span>
                                                        <div class="checkbox-wrapper w-max">
                                                            <input id="amoblado" name="amoblado" type="checkbox">
                                                            <label class="terms-label" for="amoblado">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                    <mask fill="white" id="path-1-inside-1_amoblado"><rect height="200" width="200" rx="30"></rect></mask>
                                                                    <rect mask="url(#path-1-inside-1_amoblado)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                    <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                </svg>
                                                                <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Amueblado</span>
                                                            </label>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 2. Property Amenities / Parking -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-property-parking', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">directions_car</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Property Amenities & Parking</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-property-parking" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 space-y-6 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
                                                        <div class="checkbox-wrapper w-max">
                                                            <input id="parking-garaje" name="tiene-garaje" type="checkbox">
                                                            <label class="terms-label" for="parking-garaje">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                    <mask fill="white" id="path-1-inside-1_garaje"><rect height="200" width="200" rx="30"></rect></mask>
                                                                    <rect mask="url(#path-1-inside-1_garaje)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                    <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                </svg>
                                                                <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Tiene garaje</span>
                                                            </label>
                                                        </div>
                                                        <div class="checkbox-wrapper w-max">
                                                            <input id="porton-electrico" name="porton-electrico" type="checkbox">
                                                            <label class="terms-label" for="porton-electrico">
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                    <mask fill="white" id="path-1-inside-1_porton"><rect height="200" width="200" rx="30"></rect></mask>
                                                                    <rect mask="url(#path-1-inside-1_porton)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                    <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                </svg>
                                                                <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Portón Eléctrico</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 3. Outdoor Amenities -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-outdoor', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">deck</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Outdoor Amenities (Exteriores)</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-outdoor" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="balcon" name="balcon" type="checkbox">
                                                        <label class="terms-label" for="balcon">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_balcon"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_balcon)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Balcón</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="pileta" name="pileta" type="checkbox">
                                                        <label class="terms-label" for="pileta">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_pileta"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_pileta)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Pileta</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="terraza" name="terraza" type="checkbox">
                                                        <label class="terms-label" for="terraza">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_terraza"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_terraza)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Terraza</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="patio" name="patio" type="checkbox">
                                                        <label class="terms-label" for="patio">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_patio"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_patio)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Patio</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="parrilla" name="parrilla" type="checkbox">
                                                        <label class="terms-label" for="parrilla">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_parrilla"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_parrilla)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Churrasquera / Parrilla</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="quincho" name="quincho" type="checkbox">
                                                        <label class="terms-label" for="quincho">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_quincho"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_quincho)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Quincho</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 4. Accesibilidad -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-accesibilidad', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">accessible</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Accesibilidad</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-accesibilidad" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="acceso-discapacitados" name="acceso-discapacitados" type="checkbox">
                                                        <label class="terms-label" for="acceso-discapacitados">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_acc_disc"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_acc_disc)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Acceso a discapacitados</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="ascensor" name="ascensor" type="checkbox">
                                                        <label class="terms-label" for="ascensor">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_ascensor"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_ascensor)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Ascensor</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 5. Espacios Compartidos -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-espacios-compartidos', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">groups</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Espacios Compartidos</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-espacios-compartidos" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="sum" name="sum" type="checkbox">
                                                        <label class="terms-label" for="sum">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_sum"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_sum)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">SUM (Sala de Usos Múltiples)</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="gimnasio" name="gimnasio" type="checkbox">
                                                        <label class="terms-label" for="gimnasio">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_gym"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_gym)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Gimnasio</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 6. Seguridad -->
                                    <div class="border-b border-outline-variant/30 dark:border-white/10">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-seguridad', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">shield</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Seguridad</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-seguridad" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-y-4 gap-x-4 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="seg-controlado" name="barrio-acceso-controlado" type="checkbox">
                                                        <label class="terms-label" for="seg-controlado">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_seg_ctrl"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_seg_ctrl)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Barrio con Acceso Controlado</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="seg-semicerrado" name="barrio-semicerrado" type="checkbox">
                                                        <label class="terms-label" for="seg-semicerrado">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_seg_semi"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_seg_semi)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Barrio semicerrado</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="garita-seguridad" name="garita-seguridad" type="checkbox">
                                                        <label class="terms-label" for="garita-seguridad">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_garita"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_garita)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Garita de seguridad</span>
                                                        </label>
                                                    </div>
                                                    <div class="checkbox-wrapper w-max">
                                                        <input id="alarma-comunitaria" name="alarma-comunitaria" type="checkbox">
                                                        <label class="terms-label" for="alarma-comunitaria">
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                <mask fill="white" id="path-1-inside-1_alarma"><rect height="200" width="200" rx="30"></rect></mask>
                                                                <rect mask="url(#path-1-inside-1_alarma)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                            </svg>
                                                            <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Alarma comunitaria</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 7. Orientación y Adicionales -->
                                    <div class="border-b-0">
                                        <div class="p-5 flex justify-between items-center cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors accordion-btn"
                                            onclick="toggleAccordion('content-orientacion-adicionales', this)">
                                            <div class="flex items-center gap-3">
                                                <span class="material-symbols-outlined text-primary dark:text-red-500 text-2xl">explore</span>
                                                <span class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-base md:text-lg">Orientación y Adicionales</span>
                                            </div>
                                            <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6] transition-transform duration-300 transform accordion-icon rotate-180">expand_more</span>
                                        </div>
                                        <div id="content-orientacion-adicionales" class="grid grid-rows-[1fr] transition-[grid-template-rows] duration-300 ease-in-out">
                                            <div class="overflow-hidden">
                                                <div class="p-6 pt-2 space-y-6 bg-surface-container-lowest dark:bg-[#0c0c0e]">
                                                    
                                                    <!-- Orientación -->
                                                    <div class="space-y-3">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Orientación</span>
                                                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-y-4 gap-x-4">
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="ori-norte" name="orientacion-norte" type="checkbox">
                                                                <label class="terms-label" for="ori-norte">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_norte"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_norte)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Norte</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="ori-sur" name="orientacion-sur" type="checkbox">
                                                                <label class="terms-label" for="ori-sur">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_sur"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_sur)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Sur</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="ori-este" name="orientacion-este" type="checkbox">
                                                                <label class="terms-label" for="ori-este">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_este"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_este)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Este</span>
                                                                </label>
                                                            </div>
                                                            <div class="checkbox-wrapper w-max">
                                                                <input id="ori-oeste" name="orientacion-oeste" type="checkbox">
                                                                <label class="terms-label" for="ori-oeste">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                                        <mask fill="white" id="path-1-inside-1_oeste"><rect height="200" width="200" rx="30"></rect></mask>
                                                                        <rect mask="url(#path-1-inside-1_oeste)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                                        <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                                    </svg>
                                                                    <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Oeste</span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Adicionales de Medidas -->
                                                    <div class="space-y-3 pt-4 border-t border-outline-variant/20 dark:border-white/5">
                                                        <span class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Adicionales de Estructura</span>
                                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <!-- Frente del terreno -->
                                                            <div class="space-y-2">
                                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Frente del terreno (m)</label>
                                                                <input type="number" placeholder="0" class="w-full appearance-none bg-surface-container-lowest dark:bg-[#0c0c0e] border border-outline-variant/30 dark:border-white/10 text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-0 hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] focus:bg-surface-container-lowest dark:focus:bg-[#0c0c0e] focus:outline focus:outline-1 focus:outline-primary dark:focus:outline-red-500 transition-colors placeholder:text-secondary/50">
                                                            </div>

                                                            <!-- Largo del terreno -->
                                                            <div class="space-y-2">
                                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Largo del terreno (m)</label>
                                                                <input type="number" placeholder="0" class="w-full appearance-none bg-surface-container-lowest dark:bg-[#0c0c0e] border border-outline-variant/30 dark:border-white/10 text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 font-body text-base focus:ring-0 hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] focus:bg-surface-container-lowest dark:focus:bg-[#0c0c0e] focus:outline focus:outline-1 focus:outline-primary dark:focus:outline-red-500 transition-colors placeholder:text-secondary/50">
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>

                            </form>
                        </div>
                    </div>

                    <!-- Paso 4: Preferencias de Alquiler -->
                    <div id="wizard-step-4-container"
                        class="hidden opacity-0 translate-y-8 scale-95 h-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform origin-top w-full max-w-4xl mx-auto pb-24 md:pb-8">
                        <div
                            class="bg-surface-container-lowest dark:bg-[#0c0c0e] p-6 md:p-8 rounded-2xl border border-outline-variant/30 dark:border-white/5 mb-8">
                            <form id="form-preferencias" class="space-y-8" novalidate>
                                <!-- Card Principal: Políticas de Mascotas -->
                                <div class="bg-surface-container/50 dark:bg-[#141417]/80 rounded-2xl p-6 md:p-8 border border-outline-variant/20 dark:border-white/10 space-y-6">
                                    
                                    <!-- Encabezado con Icono y Toggle Principal -->
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20 dark:border-white/10">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center shrink-0">
                                                <span class="material-symbols-outlined text-2xl">pets</span>
                                            </div>
                                            <div>
                                                <h3 class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Políticas de Mascotas</h3>
                                                <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm">Define las condiciones para inquilinos con animales de compañía</p>
                                            </div>
                                        </div>

                                        <!-- Switch: Permite mascotas -->
                                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input type="checkbox" id="permite-mascotas" class="sr-only peer">
                                            <div class="w-14 h-8 bg-surface-container-high dark:bg-[#282828] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-red-500"></div>
                                            <span class="ml-3 font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1]" id="permite-mascotas-label">No permite</span>
                                        </label>
                                    </div>

                                    <!-- Detalle de Mascotas (Se despliega sólo si permite mascotas) -->
                                    <div id="mascotas-detalles-container" class="space-y-8 hidden transition-all duration-300">
                                        
                                        <!-- Tipos y Cantidades -->
                                        <div class="space-y-4">
                                            <h4 class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Tipos de mascotas permitidas y cantidades máximas</h4>
                                            
                                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <!-- Gato -->
                                                <div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest dark:bg-[#0c0c0e] border border-outline-variant/30 dark:border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6]">cat</span>
                                                        <span class="font-headline font-semibold text-on-background dark:text-[#f1f1f1] text-sm">Gatos</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5">
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-gato'); i.value = Math.max(0, parseInt(i.value||0)-1)"><span class="material-symbols-outlined text-sm">remove</span></button>
                                                        <input type="number" id="cant-gato" class="w-6 text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-sm focus:ring-0" value="0" readonly>
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-gato'); i.value = parseInt(i.value||0)+1"><span class="material-symbols-outlined text-sm">add</span></button>
                                                    </div>
                                                </div>

                                                <!-- Perro Pequeño -->
                                                <div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest dark:bg-[#0c0c0e] border border-outline-variant/30 dark:border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6]">sound_detection_dog_barking</span>
                                                        <span class="font-headline font-semibold text-on-background dark:text-[#f1f1f1] text-sm">Perro Pequeño</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5">
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-perro-pequeno'); i.value = Math.max(0, parseInt(i.value||0)-1)"><span class="material-symbols-outlined text-sm">remove</span></button>
                                                        <input type="number" id="cant-perro-pequeno" class="w-6 text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-sm focus:ring-0" value="0" readonly>
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-perro-pequeno'); i.value = parseInt(i.value||0)+1"><span class="material-symbols-outlined text-sm">add</span></button>
                                                    </div>
                                                </div>

                                                <!-- Perro Grande -->
                                                <div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-lowest dark:bg-[#0c0c0e] border border-outline-variant/30 dark:border-white/5">
                                                    <div class="flex items-center gap-3">
                                                        <span class="material-symbols-outlined text-secondary dark:text-[#c7c6c6]">pets</span>
                                                        <span class="font-headline font-semibold text-on-background dark:text-[#f1f1f1] text-sm">Perro Grande</span>
                                                    </div>
                                                    <div class="flex items-center gap-2 bg-surface-container-high dark:bg-[#282828] p-1 rounded-full border border-outline-variant/30 dark:border-white/5">
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-perro-grande'); i.value = Math.max(0, parseInt(i.value||0)-1)"><span class="material-symbols-outlined text-sm">remove</span></button>
                                                        <input type="number" id="cant-perro-grande" class="w-6 text-center bg-transparent border-none p-0 text-on-background dark:text-[#f1f1f1] font-headline font-bold text-sm focus:ring-0" value="0" readonly>
                                                        <button type="button" class="w-8 h-8 rounded-full flex items-center justify-center text-on-background dark:text-[#f1f1f1] hover:bg-surface-container-lowest dark:hover:bg-[#0c0c0e] transition-colors" onclick="const i = document.getElementById('cant-perro-grande'); i.value = parseInt(i.value||0)+1"><span class="material-symbols-outlined text-sm">add</span></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Negociable Checkbox -->
                                        <div class="checkbox-wrapper w-max">
                                            <input id="mascotas-negociable" name="mascotas-negociable" type="checkbox">
                                            <label class="terms-label" for="mascotas-negociable">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 200 200" class="checkbox-svg">
                                                    <mask fill="white" id="path-1-inside-1_negociable"><rect height="200" width="200" rx="30"></rect></mask>
                                                    <rect mask="url(#path-1-inside-1_negociable)" stroke-width="40" class="checkbox-box" height="200" width="200" rx="30"></rect>
                                                    <path stroke-width="15" d="M52 111.018L76.9867 136L149 64" class="checkbox-tick"></path>
                                                </svg>
                                                <span class="font-body font-normal text-on-background dark:text-[#f1f1f1] text-base whitespace-nowrap ml-3">Negociable (evaluar según el caso del inquilino)</span>
                                            </label>
                                        </div>

                                        <!-- Tarifas y Costos de Mascotas -->
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-outline-variant/20 dark:border-white/10">
                                            
                                            <!-- Tarifa por mascota (depósito) -->
                                            <div class="space-y-2">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Tarifa de ingreso por mascota</label>
                                                <div class="flex bg-surface-container-high dark:bg-[#282828] rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-red-500">
                                                    <div class="bg-surface-container dark:bg-[#1e1e1e] px-4 flex items-center justify-center border-r border-outline-variant/30 dark:border-white/5 text-secondary dark:text-[#c7c6c6] font-body text-sm">$</div>
                                                    <input type="number" id="tarifa-mascota" class="flex-1 appearance-none bg-transparent border-none text-on-background dark:text-[#f1f1f1] h-14 px-4 font-body text-base focus:ring-0 placeholder:text-secondary/50" placeholder="0" value="0">
                                                </div>
                                                <p class="text-[12px] text-secondary dark:text-[#c7c6c6]">($0 si no se cobra depósito adicional)</p>
                                            </div>

                                            <!-- Se puede reembolsar (SÍ / NO) -->
                                            <div class="space-y-2">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">¿Tarifa reembolsable?</label>
                                                <div class="relative">
                                                    <select id="tarifa-reembolsable" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-10 font-body text-base focus:ring-0 cursor-pointer">
                                                        <option value="si" selected>Sí</option>
                                                        <option value="no">No</option>
                                                    </select>
                                                    <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                                </div>
                                            </div>

                                            <!-- Alquiler mensual adicional por mascota -->
                                            <div class="space-y-2">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Alquiler mensual por mascota</label>
                                                <div class="flex bg-surface-container-high dark:bg-[#282828] rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary dark:focus-within:ring-red-500">
                                                    <div class="bg-surface-container dark:bg-[#1e1e1e] px-4 flex items-center justify-center border-r border-outline-variant/30 dark:border-white/5 text-secondary dark:text-[#c7c6c6] font-body text-sm">$</div>
                                                    <input type="number" id="alquiler-mascota" class="flex-1 appearance-none bg-transparent border-none text-on-background dark:text-[#f1f1f1] h-14 px-4 font-body text-base focus:ring-0 placeholder:text-secondary/50" placeholder="0" value="0">
                                                </div>
                                                <p class="text-[12px] text-secondary dark:text-[#c7c6c6]">($0 si no se cobra adicional por mes)</p>
                                            </div>

                                        </div>

                                    </div>

                                </div>

                                <!-- Card 2: Condiciones del Contrato -->
                                <div class="bg-surface-container/50 dark:bg-[#141417]/80 rounded-2xl p-6 md:p-8 border border-outline-variant/20 dark:border-white/10 space-y-6">
                                    <div class="flex items-center gap-4 pb-6 border-b border-outline-variant/20 dark:border-white/10">
                                        <div class="w-12 h-12 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center shrink-0">
                                            <span class="material-symbols-outlined text-2xl">gavel</span>
                                        </div>
                                        <div>
                                            <h3 class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Condiciones del Contrato</h3>
                                            <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm">Establecé la duración del alquiler y los ajustes del precio</p>
                                        </div>
                                    </div>

                                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <!-- Duración del contrato -->
                                        <div class="space-y-2">
                                            <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Duración del contrato</label>
                                            <div class="relative">
                                                <select id="duracion-contrato" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-10 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                    <option value="24-meses" selected>24 meses (Recomendado)</option>
                                                    <option value="12-meses">12 meses</option>
                                                    <option value="36-meses">36 meses</option>
                                                    <option value="temporal-3-6">Temporal (3 a 6 meses)</option>
                                                    <option value="negociable">Negociable</option>
                                                </select>
                                                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                            </div>
                                        </div>

                                        <!-- Índice de actualización -->
                                        <div class="space-y-2">
                                            <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Índice de actualización</label>
                                            <div class="relative">
                                                <select id="indice-actualizacion" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-10 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                    <option value="ipc" selected>IPC (Precios al Consumidor)</option>
                                                    <option value="icl">ICL (Índice Contratos Locación)</option>
                                                    <option value="fijo-usd">Fijo en USD (Sin ajuste)</option>
                                                    <option value="acuerdo-fijo">Aumento fijo pactado</option>
                                                    <option value="negociable">Negociable</option>
                                                </select>
                                                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                            </div>
                                        </div>

                                        <!-- Frecuencia de actualización -->
                                        <div class="space-y-2">
                                            <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm">Frecuencia de ajuste</label>
                                            <div class="relative">
                                                <select id="frecuencia-actualizacion" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-14 px-4 pr-10 font-body text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                    <option value="cuatrimestral" selected>Cuatrimestral (Cada 4 meses)</option>
                                                    <option value="trimestral">Trimestral (Cada 3 meses)</option>
                                                    <option value="semestral">Semestral (Cada 6 meses)</option>
                                                    <option value="anual">Anual (Cada 12 meses)</option>
                                                </select>
                                                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Card 3: Agenda de Visitas a la Propiedad (Tours) -->
                                <div class="bg-surface-container/50 dark:bg-[#141417]/80 rounded-2xl p-6 md:p-8 border border-outline-variant/20 dark:border-white/10 space-y-6">
                                    
                                    <!-- Encabezado con Icono y Toggle Principal -->
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-outline-variant/20 dark:border-white/10">
                                        <div class="flex items-center gap-4">
                                            <div class="w-12 h-12 rounded-xl bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center shrink-0">
                                                <span class="material-symbols-outlined text-2xl">calendar_month</span>
                                            </div>
                                            <div>
                                                <h3 class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-lg md:text-xl">Agenda de Visitas Presenciales</h3>
                                                <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm">Permití a los interesados agendar visitas a tu propiedad directamente desde Hábitat</p>
                                            </div>
                                        </div>

                                        <!-- Switch: Usar agenda de visitas -->
                                        <label class="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input type="checkbox" id="usar-agenda-visitas" class="sr-only peer" checked>
                                            <div class="w-14 h-8 bg-surface-container-high dark:bg-[#282828] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary dark:peer-checked:bg-red-500"></div>
                                            <span class="ml-3 font-headline font-bold text-sm text-on-background dark:text-[#f1f1f1]" id="usar-agenda-label">Sí, activar agenda</span>
                                        </label>
                                    </div>

                                    <!-- Detalle de Visitas -->
                                    <div id="visitas-detalles-container" class="space-y-8 transition-all duration-300">
                                        
                                        <!-- Modalidad de Agendamiento -->
                                        <div class="space-y-4">
                                            <h4 class="font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Modalidad de Agendamiento</h4>
                                            
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <!-- Agendar Instantáneamente -->
                                                <label class="cursor-pointer relative block">
                                                    <input type="radio" name="modalidad-visitas" value="instantaneo" class="peer sr-only">
                                                    <div class="p-5 rounded-2xl bg-surface-container-lowest dark:bg-[#0c0c0e] border-2 border-outline-variant/30 dark:border-white/10 peer-checked:border-primary dark:peer-checked:border-red-500 peer-checked:bg-primary/5 dark:peer-checked:bg-red-500/5 transition-all space-y-2 h-full">
                                                        <div class="flex items-center justify-between">
                                                            <div class="flex items-center gap-2 text-primary dark:text-red-500 font-headline font-bold text-base">
                                                                <span class="material-symbols-outlined text-xl">bolt</span>
                                                                Agendar instantáneamente
                                                            </div>
                                                            <span class="material-symbols-outlined text-primary dark:text-red-500 opacity-0 peer-checked:opacity-100 transition-opacity">check_circle</span>
                                                        </div>
                                                        <p class="font-body text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">
                                                            Los inquilinos agendan su visita en tus horarios disponibles de forma automática.
                                                        </p>
                                                    </div>
                                                </label>

                                                <!-- Confirmar para agendar -->
                                                <label class="cursor-pointer relative block">
                                                    <input type="radio" name="modalidad-visitas" value="confirmar" class="peer sr-only" checked>
                                                    <div class="p-5 rounded-2xl bg-surface-container-lowest dark:bg-[#0c0c0e] border-2 border-outline-variant/30 dark:border-white/10 peer-checked:border-primary dark:peer-checked:border-red-500 peer-checked:bg-primary/5 dark:peer-checked:bg-red-500/5 transition-all space-y-2 h-full">
                                                        <div class="flex items-center justify-between">
                                                            <div class="flex items-center gap-2 text-primary dark:text-red-500 font-headline font-bold text-base">
                                                                <span class="material-symbols-outlined text-xl">mark_email_read</span>
                                                                Confirmar para agendar
                                                            </div>
                                                            <span class="material-symbols-outlined text-primary dark:text-red-500 opacity-0 peer-checked:opacity-100 transition-opacity">check_circle</span>
                                                        </div>
                                                        <p class="font-body text-xs text-secondary dark:text-[#c7c6c6] leading-relaxed">
                                                            Recibís una solicitud y aprobás o reprogramás cada visita antes de confirmarla.
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>

                                        <!-- Duración del Tour / Visita y Rangos Horarios -->
                                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-outline-variant/20 dark:border-white/10">
                                            <div class="space-y-2 col-span-1 sm:col-span-2 md:col-span-1">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-xs sm:text-sm">Duración de cada visita</label>
                                                <div class="relative">
                                                    <select id="duracion-visita" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 sm:h-14 px-3.5 sm:px-4 pr-10 font-body text-sm sm:text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                        <option value="15-min">15 minutos</option>
                                                        <option value="30-min" selected>30 minutos (Recomendado)</option>
                                                        <option value="45-min">45 minutos</option>
                                                        <option value="1-hora">1 hora</option>
                                                        <option value="1.5-hora">1 hora y media</option>
                                                        <option value="2-horas">2 horas</option>
                                                    </select>
                                                    <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                                </div>
                                            </div>

                                            <div class="space-y-2">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-xs sm:text-sm">Horario desde</label>
                                                <div class="relative">
                                                    <select id="visitas-hora-desde" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 sm:h-14 px-3.5 sm:px-4 pr-10 font-body text-sm sm:text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                        <option value="08:00">08:00 hs</option>
                                                        <option value="09:00" selected>09:00 hs</option>
                                                        <option value="10:00">10:00 hs</option>
                                                        <option value="11:00">11:00 hs</option>
                                                        <option value="14:00">14:00 hs</option>
                                                        <option value="15:00">15:00 hs</option>
                                                        <option value="16:00">16:00 hs</option>
                                                    </select>
                                                    <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                                </div>
                                            </div>

                                            <div class="space-y-2">
                                                <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-xs sm:text-sm">Horario hasta</label>
                                                <div class="relative">
                                                    <select id="visitas-hora-hasta" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 sm:h-14 px-3.5 sm:px-4 pr-10 font-body text-sm sm:text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 cursor-pointer">
                                                        <option value="13:00">13:00 hs</option>
                                                        <option value="17:00">17:00 hs</option>
                                                        <option value="18:00" selected>18:00 hs</option>
                                                        <option value="19:00">19:00 hs</option>
                                                        <option value="20:00">20:00 hs</option>
                                                    </select>
                                                    <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-secondary dark:text-[#c7c6c6]">expand_more</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Selector de Días Disponibles -->
                                        <div class="space-y-3 pt-2">
                                            <label class="block font-headline font-bold text-xs uppercase tracking-wider text-secondary dark:text-[#a0a0a0]">Días disponibles para mostrar la propiedad</label>
                                            <div class="grid grid-cols-4 sm:grid-cols-7 gap-2" id="dias-visitas-container">
                                                <button type="button" data-dia="lun" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-xs sm:text-sm bg-primary text-white dark:bg-red-500 border border-primary dark:border-red-500 shadow-sm transition-all active-dia">Lun</button>
                                                <button type="button" data-dia="mar" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-primary text-white dark:bg-red-500 border border-primary dark:border-red-500 shadow-sm transition-all active-dia">Mar</button>
                                                <button type="button" data-dia="mie" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-primary text-white dark:bg-red-500 border border-primary dark:border-red-500 shadow-sm transition-all active-dia">Mié</button>
                                                <button type="button" data-dia="jue" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-primary text-white dark:bg-red-500 border border-primary dark:border-red-500 shadow-sm transition-all active-dia">Jue</button>
                                                <button type="button" data-dia="vie" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-primary text-white dark:bg-red-500 border border-primary dark:border-red-500 shadow-sm transition-all active-dia">Vie</button>
                                                <button type="button" data-dia="sab" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-surface-container-high dark:bg-[#282828] text-secondary dark:text-[#c7c6c6] border border-outline-variant/30 dark:border-white/5 hover:border-primary transition-all">Sáb</button>
                                                <button type="button" data-dia="dom" class="dia-visita-btn w-full py-2.5 sm:py-3 rounded-xl font-headline font-bold text-sm bg-surface-container-high dark:bg-[#282828] text-secondary dark:text-[#c7c6c6] border border-outline-variant/30 dark:border-white/5 hover:border-primary transition-all">Dom</button>
                                            </div>
                                        </div>

                                        <!-- Indicaciones Especiales / Notas -->
                                        <div class="space-y-2 pt-2">
                                            <label class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-xs sm:text-sm">Indicaciones para el visitante (Opcional)</label>
                                            <input type="text" id="notas-visitas" class="w-full appearance-none bg-surface-container-high dark:bg-[#282828] border-none text-on-background dark:text-[#f1f1f1] rounded-xl h-12 sm:h-14 px-3.5 sm:px-4 font-body text-sm sm:text-base focus:ring-1 focus:ring-primary dark:focus:ring-red-500 placeholder:text-secondary/50" placeholder="Ej: Tocar timbre 4B o avisar 10 min antes por WhatsApp">
                                        </div>

                                    </div>

                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Paso 6: Publicar (Planes) -->
                    <div id="wizard-step-6-container"
                        class="hidden opacity-0 translate-y-8 scale-95 h-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform origin-top w-full max-w-4xl mx-auto pb-24 md:pb-8">
                        <div
                            class="bg-surface/50 dark:bg-[#121212]/50 backdrop-blur-md rounded-3xl p-6 md:p-12 border border-outline-variant/30 dark:border-white/5 shadow-2xl">
                            <form id="form-planes" class="space-y-12">

                                <!-- Plan Seleccionado (Gratis) -->
                                <div class="space-y-4">
                                    <h3 class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">
                                        Seleccioná el plan con el que querés publicar</h3>
                                    <label
                                        class="block font-headline font-medium text-on-background dark:text-[#f1f1f1] text-sm mt-4">Planes
                                        disponibles</label>

                                    <div
                                        class="border border-outline-variant/30 dark:border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest dark:bg-[#0c0c0e] relative overflow-hidden cursor-pointer hover:bg-surface-container-high/30 dark:hover:bg-[#1e1e1e] transition-colors border-l-4 border-l-primary dark:border-l-red-500">
                                        <div class="flex items-center gap-4">
                                            <div
                                                class="w-5 h-5 rounded-full border-2 border-primary dark:border-red-500 flex items-center justify-center">
                                                <div class="w-2.5 h-2.5 rounded-full bg-primary dark:bg-red-500"></div>
                                            </div>
                                            <span
                                                class="font-headline font-bold text-primary dark:text-red-500 text-lg">Gratis</span>
                                        </div>
                                        <span
                                            class="font-body text-on-background dark:text-[#f1f1f1] text-sm">Visibilidad
                                            baja</span>
                                        <span
                                            class="font-body text-secondary dark:text-[#c7c6c6] text-sm font-medium">Cantidad
                                            disponible: 1</span>
                                    </div>
                                </div>

                                <!-- Otros Planes -->
                                <div class="space-y-6 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                                    <div>
                                        <h3
                                            class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-xl">
                                            Más planes para vos</h3>
                                        <p class="font-body text-secondary dark:text-[#c7c6c6] text-sm mt-1">Obtené y
                                            publicá con cualquiera de estos planes.</p>
                                    </div>

                                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <!-- Card: Superdestacado -->
                                        <div
                                            class="border border-outline-variant/30 dark:border-white/10 rounded-2xl p-6 flex flex-col bg-surface-container-lowest dark:bg-[#0c0c0e] hover:shadow-lg transition-shadow relative">
                                            <span
                                                class="font-headline font-bold text-indigo-600 dark:text-indigo-400 text-sm mb-4">1
                                                Superdestacado</span>
                                            <div class="flex items-end gap-1 mb-6">
                                                <span
                                                    class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-3xl">$
                                                    48.130,17</span>
                                                <span
                                                    class="font-body text-secondary dark:text-[#c7c6c6] text-sm pb-1">/
                                                    mes*</span>
                                            </div>
                                            <ul class="space-y-3 mb-8 flex-1">
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Incluye 1 aviso con máxima exposición en los listados
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Genera mayor cantidad de interesados
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Plan con renovación automática
                                                </li>
                                            </ul>
                                            <div class="mb-6">
                                                <p
                                                    class="font-headline font-bold text-xs text-on-background dark:text-[#f1f1f1]">
                                                    * Precio sin impuestos:</p>
                                                <p
                                                    class="font-headline font-bold text-xs text-secondary dark:text-[#c7c6c6]">
                                                    $ 39.777,00</p>
                                            </div>
                                            <button type="button"
                                                class="w-full py-3 rounded-xl font-headline font-bold text-on-primary dark:text-[#ffffff] bg-primary dark:bg-[#A13333] hover:opacity-90 transition-opacity">
                                                Comprar
                                            </button>
                                        </div>

                                        <!-- Card: Destacado -->
                                        <div
                                            class="border border-outline-variant/30 dark:border-white/10 rounded-2xl p-6 flex flex-col bg-surface-container-lowest dark:bg-[#0c0c0e] hover:shadow-lg transition-shadow relative">
                                            <span
                                                class="font-headline font-bold text-emerald-600 dark:text-emerald-400 text-sm mb-4">1
                                                Destacado</span>
                                            <div class="flex items-end gap-1 mb-6">
                                                <span
                                                    class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-3xl">$
                                                    30.080,60</span>
                                                <span
                                                    class="font-body text-secondary dark:text-[#c7c6c6] text-sm pb-1">/
                                                    mes*</span>
                                            </div>
                                            <ul class="space-y-3 mb-8 flex-1">
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Incluye 1 aviso con visibilidad destacada en los listados
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Genera mayor cantidad de interesados
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Plan con renovación automática
                                                </li>
                                            </ul>
                                            <div class="mb-6">
                                                <p
                                                    class="font-headline font-bold text-xs text-on-background dark:text-[#f1f1f1]">
                                                    * Precio sin impuestos:</p>
                                                <p
                                                    class="font-headline font-bold text-xs text-secondary dark:text-[#c7c6c6]">
                                                    $ 24.860,00</p>
                                            </div>
                                            <button type="button"
                                                class="w-full py-3 rounded-xl font-headline font-bold text-on-primary dark:text-[#ffffff] bg-primary dark:bg-[#A13333] hover:opacity-90 transition-opacity">
                                                Comprar
                                            </button>
                                        </div>

                                        <!-- Card: Simple -->
                                        <div
                                            class="border border-outline-variant/30 dark:border-white/10 rounded-2xl p-6 flex flex-col bg-surface-container-lowest dark:bg-[#0c0c0e] hover:shadow-lg transition-shadow relative mt-4 lg:mt-0">
                                            <div
                                                class="absolute -top-4 right-6 bg-surface-container-high dark:bg-[#282828] text-on-background dark:text-[#f1f1f1] text-xs font-bold px-3 py-1 rounded-full border border-outline-variant/30 dark:border-white/10">
                                                Solo Alquiler</div>
                                            <span
                                                class="font-headline font-bold text-orange-500 dark:text-orange-400 text-sm mb-4">1
                                                Simple</span>
                                            <div class="flex items-end gap-1 mb-6">
                                                <span
                                                    class="font-headline font-bold text-on-background dark:text-[#f1f1f1] text-3xl">$
                                                    13.879,91</span>
                                                <span
                                                    class="font-body text-secondary dark:text-[#c7c6c6] text-sm pb-1">/
                                                    mes*</span>
                                            </div>
                                            <ul class="space-y-3 mb-8 flex-1">
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Incluye 1 aviso con visibilidad estándar
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Genera moderada cantidad de interesados
                                                </li>
                                                <li
                                                    class="flex items-start gap-2 font-body text-sm text-on-background dark:text-[#f1f1f1]">
                                                    <span
                                                        class="material-symbols-outlined text-green-500 text-[18px]">check</span>
                                                    Plan con renovación automática
                                                </li>
                                            </ul>
                                            <div class="mb-6">
                                                <p
                                                    class="font-headline font-bold text-xs text-on-background dark:text-[#f1f1f1]">
                                                    * Precio sin impuestos:</p>
                                                <p
                                                    class="font-headline font-bold text-xs text-secondary dark:text-[#c7c6c6]">
                                                    $ 11.471,00</p>
                                            </div>
                                            <button type="button"
                                                class="w-full py-3 rounded-xl font-headline font-bold text-on-primary dark:text-[#ffffff] bg-primary dark:bg-[#A13333] hover:opacity-90 transition-opacity">
                                                Comprar
                                            </button>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>
                    </div>

                    <!-- Action Buttons (Desktop/Tablet Only) -->
                    <div id="desktop-action-buttons"
                        class="flex-row justify-between items-center gap-4 mt-12 pt-8 border-t border-outline-variant/30 dark:border-white/5">
                        <button type="button" id="btn-back-desktop"
                            class="px-6 py-4 rounded-xl font-headline font-bold text-secondary dark:text-[#c7c6c6] bg-transparent hover:bg-surface-container transition-colors flex items-center gap-2"
                            onclick="document.getElementById('btn-back-from-publish').click()">
                            <span class="material-symbols-outlined" id="btn-back-desktop-icon">close</span>
                            <span id="btn-back-desktop-text">Cancelar</span>
                        </button>
                        <div class="flex flex-row gap-4">
                            <button type="button"
                                class="px-8 py-4 rounded-xl font-headline font-bold text-primary dark:text-red-500 bg-transparent border border-outline-variant/30 dark:border-white/5 hover:bg-surface-container transition-colors">
                                Guardar y salir
                            </button>
                            <button type="submit" form="form-principales"
                                class="px-8 py-4 rounded-[1.5rem] font-headline font-bold text-on-primary dark:text-[#ffffff] hover:opacity-90 transition-opacity shadow-[0_12px_40px_0_rgba(0,0,0,0.4)] bg-primary dark:bg-[#A13333]">
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
        </div>
        </main>
        </div>
        <!-- BottomNavBar (Mobile Only) -->
        <nav
            class="md:hidden fixed bottom-0 left-0 w-full flex justify-between items-center h-20 px-4 pb-safe bg-surface/90 dark:bg-zinc-950/90 backdrop-blur-md z-50 border-t border-outline-variant/30 dark:border-white/5 shadow-none pb-[env(safe-area-inset-bottom)]">
            <button id="btn-back-mobile"
                class="flex flex-col items-center justify-center text-secondary dark:text-[#c7c6c6] active:text-on-background dark:active:text-white transition-colors active:scale-90 shrink-0 min-w-[4rem]">
                <span class="material-symbols-outlined text-[22px]">arrow_back</span>
                <span class="font-inter text-[10px] font-medium mt-1">Atrás</span>
            </button>
            <button
                class="flex flex-col items-center justify-center text-secondary dark:text-[#c7c6c6] active:text-on-background dark:active:text-white transition-colors active:scale-90 shrink-0 min-w-[5rem]">
                <span class="material-symbols-outlined text-[22px]">save</span>
                <span class="font-inter text-[10px] font-medium mt-1 leading-tight text-center">Guardar<br>y
                    salir</span>
            </button>
            <button type="submit" form="form-principales"
                class="flex items-center justify-center bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] rounded-xl px-10 py-3.5 active:scale-95 transition-all shadow-lg font-headline font-bold text-sm flex-1 max-w-[12rem] ml-2">
                Continuar
            </button>
        </nav>


        </div>
        </div>
    </section>`;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
})();