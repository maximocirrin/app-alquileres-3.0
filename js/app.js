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
        const btnAdministrar = document.getElementById('btn-administrar');
        if (btnAdministrar) {
            btnAdministrar.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('landing-marketplace-view').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
            });
        }

        const btnPublicarMarketplace = document.getElementById('btn-publicar-marketplace');
        if (btnPublicarMarketplace) {
            btnPublicarMarketplace.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('landing-marketplace-view').classList.add('hidden');
                const appElem = document.getElementById('app');
                if(appElem) appElem.classList.add('hidden');
                const publishElem = document.getElementById('publish-property-view');
                if(publishElem) {
                    publishElem.classList.remove('hidden');
                    window.scrollTo(0, 0);
                }
            });
        }

        const btnBackFromPublish = document.getElementById('btn-back-from-publish');
        if (btnBackFromPublish) {
            btnBackFromPublish.addEventListener('click', (e) => {
                e.preventDefault();
                const publishElem = document.getElementById('publish-property-view');
                if(publishElem) publishElem.classList.add('hidden');
                document.getElementById('landing-marketplace-view').classList.remove('hidden');
                window.scrollTo(0, 0);
            });
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
                    console.log('¡Datos Ubicación completos y validados! (Acá iría la transición a Características)');
                }
            });
        }
        
        // Provincia -> Ciudad dependent dropdown
        const selectProvincia = document.getElementById('provincia');
        const selectCiudad = document.getElementById('ciudad');
        
        if (selectProvincia && selectCiudad) {
            const ciudadesConfig = {
                'buenos-aires': [
                    { value: 'la-plata', label: 'La Plata' },
                    { value: 'mar-del-plata', label: 'Mar del Plata' },
                    { value: 'tandil', label: 'Tandil' },
                    { value: 'bahia-blanca', label: 'Bahía Blanca' }
                ],
                'caba': [
                    { value: 'palermo', label: 'Palermo' },
                    { value: 'belgrano', label: 'Belgrano' },
                    { value: 'recoleta', label: 'Recoleta' },
                    { value: 'caballito', label: 'Caballito' }
                ],
                'cordoba': [
                    { value: 'cordoba-cap', label: 'Córdoba Capital' },
                    { value: 'villa-carlos-paz', label: 'Villa Carlos Paz' }
                ],
                'santa-fe': [
                    { value: 'rosario', label: 'Rosario' },
                    { value: 'santa-fe-cap', label: 'Santa Fe Capital' }
                ],
                'mendoza': [
                    { value: 'mendoza-cap', label: 'Mendoza Capital' },
                    { value: 'san-rafael', label: 'San Rafael' }
                ]
            };
            
            selectProvincia.addEventListener('change', (e) => {
                const p = e.target.value;
                selectCiudad.innerHTML = '<option disabled selected value="">Selecciona la ciudad</option>';
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

        // Real Interactive Map using Google Maps JS API
        window.initGoogleMap = function() {
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
            });

            // Use default Google Maps red marker (draggable)
            window.propertyMarker = new google.maps.Marker({
                position: initialPos,
                map: window.propertyMap,
                draggable: true,
                title: "Arrastra para ajustar tu ubicación",
                animation: google.maps.Animation.DROP,
            });
            
            // Listen for drag end
            window.propertyMarker.addListener('dragend', function() {
                const pos = window.propertyMarker.getPosition();
                console.log(`Pin dropped at Lat: ${pos.lat()}, Lng: ${pos.lng()}`);
                // Could call reverse geocoding here to auto-fill address
            });
        };

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
                // Find currently active sidebar item
                const sidebarArray = Array.from(sidebarItems);
                const activeIndex = sidebarArray.findIndex(item => item.classList.contains('active'));
                
                if (activeIndex !== -1 && activeIndex < sidebarArray.length - 1) {
                    // Navigate to next sub-step in Step 1
                    sidebarArray[activeIndex + 1].click();
                } else {
                    // We are at the last sub-step of Step 1, proceed to Step 2 (Multimedia)
                    // TODO: Implement the transition to multimedia. For now, we will add a console.log or alert.
                    alert("Avanzando al Paso 2: Multimedia (En construcción)");
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
