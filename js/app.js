/**
 * Main Application Logic
 */

const App = {
    state: {
        currentUser: null,
        currentView: 'home-view'
    },

    init: async () => {
        try {
            App.checkAuth();
            App.setupTheme();
            App.setupEventListeners();
            
            // Load marketplace public listings
            loadMarketplaceListings();
            
            // Check if user is logged in
            const user = await DataManager.getCurrentUser();
            if (user) {
                App.showMainApp(user);
            } else {
                App.showLogin();
            }
        } catch (error) {
            console.error("Initialization error:", error);
        }
    },

    checkAuth: async () => {
         const user = await DataManager.getCurrentUser();
         if (!user && !document.getElementById('login-view').classList.contains('hidden')) {
             // Stay on login
         } else if (!user) {
             App.showLogin();
         }
    },

    setupTheme: () => {
        const themeSwitches = document.querySelectorAll('.theme-switch__checkbox');
        const mobileThemeBtn = document.getElementById('mobile-theme-toggle'); 
        
        const currentTheme = localStorage.getItem('theme') || 'light';
        
        // Apply initial theme
        App.setTheme(currentTheme);

        // Listeners for Switch Toggles (Desktop/Headers)
        themeSwitches.forEach(sw => {
            sw.addEventListener('change', (e) => {
                const newTheme = e.target.checked ? 'dark' : 'light';
                App.setTheme(newTheme);
            });
        });

        // Listener for Mobile Menu Button
        if (mobileThemeBtn) {
            mobileThemeBtn.addEventListener('click', () => {
                App.toggleTheme();
            });
        }
    },

    setTheme: (theme) => {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.classList.remove('dark');
        }
        
        localStorage.setItem('theme', theme);
        
        // Sync all checkboxes
        const isDark = theme === 'dark';
        document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
            cb.checked = isDark;
        });

        App.updateThemeIcons();
    },

    toggleTheme: () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        App.setTheme(newTheme);
    },

    updateThemeIcons: () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const iconName = isDark ? 'light_mode' : 'dark_mode';
        const text = isDark ? 'Modo Claro' : 'Modo Oscuro';
        
        // Update menu item text/icon
        const mobileBtn = document.getElementById('mobile-theme-toggle');
        if (mobileBtn) {
            mobileBtn.innerHTML = `<span class="material-symbols-rounded">${iconName}</span> ${text}`;
        }
    },

    setupEventListeners: () => {
        // Landing Marketplace Navigation
        const landingMarketplaceView = document.getElementById('landing-marketplace-view');
        const landingPropietariosView = document.getElementById('landing-propietarios-view');
        const btnPropietariosMarketplace = document.getElementById('btn-propietarios-marketplace');
        const btnInquilinoMarketplace = document.getElementById('btn-inquilino-marketplace');

        if (btnPropietariosMarketplace && landingMarketplaceView && landingPropietariosView) {
            btnPropietariosMarketplace.addEventListener('click', (e) => {
                e.preventDefault();
                landingMarketplaceView.classList.add('hidden');
                landingPropietariosView.classList.remove('hidden');
                window.scrollTo(0, 0);
            });
        }

        if (btnInquilinoMarketplace && landingMarketplaceView && landingPropietariosView) {
            btnInquilinoMarketplace.addEventListener('click', (e) => {
                e.preventDefault();
                landingPropietariosView.classList.add('hidden');
                landingMarketplaceView.classList.remove('hidden');
                window.scrollTo(0, 0);
            });
        }

        const btnAdministrar = document.getElementById('btn-administrar');
        if (btnAdministrar) {
            btnAdministrar.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('landing-marketplace-view').classList.add('hidden');
                document.getElementById('landing-propietarios-view')?.classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
            });
        }

        const openPublishMarketplace = async (e) => {
            if (e) e.preventDefault();
            // Check if user is authenticated before opening wizard
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                sessionStorage.setItem('postLoginRedirect', 'publish');
                document.getElementById('landing-marketplace-view').classList.add('hidden');
                document.getElementById('landing-propietarios-view')?.classList.add('hidden');
                document.getElementById('main-layout').classList.add('hidden');
                document.getElementById('login-view').classList.remove('hidden');
                return;
            }
            window.currentWizardStep = 1;
            document.getElementById('landing-marketplace-view').classList.add('hidden');
            document.getElementById('landing-propietarios-view')?.classList.add('hidden');
            const appElem = document.getElementById('app');
            if(appElem) appElem.classList.add('hidden');
            const publishElem = document.getElementById('publish-property-view');
            if(publishElem) {
                publishElem.classList.remove('hidden');
                window.scrollTo(0, 0);
            }
        };

        const btnPublicarMarketplace = document.getElementById('btn-publicar-marketplace');
        if (btnPublicarMarketplace) {
            btnPublicarMarketplace.addEventListener('click', openPublishMarketplace);
        }

        const btnPublicarPropietariosHero = document.getElementById('btn-publicar-propietarios-hero');
        if (btnPublicarPropietariosHero) {
            btnPublicarPropietariosHero.addEventListener('click', openPublishMarketplace);
        }

        const btnPublicarPropietariosFinal = document.getElementById('btn-publicar-propietarios-final');
        if (btnPublicarPropietariosFinal) {
            btnPublicarPropietariosFinal.addEventListener('click', openPublishMarketplace);
        }

        const btnAdministrarPropietariosLink = document.getElementById('btn-administrar-propietarios-link');
        if (btnAdministrarPropietariosLink && btnAdministrar) {
            btnAdministrarPropietariosLink.addEventListener('click', () => btnAdministrar.click());
        }

        const btnBackFromPublish = document.getElementById('btn-back-from-publish');
        const btnBackMobile = document.getElementById('btn-back-mobile');
        
        const handleBackFromPublish = (e) => {
            e.preventDefault();

            // Cerrar la vista (Cancelar)
            
            // Forzar vuelta al sub-paso 1 (Operación) antes de cerrar para que al reabrir esté limpio
            const stepOperacion = document.getElementById('step-operacion');
            const stepUbicacion = document.getElementById('step-ubicacion');
            const stepCaracteristicas = document.getElementById('step-caracteristicas');
            const tabOperacion = document.getElementById('tab-operacion');
            const tabUbicacion = document.getElementById('tab-ubicacion');
            const tabCaracteristicas = document.getElementById('tab-caracteristicas');
            const pasoSubtitle = document.getElementById('paso-subtitle');
            const publishMainTitle = document.getElementById('publish-main-title');

            if (stepOperacion) stepOperacion.classList.remove('hidden');
            if (stepUbicacion) stepUbicacion.classList.add('hidden');
            if (stepCaracteristicas) stepCaracteristicas.classList.add('hidden');

            if (tabOperacion) tabOperacion.className = 'font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
            if (tabUbicacion) tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
            if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
            
            if (publishMainTitle) publishMainTitle.textContent = '¡Empecemos a crear tu aviso!';
            if (pasoSubtitle) pasoSubtitle.textContent = '¿Qué querés publicar?';

            // Reset forms and continue button bindings
            document.querySelectorAll('button[type="submit"]').forEach(btn => {
                if (btn.hasAttribute('form')) btn.setAttribute('form', 'form-principales');
            });

            const publishElem = document.getElementById('publish-property-view');
            if(publishElem) publishElem.classList.add('hidden');
            
            const landingElem = document.getElementById('landing-marketplace-view');
            if(landingElem) landingElem.classList.remove('hidden');
            
            window.scrollTo(0, 0);
            
            // Reiniciar animaciones de scroll
            if (window.marketplaceObserver) {
                document.querySelectorAll('.animate-on-scroll').forEach(el => {
                    el.classList.remove('is-visible');
                    window.marketplaceObserver.observe(el);
                });
            }
        };

        if (btnBackFromPublish) {
            btnBackFromPublish.addEventListener('click', handleBackFromPublish);
        }
        if (btnBackMobile) {
            btnBackMobile.addEventListener('click', handleBackFromPublish);
        }

        // Form 'Principales' Validation & Submit Interceptor
        const formPrincipales = document.getElementById('form-principales');
        if (formPrincipales) {
            formPrincipales.addEventListener('submit', (e) => {
                e.preventDefault();
                
                let isValid = true;
                const errorTipo = document.getElementById('error-tipo');
                const errorSubtipo = document.getElementById('error-subtipo');
                const selectTipo = document.getElementById('tipo-propiedad');
                const selectSubtipo = document.getElementById('subtipo-propiedad');

                // Reset error visuals
                if (errorTipo) errorTipo.classList.add('hidden');
                if (errorSubtipo) errorSubtipo.classList.add('hidden');

                // Custom validation for 'Tipo de propiedad'
                if (selectTipo && !selectTipo.value) {
                    if (errorTipo) errorTipo.classList.remove('hidden');
                    isValid = false;
                }

                // Custom validation for 'Subtipo de propiedad'
                if (selectSubtipo && selectSubtipo.required && !selectSubtipo.value) {
                    if (errorSubtipo) errorSubtipo.classList.remove('hidden');
                    isValid = false;
                }

                if (isValid) {
                    console.log('¡Datos Principales completos y validados (Custom)! Avanzando al subpaso de Ubicación...');
                    
                    // Manejar DOM para mostrar Ubicación
                    const tabOperacion = document.getElementById('tab-operacion');
                    const tabUbicacion = document.getElementById('tab-ubicacion');
                    const stepOperacion = document.getElementById('step-operacion');
                    const stepUbicacion = document.getElementById('step-ubicacion');
                    const pasoSubtitle = document.getElementById('paso-subtitle');

                    if (tabOperacion && tabUbicacion && stepOperacion && stepUbicacion) {
                        tabOperacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                        tabUbicacion.className = 'font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';

                        stepOperacion.classList.add('hidden');
                        stepUbicacion.classList.remove('hidden');

                        if (window.innerWidth < 768) {
                            tabUbicacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }

                        if(typeof propertyMap !== 'undefined' && propertyMap && typeof google !== 'undefined') {
                            setTimeout(() => {
                                google.maps.event.trigger(propertyMap, 'resize');
                                propertyMap.setCenter({ lat: -32.898684, lng: -68.847522 });
                            }, 50);
                        }

                        if(pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';

                        // Mover los botones "Continuar" para que apunten al nuevo formulario
                        document.querySelectorAll('button[form="form-principales"]').forEach(btn => {
                            btn.setAttribute('form', 'form-ubicacion');
                        });
                        
                        // Hacer que "Operación" sea clickeable para volver
                        tabOperacion.onclick = (event) => {
                            event.preventDefault();
                            tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                            tabOperacion.className = 'font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                            stepUbicacion.classList.add('hidden');
                            stepOperacion.classList.remove('hidden');

                            if (window.innerWidth < 768) {
                                tabOperacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }

                            if(pasoSubtitle) pasoSubtitle.textContent = '¿Qué querés publicar?';
                            document.querySelectorAll('button[form="form-ubicacion"]').forEach(btn => {
                                btn.setAttribute('form', 'form-principales');
                            });
                            

                        }
                        

                    }
                }
            });
        }

        // Dependent Dropdowns Logic for Property Publishing
        const selectTipoPropiedad = document.getElementById('tipo-propiedad');
        const selectSubtipoPropiedad = document.getElementById('subtipo-propiedad');

        if (selectTipoPropiedad && selectSubtipoPropiedad) {
            const subtiposConfig = {
                departamento: [
                    { value: 'apartaestudio', label: 'Apartaestudio' },
                    { value: 'duplex', label: 'Dúplex' },
                    { value: 'estandar', label: 'Estándar' },
                    { value: 'loft', label: 'Loft' },
                    { value: 'monoambiente', label: 'Monoambiente' },
                    { value: 'penthouse', label: 'Penthouse' },
                    { value: 'piso', label: 'Piso' },
                    { value: 'semipiso', label: 'Semipiso' },
                    { value: 'triplex', label: 'Tríplex' }
                ],
                casa: [
                    { value: 'barrio-acceso-controlado', label: 'Barrio con acceso controlado' },
                    { value: 'bungalow', label: 'Bungalow' },
                    { value: 'cabana', label: 'Cabaña' },
                    { value: 'casa', label: 'Casa' },
                    { value: 'casa-de-playa', label: 'Casa de playa' },
                    { value: 'chalet', label: 'Chalet' },
                    { value: 'condominio', label: 'Condominio' },
                    { value: 'duplex', label: 'Dúplex' },
                    { value: 'ph', label: 'PH' },
                    { value: 'prefabricada', label: 'Prefabricada' },
                    { value: 'triplex', label: 'Tríplex' }
                ]
            };

            selectTipoPropiedad.addEventListener('change', (e) => {
                const tipo = e.target.value;
                
                // Clear existing subtipos but keep the default disabled placeholder
                selectSubtipoPropiedad.innerHTML = '<option disabled selected value="">Selecciona un subtipo (opcional)</option>';

                if (tipo && subtiposConfig[tipo]) {
                    // Unlock the field, make it required, and populate the respective options
                    selectSubtipoPropiedad.disabled = false;
                    selectSubtipoPropiedad.required = true;
                    subtiposConfig[tipo].forEach(sub => {
                        const option = document.createElement('option');
                        option.value = sub.value;
                        option.textContent = sub.label;
                        selectSubtipoPropiedad.appendChild(option);
                    });
                } else {
                    // Lock the field, make it not required
                    selectSubtipoPropiedad.disabled = true;
                    selectSubtipoPropiedad.required = false;
                }

                // Remove lingering custom errors if user modifies selections
                const errorTipo = document.getElementById('error-tipo');
                const errorSubtipo = document.getElementById('error-subtipo');
                if (errorTipo) errorTipo.classList.add('hidden');
                if (errorSubtipo) errorSubtipo.classList.add('hidden');
            });
        }

        // Form 'Ubicación' Validation & Submit Interceptor
        const formUbicacion = document.getElementById('form-ubicacion');
        if (formUbicacion) {
            formUbicacion.addEventListener('submit', (e) => {
                e.preventDefault();
                let isValid = true;
                
                const calle = document.getElementById('calle-altura');
                const prov = document.getElementById('provincia');
                const ciudad = document.getElementById('ciudad');
                const errCalle = document.getElementById('error-calle');
                const errProv = document.getElementById('error-provincia');
                const errCiudad = document.getElementById('error-ciudad');
                
                if(errCalle) errCalle.classList.add('hidden');
                if(errProv) errProv.classList.add('hidden');
                if(errCiudad) errCiudad.classList.add('hidden');
                
                if(calle && !calle.value) { if(errCalle) errCalle.classList.remove('hidden'); isValid = false; }
                if(prov && !prov.value) { if(errProv) errProv.classList.remove('hidden'); isValid = false; }
                if(ciudad && ciudad.required && !ciudad.value) { if(errCiudad) errCiudad.classList.remove('hidden'); isValid = false; }
                
                if(isValid) {
                    console.log('¡Datos Ubicación completos y validados! Transicionando a Características...');
                    
                    const tabUbicacion = document.getElementById('tab-ubicacion');
                    const tabCaracteristicas = document.getElementById('tab-caracteristicas');
                    const stepUbicacion = document.getElementById('step-ubicacion');
                    const stepCaracteristicas = document.getElementById('step-caracteristicas');
                    const pasoSubtitle = document.getElementById('paso-subtitle');

                    if (tabUbicacion && tabCaracteristicas && stepUbicacion && stepCaracteristicas) {
                        tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                        tabCaracteristicas.className = 'font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';

                        stepUbicacion.classList.add('hidden');
                        stepCaracteristicas.classList.remove('hidden');

                        if (window.innerWidth < 768) {
                            tabCaracteristicas.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }

                        if(pasoSubtitle) pasoSubtitle.textContent = 'Detalles de tu propiedad';

                        document.querySelectorAll('button[form="form-ubicacion"]').forEach(btn => {
                            btn.setAttribute('form', 'form-caracteristicas');
                        });
                        
                        // Hacer que "Ubicación" sea clickeable para volver
                        tabUbicacion.onclick = (event) => {
                            event.preventDefault();
                            tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                            tabUbicacion.className = 'font-headline font-bold text-primary dark:text-red-500 border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                            stepCaracteristicas.classList.add('hidden');
                            stepUbicacion.classList.remove('hidden');

                            if (window.innerWidth < 768) {
                                tabUbicacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }

                            if(pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';
                            document.querySelectorAll('button[form="form-caracteristicas"]').forEach(btn => {
                                btn.setAttribute('form', 'form-ubicacion');
                            });
                            

                        }
                    }
                }
            });
        }
        
        // Form 'Características' Validation & Submit Interceptor
        const formCaracteristicas = document.getElementById('form-caracteristicas');
        if (formCaracteristicas) {
            formCaracteristicas.addEventListener('submit', (e) => {
                e.preventDefault();
                let isValid = true;
                
                const supCubierta = document.getElementById('sup-cubierta');
                const supTotal = document.getElementById('sup-total');
                const precio = document.getElementById('precio');
                const titulo = document.getElementById('titulo-aviso');
                const descripcion = document.getElementById('descripcion-aviso');
                
                const errSupCubierta = document.getElementById('error-sup-cubierta');
                const errSupTotal = document.getElementById('error-sup-total');
                const errPrecio = document.getElementById('error-precio');
                const errTitulo = document.getElementById('error-titulo');
                const errDescripcion = document.getElementById('error-descripcion');
                
                if(errSupCubierta) errSupCubierta.classList.add('hidden');
                if(errSupTotal) errSupTotal.classList.add('hidden');
                if(errPrecio) errPrecio.classList.add('hidden');
                if(errTitulo) errTitulo.classList.add('hidden');
                if(errDescripcion) errDescripcion.classList.add('hidden');
                
                if(supCubierta && !supCubierta.value) { if(errSupCubierta) errSupCubierta.classList.remove('hidden'); isValid = false; }
                if(supTotal && !supTotal.value) { if(errSupTotal) errSupTotal.classList.remove('hidden'); isValid = false; }
                if(precio && !precio.value) { if(errPrecio) errPrecio.classList.remove('hidden'); isValid = false; }
                if(titulo && !titulo.value) { if(errTitulo) errTitulo.classList.remove('hidden'); isValid = false; }
                if(descripcion && !descripcion.value) { if(errDescripcion) errDescripcion.classList.remove('hidden'); isValid = false; }
                
                if(isValid) {
                    console.log('¡Datos Características completos y validados! Transicionando al paso 2: Multimedia...');
                    
                    const step1Container = document.getElementById('wizard-step-1-container');
                    const step2Container = document.getElementById('wizard-step-2-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');
                    
                    // Fade out title and subtitle
                    if(title) title.style.opacity = '0';
                    if(subtitle) subtitle.style.opacity = '0';
                    
                    // Hide step 1 with animation
                    if(step1Container) {
                        step1Container.classList.remove('opacity-100', 'scale-100');
                        step1Container.classList.add('opacity-0', 'scale-95');
                    }
                    
                    setTimeout(() => {
                        if(step1Container) {
                            step1Container.classList.add('hidden');
                            step1Container.style.height = '0';
                        }
                        
                        // Update Progress Indicator
                        const pStep1 = document.getElementById('progress-step-1');
                        const pStep2 = document.getElementById('progress-step-2');
                        
                        if(pStep1) {
                            pStep1.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-red-500/20">
                                    <span class="material-symbols-outlined text-[18px]">check</span>
                                </div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base hidden sm:block">Principales</span>
                            `;
                        }
                        
                        if(pStep2) {
                            pStep2.classList.remove('opacity-50');
                            pStep2.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">2</div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base">Multimedia</span>
                            `;
                        }
                        
                        const pLine1 = document.getElementById('progress-line-1');
                        if(pLine1) {
                            pLine1.classList.remove('border-surface-dim', 'dark:border-[#1e1e1e]');
                            pLine1.classList.add('border-primary', 'dark:border-red-500');
                        }
                        
                        if(step2Container) {
                            // Show Step 2
                            step2Container.classList.remove('hidden');
                            
                            // Update titles
                            if(title) title.textContent = 'Agregá fotos y videos';
                            if(subtitle) subtitle.textContent = 'Mostrá lo mejor de tu propiedad';
                            
                            // Trigger reflow
                            void step2Container.offsetWidth;
                            
                            // Fade in Step 2 and titles
                            if(title) title.style.opacity = '1';
                            if(subtitle) subtitle.style.opacity = '1';
                            
                            step2Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step2Container.style.height = ''; // Limpiar inline style
                            
                            // Scroll up if necessary
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            
                            // Change action buttons text/behavior if needed
                            const continueBtnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                            const continueBtnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');
                            
                            if (continueBtnDesk) {
                                continueBtnDesk.textContent = 'Continuar';
                                continueBtnDesk.setAttribute('form', 'form-multimedia');
                            }
                            if (continueBtnMob) {
                                continueBtnMob.textContent = 'Continuar';
                                continueBtnMob.setAttribute('form', 'form-multimedia');
                            }
                            
                            // Set global state
                            window.currentWizardStep = 2;
                        }
                            
                    }, 400); // 400ms is close to the 500ms duration but slightly less to feel snappy
                }
            });
        }
                      // --- Image Upload Logic ---
        const fotosDropzone = document.getElementById('fotos-dropzone');
        const fotosInput = document.getElementById('fotos-input');
        const fotosPreviewContainer = document.getElementById('fotos-preview-container');
        const fotosErrorMsg = document.getElementById('fotos-error-msg');
        window.selectedPropertyPhotos = [];

        if (fotosDropzone && fotosInput && fotosPreviewContainer) {
            fotosDropzone.addEventListener('click', () => {
                fotosInput.click();
            });

            fotosInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    const imageFiles = files.filter(f => f.type.startsWith('image/'));
                    
                    const cropAndOptimizeImage1to1 = (file) => {
                        return new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = function(ev) {
                                const img = new Image();
                                img.onload = function() {
                                    const size = Math.min(img.width, img.height);
                                    const sx = (img.width - size) / 2;
                                    const sy = (img.height - size) / 2;
                                    
                                    const MAX_SIZE = 1920;
                                    const targetSize = Math.min(size, MAX_SIZE);
                                    
                                    const canvas = document.createElement('canvas');
                                    canvas.width = targetSize;
                                    canvas.height = targetSize;
                                    const ctx = canvas.getContext('2d');
                                    ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
                                    
                                    canvas.toBlob((blob) => { resolve(blob); }, 'image/webp', 0.8);
                                };
                                img.src = ev.target.result;
                            };
                            reader.readAsDataURL(file);
                        });
                    };

                    const processedBlobs = await Promise.all(imageFiles.map(cropAndOptimizeImage1to1));
                    window.selectedPropertyPhotos = [...window.selectedPropertyPhotos, ...processedBlobs];
                    
                    if (window.selectedPropertyPhotos.length > 50) {
                        window.selectedPropertyPhotos = window.selectedPropertyPhotos.slice(0, 50);
                    }
                    
                    renderPhotoPreviews();
                }
            });

            function renderPhotoPreviews() {
                fotosPreviewContainer.innerHTML = '';
                if (window.selectedPropertyPhotos.length > 0) {
                    fotosPreviewContainer.classList.remove('hidden');
                } else {
                    fotosPreviewContainer.classList.add('hidden');
                }

                window.selectedPropertyPhotos.forEach((blob, index) => {
                    const url = URL.createObjectURL(blob);
                    const div = document.createElement('div');
                    div.className = 'relative aspect-square rounded-xl overflow-hidden group border border-outline-variant/30 dark:border-white/10';
                    div.innerHTML = `
                        <img src="${url}" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" class="text-white hover:text-red-500 transition-colors delete-photo-btn" data-index="${index}">
                                <span class="material-symbols-outlined text-3xl">delete</span>
                            </button>
                        </div>
                    `;
                    fotosPreviewContainer.appendChild(div);

                    div.querySelector('.delete-photo-btn').addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        window.selectedPropertyPhotos.splice(index, 1);
                        renderPhotoPreviews();
                    });
                });
            }
        }

        // Form 'Multimedia' Submit Interceptor (Transition to Step 3)
        const formMultimedia = document.getElementById('form-multimedia');
        if (formMultimedia) {
            formMultimedia.addEventListener('submit', (e) => {
                e.preventDefault();
                
                let isValid = true;
                
                const photoCount = window.selectedPropertyPhotos ? window.selectedPropertyPhotos.length : 0;
                if (photoCount < 5 || photoCount > 50) {
                    isValid = false;
                    if (fotosErrorMsg) {
                        fotosErrorMsg.textContent = `Debes cargar entre 5 y 50 fotos. Actualmente tienes ${photoCount}.`;
                        fotosErrorMsg.classList.remove('hidden');
                    }
                } else {
                    if (fotosErrorMsg) fotosErrorMsg.classList.add('hidden');
                }
                
                if(isValid) {
                    console.log('¡Datos Multimedia completos! Transicionando al paso 3: Extras...');
                    
                    const step2Container = document.getElementById('wizard-step-2-container');
                    const step3Container = document.getElementById('wizard-step-3-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');
                    
                    // Fade out title and subtitle
                    if(title) title.style.opacity = '0';
                    if(subtitle) subtitle.style.opacity = '0';
                    
                    // Hide step 2 with animation
                    if(step2Container) {
                        step2Container.classList.remove('opacity-100', 'scale-100');
                        step2Container.classList.add('opacity-0', 'scale-95');
                    }
                    
                    setTimeout(() => {
                        if(step2Container) {
                            step2Container.classList.add('hidden');
                            step2Container.style.height = '0';
                        }
                        
                        // Update Progress Indicator
                        const pStep2 = document.getElementById('progress-step-2');
                        const pStep3 = document.getElementById('progress-step-3');
                        const pLine2 = document.getElementById('progress-line-2');
                        
                        if(pStep2) {
                            pStep2.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-red-500/20">
                                    <span class="material-symbols-outlined text-[18px]">check</span>
                                </div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base hidden sm:block">Multimedia</span>
                            `;
                        }
                        
                        if(pStep3) {
                            pStep3.classList.remove('opacity-50');
                            pStep3.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">3</div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base">Extras</span>
                            `;
                        }
                        
                        if(pLine2) {
                            pLine2.classList.remove('border-surface-dim', 'dark:border-[#1e1e1e]');
                            pLine2.classList.add('border-primary', 'dark:border-red-500');
                        }
                        
                        if(step3Container) {
                            // Show Step 3
                            step3Container.classList.remove('hidden');
                            
                            // Update titles
                            if(title) title.textContent = '¡Agregá las comodidades de tu propiedad!';
                            if(subtitle) subtitle.textContent = 'Estos campos opcionales mejoran el posicionamiento de tu aviso.';
                            
                            // Trigger reflow
                            void step3Container.offsetWidth;
                            
                            // Fade in Step 3 and titles
                            if(title) title.style.opacity = '1';
                            if(subtitle) subtitle.style.opacity = '1';
                            
                            step3Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step3Container.style.height = ''; // Limpiar inline style
                            
                            // Scroll up if necessary
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            
                            // Change action buttons text/behavior if needed
                            const continueBtnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                            const continueBtnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');
                            
                            if (continueBtnDesk) {
                                continueBtnDesk.textContent = 'Continuar';
                                continueBtnDesk.setAttribute('form', 'form-extras');
                            }
                            if (continueBtnMob) {
                                continueBtnMob.textContent = 'Continuar';
                                continueBtnMob.setAttribute('form', 'form-extras');
                            }
                            
                            // Set global state
                            window.currentWizardStep = 3;
                        }
                            
                    }, 400); // 400ms is close to the 500ms duration but slightly less to feel snappy
                }
            });
        }
        
        // Form 'Extras' Submit Interceptor (Transition to Step 4)
        const formExtras = document.getElementById('form-extras');
        if (formExtras) {
            formExtras.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // TODO: Add extras validation logic here if needed
                let isValid = true;
                
                if(isValid) {
                    console.log('¡Datos Extras completos! Transicionando al paso 4: Publicar...');
                    
                    const step3Container = document.getElementById('wizard-step-3-container');
                    const step4Container = document.getElementById('wizard-step-4-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');
                    
                    // Fade out title and subtitle
                    if(title) title.style.opacity = '0';
                    if(subtitle) subtitle.style.opacity = '0';
                    
                    // Hide step 3 with animation
                    if(step3Container) {
                        step3Container.classList.remove('opacity-100', 'scale-100');
                        step3Container.classList.add('opacity-0', 'scale-95');
                    }
                    
                    setTimeout(() => {
                        if(step3Container) {
                            step3Container.classList.add('hidden');
                            step3Container.style.height = '0';
                        }
                        
                        // Update Progress Indicator
                        const pStep3 = document.getElementById('progress-step-3');
                        const pStep4 = document.getElementById('progress-step-4');
                        const pLine3 = document.getElementById('progress-line-3');
                        
                        if(pStep3) {
                            pStep3.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-red-500/10 text-primary dark:text-red-500 flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-red-500/20">
                                    <span class="material-symbols-outlined text-[18px]">check</span>
                                </div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base hidden sm:block">Extras</span>
                            `;
                        }
                        
                        if(pStep4) {
                            pStep4.classList.remove('opacity-50');
                            pStep4.innerHTML = `
                                <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">4</div>
                                <span class="font-headline font-bold text-primary dark:text-red-500 whitespace-nowrap text-[11px] md:text-base">Publicar</span>
                            `;
                        }
                        
                        if(pLine3) {
                            pLine3.classList.remove('border-surface-dim', 'dark:border-[#1e1e1e]');
                            pLine3.classList.add('border-primary', 'dark:border-red-500');
                        }
                        
                        if(step4Container) {
                            // Show Step 4
                            step4Container.classList.remove('hidden');
                            
                            // Update titles
                            if(title) title.textContent = '¡Estás a un paso de terminar!';
                            if(subtitle) subtitle.textContent = 'Revisá y elegí tu plan de publicación';
                            
                            // Trigger reflow
                            void step4Container.offsetWidth;
                            
                            // Fade in Step 4 and titles
                            if(title) title.style.opacity = '1';
                            if(subtitle) subtitle.style.opacity = '1';
                            
                            step4Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step4Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step4Container.style.height = ''; // Limpiar inline style
                            
                            // Scroll up if necessary
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            
                            // Change action buttons text/behavior if needed
                            const continueBtnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                            const continueBtnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');
                            
                            if (continueBtnDesk) {
                                continueBtnDesk.textContent = 'Publicar Aviso';
                                continueBtnDesk.setAttribute('form', 'form-planes');
                            }
                            if (continueBtnMob) {
                                continueBtnMob.textContent = 'Publicar Aviso';
                                continueBtnMob.setAttribute('form', 'form-planes');
                            }
                            
                            // Set global state
                            window.currentWizardStep = 4;
                        }
                            
                    }, 400); // 400ms is close to the 500ms duration but slightly less to feel snappy
                }
            });
        }
        
        // Form 'Planes' Submit Interceptor (Final Submit to Supabase)
        const formPlanes = document.getElementById('form-planes');
        if (formPlanes) {
            formPlanes.addEventListener('submit', async (e) => {
                e.preventDefault();
                console.log('¡Iniciando publicación en Supabase!');
                
                // Mostrar estado de carga (opcional, podrías añadir un spinner)
                const submitBtnDesk = document.querySelector('#desktop-action-buttons button[form="form-planes"]');
                const submitBtnMob = document.querySelector('nav.md\\:hidden button[form="form-planes"]');
                const originalTextDesk = submitBtnDesk ? submitBtnDesk.textContent : '';
                
                if (submitBtnDesk) submitBtnDesk.textContent = 'Publicando...';
                if (submitBtnMob) submitBtnMob.textContent = 'Publicando...';
                if (submitBtnDesk) submitBtnDesk.disabled = true;
                if (submitBtnMob) submitBtnMob.disabled = true;

                // Create overlay dynamically for loader and success
                const isDark = document.documentElement.classList.contains('dark');
                const overlay = document.createElement('div');
                overlay.id = 'dynamic-publish-overlay';
                overlay.style.cssText = `
                    position: fixed; inset: 0; z-index: 999999;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    background: ${isDark ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)'};
                    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                    opacity: 0; transition: opacity 0.4s ease;
                `;
                
                overlay.innerHTML = `
                    <img src="img/logo-terrio.svg" alt="Terrio" style="height: 60px; margin-bottom: 2rem; opacity: 0.8;">
                    <div class="loader-pub" style="
                        width: fit-content; font-weight: bold; font-family: monospace; font-size: 30px;
                        background: radial-gradient(circle closest-side,#811b1e 94%,#0000) right/calc(200% - 1em) 100%;
                        animation: l24 1s infinite alternate linear;
                    "></div>
                `;

                // Add keyframes and pseudo-elements for loader
                if (!document.getElementById('loader-keyframes')) {
                    const styleSheet = document.createElement('style');
                    styleSheet.id = 'loader-keyframes';
                    styleSheet.textContent = `
                        .loader-pub::before {
                            content: "Publicando...";
                            line-height: 1em;
                            color: #0000;
                            background: inherit;
                            background-image: radial-gradient(circle closest-side,#fff 94%,#811b1e);
                            -webkit-background-clip: text;
                            background-clip: text;
                        }
                        html.dark .loader-pub::before {
                            background-image: radial-gradient(circle closest-side,#1a1a1a 94%,#811b1e);
                        }
                        @keyframes l24 { 100% { background-position: left } }
                    `;
                    document.head.appendChild(styleSheet);
                }

                document.body.appendChild(overlay);
                // Trigger reflow
                overlay.offsetHeight;
                overlay.style.opacity = '1';

                try {
                    // Helper to get selected radio
                    const getRadioValue = (name) => {
                        const checked = document.querySelector(`input[name="${name}"]:checked`);
                        return checked ? checked.value : null;
                    };
                    
                    // Helper to get selected checkboxes
                    const getCheckedValues = (containerSelector) => {
                        const container = document.querySelector(containerSelector);
                        if (!container) return [];
                        const checked = container.querySelectorAll('input[type="checkbox"]:checked');
                        return Array.from(checked).map(cb => cb.name);
                    };

                    const getVal = (id) => {
                        const el = document.getElementById(id);
                        return el ? el.value : null;
                    };

                    // Collecting data
                    const propertyData = {
                        // Contacto (Paso 1)
                        contactNombre: getVal('contact-nombre'),
                        contactApellido: getVal('contact-apellido'),
                        contactCondicion: getRadioValue('contact-condicion') || 'propietario',
                        contactDocumento: getVal('contact-documento'),
                        contactCelular: getVal('contact-celular'),
                        contactFijo: getVal('contact-fijo'),
                        
                        // Principales (Paso 1)
                        operacion: getRadioValue('operacion') || 'alquiler',
                        tipoPropiedad: getVal('tipo-propiedad'),
                        subtipoPropiedad: getVal('subtipo-propiedad'),
                        
                        ambientes: getVal('ambientes-new'),
                        dormitorios: getVal('dormitorios-new'),
                        banos: getVal('banos-new'),
                        toilettes: getVal('toilettes-new'),
                        cocheras: getVal('cocheras-new'),
                        antiguedad: getRadioValue('antiguedad'),
                        
                        // Ubicacion (Paso 1.1)
                        calleAltura: getVal('calle-altura'),
                        provincia: getVal('provincia'),
                        ciudad: getVal('ciudad'),
                        barrio: getVal('barrio'),
                        subzona: getVal('subzona'),
                        ubicacionExacta: getRadioValue('precision') === 'exacta',
                        
                        // Caracteristicas (Paso 1.2)
                        supCubierta: getVal('sup-cubierta'),
                        supTotal: getVal('sup-total'),
                        precio: getVal('precio'),
                        moneda: document.getElementById('precio')?.previousElementSibling?.value === 'U$S' ? 'USD' : 'ARS',
                        expensas: getVal('expensas'),
                        tituloAviso: getVal('titulo-aviso'),
                        descripcionAviso: getVal('descripcion-aviso'),
                        
                        // Extras (Paso 3)
                        caracteristicas: getCheckedValues('#content-caracteristicas'),
                        ambientesExtras: getCheckedValues('#content-ambientes'),
                        servicios: getCheckedValues('#content-servicios'),
                        adicionales: {
                            cantidadPlantas: document.querySelector('#form-extras select:nth-of-type(1)')?.value,
                            coberturaCochera: document.querySelector('#form-extras select:nth-of-type(2)')?.value,
                            luminoso: document.querySelector('#form-extras select:nth-of-type(3)')?.value,
                            orientacion: document.querySelector('#form-extras select:nth-of-type(4)')?.value,
                            frenteTerreno: document.querySelector('#form-extras input[placeholder="0"]:nth-of-type(1)')?.value,
                            largoTerreno: document.querySelector('#form-extras input[placeholder="0"]:nth-of-type(2)')?.value,
                            supSemicubierta: document.querySelector('#form-extras input[placeholder="0"]:nth-of-type(3)')?.value
                        },
                        
                        // Planes (Paso 4)
                        planPublicacion: 'gratis', // For now, hardcoded as default or extract from UI if implemented
                        
                        // Multimedia
                        photos: window.selectedPropertyPhotos || []
                    };

                    // Guardar en Supabase
                    const result = await window.DataManager.addMarketplaceProperty(propertyData);
                    console.log('Propiedad guardada exitosamente:', result);
                    
                    // Show success overlay with animated checkmark
                    // Re-enable buttons first
                    if (submitBtnDesk) { submitBtnDesk.textContent = originalTextDesk; submitBtnDesk.disabled = false; }
                    if (submitBtnMob) { submitBtnMob.textContent = 'Publicar Aviso'; submitBtnMob.disabled = false; }
                    
                    // Update the existing overlay with the success checkmark
                    const isDark = document.documentElement.classList.contains('dark');
                    const overlay = document.getElementById('dynamic-publish-overlay');
                    if (!overlay) return;
                    
                    overlay.innerHTML = `
                        <svg width="100" height="100" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#A13333" stroke-width="3"
                                stroke-linecap="round" stroke-dasharray="283" stroke-dashoffset="283"
                                style="animation: successCircle 0.6s cubic-bezier(0.65,0,0.45,1) 0.2s forwards;" />
                            <polyline points="30 52 44 66 70 38" fill="none" stroke="#A13333" stroke-width="4"
                                stroke-linecap="round" stroke-linejoin="round"
                                stroke-dasharray="50" stroke-dashoffset="50"
                                style="animation: successCheck 0.4s cubic-bezier(0.65,0,0.45,1) 0.7s forwards;" />
                        </svg>
                        <p style="font-family: 'Outfit', 'Manrope', sans-serif; font-size: 1.5rem; font-weight: 700;
                            color: ${isDark ? '#f1f1f1' : '#1a1a1a'}; margin-top: 1.5rem;
                            opacity: 0; transform: translateY(10px);
                            animation: successFadeUp 0.5s ease 1s forwards;">
                            ¡Propiedad publicada!
                        </p>
                        <p style="font-family: 'Inter', sans-serif; font-size: 0.95rem;
                            color: ${isDark ? '#999' : '#666'}; margin-top: 0.5rem;
                            opacity: 0; transform: translateY(10px);
                            animation: successFadeUp 0.5s ease 1.15s forwards;">
                            Tu aviso ya está disponible en el marketplace
                        </p>
                    `;
                    
                    // Inject keyframes if not already present
                    if (!document.getElementById('success-keyframes')) {
                        const styleSheet = document.createElement('style');
                        styleSheet.id = 'success-keyframes';
                        styleSheet.textContent = `
                            @keyframes successCircle { to { stroke-dashoffset: 0; } }
                            @keyframes successCheck { to { stroke-dashoffset: 0; } }
                            @keyframes successFadeUp { to { opacity: 1; transform: translateY(0); } }
                        `;
                        document.head.appendChild(styleSheet);
                    }
                    
                    // Wait for animation to play
                    await new Promise(resolve => setTimeout(resolve, 2800));
                    
                    // Fade out
                    overlay.style.opacity = '0';
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Remove overlay and redirect
                    overlay.remove();
                    document.getElementById('btn-back-from-publish').click();
                    return;
                    
                } catch (error) {
                    const overlay = document.getElementById('dynamic-publish-overlay');
                    if (overlay) overlay.remove();
                    console.error('Error al publicar la propiedad:', error);
                    alert('Ocurrió un error al publicar la propiedad. Por favor, intenta nuevamente.');
                } finally {
                    if (submitBtnDesk) submitBtnDesk.textContent = originalTextDesk;
                    if (submitBtnMob) submitBtnMob.textContent = 'Publicar Aviso';
                    if (submitBtnDesk) submitBtnDesk.disabled = false;
                    if (submitBtnMob) submitBtnMob.disabled = false;
                }
            });
        }
        
        // Provincia -> Ciudad dependent dropdown
        const selectProvincia = document.getElementById('provincia');
        const selectCiudad = document.getElementById('ciudad');
        
        if (selectProvincia && selectCiudad) {
            const ciudadesConfig = {
                "buenos-aires": [
                    {
                        "value": "25-de-mayo",
                        "label": "25 de Mayo"
                    },
                    {
                        "value": "9-de-julio",
                        "label": "9 de Julio"
                    },
                    {
                        "value": "adolfo-alsina",
                        "label": "Adolfo Alsina"
                    },
                    {
                        "value": "adolfo-gonzales-chaves",
                        "label": "Adolfo Gonzales Chaves"
                    },
                    {
                        "value": "alberti",
                        "label": "Alberti"
                    },
                    {
                        "value": "almirante-brown",
                        "label": "Almirante Brown"
                    },
                    {
                        "value": "arrecifes",
                        "label": "Arrecifes"
                    },
                    {
                        "value": "avellaneda",
                        "label": "Avellaneda"
                    },
                    {
                        "value": "ayacucho",
                        "label": "Ayacucho"
                    },
                    {
                        "value": "azul",
                        "label": "Azul"
                    },
                    {
                        "value": "bahia-blanca",
                        "label": "Bahía Blanca"
                    },
                    {
                        "value": "balcarce",
                        "label": "Balcarce"
                    },
                    {
                        "value": "baradero",
                        "label": "Baradero"
                    },
                    {
                        "value": "benito-juarez",
                        "label": "Benito Juárez"
                    },
                    {
                        "value": "berazategui",
                        "label": "Berazategui"
                    },
                    {
                        "value": "berisso",
                        "label": "Berisso"
                    },
                    {
                        "value": "bolivar",
                        "label": "Bolívar"
                    },
                    {
                        "value": "bragado",
                        "label": "Bragado"
                    },
                    {
                        "value": "brandsen",
                        "label": "Brandsen"
                    },
                    {
                        "value": "campana",
                        "label": "Campana"
                    },
                    {
                        "value": "canuelas",
                        "label": "Cañuelas"
                    },
                    {
                        "value": "capitan-sarmiento",
                        "label": "Capitán Sarmiento"
                    },
                    {
                        "value": "carlos-casares",
                        "label": "Carlos Casares"
                    },
                    {
                        "value": "carlos-tejedor",
                        "label": "Carlos Tejedor"
                    },
                    {
                        "value": "carmen-de-areco",
                        "label": "Carmen de Areco"
                    },
                    {
                        "value": "castelli",
                        "label": "Castelli"
                    },
                    {
                        "value": "chacabuco",
                        "label": "Chacabuco"
                    },
                    {
                        "value": "chascomus",
                        "label": "Chascomús"
                    },
                    {
                        "value": "chivilcoy",
                        "label": "Chivilcoy"
                    },
                    {
                        "value": "colon",
                        "label": "Colón"
                    },
                    {
                        "value": "coronel-de-marina-leonardo-rosales",
                        "label": "Coronel de Marina Leonardo Rosales"
                    },
                    {
                        "value": "coronel-dorrego",
                        "label": "Coronel Dorrego"
                    },
                    {
                        "value": "coronel-pringles",
                        "label": "Coronel Pringles"
                    },
                    {
                        "value": "coronel-suarez",
                        "label": "Coronel Suárez"
                    },
                    {
                        "value": "daireaux",
                        "label": "Daireaux"
                    },
                    {
                        "value": "dolores",
                        "label": "Dolores"
                    },
                    {
                        "value": "ensenada",
                        "label": "Ensenada"
                    },
                    {
                        "value": "escobar",
                        "label": "Escobar"
                    },
                    {
                        "value": "esteban-echeverria",
                        "label": "Esteban Echeverría"
                    },
                    {
                        "value": "exaltacion-de-la-cruz",
                        "label": "Exaltación de la Cruz"
                    },
                    {
                        "value": "ezeiza",
                        "label": "Ezeiza"
                    },
                    {
                        "value": "florencio-varela",
                        "label": "Florencio Varela"
                    },
                    {
                        "value": "florentino-ameghino",
                        "label": "Florentino Ameghino"
                    },
                    {
                        "value": "general-alvarado",
                        "label": "General Alvarado"
                    },
                    {
                        "value": "general-alvear",
                        "label": "General Alvear"
                    },
                    {
                        "value": "general-arenales",
                        "label": "General Arenales"
                    },
                    {
                        "value": "general-belgrano",
                        "label": "General Belgrano"
                    },
                    {
                        "value": "general-guido",
                        "label": "General Guido"
                    },
                    {
                        "value": "general-juan-madariaga",
                        "label": "General Juan Madariaga"
                    },
                    {
                        "value": "general-la-madrid",
                        "label": "General La Madrid"
                    },
                    {
                        "value": "general-las-heras",
                        "label": "General Las Heras"
                    },
                    {
                        "value": "general-lavalle",
                        "label": "General Lavalle"
                    },
                    {
                        "value": "general-paz",
                        "label": "General Paz"
                    },
                    {
                        "value": "general-pinto",
                        "label": "General Pinto"
                    },
                    {
                        "value": "general-pueyrredon",
                        "label": "General Pueyrredón"
                    },
                    {
                        "value": "general-rodriguez",
                        "label": "General Rodríguez"
                    },
                    {
                        "value": "general-san-martin",
                        "label": "General San Martín"
                    },
                    {
                        "value": "general-viamonte",
                        "label": "General Viamonte"
                    },
                    {
                        "value": "general-villegas",
                        "label": "General Villegas"
                    },
                    {
                        "value": "guamini",
                        "label": "Guaminí"
                    },
                    {
                        "value": "hipolito-yrigoyen",
                        "label": "Hipólito Yrigoyen"
                    },
                    {
                        "value": "hurlingham",
                        "label": "Hurlingham"
                    },
                    {
                        "value": "ituzaingo",
                        "label": "Ituzaingó"
                    },
                    {
                        "value": "jose-c-paz",
                        "label": "José C. Paz"
                    },
                    {
                        "value": "junin",
                        "label": "Junín"
                    },
                    {
                        "value": "la-costa",
                        "label": "La Costa"
                    },
                    {
                        "value": "la-matanza",
                        "label": "La Matanza"
                    },
                    {
                        "value": "la-plata",
                        "label": "La Plata"
                    },
                    {
                        "value": "lanus",
                        "label": "Lanús"
                    },
                    {
                        "value": "laprida",
                        "label": "Laprida"
                    },
                    {
                        "value": "las-flores",
                        "label": "Las Flores"
                    },
                    {
                        "value": "leandro-n-alem",
                        "label": "Leandro N. Alem"
                    },
                    {
                        "value": "lezama",
                        "label": "Lezama"
                    },
                    {
                        "value": "lincoln",
                        "label": "Lincoln"
                    },
                    {
                        "value": "loberia",
                        "label": "Lobería"
                    },
                    {
                        "value": "lobos",
                        "label": "Lobos"
                    },
                    {
                        "value": "lomas-de-zamora",
                        "label": "Lomas de Zamora"
                    },
                    {
                        "value": "lujan",
                        "label": "Luján"
                    },
                    {
                        "value": "magdalena",
                        "label": "Magdalena"
                    },
                    {
                        "value": "maipu",
                        "label": "Maipú"
                    },
                    {
                        "value": "malvinas-argentinas",
                        "label": "Malvinas Argentinas"
                    },
                    {
                        "value": "mar-chiquita",
                        "label": "Mar Chiquita"
                    },
                    {
                        "value": "marcos-paz",
                        "label": "Marcos Paz"
                    },
                    {
                        "value": "mercedes",
                        "label": "Mercedes"
                    },
                    {
                        "value": "merlo",
                        "label": "Merlo"
                    },
                    {
                        "value": "monte",
                        "label": "Monte"
                    },
                    {
                        "value": "monte-hermoso",
                        "label": "Monte Hermoso"
                    },
                    {
                        "value": "moreno",
                        "label": "Moreno"
                    },
                    {
                        "value": "moron",
                        "label": "Morón"
                    },
                    {
                        "value": "navarro",
                        "label": "Navarro"
                    },
                    {
                        "value": "necochea",
                        "label": "Necochea"
                    },
                    {
                        "value": "olavarria",
                        "label": "Olavarría"
                    },
                    {
                        "value": "patagones",
                        "label": "Patagones"
                    },
                    {
                        "value": "pehuajo",
                        "label": "Pehuajó"
                    },
                    {
                        "value": "pellegrini",
                        "label": "Pellegrini"
                    },
                    {
                        "value": "pergamino",
                        "label": "Pergamino"
                    },
                    {
                        "value": "pila",
                        "label": "Pila"
                    },
                    {
                        "value": "pilar",
                        "label": "Pilar"
                    },
                    {
                        "value": "pinamar",
                        "label": "Pinamar"
                    },
                    {
                        "value": "presidente-peron",
                        "label": "Presidente Perón"
                    },
                    {
                        "value": "puan",
                        "label": "Puán"
                    },
                    {
                        "value": "punta-indio",
                        "label": "Punta Indio"
                    },
                    {
                        "value": "quilmes",
                        "label": "Quilmes"
                    },
                    {
                        "value": "ramallo",
                        "label": "Ramallo"
                    },
                    {
                        "value": "rauch",
                        "label": "Rauch"
                    },
                    {
                        "value": "rivadavia",
                        "label": "Rivadavia"
                    },
                    {
                        "value": "rojas",
                        "label": "Rojas"
                    },
                    {
                        "value": "roque-perez",
                        "label": "Roque Pérez"
                    },
                    {
                        "value": "saavedra",
                        "label": "Saavedra"
                    },
                    {
                        "value": "saladillo",
                        "label": "Saladillo"
                    },
                    {
                        "value": "salliquelo",
                        "label": "Salliqueló"
                    },
                    {
                        "value": "salto",
                        "label": "Salto"
                    },
                    {
                        "value": "san-andres-de-giles",
                        "label": "San Andrés de Giles"
                    },
                    {
                        "value": "san-antonio-de-areco",
                        "label": "San Antonio de Areco"
                    },
                    {
                        "value": "san-cayetano",
                        "label": "San Cayetano"
                    },
                    {
                        "value": "san-fernando",
                        "label": "San Fernando"
                    },
                    {
                        "value": "san-isidro",
                        "label": "San Isidro"
                    },
                    {
                        "value": "san-miguel",
                        "label": "San Miguel"
                    },
                    {
                        "value": "san-nicolas",
                        "label": "San Nicolás"
                    },
                    {
                        "value": "san-pedro",
                        "label": "San Pedro"
                    },
                    {
                        "value": "san-vicente",
                        "label": "San Vicente"
                    },
                    {
                        "value": "suipacha",
                        "label": "Suipacha"
                    },
                    {
                        "value": "tandil",
                        "label": "Tandil"
                    },
                    {
                        "value": "tapalque",
                        "label": "Tapalqué"
                    },
                    {
                        "value": "tigre",
                        "label": "Tigre"
                    },
                    {
                        "value": "tordillo",
                        "label": "Tordillo"
                    },
                    {
                        "value": "tornquist",
                        "label": "Tornquist"
                    },
                    {
                        "value": "trenque-lauquen",
                        "label": "Trenque Lauquen"
                    },
                    {
                        "value": "tres-arroyos",
                        "label": "Tres Arroyos"
                    },
                    {
                        "value": "tres-de-febrero",
                        "label": "Tres de Febrero"
                    },
                    {
                        "value": "tres-lomas",
                        "label": "Tres Lomas"
                    },
                    {
                        "value": "vicente-lopez",
                        "label": "Vicente López"
                    },
                    {
                        "value": "villa-gesell",
                        "label": "Villa Gesell"
                    },
                    {
                        "value": "villarino",
                        "label": "Villarino"
                    },
                    {
                        "value": "zarate",
                        "label": "Zárate"
                    }
                ],
                "entre-rios": [
                    {
                        "value": "colon",
                        "label": "Colón"
                    },
                    {
                        "value": "concordia",
                        "label": "Concordia"
                    },
                    {
                        "value": "diamante",
                        "label": "Diamante"
                    },
                    {
                        "value": "federacion",
                        "label": "Federación"
                    },
                    {
                        "value": "federal",
                        "label": "Federal"
                    },
                    {
                        "value": "feliciano",
                        "label": "Feliciano"
                    },
                    {
                        "value": "gualeguay",
                        "label": "Gualeguay"
                    },
                    {
                        "value": "gualeguaychu",
                        "label": "Gualeguaychú"
                    },
                    {
                        "value": "islas-del-ibicuy",
                        "label": "Islas del Ibicuy"
                    },
                    {
                        "value": "la-paz",
                        "label": "La Paz"
                    },
                    {
                        "value": "nogoya",
                        "label": "Nogoyá"
                    },
                    {
                        "value": "parana",
                        "label": "Paraná"
                    },
                    {
                        "value": "san-salvador",
                        "label": "San Salvador"
                    },
                    {
                        "value": "tala",
                        "label": "Tala"
                    },
                    {
                        "value": "uruguay",
                        "label": "Uruguay"
                    },
                    {
                        "value": "victoria",
                        "label": "Victoria"
                    },
                    {
                        "value": "villaguay",
                        "label": "Villaguay"
                    }
                ],
                "corrientes": [
                    {
                        "value": "bella-vista",
                        "label": "Bella Vista"
                    },
                    {
                        "value": "beron-de-astrada",
                        "label": "Berón de Astrada"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "concepcion",
                        "label": "Concepción"
                    },
                    {
                        "value": "curuzu-cuatia",
                        "label": "Curuzú Cuatiá"
                    },
                    {
                        "value": "empedrado",
                        "label": "Empedrado"
                    },
                    {
                        "value": "esquina",
                        "label": "Esquina"
                    },
                    {
                        "value": "general-alvear",
                        "label": "General Alvear"
                    },
                    {
                        "value": "general-paz",
                        "label": "General Paz"
                    },
                    {
                        "value": "goya",
                        "label": "Goya"
                    },
                    {
                        "value": "itati",
                        "label": "Itatí"
                    },
                    {
                        "value": "ituzaingo",
                        "label": "Ituzaingó"
                    },
                    {
                        "value": "lavalle",
                        "label": "Lavalle"
                    },
                    {
                        "value": "mburucuya",
                        "label": "Mburucuyá"
                    },
                    {
                        "value": "mercedes",
                        "label": "Mercedes"
                    },
                    {
                        "value": "monte-caseros",
                        "label": "Monte Caseros"
                    },
                    {
                        "value": "paso-de-los-libres",
                        "label": "Paso de los Libres"
                    },
                    {
                        "value": "saladas",
                        "label": "Saladas"
                    },
                    {
                        "value": "san-cosme",
                        "label": "San Cosme"
                    },
                    {
                        "value": "san-luis-del-palmar",
                        "label": "San Luis del Palmar"
                    },
                    {
                        "value": "san-martin",
                        "label": "San Martín"
                    },
                    {
                        "value": "san-miguel",
                        "label": "San Miguel"
                    },
                    {
                        "value": "san-roque",
                        "label": "San Roque"
                    },
                    {
                        "value": "santo-tome",
                        "label": "Santo Tomé"
                    },
                    {
                        "value": "sauce",
                        "label": "Sauce"
                    }
                ],
                "salta": [
                    {
                        "value": "anta",
                        "label": "Anta"
                    },
                    {
                        "value": "cachi",
                        "label": "Cachi"
                    },
                    {
                        "value": "cafayate",
                        "label": "Cafayate"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "cerrillos",
                        "label": "Cerrillos"
                    },
                    {
                        "value": "chicoana",
                        "label": "Chicoana"
                    },
                    {
                        "value": "general-guemes",
                        "label": "General Güemes"
                    },
                    {
                        "value": "general-jose-de-san-martin",
                        "label": "General José de San Martín"
                    },
                    {
                        "value": "guachipas",
                        "label": "Guachipas"
                    },
                    {
                        "value": "iruya",
                        "label": "Iruya"
                    },
                    {
                        "value": "la-caldera",
                        "label": "La Caldera"
                    },
                    {
                        "value": "la-candelaria",
                        "label": "La Candelaria"
                    },
                    {
                        "value": "la-poma",
                        "label": "La Poma"
                    },
                    {
                        "value": "la-vina",
                        "label": "La Viña"
                    },
                    {
                        "value": "los-andes",
                        "label": "Los Andes"
                    },
                    {
                        "value": "metan",
                        "label": "Metán"
                    },
                    {
                        "value": "molinos",
                        "label": "Molinos"
                    },
                    {
                        "value": "oran",
                        "label": "Orán"
                    },
                    {
                        "value": "rivadavia",
                        "label": "Rivadavia"
                    },
                    {
                        "value": "rosario-de-la-frontera",
                        "label": "Rosario de la Frontera"
                    },
                    {
                        "value": "rosario-de-lerma",
                        "label": "Rosario de Lerma"
                    },
                    {
                        "value": "san-carlos",
                        "label": "San Carlos"
                    },
                    {
                        "value": "santa-victoria",
                        "label": "Santa Victoria"
                    }
                ],
                "chaco": [
                    {
                        "value": "1-de-mayo",
                        "label": "1° de Mayo"
                    },
                    {
                        "value": "12-de-octubre",
                        "label": "12 de Octubre"
                    },
                    {
                        "value": "2-de-abril",
                        "label": "2 de Abril"
                    },
                    {
                        "value": "25-de-mayo",
                        "label": "25 de Mayo"
                    },
                    {
                        "value": "9-de-julio",
                        "label": "9 de Julio"
                    },
                    {
                        "value": "almirante-brown",
                        "label": "Almirante Brown"
                    },
                    {
                        "value": "bermejo",
                        "label": "Bermejo"
                    },
                    {
                        "value": "chacabuco",
                        "label": "Chacabuco"
                    },
                    {
                        "value": "comandante-fernandez",
                        "label": "Comandante Fernández"
                    },
                    {
                        "value": "fray-justo-santa-maria-de-oro",
                        "label": "Fray Justo Santa María de Oro"
                    },
                    {
                        "value": "general-belgrano",
                        "label": "General Belgrano"
                    },
                    {
                        "value": "general-donovan",
                        "label": "General Donovan"
                    },
                    {
                        "value": "general-guemes",
                        "label": "General Güemes"
                    },
                    {
                        "value": "independencia",
                        "label": "Independencia"
                    },
                    {
                        "value": "libertad",
                        "label": "Libertad"
                    },
                    {
                        "value": "libertador-general-san-martin",
                        "label": "Libertador General San Martín"
                    },
                    {
                        "value": "maipu",
                        "label": "Maipú"
                    },
                    {
                        "value": "mayor-luis-j-fontana",
                        "label": "Mayor Luis J. Fontana"
                    },
                    {
                        "value": "ohiggins",
                        "label": "O'Higgins"
                    },
                    {
                        "value": "presidencia-de-la-plaza",
                        "label": "Presidencia de la Plaza"
                    },
                    {
                        "value": "quitilipi",
                        "label": "Quitilipi"
                    },
                    {
                        "value": "san-fernando",
                        "label": "San Fernando"
                    },
                    {
                        "value": "san-lorenzo",
                        "label": "San Lorenzo"
                    },
                    {
                        "value": "sargento-cabral",
                        "label": "Sargento Cabral"
                    },
                    {
                        "value": "tapenaga",
                        "label": "Tapenagá"
                    }
                ],
                "la-rioja": [
                    {
                        "value": "angel-vicente-penaloza",
                        "label": "Ángel Vicente Peñaloza"
                    },
                    {
                        "value": "arauco",
                        "label": "Arauco"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "castro-barros",
                        "label": "Castro Barros"
                    },
                    {
                        "value": "chamical",
                        "label": "Chamical"
                    },
                    {
                        "value": "chilecito",
                        "label": "Chilecito"
                    },
                    {
                        "value": "famatina",
                        "label": "Famatina"
                    },
                    {
                        "value": "general-belgrano",
                        "label": "General Belgrano"
                    },
                    {
                        "value": "general-felipe-varela",
                        "label": "General Felipe Varela"
                    },
                    {
                        "value": "general-juan-facundo-quiroga",
                        "label": "General Juan Facundo Quiroga"
                    },
                    {
                        "value": "general-lamadrid",
                        "label": "General Lamadrid"
                    },
                    {
                        "value": "general-ortiz-de-ocampo",
                        "label": "General Ortiz de Ocampo"
                    },
                    {
                        "value": "general-san-martin",
                        "label": "General San Martín"
                    },
                    {
                        "value": "independencia",
                        "label": "Independencia"
                    },
                    {
                        "value": "rosario-vera-penaloza",
                        "label": "Rosario Vera Peñaloza"
                    },
                    {
                        "value": "san-blas-de-los-sauces",
                        "label": "San Blas de Los Sauces"
                    },
                    {
                        "value": "sanagasta",
                        "label": "Sanagasta"
                    },
                    {
                        "value": "vinchina",
                        "label": "Vinchina"
                    }
                ],
                "chubut": [
                    {
                        "value": "biedma",
                        "label": "Biedma"
                    },
                    {
                        "value": "cushamen",
                        "label": "Cushamen"
                    },
                    {
                        "value": "escalante",
                        "label": "Escalante"
                    },
                    {
                        "value": "florentino-ameghino",
                        "label": "Florentino Ameghino"
                    },
                    {
                        "value": "futaleufu",
                        "label": "Futaleufú"
                    },
                    {
                        "value": "gaiman",
                        "label": "Gaiman"
                    },
                    {
                        "value": "gastre",
                        "label": "Gastre"
                    },
                    {
                        "value": "languineo",
                        "label": "Languiñeo"
                    },
                    {
                        "value": "martires",
                        "label": "Mártires"
                    },
                    {
                        "value": "paso-de-indios",
                        "label": "Paso de Indios"
                    },
                    {
                        "value": "rawson",
                        "label": "Rawson"
                    },
                    {
                        "value": "rio-senguer",
                        "label": "Río Senguer"
                    },
                    {
                        "value": "sarmiento",
                        "label": "Sarmiento"
                    },
                    {
                        "value": "tehuelches",
                        "label": "Tehuelches"
                    },
                    {
                        "value": "telsen",
                        "label": "Telsen"
                    }
                ],
                "santa-cruz": [
                    {
                        "value": "corpen-aike",
                        "label": "Corpen Aike"
                    },
                    {
                        "value": "deseado",
                        "label": "Deseado"
                    },
                    {
                        "value": "guer-aike",
                        "label": "Güer Aike"
                    },
                    {
                        "value": "lago-argentino",
                        "label": "Lago Argentino"
                    },
                    {
                        "value": "lago-buenos-aires",
                        "label": "Lago Buenos Aires"
                    },
                    {
                        "value": "magallanes",
                        "label": "Magallanes"
                    },
                    {
                        "value": "rio-chico",
                        "label": "Río Chico"
                    }
                ],
                "rio-negro": [
                    {
                        "value": "25-de-mayo",
                        "label": "25 de Mayo"
                    },
                    {
                        "value": "9-de-julio",
                        "label": "9 de Julio"
                    },
                    {
                        "value": "adolfo-alsina",
                        "label": "Adolfo Alsina"
                    },
                    {
                        "value": "avellaneda",
                        "label": "Avellaneda"
                    },
                    {
                        "value": "bariloche",
                        "label": "Bariloche"
                    },
                    {
                        "value": "el-cuy",
                        "label": "El Cuy"
                    },
                    {
                        "value": "general-roca",
                        "label": "General Roca"
                    },
                    {
                        "value": "norquinco",
                        "label": "Ñorquinco"
                    },
                    {
                        "value": "pichi-mahuida",
                        "label": "Pichi Mahuida"
                    },
                    {
                        "value": "pilcaniyeu",
                        "label": "Pilcaniyeu"
                    },
                    {
                        "value": "san-antonio",
                        "label": "San Antonio"
                    },
                    {
                        "value": "valcheta",
                        "label": "Valcheta"
                    }
                ],
                "santiago-del-estero": [
                    {
                        "value": "aguirre",
                        "label": "Aguirre"
                    },
                    {
                        "value": "alberdi",
                        "label": "Alberdi"
                    },
                    {
                        "value": "atamisqui",
                        "label": "Atamisqui"
                    },
                    {
                        "value": "avellaneda",
                        "label": "Avellaneda"
                    },
                    {
                        "value": "banda",
                        "label": "Banda"
                    },
                    {
                        "value": "belgrano",
                        "label": "Belgrano"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "choya",
                        "label": "Choya"
                    },
                    {
                        "value": "copo",
                        "label": "Copo"
                    },
                    {
                        "value": "figueroa",
                        "label": "Figueroa"
                    },
                    {
                        "value": "general-taboada",
                        "label": "General Taboada"
                    },
                    {
                        "value": "guasayan",
                        "label": "Guasayán"
                    },
                    {
                        "value": "jimenez",
                        "label": "Jiménez"
                    },
                    {
                        "value": "juan-felipe-ibarra",
                        "label": "Juan Felipe Ibarra"
                    },
                    {
                        "value": "loreto",
                        "label": "Loreto"
                    },
                    {
                        "value": "mitre",
                        "label": "Mitre"
                    },
                    {
                        "value": "moreno",
                        "label": "Moreno"
                    },
                    {
                        "value": "ojo-de-agua",
                        "label": "Ojo de Agua"
                    },
                    {
                        "value": "pellegrini",
                        "label": "Pellegrini"
                    },
                    {
                        "value": "quebrachos",
                        "label": "Quebrachos"
                    },
                    {
                        "value": "rio-hondo",
                        "label": "Río Hondo"
                    },
                    {
                        "value": "rivadavia",
                        "label": "Rivadavia"
                    },
                    {
                        "value": "robles",
                        "label": "Robles"
                    },
                    {
                        "value": "salavina",
                        "label": "Salavina"
                    },
                    {
                        "value": "san-martin",
                        "label": "San Martín"
                    },
                    {
                        "value": "sarmiento",
                        "label": "Sarmiento"
                    },
                    {
                        "value": "silipica",
                        "label": "Silípica"
                    }
                ],
                "san-luis": [
                    {
                        "value": "ayacucho",
                        "label": "Ayacucho"
                    },
                    {
                        "value": "belgrano",
                        "label": "Belgrano"
                    },
                    {
                        "value": "chacabuco",
                        "label": "Chacabuco"
                    },
                    {
                        "value": "coronel-pringles",
                        "label": "Coronel Pringles"
                    },
                    {
                        "value": "general-pedernera",
                        "label": "General Pedernera"
                    },
                    {
                        "value": "gobernador-dupuy",
                        "label": "Gobernador Dupuy"
                    },
                    {
                        "value": "juan-martin-de-pueyrredon",
                        "label": "Juan Martín de Pueyrredón"
                    },
                    {
                        "value": "junin",
                        "label": "Junín"
                    },
                    {
                        "value": "libertador-general-san-martin",
                        "label": "Libertador General San Martín"
                    }
                ],
                "cordoba": [
                    {
                        "value": "calamuchita",
                        "label": "Calamuchita"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "colon",
                        "label": "Colón"
                    },
                    {
                        "value": "cruz-del-eje",
                        "label": "Cruz del Eje"
                    },
                    {
                        "value": "general-roca",
                        "label": "General Roca"
                    },
                    {
                        "value": "general-san-martin",
                        "label": "General San Martín"
                    },
                    {
                        "value": "ischilin",
                        "label": "Ischilín"
                    },
                    {
                        "value": "juarez-celman",
                        "label": "Juárez Celman"
                    },
                    {
                        "value": "marcos-juarez",
                        "label": "Marcos Juárez"
                    },
                    {
                        "value": "minas",
                        "label": "Minas"
                    },
                    {
                        "value": "pocho",
                        "label": "Pocho"
                    },
                    {
                        "value": "presidente-roque-saenz-pena",
                        "label": "Presidente Roque Sáenz Peña"
                    },
                    {
                        "value": "punilla",
                        "label": "Punilla"
                    },
                    {
                        "value": "rio-cuarto",
                        "label": "Río Cuarto"
                    },
                    {
                        "value": "rio-primero",
                        "label": "Río Primero"
                    },
                    {
                        "value": "rio-seco",
                        "label": "Río Seco"
                    },
                    {
                        "value": "rio-segundo",
                        "label": "Río Segundo"
                    },
                    {
                        "value": "san-alberto",
                        "label": "San Alberto"
                    },
                    {
                        "value": "san-javier",
                        "label": "San Javier"
                    },
                    {
                        "value": "san-justo",
                        "label": "San Justo"
                    },
                    {
                        "value": "santa-maria",
                        "label": "Santa María"
                    },
                    {
                        "value": "sobremonte",
                        "label": "Sobremonte"
                    },
                    {
                        "value": "tercero-arriba",
                        "label": "Tercero Arriba"
                    },
                    {
                        "value": "totoral",
                        "label": "Totoral"
                    },
                    {
                        "value": "tulumba",
                        "label": "Tulumba"
                    },
                    {
                        "value": "union",
                        "label": "Unión"
                    }
                ],
                "caba": [
                    {
                        "value": "comuna-1",
                        "label": "Comuna 1"
                    },
                    {
                        "value": "comuna-10",
                        "label": "Comuna 10"
                    },
                    {
                        "value": "comuna-11",
                        "label": "Comuna 11"
                    },
                    {
                        "value": "comuna-12",
                        "label": "Comuna 12"
                    },
                    {
                        "value": "comuna-13",
                        "label": "Comuna 13"
                    },
                    {
                        "value": "comuna-14",
                        "label": "Comuna 14"
                    },
                    {
                        "value": "comuna-15",
                        "label": "Comuna 15"
                    },
                    {
                        "value": "comuna-2",
                        "label": "Comuna 2"
                    },
                    {
                        "value": "comuna-3",
                        "label": "Comuna 3"
                    },
                    {
                        "value": "comuna-4",
                        "label": "Comuna 4"
                    },
                    {
                        "value": "comuna-5",
                        "label": "Comuna 5"
                    },
                    {
                        "value": "comuna-6",
                        "label": "Comuna 6"
                    },
                    {
                        "value": "comuna-7",
                        "label": "Comuna 7"
                    },
                    {
                        "value": "comuna-8",
                        "label": "Comuna 8"
                    },
                    {
                        "value": "comuna-9",
                        "label": "Comuna 9"
                    }
                ],
                "mendoza": [
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "general-alvear",
                        "label": "General Alvear"
                    },
                    {
                        "value": "godoy-cruz",
                        "label": "Godoy Cruz"
                    },
                    {
                        "value": "guaymallen",
                        "label": "Guaymallén"
                    },
                    {
                        "value": "junin",
                        "label": "Junín"
                    },
                    {
                        "value": "la-paz",
                        "label": "La Paz"
                    },
                    {
                        "value": "las-heras",
                        "label": "Las Heras"
                    },
                    {
                        "value": "lavalle",
                        "label": "Lavalle"
                    },
                    {
                        "value": "lujan-de-cuyo",
                        "label": "Luján de Cuyo"
                    },
                    {
                        "value": "maipu",
                        "label": "Maipú"
                    },
                    {
                        "value": "malargue",
                        "label": "Malargüe"
                    },
                    {
                        "value": "rivadavia",
                        "label": "Rivadavia"
                    },
                    {
                        "value": "san-carlos",
                        "label": "San Carlos"
                    },
                    {
                        "value": "san-martin",
                        "label": "San Martín"
                    },
                    {
                        "value": "san-rafael",
                        "label": "San Rafael"
                    },
                    {
                        "value": "santa-rosa",
                        "label": "Santa Rosa"
                    },
                    {
                        "value": "tunuyan",
                        "label": "Tunuyán"
                    },
                    {
                        "value": "tupungato",
                        "label": "Tupungato"
                    }
                ],
                "formosa": [
                    {
                        "value": "bermejo",
                        "label": "Bermejo"
                    },
                    {
                        "value": "formosa",
                        "label": "Formosa"
                    },
                    {
                        "value": "laishi",
                        "label": "Laishi"
                    },
                    {
                        "value": "matacos",
                        "label": "Matacos"
                    },
                    {
                        "value": "patino",
                        "label": "Patiño"
                    },
                    {
                        "value": "pilagas",
                        "label": "Pilagás"
                    },
                    {
                        "value": "pilcomayo",
                        "label": "Pilcomayo"
                    },
                    {
                        "value": "pirane",
                        "label": "Pirané"
                    },
                    {
                        "value": "ramon-lista",
                        "label": "Ramón Lista"
                    }
                ],
                "ro-negro": [
                    {
                        "value": "conesa",
                        "label": "Conesa"
                    }
                ],
                "jujuy": [
                    {
                        "value": "cochinoca",
                        "label": "Cochinoca"
                    },
                    {
                        "value": "dr-manuel-belgrano",
                        "label": "Dr. Manuel Belgrano"
                    },
                    {
                        "value": "el-carmen",
                        "label": "El Carmen"
                    },
                    {
                        "value": "humahuaca",
                        "label": "Humahuaca"
                    },
                    {
                        "value": "ledesma",
                        "label": "Ledesma"
                    },
                    {
                        "value": "palpala",
                        "label": "Palpalá"
                    },
                    {
                        "value": "rinconada",
                        "label": "Rinconada"
                    },
                    {
                        "value": "san-antonio",
                        "label": "San Antonio"
                    },
                    {
                        "value": "san-pedro",
                        "label": "San Pedro"
                    },
                    {
                        "value": "santa-barbara",
                        "label": "Santa Bárbara"
                    },
                    {
                        "value": "santa-catalina",
                        "label": "Santa Catalina"
                    },
                    {
                        "value": "susques",
                        "label": "Susques"
                    },
                    {
                        "value": "tilcara",
                        "label": "Tilcara"
                    },
                    {
                        "value": "tumbaya",
                        "label": "Tumbaya"
                    },
                    {
                        "value": "valle-grande",
                        "label": "Valle Grande"
                    },
                    {
                        "value": "yavi",
                        "label": "Yavi"
                    }
                ],
                "neuquen": [
                    {
                        "value": "alumine",
                        "label": "Aluminé"
                    },
                    {
                        "value": "anelo",
                        "label": "Añelo"
                    },
                    {
                        "value": "catan-lil",
                        "label": "Catán Lil"
                    },
                    {
                        "value": "chos-malal",
                        "label": "Chos Malal"
                    },
                    {
                        "value": "collon-cura",
                        "label": "Collón Curá"
                    },
                    {
                        "value": "confluencia",
                        "label": "Confluencia"
                    },
                    {
                        "value": "huiliches",
                        "label": "Huiliches"
                    },
                    {
                        "value": "lacar",
                        "label": "Lácar"
                    },
                    {
                        "value": "loncopue",
                        "label": "Loncopué"
                    },
                    {
                        "value": "los-lagos",
                        "label": "Los Lagos"
                    },
                    {
                        "value": "minas",
                        "label": "Minas"
                    },
                    {
                        "value": "norquin",
                        "label": "Ñorquín"
                    },
                    {
                        "value": "pehuenches",
                        "label": "Pehuenches"
                    },
                    {
                        "value": "picun-leufu",
                        "label": "Picún Leufú"
                    },
                    {
                        "value": "picunches",
                        "label": "Picunches"
                    },
                    {
                        "value": "zapala",
                        "label": "Zapala"
                    }
                ],
                "catamarca": [
                    {
                        "value": "ambato",
                        "label": "Ambato"
                    },
                    {
                        "value": "ancasti",
                        "label": "Ancasti"
                    },
                    {
                        "value": "andalgala",
                        "label": "Andalgalá"
                    },
                    {
                        "value": "antofagasta-de-la-sierra",
                        "label": "Antofagasta de la Sierra"
                    },
                    {
                        "value": "belen",
                        "label": "Belén"
                    },
                    {
                        "value": "capayan",
                        "label": "Capayán"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "el-alto",
                        "label": "El Alto"
                    },
                    {
                        "value": "fray-mamerto-esquiu",
                        "label": "Fray Mamerto Esquiú"
                    },
                    {
                        "value": "la-paz",
                        "label": "La Paz"
                    },
                    {
                        "value": "paclin",
                        "label": "Paclín"
                    },
                    {
                        "value": "poman",
                        "label": "Pomán"
                    },
                    {
                        "value": "santa-maria",
                        "label": "Santa María"
                    },
                    {
                        "value": "santa-rosa",
                        "label": "Santa Rosa"
                    },
                    {
                        "value": "tinogasta",
                        "label": "Tinogasta"
                    },
                    {
                        "value": "valle-viejo",
                        "label": "Valle Viejo"
                    }
                ],
                "tierra-del-fuego": [
                    {
                        "value": "antartida-argentina",
                        "label": "Antártida Argentina"
                    },
                    {
                        "value": "islas-del-atlantico-sur",
                        "label": "Islas del Atlántico Sur"
                    },
                    {
                        "value": "rio-grande",
                        "label": "Río Grande"
                    },
                    {
                        "value": "tolhuin",
                        "label": "Tolhuin"
                    },
                    {
                        "value": "ushuaia",
                        "label": "Ushuaia"
                    }
                ],
                "tucuman": [
                    {
                        "value": "burruyacu",
                        "label": "Burruyacú"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "chicligasta",
                        "label": "Chicligasta"
                    },
                    {
                        "value": "cruz-alta",
                        "label": "Cruz Alta"
                    },
                    {
                        "value": "famailla",
                        "label": "Famaillá"
                    },
                    {
                        "value": "graneros",
                        "label": "Graneros"
                    },
                    {
                        "value": "juan-bautista-alberdi",
                        "label": "Juan Bautista Alberdi"
                    },
                    {
                        "value": "la-cocha",
                        "label": "La Cocha"
                    },
                    {
                        "value": "leales",
                        "label": "Leales"
                    },
                    {
                        "value": "lules",
                        "label": "Lules"
                    },
                    {
                        "value": "monteros",
                        "label": "Monteros"
                    },
                    {
                        "value": "rio-chico",
                        "label": "Río Chico"
                    },
                    {
                        "value": "simoca",
                        "label": "Simoca"
                    },
                    {
                        "value": "tafi-del-valle",
                        "label": "Tafí del Valle"
                    },
                    {
                        "value": "tafi-viejo",
                        "label": "Tafí Viejo"
                    },
                    {
                        "value": "trancas",
                        "label": "Trancas"
                    },
                    {
                        "value": "yerba-buena",
                        "label": "Yerba Buena"
                    }
                ],
                "santa-fe": [
                    {
                        "value": "9-de-julio",
                        "label": "9 de Julio"
                    },
                    {
                        "value": "belgrano",
                        "label": "Belgrano"
                    },
                    {
                        "value": "caseros",
                        "label": "Caseros"
                    },
                    {
                        "value": "castellanos",
                        "label": "Castellanos"
                    },
                    {
                        "value": "constitucion",
                        "label": "Constitución"
                    },
                    {
                        "value": "garay",
                        "label": "Garay"
                    },
                    {
                        "value": "general-lopez",
                        "label": "General López"
                    },
                    {
                        "value": "general-obligado",
                        "label": "General Obligado"
                    },
                    {
                        "value": "iriondo",
                        "label": "Iriondo"
                    },
                    {
                        "value": "la-capital",
                        "label": "La Capital"
                    },
                    {
                        "value": "las-colonias",
                        "label": "Las Colonias"
                    },
                    {
                        "value": "rosario",
                        "label": "Rosario"
                    },
                    {
                        "value": "san-cristobal",
                        "label": "San Cristóbal"
                    },
                    {
                        "value": "san-javier",
                        "label": "San Javier"
                    },
                    {
                        "value": "san-jeronimo",
                        "label": "San Jerónimo"
                    },
                    {
                        "value": "san-justo",
                        "label": "San Justo"
                    },
                    {
                        "value": "san-lorenzo",
                        "label": "San Lorenzo"
                    },
                    {
                        "value": "san-martin",
                        "label": "San Martín"
                    },
                    {
                        "value": "vera",
                        "label": "Vera"
                    }
                ],
                "la-pampa": [
                    {
                        "value": "atreuco",
                        "label": "Atreucó"
                    },
                    {
                        "value": "caleu-caleu",
                        "label": "Caleu Caleu"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "catrilo",
                        "label": "Catriló"
                    },
                    {
                        "value": "chalileo",
                        "label": "Chalileo"
                    },
                    {
                        "value": "chapaleufu",
                        "label": "Chapaleufú"
                    },
                    {
                        "value": "chical-co",
                        "label": "Chical Co"
                    },
                    {
                        "value": "conhelo",
                        "label": "Conhelo"
                    },
                    {
                        "value": "curaco",
                        "label": "Curacó"
                    },
                    {
                        "value": "guatrache",
                        "label": "Guatraché"
                    },
                    {
                        "value": "hucal",
                        "label": "Hucal"
                    },
                    {
                        "value": "lihuel-calel",
                        "label": "Lihuel Calel"
                    },
                    {
                        "value": "limay-mahuida",
                        "label": "Limay Mahuida"
                    },
                    {
                        "value": "loventue",
                        "label": "Loventué"
                    },
                    {
                        "value": "maraco",
                        "label": "Maracó"
                    },
                    {
                        "value": "puelen",
                        "label": "Puelén"
                    },
                    {
                        "value": "quemu-quemu",
                        "label": "Quemú Quemú"
                    },
                    {
                        "value": "rancul",
                        "label": "Rancul"
                    },
                    {
                        "value": "realico",
                        "label": "Realicó"
                    },
                    {
                        "value": "toay",
                        "label": "Toay"
                    },
                    {
                        "value": "trenel",
                        "label": "Trenel"
                    },
                    {
                        "value": "utracan",
                        "label": "Utracán"
                    }
                ],
                "misiones": [
                    {
                        "value": "25-de-mayo",
                        "label": "25 de Mayo"
                    },
                    {
                        "value": "apostoles",
                        "label": "Apóstoles"
                    },
                    {
                        "value": "cainguas",
                        "label": "Cainguás"
                    },
                    {
                        "value": "candelaria",
                        "label": "Candelaria"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "concepcion",
                        "label": "Concepción"
                    },
                    {
                        "value": "eldorado",
                        "label": "Eldorado"
                    },
                    {
                        "value": "general-manuel-belgrano",
                        "label": "General Manuel Belgrano"
                    },
                    {
                        "value": "guarani",
                        "label": "Guaraní"
                    },
                    {
                        "value": "iguazu",
                        "label": "Iguazú"
                    },
                    {
                        "value": "leandro-n-alem",
                        "label": "Leandro N. Alem"
                    },
                    {
                        "value": "libertador-general-san-martin",
                        "label": "Libertador General San Martín"
                    },
                    {
                        "value": "montecarlo",
                        "label": "Montecarlo"
                    },
                    {
                        "value": "obera",
                        "label": "Oberá"
                    },
                    {
                        "value": "san-ignacio",
                        "label": "San Ignacio"
                    },
                    {
                        "value": "san-javier",
                        "label": "San Javier"
                    },
                    {
                        "value": "san-pedro",
                        "label": "San Pedro"
                    }
                ],
                "san-juan": [
                    {
                        "value": "25-de-mayo",
                        "label": "25 de Mayo"
                    },
                    {
                        "value": "9-de-julio",
                        "label": "9 de Julio"
                    },
                    {
                        "value": "albardon",
                        "label": "Albardón"
                    },
                    {
                        "value": "angaco",
                        "label": "Angaco"
                    },
                    {
                        "value": "calingasta",
                        "label": "Calingasta"
                    },
                    {
                        "value": "capital",
                        "label": "Capital"
                    },
                    {
                        "value": "caucete",
                        "label": "Caucete"
                    },
                    {
                        "value": "chimbas",
                        "label": "Chimbas"
                    },
                    {
                        "value": "iglesia",
                        "label": "Iglesia"
                    },
                    {
                        "value": "jachal",
                        "label": "Jáchal"
                    },
                    {
                        "value": "pocito",
                        "label": "Pocito"
                    },
                    {
                        "value": "rawson",
                        "label": "Rawson"
                    },
                    {
                        "value": "rivadavia",
                        "label": "Rivadavia"
                    },
                    {
                        "value": "san-martin",
                        "label": "San Martín"
                    },
                    {
                        "value": "santa-lucia",
                        "label": "Santa Lucía"
                    },
                    {
                        "value": "sarmiento",
                        "label": "Sarmiento"
                    },
                    {
                        "value": "ullum",
                        "label": "Ullum"
                    },
                    {
                        "value": "valle-fertil",
                        "label": "Valle Fértil"
                    },
                    {
                        "value": "zonda",
                        "label": "Zonda"
                    }
                ]
            };
            
            selectProvincia.addEventListener('change', (e) => {
                const p = e.target.value;
                selectCiudad.innerHTML = '<option disabled selected value="">Selecciona el departamento</option>';
                const errProv = document.getElementById('error-provincia');
                if(errProv) errProv.classList.add('hidden');
                
                if (p && ciudadesConfig[p]) {
                    selectCiudad.disabled = false;
                    selectCiudad.required = true;
                    ciudadesConfig[p].forEach(city => {
                        const opt = document.createElement('option');
                        opt.value = city.value;
                        opt.textContent = city.label;
                        selectCiudad.appendChild(opt);
                    });
                } else {
                    selectCiudad.disabled = true;
                    selectCiudad.required = false;
                }
                const errCiudad = document.getElementById('error-ciudad');
                if(errCiudad) errCiudad.classList.add('hidden');
            });
            
            selectCiudad.addEventListener('change', () => {
                const errCiudad = document.getElementById('error-ciudad');
                if(errCiudad) errCiudad.classList.add('hidden');
            });
            
            const calle = document.getElementById('calle-altura');
            if(calle) {
                calle.addEventListener('input', () => {
                    const errCalle = document.getElementById('error-calle');
                    if(errCalle) errCalle.classList.add('hidden');
                });
            }
        }



        const btnBackMarketplaceElements = document.querySelectorAll('.btn-back-marketplace');
        btnBackMarketplaceElements.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('app').classList.add('hidden');
                document.getElementById('landing-marketplace-view').classList.remove('hidden');
                
                // Reiniciar animaciones de scroll
                if (window.marketplaceObserver) {
                    document.querySelectorAll('.animate-on-scroll').forEach(el => {
                        el.classList.remove('is-visible');
                        window.marketplaceObserver.observe(el);
                    });
                }
            });
        });

        // Login Form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                try {
                    const user = await DataManager.login(email, password);
                    if (user) {
                        App.showMainApp(user);
                        // Handle post-login redirect
                        const redirect = sessionStorage.getItem('postLoginRedirect');
                        if (redirect === 'publish') {
                            sessionStorage.removeItem('postLoginRedirect');
                            setTimeout(() => {
                                document.getElementById('landing-marketplace-view').classList.remove('hidden');
                                document.getElementById('main-layout').classList.add('hidden');
                                document.getElementById('login-view').classList.add('hidden');
                                document.getElementById('landing-marketplace-view').classList.remove('hidden');
                                window.currentWizardStep = 1;
                                const publishElem = document.getElementById('publish-property-view');
                                if(publishElem) { publishElem.classList.remove('hidden'); window.scrollTo(0, 0); }
                            }, 100);
                        }
                    } else {
                        alert('Credenciales inválidas');
                    }
                } catch (error) {
                    console.error(error);
                    alert("Error al iniciar sesión");
                }
            });
        }

        // Register Form
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('reg-name').value;
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                
                try {
                    const user = await DataManager.signUp(email, password, name);
                    if (user) {
                         alert("Cuenta creada exitosamente! Sesión iniciada.");
                         App.showMainApp(user);
                    }
                } catch (error) {
                    console.error(error);
                    alert("Error al registrarse: " + error.message);
                }
            });
        }

        // Toggle Login/Register
        const showRegisterBtn = document.getElementById('show-register-btn');
        const showLoginBtn = document.getElementById('show-login-btn');
        const loginText = document.getElementById('to-register-text');
        const registerText = document.getElementById('to-login-text');

        if(showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form').classList.add('hidden');
                loginText.classList.add('hidden');
                
                document.getElementById('register-form').classList.remove('hidden');
                registerText.classList.remove('hidden');
            });
        }

        if(showLoginBtn) {
            showLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('register-form').classList.add('hidden');
                registerText.classList.add('hidden');
                
                document.getElementById('login-form').classList.remove('hidden');
                loginText.classList.remove('hidden');
            });
        }

        // Logout
        const handleLogout = () => {
            DataManager.logout();
            App.state.currentUser = null;
            App.render();
        };
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        document.getElementById('mobile-logout-btn').addEventListener('click', handleLogout);

        // Theme Toggle (Menu Button)
        document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
            btn.addEventListener('click', App.toggleTheme);
        });

        // Theme Switch (Checkbox)
        document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                App.setTheme(e.target.checked ? 'dark' : 'light');
            });
        });

        // Navigation
        const navLinks = document.querySelectorAll('.nav-link, .nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('data-target');
                if (targetId) {
                    App.navigateTo(targetId);
                }
            });
        });

        // Add Property Modal Handling
        const modal = document.getElementById('add-property-modal');
        const openModalBtns = [document.getElementById('quick-add-btn'), document.getElementById('add-property-fab')];
        const closeModalBtn = document.querySelector('.close-modal');
        
        // Wizard State
        let currentStep = 1;
        const totalSteps = 4;

        const updateWizardUI = () => {
            // Update Steps
            document.querySelectorAll('.form-step').forEach(step => {
                if(parseInt(step.dataset.step) === currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });

            // Update Indicators
            document.querySelectorAll('.step-indicator').forEach(ind => {
                const step = parseInt(ind.dataset.step);
                if (step === currentStep) {
                    ind.classList.add('active');
                    ind.classList.remove('completed');
                } else if (step < currentStep) {
                    ind.classList.add('completed');
                    ind.classList.remove('active');
                } else {
                    ind.classList.remove('active', 'completed');
                }
            });

            // Update Lines
            const lines = document.querySelectorAll('.step-line');
            lines.forEach((line, index) => {
                if (index < currentStep - 1) {
                    line.classList.add('active');
                } else {
                    line.classList.remove('active');
                }
            });
        };

        const validateStep = (step) => {
            const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
            const inputs = stepEl.querySelectorAll('input[required], select[required]');
            let isValid = true;
            inputs.forEach(input => {
                if (!input.value) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                    // Reset border on input
                    input.addEventListener('input', function() {
                        this.style.borderColor = '';
                    }, { once: true });
                }
            });
            return isValid;
        };

        // Open Modal
        openModalBtns.forEach(btn => {
            if(btn) {
                btn.addEventListener('click', () => {
                    modal.classList.remove('hidden');
                    document.body.classList.add('no-scroll');
                    // Reset wizard
                    currentStep = 1;
                    updateWizardUI();
                    document.getElementById('add-property-form').reset();
                    // document.getElementById('photo-file-name').textContent = "Ningún archivo seleccionado"; // Removed
                    document.getElementById('contract-file-name').textContent = "Ningún archivo seleccionado";
                });
            }
        });

        // Close Modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modalToClose = e.target.closest('.modal');
                if (modalToClose) {
                    modalToClose.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                }
            });
        });
        
        // Close Modal on click outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
            // Close Dropdown Menus if clicking outside
            if (!e.target.closest('.action-cell')) {
                document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
            }
        });

        // Wizard Navigation
        document.querySelectorAll('.next-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    if (currentStep < totalSteps) {
                        currentStep++;
                        updateWizardUI();
                    }
                } else {
                    alert("Por favor completa los campos requeridos.");
                }
            });
        });

        document.querySelectorAll('.prev-step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (currentStep > 1) {
                    currentStep--;
                    updateWizardUI();
                }
            });
        });

        // Duration Select Handling
        const durationSelect = document.getElementById('contract-duration');
        const customDurationGroup = document.getElementById('custom-duration-group');
        const customDurationInput = document.getElementById('custom-duration');

        if(durationSelect && customDurationGroup && customDurationInput) {
            durationSelect.addEventListener('change', (e) => {
                if(e.target.value === 'custom') {
                    customDurationGroup.classList.remove('hidden');
                    customDurationInput.setAttribute('required', 'true');
                } else {
                    customDurationGroup.classList.add('hidden');
                    customDurationInput.removeAttribute('required');
                    customDurationInput.value = '';
                }
            });
        }

        // File Input Handling (Contract Only)
        const handleFileSelect = (inputId, nameId) => {
            const input = document.getElementById(inputId);
            const nameSpan = document.getElementById(nameId);
            if(input && nameSpan) {
                input.addEventListener('change', (e) => {
                    if(e.target.files && e.target.files.length > 0) {
                        nameSpan.textContent = e.target.files[0].name;
                    } else {
                        nameSpan.textContent = "Ningún archivo seleccionado";
                    }
                });
            }
        };

        // handleFileSelect('photo-upload', 'photo-file-name'); // Removed
        handleFileSelect('contract-upload', 'contract-file-name');

        // Tab Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Update Buttons
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update Content
                document.querySelectorAll('.tab-content').forEach(c => {
                    c.classList.add('hidden');
                    c.classList.remove('active');
                });
                    // Lazy load content if needed
                    const content = document.getElementById(targetTab);
                    if(content) {
                        content.classList.remove('hidden');
                        content.classList.add('active');
                        // Load specific tab data
                        if(targetTab === 'tab-tenants') App.renderTenants();
                        if(targetTab === 'tab-payments') App.renderPayments();
                    }
            });
        });

        // Search Handlers
        const setupSearch = (inputId, tableId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            
            input.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const rows = document.querySelectorAll(`#${tableId} tbody tr`);
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        };

        setupSearch('tenant-search', 'tenants-table');
        setupSearch('payment-search', 'payments-table');

        // Market Place Handlers
        App.setupMarketPlaceListeners();

        // Quick Add Tenant Button (Simulate opening modal for now)
        document.getElementById('quick-add-tenant-btn').addEventListener('click', () => {
           // For now, re-use the property modal or show a message
           document.getElementById('add-property-fab').click();
           // In a real app, this would open a tenant-specific modal or pre-fill the form
        });

        // Add Property Form Submit
        const addPropertyForm = document.getElementById('add-property-form');
        if(addPropertyForm) {
            addPropertyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);

                // Helper to read file
                const readFile = (file) => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                };

                try {
                    // const photoFile = formData.get('photo'); // Removed
                    const contractFile = formData.get('contract');
                    
                    // Default Photo URL
                    let photoUrl = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
                    /*
                    if (photoFile && photoFile.size > 0) {
                        photoUrl = await readFile(photoFile);
                    }
                    */

                    let contractData = null;
                    if (contractFile && contractFile.size > 0) {
                        contractData = {
                            name: contractFile.name,
                            data: await readFile(contractFile)
                        };
                    }

                    // Safe parsing
                    const price = parseFloat(formData.get('price')) || 0;
                    const increaseRate = parseFloat(formData.get('increaseRate')) || 0;
                    const increaseFrequency = parseInt(formData.get('increaseFrequency')) || 12; // Default to 12 if missing
                    const rentDueDay = parseInt(formData.get('rentDueDay')) || 1;


                        // Calculate End Date based on Duration
                        const startDateStr = formData.get('contractStartDate');
                        let durationMonths = 0;
                        
                        const durationVal = formData.get('contractDuration');
                        if (durationVal === 'custom') {
                            durationMonths = parseInt(formData.get('customDuration'));
                        } else {
                            durationMonths = parseInt(durationVal);
                        }

                        let contractEndDate = '';
                        if (startDateStr && durationMonths > 0) {
                            // Parse start date as local date to avoid timezone issues
                            const [y, m, d] = startDateStr.split('-').map(Number);
                            const startDate = new Date(y, m - 1, d);
                            
                            // Add months
                            startDate.setMonth(startDate.getMonth() + durationMonths);
                            
                            // Format YYYY-MM-DD
                            const year = startDate.getFullYear();
                            const month = String(startDate.getMonth() + 1).padStart(2, '0');
                            const day = String(startDate.getDate()).padStart(2, '0');
                            contractEndDate = `${year}-${month}-${day}`;
                        }

                        const property = {
                            address: formData.get('address'),
                            tenantName: formData.get('tenantName'),
                            tenantEmail: formData.get('tenantEmail'),
                            tenantPhone: formData.get('tenantPhone'),
                            ownerName: formData.get('ownerName'),
                            ownerEmail: formData.get('ownerEmail'),
                            ownerPhone: formData.get('ownerPhone'),
                            price: price,
                            increaseRate: increaseRate,
                            increaseFrequency: increaseFrequency,
                            contractStartDate: startDateStr,
                            contractEndDate: contractEndDate,
                            rentDueDay: rentDueDay,
                            photoUrl: photoUrl,
                            contract: contractData,
                            cbuAlias: formData.get('cbuAlias'),
                            notifyRentExpiry: formData.get('notifyRentExpiry') === 'on',
                            notifyPunitiveInterests: formData.get('notifyPunitiveInterests') === 'on'
                        };

                    await DataManager.addProperty(property);
                    e.target.reset();
                    modal.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                    await App.refreshData(); // Re-render data dependent views
                    App.navigateTo('properties-view');
                } catch (error) {
                    console.error("Error saving property:", error);
                    alert("Hubo un error al guardar la propiedad. Intenta con archivos más pequeños.");
                }
            });
        }
    },

    openPropertyDetails: (property) => {
        const modal = document.getElementById('property-details-modal');
        const infoContainer = document.getElementById('details-info-container');
        const closeBtn = document.getElementById('close-details-modal');

        // ADDED: Bottom Right Delete Button Logic
        const modalContent = modal.querySelector('.modal-content');

        // Remove existing from header (legacy fix) or content or calendar section
        const existingBtnHeader = modal.querySelector('.modal-header .delete-property-btn');
        if(existingBtnHeader) existingBtnHeader.remove();
        
        const existingBtn = modal.querySelector('.calendar-section .delete-property-btn');
        if(existingBtn) existingBtn.remove();
        
        // Also remove if it was directly in modal content/previous location
        const existingBtnContent = modalContent.querySelector('.delete-property-btn');
        if(existingBtnContent) existingBtnContent.remove();

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-property-btn text-danger';
        deleteBtn.innerHTML = '<span class="material-symbols-rounded">delete</span> Eliminar Propiedad';
        deleteBtn.title = 'Eliminar Propiedad';
        
        // Append to calendar section
        const calendarSection = modal.querySelector('.calendar-section');
        if(calendarSection) {
            calendarSection.appendChild(deleteBtn);
        } else {
             modalContent.appendChild(deleteBtn);
        }

        deleteBtn.onclick = async () => {
            if(confirm('¿Estás seguro de eliminar esta propiedad? Esta acción no se puede deshacer.')) {
                try {
                    await DataManager.deleteProperty(property.id);
                    modal.classList.add('hidden');
                    document.body.classList.remove('no-scroll');
                    await App.refreshData();
                } catch (error) {
                    alert('Error al eliminar la propiedad');
                    console.error(error);
                }
            }
        };
        
        // Calculate Status
        const today = new Date();
        // Check if current day is past rentDueDay
        // Note: strictly greater means overdue. e.g. Due 10th. Today 11th -> Overdue.
        const isOverdue = today.getDate() > property.rentDueDay;
        
        // Since we don't track payments yet, we'll assume "Al día" if not overdue, or "Vencido" if overdue.
        // In a real app, we'd check if a payment exists for this month.
        const statusHtml = isOverdue 
            ? `<span class="status-badge status-overdue">Vencido</span>`
            : `<span class="status-badge status-pending">Al día</span>`;

        // Calculate Expiration Date (Current Month)
        // We always show the due date for the *current* month to align with the status
        const dueYear = today.getFullYear();
        const dueMonth = today.getMonth();
        const maxDaysInMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
        const dueDaySafe = Math.min(property.rentDueDay || 1, maxDaysInMonth);
        
        const expirationDate = new Date(dueYear, dueMonth, dueDaySafe);
        const expirationDateStr = expirationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Populate Info
        infoContainer.innerHTML = `
            <p><strong>Dirección:</strong> ${property.address}</p>
            <p><strong>Estado:</strong> ${statusHtml}</p>
            <p><strong>Vencimiento:</strong> ${expirationDateStr}</p>
            <p><strong>Inquilino:</strong> ${property.tenantName}</p>
            <p><strong>Precio:</strong> $${property.price.toLocaleString()}</p>
            <p><strong>Aumento:</strong> ${property.increaseRate}% cada ${property.increaseFrequency} meses</p>
            <p><strong>Vencimiento Alquiler:</strong> Día ${property.rentDueDay}</p>
            <p><strong>Contrato:</strong> ${property.contractStartDate} al ${property.contractEndDate}</p>
            ${property.contract ? `<p><strong>Archivo:</strong> <a href="${property.contract.data}" download="${property.contract.name}" style="color:var(--primary-color)">Descargar Contrato</a></p>` : ''}
        `;

        // Calendar State
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();

        const render = () => App.renderCalendar(currentYear, currentMonth, property);
        
        // Navigation Handlers (remove old listeners to avoid duplicates if any - simple approach here)
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        
        prevBtn.onclick = () => {
            currentMonth--;
            if(currentMonth < 0) { currentMonth = 11; currentYear--; }
            render();
        };
        
        nextBtn.onclick = () => {
            currentMonth++;
            if(currentMonth > 11) { currentMonth = 0; currentYear++; }
            render();
        };

        // Initial Render
        render();
        
        // Show Modal
        modal.classList.remove('hidden');
        document.body.classList.add('no-scroll');
        
        // Close Handlers
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        };
        modal.onclick = (e) => {
            if(e.target === modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
        };
    },

    renderCalendar: (year, month, property) => {
        // Helper to parse date string YYYY-MM-DD as Local Date (avoiding TZ shifts)
        const parseLocalDate = (dateStr) => {
            if(!dateStr) return null;
            const [y, m, d] = dateStr.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0); // Noon to match calendar cells
        };

        const grid = document.getElementById('calendar-grid');
        const monthYearLabel = document.getElementById('calendar-month-year');
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        monthYearLabel.textContent = `${monthNames[month]} ${year}`;
        grid.innerHTML = '';

        // Headers
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        days.forEach(d => {
            const el = document.createElement('div');
            el.className = 'calendar-day-header';
            el.textContent = d;
            grid.appendChild(el);
        });

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();

        // Total cells counter
        let totalCells = 0;

        // Empty slots
        for(let i=0; i<firstDay; i++) {
            grid.appendChild(document.createElement('div'));
            totalCells++;
        }

        // Helper to calculate rent for a specific date
        const calculateRent = (date) => {
            const start = parseLocalDate(property.contractStartDate);
            if (!start) return property.price;
            
            if (date < start) return property.price;

            // Calculate months elapsed since start
            const monthsElapsed = (date.getFullYear() - start.getFullYear()) * 12 + (date.getMonth() - start.getMonth());
            
            // Calculate number of increases
            const numIncreases = Math.floor(monthsElapsed / property.increaseFrequency);
            
            if (numIncreases <= 0) return property.price;

            // Compound interest formula: Price * (1 + Rate)^Increases
            const rate = property.increaseRate / 100;
            const newPrice = property.price * Math.pow(1 + rate, numIncreases);
            
            return Math.round(newPrice);
        };

        // Days
        for(let day=1; day<=daysInMonth; day++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            el.appendChild(dayNumber);
            
            const currentDate = new Date(year, month, day, 12, 0, 0);
            
            // Checks
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            if(isToday) el.classList.add('is-today');

            // Contract Start/End
            const startDate = parseLocalDate(property.contractStartDate);
            const endDate = parseLocalDate(property.contractEndDate);
            
            if (startDate && endDate) {
                const isStart = currentDate.getTime() === startDate.getTime();
                const isEnd = currentDate.getTime() === endDate.getTime();

                if(isStart || isEnd) el.classList.add('is-start-end');

                // Rent Due Day & Amount Display
                // Only show if within contract period
                if (currentDate >= startDate && currentDate <= endDate) {
                    if(day === property.rentDueDay) {
                        el.classList.add('is-due');
                        
                        const rentAmount = calculateRent(currentDate);
                        const priceEl = document.createElement('span');
                        priceEl.className = 'calendar-price';
                        priceEl.textContent = `$${rentAmount.toLocaleString()}`;
                        el.appendChild(priceEl);
                    }
                }

                // Increase Dates (Visual indicator only)
                // Check if monthsDiff is positive and multiple of frequency
                // And match the DAY of the start date (e.g. if started on 15th, increases are on 15th)
                if (day === startDate.getDate()) {
                     const monthsDiff = (year - startDate.getFullYear()) * 12 + (month - startDate.getMonth());
                     if (monthsDiff > 0 && monthsDiff % property.increaseFrequency === 0) {
                         if(currentDate <= endDate) el.classList.add('is-increase');
                     }
                }
            }

            grid.appendChild(el);
            totalCells++;
        }

        // Fill remaining slots to maintain constant height (6 rows * 7 days = 42 cells)
        const totalRows = 6;
        const remainingCells = (totalRows * 7) - totalCells;
        
        for(let i=0; i<remainingCells; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            grid.appendChild(el);
        }
    },

    showLogin: () => {
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('main-layout').classList.add('hidden');
    },

    showMainApp: (user) => {
        App.state.currentUser = user;
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('main-layout').classList.remove('hidden');
        App.render();
        App.refreshData();
    },

    setupMarketPlaceListeners: () => {
        const startBtn = document.getElementById('publish-property-trigger');
        const contactModal = document.getElementById('marketplace-contact-modal');
        const wizardModal = document.getElementById('marketplace-wizard-modal');
        const contactForm = document.getElementById('marketplace-contact-form');
        
        if (startBtn && contactModal) {
            startBtn.addEventListener('click', () => {
                contactModal.classList.remove('hidden');
                document.body.classList.add('no-scroll');
            });
        }

        if (contactForm && wizardModal) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Prevent page reload
                // Here we would normally validate and store the contact form data.
                // For now, we proceed to the wizard.
                if (contactModal) contactModal.classList.add('hidden');
                wizardModal.classList.remove('hidden');
            });
        }

        // Substep Navigation in Wizard (Step 1)
        const sidebarItems = document.querySelectorAll('.wizard-sidebar .wizard-nav-item');
        const substepContents = document.querySelectorAll('.wizard-substep');
        const wizardBackBtn = document.getElementById('wizard-back-btn');

        // Helper function to update the footer buttons based on the active index
        const updateWizardFooter = (activeIndex) => {
            if (wizardBackBtn) {
                if (activeIndex > 0) {
                    wizardBackBtn.classList.remove('hidden');
                } else {
                    wizardBackBtn.classList.add('hidden');
                }
            }
        };

        sidebarItems.forEach((item, index) => {
            item.addEventListener('click', () => {
                // Remove active class from all
                sidebarItems.forEach(i => i.classList.remove('active'));
                substepContents.forEach(c => {
                    c.classList.remove('active');
                    c.classList.add('hidden');
                });

                // Add active class to clicked
                item.classList.add('active');
                const targetId = `substep-${item.getAttribute('data-substep')}`;
                
                const targetContent = document.getElementById(targetId);
                if (targetContent) {
                    targetContent.classList.remove('hidden');
                    targetContent.classList.add('active');
                }

                updateWizardFooter(index);
            });
        });

        const wizardContinueBtn = document.getElementById('wizard-continue-btn');
        if (wizardContinueBtn) {
            wizardContinueBtn.addEventListener('click', () => {
                if (window.currentWizardStep === 1) {
                    const sidebarArray = Array.from(sidebarItems);
                    const activeIndex = sidebarArray.findIndex(item => item.classList.contains('active'));
                    
                    if (activeIndex !== -1 && activeIndex < sidebarArray.length - 1) {
                        sidebarArray[activeIndex + 1].click();
                    } else {
                        const form = document.getElementById('form-general');
                        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                } else if (window.currentWizardStep === 2) {
                    const form = document.getElementById('form-multimedia');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (window.currentWizardStep === 3) {
                    const form = document.getElementById('form-extras');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (window.currentWizardStep === 4) {
                    const form = document.getElementById('form-planes');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                }
            });
        }

        if (wizardBackBtn) {
            wizardBackBtn.addEventListener('click', () => {
                const sidebarArray = Array.from(sidebarItems);
                const activeIndex = sidebarArray.findIndex(item => item.classList.contains('active'));
                
                if (activeIndex > 0) {
                    sidebarArray[activeIndex - 1].click();
                }
            });
        }

        // Counters + / - Logic
        const counterBtns = document.querySelectorAll('.counter-btn');
        counterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-target');
                const isPlus = btn.classList.contains('plus');
                
                const hiddenInput = document.getElementById(targetId);
                const displayVal = document.getElementById(`val-${targetId}`);
                
                if (hiddenInput && displayVal) {
                    let currentVal = parseInt(hiddenInput.value) || 0;
                    if (isPlus) {
                        currentVal++;
                    } else {
                        if (currentVal > 0) currentVal--;
                    }
                    hiddenInput.value = currentVal;
                    displayVal.textContent = currentVal;
                }
            });
        });

        // Property Type Dropdown logic based on Subtype
        const propTypeSelect = document.getElementById('prop-type');
        const propSubtypeSelect = document.getElementById('prop-subtype');

        if (propTypeSelect && propSubtypeSelect) {
            const subtypes = {
                departamento: ['Departamento', 'Duplex', 'Triplex', 'Penthouse', 'Loft'],
                casa: ['Casa', 'Chalet', 'Casa Quinta', 'Casa de Campo', 'Cabaña'],
                ph: ['PH al frente', 'PH al fondo', 'PH independiente'],
                terreno: ['Lote', 'Terreno Comercial', 'Terreno Residencial', 'Quinta'],
                oficina: ['Oficina individual', 'Piso de oficina', 'Coworking'],
                comercial: ['Local en calle', 'Local en galería', 'Galpón', 'Depósito'],
                cochera: ['Fija', 'Móvil', 'Techada', 'Descubierta']
            };

            propTypeSelect.addEventListener('change', (e) => {
                const type = e.target.value;
                propSubtypeSelect.innerHTML = '<option value="" disabled selected>Seleccioná subtipo...</option>';
                
                if (subtypes[type]) {
                    subtypes[type].forEach(st => {
                        const opt = document.createElement('option');
                        opt.value = st.toLowerCase().replace(/ /g, '_');
                        opt.textContent = st;
                        propSubtypeSelect.appendChild(opt);
                    });
                    propSubtypeSelect.disabled = false;
                } else {
                    propSubtypeSelect.disabled = true;
                }
            });
        }
    },

    navigateTo: (viewId) => {
        // Update State
        App.state.currentView = viewId;

        // Update UI Classes
        document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));
        document.getElementById(viewId).classList.remove('hidden');

        // Update Nav Active State
        document.querySelectorAll('.nav-link, .nav-item').forEach(el => {
            if (el.getAttribute('data-target') === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    },

    render: async () => {
        const { currentUser } = App.state;
        const loginView = document.getElementById('login-view');
        const mainLayout = document.getElementById('main-layout');

        if (currentUser) {
            loginView.classList.add('hidden');
            mainLayout.classList.remove('hidden');
            document.getElementById('user-display-name').textContent = currentUser.name;
            await App.refreshData();
            // Ensure we are on a valid view, default to home if none active or if coming from login
            if(document.querySelectorAll('.view:not(.hidden)').length === 0 || App.state.currentView === 'login-view') {
                 App.navigateTo('home-view');
            }
        } else {
            loginView.classList.remove('hidden');
            mainLayout.classList.add('hidden');
        }
    },

    // NEW METHODS
    renderTenants: async () => {
        const tenants = await DataManager.getTenants();
        const tbody = document.querySelector('#tenants-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (tenants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--muted-foreground);">No hay inquilinos registrados.</td></tr>';
            return;
        }

        tenants.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${t.name}</div>
                    <div style="font-size: 0.8em; color: var(--muted-foreground);">${t.email}</div>
                </td>
                <td>${t.phone}</td>
                <td>${t.propertyAddress}</td>
                <td>
                    ${t.contract ? `<a href="${t.contract.data}" download="${t.contract.name}" class="text-primary" title="Descargar Contrato"><span class="material-symbols-rounded">description</span></a>` : '<span class="text-muted">-</span>'}
                </td>
                <td>${t.contractEnd || '<span class="text-muted">-</span>'}</td>
                <td style="font-weight: 600;">$${t.rent.toLocaleString()}</td>
                <td class="action-cell">
                    <button class="more-options-btn" onclick="App.toggleMenu(event, 'tenant', '${t.id}')">
                        <span class="material-symbols-rounded">more_vert</span>
                    </button>
                    <div id="menu-tenant-${t.id}" class="dropdown-menu">
                        <button class="dropdown-item" onclick="App.handleAction('details', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">visibility</span> Ver detalles
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('edit', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">edit</span> Editar
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('renew', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">autorenew</span> Renovar contrato
                        </button>
                        <button class="dropdown-item danger" onclick="App.handleAction('delete', 'tenant', '${t.id}')">
                            <span class="material-symbols-rounded">delete</span> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    renderPayments: async () => {
        // use mock payments for now
        const payments = await DataManager.getMockPayments();
        const tbody = document.querySelector('#payments-table tbody');
        if(!tbody) return;

        tbody.innerHTML = '';

        if (payments.length === 0) {
             tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--muted-foreground);">No hay pagos registrados.</td></tr>';
             return;
        }

        payments.forEach(p => {
            const tr = document.createElement('tr');
            
            // Status Class
            let badgeClass = 'badge-pending';
            if (p.status === 'Pagado') badgeClass = 'badge-paid';
            if (p.status === 'Atrasado') badgeClass = 'badge-late';

            tr.innerHTML = `
                <td style="white-space:nowrap;">${p.date}</td>
                <td style="font-weight: 500;">${p.tenantName}</td>
                <td style="font-size: 0.9em;">${p.propertyAddress}</td>
                <td>${p.method}</td>
                <td style="font-weight: 600;">$${p.amount.toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${p.status}</span></td>
                <td class="action-cell">
                    <button class="more-options-btn" onclick="App.toggleMenu(event, 'payment', '${p.id}')">
                        <span class="material-symbols-rounded">more_vert</span>
                    </button>
                    <div id="menu-payment-${p.id}" class="dropdown-menu">
                        <button class="dropdown-item" onclick="App.handleAction('details', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">visibility</span> Ver detalles
                        </button>
                        <button class="dropdown-item" onclick="App.handleAction('edit', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">edit</span> Editar
                        </button>
                         <button class="dropdown-item danger" onclick="App.handleAction('delete', 'payment', '${p.id}')">
                            <span class="material-symbols-rounded">delete</span> Eliminar
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Update Payment Stats
        const stats = await DataManager.getPaymentStats();
        document.getElementById('payments-total-paid').textContent = `$${stats.totalPaid.toLocaleString()}`;
        document.getElementById('payments-pending-count').textContent = stats.pendingCount;
        document.getElementById('payments-total-transactions').textContent = stats.totalTransactions;
    },

    toggleMenu: (event, type, id) => {
        event.stopPropagation();
        const menuId = `menu-${type}-${id}`;
        const menu = document.getElementById(menuId);
        
        // Close all other menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => {
            if(m.id !== menuId) m.classList.remove('active');
        });

        if(menu) {
            menu.classList.toggle('active');
        }
    },

    handleAction: (action, type, id) => {
        console.log(`Action: ${action}, Type: ${type}, ID: ${id}`);
        // Close menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));
        
        if (action === 'delete') {
            if(confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
                alert('Elemento eliminado (simulado)');
                // In real app: call DataManager.delete... and re-render
            }
        } else {
            alert(`Acción: ${action} en ${type} (simulada)`);
        }
    },

    refreshData: async () => {
        const properties = await DataManager.getProperties();
        const totalIncome = await DataManager.calculateTotalIncome();

        // Dashboard Stats
        const totalPropsDisplay = document.getElementById('total-properties-count');
        if (totalPropsDisplay) totalPropsDisplay.textContent = properties.length;
        
        const totalIncomeDisplay = document.getElementById('total-income-display');
        if (totalIncomeDisplay) totalIncomeDisplay.textContent = `$${totalIncome.toLocaleString()}`;
        
        const lateTenantsDisplay = document.getElementById('late-tenants-count');
        if (lateTenantsDisplay) lateTenantsDisplay.textContent = await DataManager.getLateTenantsCount();

        // Properties List
        const propertiesList = document.getElementById('properties-list');
        if (propertiesList) {
            propertiesList.innerHTML = '';
            if (properties.length === 0) {
                propertiesList.innerHTML = '<p style="text-align:center; color:var(--text-muted); grid-column: 1/-1;">No hay propiedades registradas.</p>';
            } else {
                properties.forEach(p => {
                    const card = document.createElement('div');
                    card.className = 'property-card glass-card';
                    card.style.cursor = 'pointer';
                    card.onclick = (e) => {
                        if(e.target.tagName === 'A' || e.target.closest('a')) return;
                        App.openPropertyDetails(p);
                    };
                    
                    const imgHtml = p.photoUrl ? `<img src="${p.photoUrl}" alt="Foto propiedad" style="width:100%; height: 150px; object-fit: cover; border-radius: var(--radius-sm); margin-bottom: var(--spacing-sm);">` : '';
                    
                    const contractHtml = p.contract ? `
                        <div style="margin-top: 8px;">
                            <a href="${p.contract.data}" download="${p.contract.name}" class="btn-secondary" style="font-size: 0.8rem; padding: 4px 8px;">
                                <span class="material-symbols-rounded" style="font-size: 16px;">description</span> Ver Contrato
                            </a>
                        </div>
                    ` : '';

                    const today = new Date();
                    const isOverdue = today.getDate() > p.rentDueDay;
                    const statusHtml = isOverdue 
                        ? `<span class="status-badge status-overdue" style="font-size: 0.7rem; padding: 2px 6px;">Vencido</span>`
                        : `<span class="status-badge status-pending" style="font-size: 0.7rem; padding: 2px 6px;">Al día</span>`;

                    const currentYear = today.getFullYear();
                    const currentMonth = today.getMonth();
                    const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
                    const dueDaySafe = Math.min(p.rentDueDay || 1, maxDaysInMonth);
                    const expirationDate = new Date(currentYear, currentMonth, dueDaySafe);
                    
                    const timeLeft = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
                    
                    const contractEndParam = p.contractEndDate ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;"><strong>Fin Contrato:</strong> ${p.contractEndDate}</p>` : '';

                    card.innerHTML = `
                        ${imgHtml}
                        <div class="property-info" style="padding: var(--spacing-sm);">
                            <h3 style="font-size: 1.1rem; margin-bottom: 4px;">${p.address}</h3>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight: 600; color: var(--primary-color);">$${p.price.toLocaleString()}</span>
                                ${statusHtml}
                            </div>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Inquilino: ${p.tenantName}</p>
                            ${contractEndParam}
                            ${contractHtml}
                        </div>
                    `;
                    propertiesList.appendChild(card);
                });
            }
        }

        // Finances View (Simple)
        const incomeDisplay = document.getElementById('finance-total-income');
        if(incomeDisplay) incomeDisplay.textContent = `$${totalIncome.toLocaleString()}`;
        
        const financeList = document.getElementById('finance-breakdown-list');
        if(financeList) {
            financeList.innerHTML = '';
            properties.forEach(p => {
                // Determine property status (mock logic: check late tenants or use simple "AL DÍA" default)
                // In a real app we'd determine this via DataManager.getPaymentsForMonth()
                const isLate = false; // Could add real logic
                const statusHtml = isLate 
                    ? `<span class="bg-error-container/20 text-error-container font-label text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-sm shrink-0 border border-error-container/30">VENCIDO</span>`
                    : `<span class="bg-surface-variant/10 text-secondary-fixed font-label text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-sm shrink-0 border border-surface-variant/20">AL DÍA</span>`;
                
                const imageUrl = p.photoUrl || "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80";

                const item = document.createElement('div');
                item.className = 'bg-surface-container-lowest dark:bg-on-surface border border-outline-variant/50 dark:border-none rounded-xl overflow-hidden flex flex-col sm:flex-row group transition-all duration-300 hover:bg-surface-container-low dark:hover:bg-on-surface/80 shadow-sm dark:shadow-none';
                item.innerHTML = `
                    <div class="sm:w-64 h-48 sm:h-auto relative overflow-hidden">
                    <img alt="Property Image" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src="${imageUrl}"/>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden"></div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col justify-between">
                    <div class="flex justify-between items-start gap-4 mb-4">
                    <div>
                    <h4 class="font-body font-bold text-lg text-on-surface dark:text-white mb-1">${p.address}</h4>
                    <p class="font-body text-sm text-secondary dark:text-secondary-fixed-dim">${p.ownerName || 'Propietario no asignado'}</p>
                    </div>
                    ${statusHtml}
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-auto">
                    <div>
                    <span class="block font-label text-[10px] text-secondary dark:text-secondary-fixed-dim uppercase tracking-widest mb-1">Inquilino</span>
                    <span class="font-body text-sm text-on-surface dark:text-white font-medium">${p.tenantName || 'Sin asignar'}</span>
                    </div>
                    <div>
                    <span class="block font-label text-[10px] text-secondary dark:text-secondary-fixed-dim uppercase tracking-widest mb-1">Valor Mensual</span>
                    <span class="font-body text-sm text-on-surface dark:text-white font-medium">$${parseFloat(p.price).toLocaleString()}</span>
                    </div>
                    </div>
                    </div>
                `;
                financeList.appendChild(item);
            });
        }

        // REFRESH NEW GRIDS
        App.renderTenants();
        App.renderPayments();
    }
};

// Make App global
window.App = App;

// Remove duplicate init call
// document.addEventListener('DOMContentLoaded', App.init);

// ============================================================
// Marketplace Public Listings Renderer
// ============================================================
async function loadMarketplaceListings() {
    const grid = document.getElementById('marketplace-property-grid');
    const emptyState = document.getElementById('marketplace-empty-state');
    if (!grid) return;

    try {
        const properties = await window.DataManager.getPublicMarketplaceProperties(12);

        // Remove skeleton cards
        grid.querySelectorAll('.marketplace-skeleton').forEach(el => el.remove());

        if (!properties || properties.length === 0) {
            grid.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');

        properties.forEach((prop, i) => {
            const card = createMarketplaceCard(prop, i);
            grid.appendChild(card);
        });

        // Re-observe for scroll animations
        grid.querySelectorAll('.animate-on-scroll').forEach(el => {
            if (window.marketplaceObserver) window.marketplaceObserver.observe(el);
        });

    } catch (err) {
        console.error('Error loading marketplace listings:', err);
        grid.querySelectorAll('.marketplace-skeleton').forEach(el => el.remove());
        if (emptyState) emptyState.classList.remove('hidden');
    }
}

function createMarketplaceCard(prop, index) {
    const delays = ['delay-100', 'delay-200', 'delay-300'];
    const delay = delays[index % 3];

    let extraInfo = {};
    if (prop.description && prop.description.includes('Detalles: ')) {
        try {
            const jsonStr = prop.description.split('Detalles: ')[1];
            extraInfo = JSON.parse(jsonStr);
        } catch (e) {
            console.warn('Could not parse extraInfo from description');
        }
    }

    const operacionLabel = {
        'venta': 'EN VENTA',
        'alquiler': 'EN ALQUILER',
        'temporada': 'TEMPORADA'
    }[extraInfo.operacion?.toLowerCase()] || extraInfo.operacion?.toUpperCase() || 'EN VENTA';

    const moneda = extraInfo.moneda === 'USD' ? 'U$S' : '$';
    const precio = prop.price
        ? `${moneda} ${Number(prop.price).toLocaleString('es-AR')}`
        : 'Consultar precio';

    const ubicacion = prop.address || 'Ubicación no especificada';

    const titulo = prop.title || 'Propiedad';

    // Get first image from multimedia if available
    let fotos = prop.images || [];
    if (prop.propiedad_imagenes && prop.propiedad_imagenes.length > 0) {
        // Sort by 'orden' and map to URLs
        const sortedImages = prop.propiedad_imagenes.sort((a, b) => a.orden - b.orden);
        fotos = sortedImages.map(img => img.url);
    }
    const imgSrc = (Array.isArray(fotos) && fotos.length > 0)
        ? fotos[0]
        : 'img/hero-marketplace.jpg';

    const dormitorios = extraInfo.dormitorios || 0;
    const banos = extraInfo.banos || 0;
    const supCubierta = extraInfo.sup_cubierta;

    const card = document.createElement('div');
    card.className = `group cursor-pointer animate-on-scroll ${delay}`;
    card.innerHTML = `
        <div class="relative overflow-hidden rounded-xl mb-6 aspect-[4/5] border-none shadow-none">
            <img alt="${titulo}"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                src="${imgSrc}"
                onerror="this.src='img/hero-marketplace.jpg'">
            <div class="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded shadow-sm border-none">
                <span class="text-[10px] font-bold tracking-widest text-primary uppercase">${operacionLabel}</span>
            </div>
        </div>
        <div class="space-y-3">
            <div class="flex justify-between items-start gap-2">
                <h3 class="font-headline text-xl font-bold text-on-background leading-tight line-clamp-2">${titulo}</h3>
                <span class="text-xl font-bold text-primary whitespace-nowrap shrink-0">${precio}</span>
            </div>
            <p class="text-secondary flex items-center gap-1 text-sm border-none">
                <span class="material-symbols-outlined text-base">location_on</span>
                ${ubicacion || 'Ubicación no especificada'}
            </p>
            <div class="flex flex-col gap-4 pt-4 border-t border-outline-variant/20">
                <div class="flex items-center gap-6 text-secondary">
                    ${dormitorios > 0 ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-lg">bed</span><span class="text-sm font-semibold">${dormitorios} Dorm.</span></div>` : ''}
                    ${banos > 0 ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-lg">bathtub</span><span class="text-sm font-semibold">${banos} Baños</span></div>` : ''}
                    ${supCubierta ? `<div class="flex items-center gap-2"><span class="material-symbols-outlined text-lg">square_foot</span><span class="text-sm font-semibold">${supCubierta} m²</span></div>` : ''}
                </div>
                <button class="w-full bg-surface-container hover:bg-primary text-on-surface hover:text-on-primary font-bold py-3 rounded-lg transition-all duration-300 border border-outline-variant/20 flex items-center justify-center gap-2 group/btn">
                    Ver más
                    <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
        </div>
    `;
    return card;
}
// Real Interactive Map using Google Maps JS API
window.initGoogleMap = async function() {
    const mapContainer = document.getElementById('real-map-container');
    if (!mapContainer) return;

    // Mendoza coordinates
    const initialPos = { lat: -32.898684, lng: -68.847522 };

    window.propertyMap = new google.maps.Map(mapContainer, {
        zoom: 15,
        center: initialPos,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapId: 'property_wizard_map',
    });

    // Use AdvancedMarkerElement (modern API)
    const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
    window.propertyMarker = new AdvancedMarkerElement({
        position: initialPos,
        map: window.propertyMap,
        title: "Arrastra para ajustar tu ubicación",
        gmpDraggable: true,
    });

    const updateAddressUI = (latLng) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;
                const label = document.getElementById('map-address-label');
                if (label) label.textContent = address;
                
                const inputCalle = document.getElementById('calle-altura');
                if (inputCalle && !inputCalle.value) {
                    const addressComponents = results[0].address_components;
                    let route = '';
                    let streetNumber = '';
                    addressComponents.forEach(comp => {
                        if (comp.types.includes('route')) route = comp.long_name;
                        if (comp.types.includes('street_number')) streetNumber = comp.long_name;
                    });
                    if (route) {
                        inputCalle.value = `${route} ${streetNumber}`.trim();
                    }
                }
            }
        });
    };
    
    // Listen for map click
    window.propertyMap.addListener('click', function(e) {
        window.propertyMarker.position = e.latLng;
        window.propertyMap.panTo(e.latLng);
        updateAddressUI(e.latLng);
    });
    
    // Listen for drag end on AdvancedMarkerElement
    window.propertyMarker.addListener('dragend', function() {
        const pos = window.propertyMarker.position;
        updateAddressUI(pos);
    });

    // --- Autocomplete & Auto-fill (PlaceAutocompleteElement - modern API) ---
    const inputCalle = document.getElementById('calle-altura');
    if (inputCalle) {
        const autocomplete = new google.maps.places.Autocomplete(inputCalle, {
            componentRestrictions: { country: "ar" },
            fields: ["address_components", "geometry", "formatted_address", "name"],
        });

        // Prevent form submission on enter to not accidentally submit the wizard
        inputCalle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            // Update map
            window.propertyMap.panTo(place.geometry.location);
            window.propertyMarker.position = place.geometry.location;
            
            const label = document.getElementById('map-address-label');
            if (label) label.textContent = place.formatted_address;

            // Extract components
            let provinciaStr = '';
            let departamentoStr = '';
            
            for (const component of place.address_components) {
                const types = component.types;
                if (types.includes('administrative_area_level_1')) {
                    provinciaStr = component.long_name;
                }
                if (types.includes('administrative_area_level_2') || types.includes('locality')) {
                    if (!departamentoStr) departamentoStr = component.long_name;
                }
            }

            // Clean string helper for flexible matching
            const cleanStr = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

            const provSelect = document.getElementById('provincia');
            const depSelect = document.getElementById('ciudad');

            if (provSelect && provinciaStr) {
                const searchProv = cleanStr(provinciaStr);
                let matchedProv = false;
                for (let i = 0; i < provSelect.options.length; i++) {
                    const optText = cleanStr(provSelect.options[i].text);
                    // Match province names
                    if (optText.includes(searchProv) || searchProv.includes(optText)) {
                        provSelect.selectedIndex = i;
                        matchedProv = true;
                        provSelect.dispatchEvent(new Event('change'));
                        
                        // Clear error UI if present
                        const errProv = document.getElementById('error-provincia');
                        if (errProv) errProv.classList.add('hidden');
                        break;
                    }
                }

                // If province matched, try to match department
                if (matchedProv && depSelect && departamentoStr) {
                    setTimeout(() => {
                        const searchDep = cleanStr(departamentoStr);
                        for (let i = 0; i < depSelect.options.length; i++) {
                            const optText = cleanStr(depSelect.options[i].text);
                            if (optText.includes(searchDep) || searchDep.includes(optText)) {
                                depSelect.selectedIndex = i;
                                depSelect.dispatchEvent(new Event('change'));
                                
                                const errDep = document.getElementById('error-ciudad');
                                if (errDep) errDep.classList.add('hidden');
                                break;
                            }
                        }
                    }, 50); // slight delay to allow department list to render after province change
                }
            }
        });
    }
};

// Toggle for accordions in Step 3
window.toggleAccordion = function(contentId, btn) {
    const content = document.getElementById(contentId);
    if (!content) return;
    
    const icon = btn.querySelector('.accordion-icon');
    
    if (content.classList.contains('grid-rows-[0fr]')) {
        // Abrir
        content.classList.remove('grid-rows-[0fr]');
        content.classList.add('grid-rows-[1fr]');
        if (icon) {
            icon.classList.add('rotate-180');
        }
    } else {
        // Cerrar
        content.classList.remove('grid-rows-[1fr]');
        content.classList.add('grid-rows-[0fr]');
        if (icon) {
            icon.classList.remove('rotate-180');
        }
    }
};

// Step 3 Selected Features Chips and Search Logic
document.addEventListener('DOMContentLoaded', () => {
    const formExtras = document.getElementById('form-extras');
    const selectedFeaturesContainer = document.getElementById('selected-features-container');
    const searchInput = document.querySelector('#form-extras input[type="text"][placeholder="Ej. Permite mascotas"]');

    if (formExtras && selectedFeaturesContainer) {
        const featureCheckboxes = formExtras.querySelectorAll('.checkbox-wrapper input[type="checkbox"]');
        
        // Logic for updating chips
        featureCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateFeatureChips);
        });

        function updateFeatureChips() {
            selectedFeaturesContainer.innerHTML = '';
            
            featureCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    const label = checkbox.nextElementSibling;
                    const textSpan = label.querySelector('span');
                    if (!textSpan) return;
                    
                    const text = textSpan.textContent.trim();
                    
                    const chip = document.createElement('div');
                    chip.className = 'inline-flex items-center gap-2 bg-[#cfd7db] dark:bg-[#282828] rounded-lg px-3 py-1.5 transition-colors';
                    
                    const spanText = document.createElement('span');
                    spanText.className = 'font-body text-on-background dark:text-[#f1f1f1] text-sm whitespace-nowrap';
                    spanText.textContent = text;
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'w-4 h-4 rounded-full bg-[#f24822] flex items-center justify-center hover:opacity-80 transition-opacity shrink-0';
                    removeBtn.innerHTML = `<span class="material-symbols-outlined text-white" style="font-size: 12px; font-weight: bold;">close</span>`;
                    
                    removeBtn.addEventListener('click', () => {
                        checkbox.checked = false;
                        updateFeatureChips();
                    });
                    
                    chip.appendChild(spanText);
                    chip.appendChild(removeBtn);
                    
                    selectedFeaturesContainer.appendChild(chip);
                }
            });
        }

        // Logic for search filtering
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                
                // Open all accordions if there's text
                const accordions = formExtras.querySelectorAll('.accordion-btn');
                const contents = formExtras.querySelectorAll('.transition-\\[grid-template-rows\\]');
                
                if (term.length > 0) {
                    contents.forEach(content => {
                        content.classList.remove('grid-rows-[0fr]');
                        content.classList.add('grid-rows-[1fr]');
                    });
                    accordions.forEach(btn => {
                        const icon = btn.querySelector('.accordion-icon');
                        if (icon) icon.classList.add('rotate-180');
                    });
                }
                
                // Filter items
                featureCheckboxes.forEach(checkbox => {
                    const wrapper = checkbox.closest('.checkbox-wrapper');
                    const label = checkbox.nextElementSibling;
                    const textSpan = label.querySelector('span');
                    
                    if (wrapper && textSpan) {
                        const text = textSpan.textContent.toLowerCase();
                        if (text.includes(term)) {
                            wrapper.style.display = '';
                        } else {
                            wrapper.style.display = 'none';
                        }
                    }
                });
            });
        }
    }
});

// Landing propietarios: static carousel controlled by step buttons
document.addEventListener('DOMContentLoaded', () => {
    const carousel = document.querySelector('.owner-steps-carousel');
    if (!carousel) return;

    const tabs = Array.from(carousel.querySelectorAll('.owner-step-tab'));
    const track = carousel.querySelector('.owner-steps-track');
    const slides = Array.from(carousel.querySelectorAll('.owner-step-slide'));
    if (!tabs.length || !track || !slides.length) return;

    let activeIndex = 0;
    let frameRequest = null;

    const positionCarousel = () => {
        const activeSlide = slides[activeIndex];
        const wrap = carousel.querySelector('.owner-steps-track-wrap');
        if (!activeSlide || !wrap) return;

        if (frameRequest) cancelAnimationFrame(frameRequest);
        frameRequest = requestAnimationFrame(() => {
            const activeCenter = activeSlide.offsetLeft + activeSlide.offsetWidth / 2;
            const wrapCenter = wrap.clientWidth / 2;
            track.style.transform = `translate3d(${wrapCenter - activeCenter}px, 0, 0)`;
            frameRequest = null;
        });
    };

    const setActiveStep = (index) => {
        activeIndex = index;

        tabs.forEach((tab, tabIndex) => {
            const isActive = tabIndex === activeIndex;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        slides.forEach((slide, slideIndex) => {
            slide.classList.toggle('is-active', slideIndex === activeIndex);
        });

        positionCarousel();
    };

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const nextIndex = Number(tab.dataset.ownerStep);
            if (Number.isNaN(nextIndex)) return;
            setActiveStep(nextIndex);
        });
    });

    window.addEventListener('resize', positionCarousel);
    slides.forEach((slide) => {
        const image = slide.querySelector('img');
        if (image && !image.complete) image.addEventListener('load', positionCarousel, { once: true });
    });

    setActiveStep(0);
    requestAnimationFrame(positionCarousel);
});

// Landing propietarios FAQ accordion
document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.owner-faq-item');
    if (!faqItems.length) return;

    faqItems.forEach((item) => {
        const button = item.querySelector('.owner-faq-question');
        if (!button) return;

        button.addEventListener('click', () => {
            const isOpen = item.classList.toggle('is-open');
            button.setAttribute('aria-expanded', String(isOpen));
        });
    });
});

// Disable number inputs scroll wheel behavior globally
document.addEventListener('wheel', function(event) {
    if (document.activeElement.type === 'number') {
        document.activeElement.blur();
    }
});

// ============================================================
// User Dropdown Menu & Mis Avisos
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const avatarBtn = document.getElementById('user-avatar-btn');
    const dropdownMenu = document.getElementById('user-dropdown-menu');
    const menuContainer = document.getElementById('user-menu-container');
    
    if (!avatarBtn || !dropdownMenu) return;
    
    let isDropdownOpen = false;
    
    // Toggle dropdown
    const openDropdown = () => {
        dropdownMenu.classList.remove('hidden');
        // Force reflow for animation
        void dropdownMenu.offsetWidth;
        dropdownMenu.classList.remove('opacity-0', 'translate-y-2');
        dropdownMenu.classList.add('opacity-100', 'translate-y-0');
        avatarBtn.setAttribute('aria-expanded', 'true');
        isDropdownOpen = true;
    };
    
    const closeDropdown = () => {
        dropdownMenu.classList.remove('opacity-100', 'translate-y-0');
        dropdownMenu.classList.add('opacity-0', 'translate-y-2');
        avatarBtn.setAttribute('aria-expanded', 'false');
        isDropdownOpen = false;
        setTimeout(() => {
            if (!isDropdownOpen) {
                dropdownMenu.classList.add('hidden');
            }
        }, 200);
    };
    
    avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isDropdownOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (isDropdownOpen && menuContainer && !menuContainer.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isDropdownOpen) {
            closeDropdown();
        }
    });
    
    // Populate user info from Supabase
    async function populateUserDropdown() {
        try {
            const profile = await window.DataManager.getUserProfile();
            if (profile) {
                const nameEl = document.getElementById('dropdown-user-name');
                const idEl = document.getElementById('dropdown-user-id');
                const initialEl = document.getElementById('user-avatar-initial');
                
                if (nameEl) nameEl.textContent = profile.full_name || profile.email || 'Usuario';
                if (idEl) idEl.textContent = `Identificador: ${profile.id.substring(0, 8)}`;
                if (initialEl && profile.full_name) {
                    initialEl.textContent = profile.full_name.charAt(0).toUpperCase();
                }
            }
        } catch (err) {
            console.warn('Could not load user profile for dropdown:', err);
        }
    }
    
    // Listen for auth state changes to populate
    window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            if (session) populateUserDropdown();
        }
        if (event === 'SIGNED_OUT') {
            const nameEl = document.getElementById('dropdown-user-name');
            const idEl = document.getElementById('dropdown-user-id');
            const initialEl = document.getElementById('user-avatar-initial');
            if (nameEl) nameEl.textContent = 'Usuario';
            if (idEl) idEl.textContent = 'Identificador';
            if (initialEl) initialEl.textContent = 'U';
        }
    });
    
    // Initial load
    populateUserDropdown();
    
    // Logout handler
    const logoutBtn = document.getElementById('menu-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            closeDropdown();
            await window.DataManager.logout();
            // Redirect to marketplace landing
            document.querySelectorAll('#mis-avisos-view, #publish-property-view, #app, #main-layout').forEach(el => {
                if (el) el.classList.add('hidden');
            });
            const landing = document.getElementById('landing-marketplace-view');
            if (landing) landing.classList.remove('hidden');
            window.scrollTo(0, 0);
        });
    }
    
    // ============================================================
    // Mis Avisos Navigation & Rendering
    // ============================================================
    let allAvisos = [];
    const menuMisAvisos = document.getElementById('menu-mis-avisos');
    const misAvisosView = document.getElementById('mis-avisos-view');
    const landingView = document.getElementById('landing-marketplace-view');
    const btnBackFromAvisos = document.getElementById('btn-back-from-avisos');
    const btnNuevoAviso = document.getElementById('btn-nuevo-aviso');
    const btnPublicarEmpty = document.getElementById('btn-publicar-empty');

    // Sync avatar initial in avisos nav
    function syncAvisosAvatar() {
        const srcInitial = document.getElementById('user-avatar-initial');
        const targets = document.querySelectorAll('.avisos-avatar-initial');
        if (srcInitial) targets.forEach(t => t.textContent = srcInitial.textContent);
    }

    // Mobile filter toggle
    const mobileFilterToggle = document.getElementById('mobile-filter-toggle');
    const mobileFiltersDrawer = document.getElementById('mobile-filters-drawer');
    if (mobileFilterToggle && mobileFiltersDrawer) {
        mobileFilterToggle.addEventListener('click', () => mobileFiltersDrawer.classList.toggle('hidden'));
    }

    // Avisos avatar btn -> go back
    const avisosAvatarBtn = document.getElementById('avisos-user-avatar-btn');
    if (avisosAvatarBtn) {
        avisosAvatarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isDropdownOpen) closeDropdown();
            else openDropdown();
        });
    }
    
    // Navigate to Mis Avisos
    if (menuMisAvisos) {
        menuMisAvisos.addEventListener('click', async () => {
            closeDropdown();
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                sessionStorage.setItem('postLoginRedirect', 'misAvisos');
                document.getElementById('landing-marketplace-view')?.classList.add('hidden');
                document.getElementById('main-layout')?.classList.add('hidden');
                document.getElementById('login-view')?.classList.remove('hidden');
                return;
            }
            syncAvisosAvatar();
            if (landingView) landingView.classList.add('hidden');
            if (misAvisosView) misAvisosView.classList.remove('hidden');
            window.scrollTo(0, 0);
            loadMisAvisos();
        });
    }

    // Back from Mis Avisos
    if (btnBackFromAvisos) {
        btnBackFromAvisos.addEventListener('click', (e) => {
            e.preventDefault();
            if (misAvisosView) misAvisosView.classList.add('hidden');
            if (landingView) landingView.classList.remove('hidden');
            window.scrollTo(0, 0);
        });
    }
    
    // Nuevo aviso from Mis Avisos
    const goToPublish = async () => {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) return;
        
        if (misAvisosView) misAvisosView.classList.add('hidden');
        if (landingView) landingView.classList.add('hidden');
        const appElem = document.getElementById('app');
        if (appElem) appElem.classList.add('hidden');
        
        window.currentWizardStep = 1;
        const publishElem = document.getElementById('publish-property-view');
        if (publishElem) {
            publishElem.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    };
    
    if (btnNuevoAviso) btnNuevoAviso.addEventListener('click', goToPublish);
    if (btnPublicarEmpty) btnPublicarEmpty.addEventListener('click', goToPublish);
    
    // Search & sort handlers
    const avisosSearch = document.getElementById('avisos-search');
    const avisosSort = document.getElementById('avisos-sort');
    if (avisosSearch) avisosSearch.addEventListener('input', () => renderFilteredAvisos());
    if (avisosSort) avisosSort.addEventListener('change', () => renderFilteredAvisos());

    function renderFilteredAvisos() {
        const term = (avisosSearch?.value || '').toLowerCase();
        const sortVal = avisosSort?.value || 'recent';
        let filtered = allAvisos.filter(a => {
            const searchable = [a.titulo_aviso, a.calle_altura, a.ciudad, a.provincia, a.tipo_propiedad, a.id?.substring(0,8)].filter(Boolean).join(' ').toLowerCase();
            return searchable.includes(term);
        });
        if (sortVal === 'oldest') filtered.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortVal === 'price-asc') filtered.sort((a,b) => (Number(a.precio)||0) - (Number(b.precio)||0));
        else if (sortVal === 'price-desc') filtered.sort((a,b) => (Number(b.precio)||0) - (Number(a.precio)||0));
        else filtered.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
        renderAvisosCards(filtered);
    }

    function renderAvisosCards(avisos) {
        const grid = document.getElementById('mis-avisos-grid');
        const emptyState = document.getElementById('mis-avisos-empty');
        const countEl = document.getElementById('avisos-count');
        if (!grid) return;
        grid.querySelectorAll('.aviso-card').forEach(el => el.remove());
        if (countEl) countEl.innerHTML = `<span class="material-symbols-outlined text-lg text-zinc-400">search</span> Se encontraron <b>${avisos.length}</b> aviso${avisos.length !== 1 ? 's' : ''}`;
        if (!avisos.length) {
            grid.classList.add('hidden');
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }
        if (emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        avisos.forEach((a, i) => grid.appendChild(createAvisoCard(a, i)));
    }

    function populateFilters(avisos) {
        const tipoMap = {}, opMap = {}, cityMap = {};
        avisos.forEach(a => {
            if (a.tipo_propiedad) tipoMap[a.tipo_propiedad] = (tipoMap[a.tipo_propiedad]||0)+1;
            if (a.operacion) opMap[a.operacion] = (opMap[a.operacion]||0)+1;
            if (a.ciudad) cityMap[a.ciudad] = (cityMap[a.ciudad]||0)+1;
        });
        const tipoLabels = {'departamento':'Departamento','casa':'Casa','ph':'PH','terreno':'Terreno','local-comercial':'Local comercial','oficina-comercial':'Oficina comercial','quinta-vacacional':'Quinta Vacacional'};
        const opLabels = {'venta':'Venta','alquiler':'Alquiler','temporada':'Temporada','on':'Venta'};
        const makeFilterItem = (label, count) => `<a class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-red-400 cursor-pointer transition-colors py-0.5"><span>${label}</span><span class="text-xs text-zinc-400">(${count})</span></a>`;
        ['', '-mobile'].forEach(suffix => {
            const tipoEl = document.getElementById('filter-tipo'+suffix);
            const opEl = document.getElementById('filter-operacion'+suffix);
            const cityEl = document.getElementById('filter-ciudad'+suffix);
            if (tipoEl) tipoEl.innerHTML = Object.entries(tipoMap).map(([k,v]) => makeFilterItem(tipoLabels[k]||k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (opEl) opEl.innerHTML = Object.entries(opMap).map(([k,v]) => makeFilterItem(opLabels[k]||k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (cityEl) cityEl.innerHTML = Object.entries(cityMap).map(([k,v]) => makeFilterItem(k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
        });
    }

    async function loadMisAvisos() {
        const grid = document.getElementById('mis-avisos-grid');
        const emptyState = document.getElementById('mis-avisos-empty');
        const countEl = document.getElementById('avisos-count');
        if (!grid) return;
        grid.querySelectorAll('.mis-avisos-skeleton').forEach(el => el.style.display = '');
        grid.querySelectorAll('.aviso-card').forEach(el => el.remove());
        if (emptyState) emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        if (countEl) countEl.innerHTML = `<span class="material-symbols-outlined text-lg text-zinc-400 animate-spin">progress_activity</span> Cargando avisos...`;
        try {
            allAvisos = await window.DataManager.getUserMarketplaceProperties();
            grid.querySelectorAll('.mis-avisos-skeleton').forEach(el => el.remove());
            populateFilters(allAvisos);
            renderFilteredAvisos();
        } catch (err) {
            console.error('Error loading mis avisos:', err);
            grid.querySelectorAll('.mis-avisos-skeleton').forEach(el => el.remove());
            if (emptyState) emptyState.classList.remove('hidden');
            if (countEl) countEl.innerHTML = `<span class="material-symbols-outlined text-lg text-red-400">error</span> Error al cargar`;
        }
    }

    function createAvisoCard(aviso, index) {
        const statusCfg = {
            'disponible': {label:'Disponible', dot:'bg-emerald-400', text:'text-emerald-700 dark:text-emerald-300'},
            'draft': {label:'Borrador', dot:'bg-amber-400', text:'text-amber-700 dark:text-amber-300'},
            'published': {label:'Publicado', dot:'bg-emerald-400', text:'text-emerald-700 dark:text-emerald-300'},
            'alquilada': {label:'Alquilada', dot:'bg-blue-400', text:'text-blue-700 dark:text-blue-300'},
            'mantenimiento': {label:'Mantenimiento', dot:'bg-zinc-400', text:'text-zinc-600 dark:text-zinc-400'},
            'paused': {label:'Pausado', dot:'bg-zinc-400', text:'text-zinc-600 dark:text-zinc-400'},
            'expired': {label:'Expirado', dot:'bg-red-400', text:'text-red-600 dark:text-red-400'}
        };
        const st = statusCfg[aviso.status] || statusCfg['draft'];

        // Parse extra info from description JSON if present
        let extraInfo = {};
        if (aviso.description && aviso.description.includes('Detalles: ')) {
            try { extraInfo = JSON.parse(aviso.description.split('Detalles: ')[1]); } catch(e) {}
        }

        const tipoLabels = {'departamento':'Departamento','casa':'Casa','ph':'PH','terreno':'Terreno','local-comercial':'Local comercial','oficina-comercial':'Oficina comercial','quinta-vacacional':'Quinta Vacacional'};
        const opLabels = {'venta':'Venta','alquiler':'Alquiler','temporada':'Temporada','on':'Venta'};
        const tipo = tipoLabels[extraInfo.tipo_propiedad] || extraInfo.tipo_propiedad || 'Propiedad';
        const op = opLabels[extraInfo.operacion?.toLowerCase()] || extraInfo.operacion || '';
        const moneda = (extraInfo.moneda === 'USD') ? 'U$S' : '$';
        const precio = aviso.price ? `${moneda} ${Number(aviso.price).toLocaleString('es-AR')}` : 'Consultar';
        const ubicacion = aviso.address || 'Sin ubicación';
        const titulo = aviso.title || `${tipo} en ${op}`;
        const date = aviso.created_at ? new Date(aviso.created_at).toLocaleDateString('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}) : '';
        const shortId = aviso.id ? aviso.id.substring(0,8) : '';

        // Get image from propiedad_imagenes join or images array
        let imgSrc = 'img/hero-marketplace.jpg';
        if (aviso.propiedad_imagenes && aviso.propiedad_imagenes.length > 0) {
            const sorted = aviso.propiedad_imagenes.sort((a,b) => a.orden - b.orden);
            imgSrc = sorted[0].url;
        } else if (aviso.images && aviso.images.length > 0) {
            imgSrc = aviso.images[0];
        }

        const dormitorios = extraInfo.dormitorios || 0;
        const banos = extraInfo.banos || 0;
        const supCubierta = extraInfo.sup_cubierta || '';

        // Completeness percentage
        const fields = [aviso.title, aviso.price, aviso.address, extraInfo.tipo_propiedad, extraInfo.operacion, dormitorios, banos, supCubierta, aviso.description, aviso.images?.length || aviso.propiedad_imagenes?.length];
        const filled = fields.filter(Boolean).length;
        const pct = Math.round((filled / fields.length) * 100);
        const pctColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const circumference = 2 * Math.PI * 18;
        const strokeOffset = circumference - (pct / 100) * circumference;

        const card = document.createElement('div');
        card.className = 'aviso-card bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 p-4 md:p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group';
        card.innerHTML = `
            <div class="flex gap-4 md:gap-5">
                <!-- Thumbnail -->
                <div class="w-[90px] h-[68px] sm:w-[120px] sm:h-[85px] md:w-[140px] md:h-[100px] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 relative">
                    <img src="${imgSrc}" alt="${titulo}" class="w-full h-full object-cover" onerror="this.src='img/hero-marketplace.jpg'">
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-primary dark:text-red-400 uppercase tracking-wider">${tipo}</span>
                        <div class="flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full ${st.dot} inline-block"></span>
                            <span class="text-xs font-semibold ${st.text}">${st.label}</span>
                        </div>
                    </div>
                    <h3 class="font-headline text-sm md:text-base font-bold text-on-background dark:text-white leading-snug line-clamp-1 mb-0.5">${titulo}</h3>
                    <p class="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-1">${ubicacion}</p>
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-medium text-zinc-600 dark:text-zinc-300">${op}</span>
                        <span class="text-sm font-bold text-on-background dark:text-white">${precio}</span>
                    </div>
                </div>
                <!-- Completion ring (desktop) -->
                <div class="hidden md:flex flex-col items-center justify-center gap-1 flex-shrink-0 w-16">
                    <svg width="44" height="44" viewBox="0 0 44 44" class="transform -rotate-90">
                        <circle cx="22" cy="22" r="18" stroke-width="3" fill="none" class="stroke-zinc-200 dark:stroke-zinc-700"/>
                        <circle cx="22" cy="22" r="18" stroke-width="3" fill="none" stroke="${pctColor}" stroke-linecap="round" stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}"/>
                    </svg>
                    <span class="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 -mt-8">${pct}%</span>
                </div>
                <!-- Stats (desktop) -->
                <div class="hidden lg:flex items-center gap-6 flex-shrink-0">
                    <div class="text-center min-w-[70px]"><p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Exposición</p><p class="text-sm font-bold text-zinc-700 dark:text-zinc-300">-</p></div>
                    <div class="text-center min-w-[80px]"><p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Visualizaciones</p><p class="text-sm font-bold text-zinc-700 dark:text-zinc-300">-</p></div>
                    <div class="text-center min-w-[70px]"><p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Interesados</p><p class="text-sm font-bold text-primary dark:text-red-400">Ver consultas</p></div>
                </div>
            </div>
            <!-- Footer -->
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div class="flex items-center gap-3 md:gap-5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>ID <b class="text-primary dark:text-red-400">${shortId}</b></span>
                    <span>Creado ${date}</span>
                    <span class="hidden sm:inline">${dormitorios ? dormitorios+' dorm.' : ''} ${banos ? banos+' baños' : ''} ${supCubierta ? supCubierta+'m²' : ''}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Ver"><span class="material-symbols-outlined text-lg">visibility</span></button>
                    <button class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Editar"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Compartir"><span class="material-symbols-outlined text-lg">share</span></button>
                </div>
            </div>
        `;
        return card;
    }
});
