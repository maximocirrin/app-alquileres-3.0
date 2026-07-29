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
            await App.checkAuth();
            App.setupTheme();
            App.setupEventListeners();
            App.applyPageContext();

            // Load marketplace public listings if defined
            if (typeof loadMarketplaceListings === 'function') {
                loadMarketplaceListings();
            }

            // Check if user is logged in
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            const user = session?.user || await DataManager.getCurrentUser();
            const params = new URLSearchParams(window.location.search);
            const shouldOpenPublish = params.get('publish') === '1';
            const shouldOpenAdmin = params.get('admin') === '1';
            const viewParam = params.get('view');
            const pageContext = App.getPageContext();

            if (user) {
                if (pageContext === 'admin' || shouldOpenAdmin || viewParam === 'properties') {
                    await App.openAdminDashboard(user);
                    if (viewParam === 'properties') {
                        App.navigateTo('properties-view');
                    }
                    if (shouldOpenAdmin || viewParam) window.history.replaceState({}, document.title, window.location.pathname);
                } else if (shouldOpenPublish) {
                    App.showPublishWizard();
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    App.showMainApp(user);
                }
            } else {
                if (shouldOpenPublish) {
                    window.location.replace('login.html?redirect=publish');
                } else if (pageContext === 'admin' || shouldOpenAdmin) {
                    window.location.replace('login.html?redirect=admin&mode=login');
                } else if (pageContext === 'default') {
                    App.showLogin();
                } else {
                    App.applyPageContext();
                }
            }
        } catch (error) {
            console.error("Initialization error:", error);
        }
    },

    checkAuth: async () => {
        const user = await DataManager.getCurrentUser();
        const loginView = document.getElementById('login-view');
        if (!user && loginView && !loginView.classList.contains('hidden')) {
            // Stay on login
        } else if (!user && App.getPageContext() === 'default') {
            App.showLogin();
        }
    },

    logout: async () => {
        try {
            if (window.DataManager) {
                await window.DataManager.logout();
            }
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error during logout:", error);
            window.location.href = 'index.html';
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

    getPageContext: () => {
        const page = window.location.pathname.split('/').pop() || 'index.html';
        if (page === 'propietarios.html') return 'propietarios';
        if (page === 'administrador.html') return 'admin';
        if (page === 'inquilinos.html' || page === 'index.html') return 'inquilinos';
        return 'default';
    },

    applyPageContext: () => {
        const context = App.getPageContext();
        const marketplace = document.getElementById('landing-marketplace-view');
        const propietarios = document.getElementById('landing-propietarios-view');
        const app = document.getElementById('app');

        if (context === 'propietarios') {
            marketplace?.classList.add('hidden');
            propietarios?.classList.remove('hidden');
            app?.classList.add('hidden');
        }

        if (context === 'inquilinos') {
            marketplace?.classList.remove('hidden');
            propietarios?.classList.add('hidden');
            app?.classList.add('hidden');
        }

        if (context === 'admin') {
            marketplace?.classList.add('hidden');
            propietarios?.classList.add('hidden');
            app?.classList.remove('hidden');
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
                window.location.href = 'propietarios.html';
            });
        }

        if (btnInquilinoMarketplace && landingMarketplaceView && landingPropietariosView) {
            btnInquilinoMarketplace.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }

        const btnAdministrar = document.getElementById('btn-administrar');
        if (btnAdministrar) {
            btnAdministrar.addEventListener('click', async (e) => {
                e.preventDefault();
                window.location.href = 'administrador.html';
            });
        }

        const openPublishMarketplace = async (e) => {
            if (e) e.preventDefault();
            // Check if user is authenticated before opening wizard
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (!session) {
                window.location.href = 'login.html?redirect=publish';
                return;
            }
            App.showPublishWizard();
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

        const btnAddPropertyFab = document.getElementById('add-property-fab');
        if (btnAddPropertyFab) {
            btnAddPropertyFab.addEventListener('click', openPublishMarketplace);
        }

        const btnQuickAdd = document.getElementById('quick-add-btn');
        if (btnQuickAdd) {
            btnQuickAdd.addEventListener('click', openPublishMarketplace);
        }

        const btnAdministrarPropietariosLink = document.getElementById('btn-administrar-propietarios-link');
        if (btnAdministrarPropietariosLink) {
            btnAdministrarPropietariosLink.addEventListener('click', () => {
                window.location.href = 'administrador.html';
            });
        }

        // Listener para deshabilitar expensas si se selecciona 'expensas incluidas'
        document.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'expensas-incluidas') {
                const expensasInput = document.getElementById('expensas');
                if (expensasInput) {
                    if (e.target.checked) {
                        expensasInput.value = '';
                        expensasInput.disabled = true;
                        expensasInput.classList.add('opacity-40', 'cursor-not-allowed');
                    } else {
                        expensasInput.disabled = false;
                        expensasInput.classList.remove('opacity-40', 'cursor-not-allowed');
                    }
                }
            }
        });

        const btnBackFromPublish = document.getElementById('btn-back-from-publish');
        const btnBackMobile = document.getElementById('btn-back-mobile');

        const handleBackFromPublish = (e) => {
            if (e) e.preventDefault();
            App.closePublishWizard();
        };

        const handleBackStepMobile = (e) => {
            e.preventDefault();

            const stepOperacion = document.getElementById('step-operacion');
            const stepUbicacion = document.getElementById('step-ubicacion');
            const stepCaracteristicas = document.getElementById('step-caracteristicas');
            const step1Container = document.getElementById('wizard-step-1-container');
            const step2Container = document.getElementById('wizard-step-2-container');
            const step3Container = document.getElementById('wizard-step-3-container');
            const step4Container = document.getElementById('wizard-step-4-container');
            const tabOperacion = document.getElementById('tab-operacion');
            const tabUbicacion = document.getElementById('tab-ubicacion');
            const tabCaracteristicas = document.getElementById('tab-caracteristicas');
            const pasoSubtitle = document.getElementById('paso-subtitle');
            const publishMainTitle = document.getElementById('publish-main-title');

            // Step 4 -> Step 3
            if (step4Container && !step4Container.classList.contains('hidden')) {
                step4Container.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
                step4Container.classList.add('opacity-0', 'translate-y-8', 'scale-95');
                setTimeout(() => {
                    step4Container.classList.add('hidden');
                    step4Container.style.height = '0';
                    step3Container.classList.remove('hidden');
                    step3Container.style.height = 'auto';
                    setTimeout(() => {
                        step3Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95');
                        step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    }, 50);
                }, 300);

                const pStep3 = document.getElementById('progress-step-3');
                const pStep4 = document.getElementById('progress-step-4');
                const pLine3 = document.getElementById('progress-line-3');
                if (pStep3) {
                    pStep3.classList.remove('opacity-50');
                    pStep3.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-[#A13333]/20">3</div>
                        <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-[11px] md:text-base hidden sm:block">Condiciones</span>
                    `;
                }
                if (pStep4) {
                    pStep4.classList.add('opacity-50');
                    pStep4.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-outline-variant/30 dark:border-white/5">4</div>
                        <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-[11px] md:text-base hidden sm:block">Publicar</span>
                    `;
                }
                if (pLine3) pLine3.className = 'w-4 flex-1 md:flex-none md:w-8 border-t-2 border-surface-dim dark:border-[#1e1e1e] mt-4 md:mt-0 shrink-[2] transition-colors duration-300';

                document.querySelectorAll('button[form="form-planes"]').forEach(btn => {
                    btn.setAttribute('form', 'form-extras');
                });
                return;
            }

            // Step 3 -> Step 2
            if (step3Container && !step3Container.classList.contains('hidden')) {
                step3Container.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
                step3Container.classList.add('opacity-0', 'translate-y-8', 'scale-95');
                setTimeout(() => {
                    step3Container.classList.add('hidden');
                    step3Container.style.height = '0';
                    step2Container.classList.remove('hidden');
                    step2Container.style.height = 'auto';
                    setTimeout(() => {
                        step2Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95');
                        step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    }, 50);
                }, 300);

                const pStep2 = document.getElementById('progress-step-2');
                const pStep3 = document.getElementById('progress-step-3');
                const pLine2 = document.getElementById('progress-line-2');
                if (pStep2) {
                    pStep2.classList.remove('opacity-50');
                    pStep2.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-[#A13333]/20">2</div>
                        <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-[11px] md:text-base hidden sm:block">Multimedia</span>
                    `;
                }
                if (pStep3) {
                    pStep3.classList.add('opacity-50');
                    pStep3.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-outline-variant/30 dark:border-white/5">3</div>
                        <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-[11px] md:text-base hidden sm:block">Condiciones</span>
                    `;
                }
                if (pLine2) pLine2.className = 'w-4 flex-1 md:flex-none md:w-8 border-t-2 border-surface-dim dark:border-[#1e1e1e] mt-4 md:mt-0 shrink-[2] transition-colors duration-300';

                document.querySelectorAll('button[form="form-extras"]').forEach(btn => {
                    btn.setAttribute('form', 'form-multimedia');
                });
                return;
            }

            // Step 2 -> Step 1
            if (step2Container && !step2Container.classList.contains('hidden')) {
                step2Container.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
                step2Container.classList.add('opacity-0', 'translate-y-8', 'scale-95');
                setTimeout(() => {
                    step2Container.classList.add('hidden');
                    step2Container.style.height = '0';
                    step1Container.classList.remove('hidden', 'opacity-0', 'scale-95');
                    step1Container.style.height = 'auto';
                    step1Container.classList.add('opacity-100', 'scale-100');
                    if (publishMainTitle) publishMainTitle.style.opacity = '1';
                    if (pasoSubtitle) pasoSubtitle.style.opacity = '1';
                }, 300);

                const pStep1 = document.getElementById('progress-step-1');
                const pStep2 = document.getElementById('progress-step-2');
                const pLine1 = document.getElementById('progress-line-1');
                if (pStep1) {
                    pStep1.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">1</div>
                        <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-[11px] md:text-base">Principales</span>
                    `;
                }
                if (pStep2) {
                    pStep2.classList.add('opacity-50');
                    pStep2.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-outline-variant/30 dark:border-white/5">2</div>
                        <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-[11px] md:text-base hidden sm:block">Multimedia</span>
                    `;
                }
                if (pLine1) pLine1.className = 'w-4 flex-1 md:flex-none md:w-8 border-t-2 border-surface-dim dark:border-[#1e1e1e] mt-4 md:mt-0 shrink-[2] transition-colors duration-300';

                document.querySelectorAll('button[form="form-multimedia"]').forEach(btn => {
                    btn.setAttribute('form', 'form-caracteristicas');
                });
                return;
            }

            // Step 1: Características -> Ubicación
            if (stepCaracteristicas && !stepCaracteristicas.classList.contains('hidden')) {
                stepCaracteristicas.classList.add('hidden');
                stepUbicacion.classList.remove('hidden');
                if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                if (tabUbicacion) tabUbicacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                if (pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';
                document.querySelectorAll('button[form="form-caracteristicas"]').forEach(btn => {
                    btn.setAttribute('form', 'form-ubicacion');
                });
                return;
            }

            // Step 1: Ubicación -> Operación
            if (stepUbicacion && !stepUbicacion.classList.contains('hidden')) {
                stepUbicacion.classList.add('hidden');
                stepOperacion.classList.remove('hidden');
                if (tabUbicacion) tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                if (tabOperacion) tabOperacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                if (pasoSubtitle) pasoSubtitle.textContent = '¿Qué querés publicar?';
                document.querySelectorAll('button[form="form-ubicacion"]').forEach(btn => {
                    btn.setAttribute('form', 'form-principales');
                });
                return;
            }

            // Very first step (operacion), close wizard
            handleBackFromPublish(e);
        };

        if (btnBackFromPublish) {
            btnBackFromPublish.addEventListener('click', handleBackFromPublish);
        }
        if (btnBackMobile) {
            btnBackMobile.addEventListener('click', handleBackStepMobile);
        }

        // Helper functions for Form Validation Feedback
        function highlightInvalidInput(el) {
            if (!el) return;
            el.classList.add('!border-2', '!border-red-500', 'dark:!border-[#A13333]', '!ring-2', '!ring-red-500/40', 'dark:!ring-[#A13333]/40');
            const onInputOrChange = () => {
                el.classList.remove('!border-2', '!border-red-500', 'dark:!border-[#A13333]', '!ring-2', '!ring-red-500/40', 'dark:!ring-[#A13333]/40');
                el.removeEventListener('input', onInputOrChange);
                el.removeEventListener('change', onInputOrChange);
            };
            el.addEventListener('input', onInputOrChange);
            el.addEventListener('change', onInputOrChange);
        }

        function showValidationToast(message = 'Por favor, completá los campos obligatorios marcados en rojo antes de continuar.') {
            let existingToast = document.getElementById('validation-toast-notification');
            if (existingToast) existingToast.remove();

            const toast = document.createElement('div');
            toast.id = 'validation-toast-notification';
            toast.className = 'fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-md w-[92%] bg-red-600 dark:bg-red-700 text-white font-headline font-bold text-sm sm:text-base px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(220,38,38,0.4)] flex items-center justify-between gap-3 transition-all duration-300 transform -translate-y-4 opacity-0 border border-white/20';
            toast.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-2xl shrink-0">error</span>
                    <span class="leading-snug">${message}</span>
                </div>
                <button type="button" onclick="this.parentElement.remove()" class="text-white/80 hover:text-white shrink-0 p-1">
                    <span class="material-symbols-outlined text-xl">close</span>
                </button>
            `;

            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove('-translate-y-4', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            });

            setTimeout(() => {
                if (toast && toast.parentElement) {
                    toast.classList.remove('translate-y-0', 'opacity-100');
                    toast.classList.add('-translate-y-4', 'opacity-0');
                    setTimeout(() => toast.remove(), 300);
                }
            }, 5000);
        }
        window.showValidationToast = showValidationToast;
        window.highlightInvalidInput = highlightInvalidInput;

        // Form 'Principales' Validation & Submit Interceptor
        const formPrincipales = document.getElementById('form-principales');
        if (formPrincipales) {
            formPrincipales.addEventListener('submit', (e) => {
                e.preventDefault();

                let isValid = true;
                let invalidElements = [];

                const errorTipo = document.getElementById('error-tipo');
                const errorSubtipo = document.getElementById('error-subtipo');
                const errorPiso = document.getElementById('error-piso');
                const errorDepto = document.getElementById('error-depto');
                const errorNumeroLocal = document.getElementById('error-numero-local');

                const selectTipo = document.getElementById('tipo-propiedad');
                const selectSubtipo = document.getElementById('subtipo-propiedad');
                const inputPiso = document.getElementById('piso-propiedad');
                const inputDepto = document.getElementById('depto-propiedad');
                const inputNumeroLocal = document.getElementById('numero-local');

                // Reset error visuals
                if (errorTipo) errorTipo.classList.add('hidden');
                if (errorSubtipo) errorSubtipo.classList.add('hidden');
                if (errorPiso) errorPiso.classList.add('hidden');
                if (errorDepto) errorDepto.classList.add('hidden');
                if (errorNumeroLocal) errorNumeroLocal.classList.add('hidden');

                // Custom validation for 'Tipo de propiedad'
                if (selectTipo && !selectTipo.value) {
                    if (errorTipo) errorTipo.classList.remove('hidden');
                    highlightInvalidInput(selectTipo);
                    invalidElements.push(selectTipo);
                    isValid = false;
                }

                // Custom validation for 'Subtipo de propiedad'
                if (selectSubtipo && selectSubtipo.required && !selectSubtipo.value) {
                    if (errorSubtipo) errorSubtipo.classList.remove('hidden');
                    highlightInvalidInput(selectSubtipo);
                    invalidElements.push(selectSubtipo);
                    isValid = false;
                }

                // Custom validation for Piso y Depto (required if Departamento or PH)
                if (selectTipo && (selectTipo.value === 'departamento' || selectTipo.value === 'ph')) {
                    if (inputPiso && !inputPiso.value.trim()) {
                        if (errorPiso) errorPiso.classList.remove('hidden');
                        highlightInvalidInput(inputPiso);
                        invalidElements.push(inputPiso);
                        isValid = false;
                    }
                    if (inputDepto && !inputDepto.value.trim()) {
                        if (errorDepto) errorDepto.classList.remove('hidden');
                        highlightInvalidInput(inputDepto);
                        invalidElements.push(inputDepto);
                        isValid = false;
                    }
                }

                // Custom validation for 'Subtipo En galería' (required N° de Local)
                if (selectSubtipo && selectSubtipo.value === 'galeria') {
                    if (inputNumeroLocal && !inputNumeroLocal.value.trim()) {
                        if (errorNumeroLocal) errorNumeroLocal.classList.remove('hidden');
                        highlightInvalidInput(inputNumeroLocal);
                        invalidElements.push(inputNumeroLocal);
                        isValid = false;
                    }
                }

                if (!isValid) {
                    if (invalidElements.length > 0) {
                        invalidElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        invalidElements[0].focus();
                    }
                    showValidationToast('Por favor, completá los campos obligatorios marcados en rojo antes de continuar.');
                } else {
                    console.log('¡Datos Principales completos y validados (Custom)! Avanzando al subpaso de Ubicación...');

                    // Manejar DOM para mostrar Ubicación
                    const tabOperacion = document.getElementById('tab-operacion');
                    const tabUbicacion = document.getElementById('tab-ubicacion');
                    const stepOperacion = document.getElementById('step-operacion');
                    const stepUbicacion = document.getElementById('step-ubicacion');
                    const pasoSubtitle = document.getElementById('paso-subtitle');

                    if (tabOperacion && tabUbicacion && stepOperacion && stepUbicacion) {
                        tabOperacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                        tabUbicacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';

                        stepOperacion.classList.add('hidden');
                        stepUbicacion.classList.remove('hidden');

                        if (window.innerWidth < 768) {
                            tabUbicacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }

                        if (typeof propertyMap !== 'undefined' && propertyMap && typeof google !== 'undefined') {
                            setTimeout(() => {
                                google.maps.event.trigger(propertyMap, 'resize');
                                propertyMap.setCenter({ lat: -32.898684, lng: -68.847522 });
                            }, 50);
                        }

                        if (pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';

                        // Mover los botones "Continuar" para que apunten al nuevo formulario
                        document.querySelectorAll('button[form="form-principales"]').forEach(btn => {
                            btn.setAttribute('form', 'form-ubicacion');
                        });

                        // Hacer que "Operación" sea clickeable para volver
                        tabOperacion.onclick = (event) => {
                            event.preventDefault();
                            tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                            tabOperacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                            stepUbicacion.classList.add('hidden');
                            stepOperacion.classList.remove('hidden');

                            if (window.innerWidth < 768) {
                                tabOperacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }

                            if (pasoSubtitle) pasoSubtitle.textContent = '¿Qué querés publicar?';
                            document.querySelectorAll('button[form="form-ubicacion"]').forEach(btn => {
                                btn.setAttribute('form', 'form-principales');
                            });
                        }
                    }
                }
            });
        }

        // Dependent Dropdowns & Conditional Inputs Logic for Property Publishing
        const selectTipoPropiedad = document.getElementById('tipo-propiedad');
        const selectSubtipoPropiedad = document.getElementById('subtipo-propiedad');

        if (selectTipoPropiedad && selectSubtipoPropiedad) {
            const subtiposConfig = {
                departamento: [
                    { value: 'duplex', label: 'Dúplex' },
                    { value: 'estandar', label: 'Estándar' },
                    { value: 'monoambiente', label: 'Monoambiente' },
                    { value: 'piso', label: 'Piso' }
                ],
                'local-comercial': [
                    { value: 'local-a-calle', label: 'Local a la calle' },
                    { value: 'galeria', label: 'En galería' },
                    { value: 'centro-comercial', label: 'En centro comercial' }
                ]
            };

            selectTipoPropiedad.addEventListener('change', (e) => {
                const tipo = e.target.value;

                // Toggle Piso y Depto inputs for Departamento and PH
                const containerPisoDepto = document.getElementById('container-piso-depto');
                const errorPiso = document.getElementById('error-piso');
                const errorDepto = document.getElementById('error-depto');
                if (errorPiso) errorPiso.classList.add('hidden');
                if (errorDepto) errorDepto.classList.add('hidden');

                if (containerPisoDepto) {
                    if (tipo === 'departamento' || tipo === 'ph') {
                        containerPisoDepto.classList.remove('hidden');
                    } else {
                        containerPisoDepto.classList.add('hidden');
                        const inputPiso = document.getElementById('piso-propiedad');
                        const inputDepto = document.getElementById('depto-propiedad');
                        if (inputPiso) inputPiso.value = '';
                        if (inputDepto) inputDepto.value = '';
                    }
                }

                // Reset container subtipos & container numero local
                const containerSubtipo = document.getElementById('container-subtipo-propiedad');
                const containerNumeroLocal = document.getElementById('container-numero-local');
                const errorNumeroLocal = document.getElementById('error-numero-local');
                if (containerNumeroLocal) containerNumeroLocal.classList.add('hidden');
                if (errorNumeroLocal) errorNumeroLocal.classList.add('hidden');
                const inputNumeroLocal = document.getElementById('numero-local');
                const inputSectorLocal = document.getElementById('sector-local');
                if (inputNumeroLocal) inputNumeroLocal.value = '';
                if (inputSectorLocal) inputSectorLocal.value = '';

                // Clear existing subtipos but keep the default disabled placeholder
                selectSubtipoPropiedad.innerHTML = '<option disabled selected value="">Selecciona un subtipo (opcional)</option>';

                if (tipo && subtiposConfig[tipo] && subtiposConfig[tipo].length > 0) {
                    if (containerSubtipo) containerSubtipo.classList.remove('hidden');
                    selectSubtipoPropiedad.disabled = false;
                    selectSubtipoPropiedad.required = true;
                    subtiposConfig[tipo].forEach(sub => {
                        const option = document.createElement('option');
                        option.value = sub.value;
                        option.textContent = sub.label;
                        selectSubtipoPropiedad.appendChild(option);
                    });
                } else {
                    if (containerSubtipo) containerSubtipo.classList.add('hidden');
                    selectSubtipoPropiedad.disabled = true;
                    selectSubtipoPropiedad.required = false;
                }

                // Remove lingering custom errors if user modifies selections
                const errorTipo = document.getElementById('error-tipo');
                const errorSubtipo = document.getElementById('error-subtipo');
                if (errorTipo) errorTipo.classList.add('hidden');
                if (errorSubtipo) errorSubtipo.classList.add('hidden');
            });

            selectSubtipoPropiedad.addEventListener('change', (e) => {
                const subtipo = e.target.value;
                const containerNumeroLocal = document.getElementById('container-numero-local');
                const errorNumeroLocal = document.getElementById('error-numero-local');
                if (errorNumeroLocal) errorNumeroLocal.classList.add('hidden');

                if (containerNumeroLocal) {
                    if (subtipo === 'galeria') {
                        containerNumeroLocal.classList.remove('hidden');
                    } else {
                        containerNumeroLocal.classList.add('hidden');
                        const inputNumeroLocal = document.getElementById('numero-local');
                        const inputSectorLocal = document.getElementById('sector-local');
                        if (inputNumeroLocal) inputNumeroLocal.value = '';
                        if (inputSectorLocal) inputSectorLocal.value = '';
                    }
                }

                const errorSubtipo = document.getElementById('error-subtipo');
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
                const errCalle = document.getElementById('error-calle');

                if (errCalle) errCalle.classList.add('hidden');

                if (!calle || !calle.value.trim()) {
                    if (errCalle) {
                        errCalle.textContent = 'Completa este campo';
                        errCalle.classList.remove('hidden');
                    }
                    highlightInvalidInput(calle);
                    calle.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    calle.focus();
                    showValidationToast('Por favor, completá la calle y altura de tu propiedad.');
                    isValid = false;
                } else if (!window.selectedPropertyFromGoogle || !window.selectedPropertyStreetNumber) {
                    if (errCalle) {
                        errCalle.textContent = 'Debes seleccionar una dirección de la lista desplegable de sugerencias que incluya el número de calle (altura).';
                        errCalle.classList.remove('hidden');
                    }
                    highlightInvalidInput(calle);
                    calle.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    calle.focus();
                    showValidationToast('Debés seleccionar una dirección sugerida con número de calle.');
                    isValid = false;
                }

                if (isValid) {
                    console.log('¡Datos Ubicación completos y validados! Transicionando a Características...');

                    const tabUbicacion = document.getElementById('tab-ubicacion');
                    const tabCaracteristicas = document.getElementById('tab-caracteristicas');
                    const stepUbicacion = document.getElementById('step-ubicacion');
                    const stepCaracteristicas = document.getElementById('step-caracteristicas');
                    const pasoSubtitle = document.getElementById('paso-subtitle');

                    if (tabUbicacion && tabCaracteristicas && stepUbicacion && stepCaracteristicas) {
                        tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                        tabCaracteristicas.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';

                        stepUbicacion.classList.add('hidden');
                        stepCaracteristicas.classList.remove('hidden');

                        if (window.innerWidth < 768) {
                            tabCaracteristicas.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                        }

                        if (pasoSubtitle) pasoSubtitle.textContent = 'Detalles de tu propiedad';

                        document.querySelectorAll('button[form="form-ubicacion"]').forEach(btn => {
                            btn.setAttribute('form', 'form-caracteristicas');
                        });

                        // Hacer que "Ubicación" sea clickeable para volver
                        tabUbicacion.onclick = (event) => {
                            event.preventDefault();
                            tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                            tabUbicacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                            stepCaracteristicas.classList.add('hidden');
                            stepUbicacion.classList.remove('hidden');

                            if (window.innerWidth < 768) {
                                tabUbicacion.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                            }

                            if (pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';
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
                let invalidElements = [];

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

                if (errSupCubierta) errSupCubierta.classList.add('hidden');
                if (errSupTotal) errSupTotal.classList.add('hidden');
                if (errPrecio) errPrecio.classList.add('hidden');
                if (errTitulo) errTitulo.classList.add('hidden');
                if (errDescripcion) errDescripcion.classList.add('hidden');

                if (supCubierta && !supCubierta.value) { if (errSupCubierta) errSupCubierta.classList.remove('hidden'); highlightInvalidInput(supCubierta); invalidElements.push(supCubierta); isValid = false; }
                if (supTotal && !supTotal.value) { if (errSupTotal) errSupTotal.classList.remove('hidden'); highlightInvalidInput(supTotal); invalidElements.push(supTotal); isValid = false; }
                if (precio && !precio.value) { if (errPrecio) errPrecio.classList.remove('hidden'); highlightInvalidInput(precio); invalidElements.push(precio); isValid = false; }
                if (titulo && !titulo.value) { if (errTitulo) errTitulo.classList.remove('hidden'); highlightInvalidInput(titulo); invalidElements.push(titulo); isValid = false; }
                if (descripcion && !descripcion.value) { if (errDescripcion) errDescripcion.classList.remove('hidden'); highlightInvalidInput(descripcion); invalidElements.push(descripcion); isValid = false; }

                if (!isValid) {
                    if (invalidElements.length > 0) {
                        invalidElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                        invalidElements[0].focus();
                    }
                    showValidationToast('Por favor, completá los campos obligatorios marcados en rojo antes de continuar.');
                } else {
                    console.log('¡Datos Características completos y validados! Transicionando al paso 2: Multimedia...');

                    const step1Container = document.getElementById('wizard-step-1-container');
                    const step2Container = document.getElementById('wizard-step-2-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');

                    // Fade out title and subtitle
                    if (title) title.style.opacity = '0';
                    if (subtitle) subtitle.style.opacity = '0';

                    // Hide step 1 with animation
                    if (step1Container) {
                        step1Container.classList.remove('opacity-100', 'scale-100');
                        step1Container.classList.add('opacity-0', 'scale-95');
                    }

                    setTimeout(() => {
                        if (step1Container) {
                            step1Container.classList.add('hidden');
                            step1Container.style.height = '0';
                        }

                        // Update Progress Indicator
                        updateHeaderProgress(2);

                        if (step2Container) {
                            // Show Step 2
                            step2Container.classList.remove('hidden');

                            // Update titles
                            if (title) title.textContent = 'Agregá fotos y videos';
                            if (subtitle) subtitle.textContent = 'Mostrá lo mejor de tu propiedad';

                            // Trigger reflow
                            void step2Container.offsetWidth;

                            // Fade in Step 2 and titles
                            if (title) title.style.opacity = '1';
                            if (subtitle) subtitle.style.opacity = '1';

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
        // --- Robust Delegated Image Upload Logic ---
        window.selectedPropertyPhotos = window.selectedPropertyPhotos || [];

        let draggedPhotoIndex = null;
        let touchGhost = null;
        let touchTargetIndex = null;

        function renderPhotoPreviews() {
            const fotosPreviewContainer = document.getElementById('fotos-preview-container') || document.getElementById('preview-fotos-grid');
            if (!fotosPreviewContainer) return;

            fotosPreviewContainer.innerHTML = '';
            if (window.selectedPropertyPhotos.length > 0) {
                fotosPreviewContainer.classList.remove('hidden');
            } else {
                fotosPreviewContainer.classList.add('hidden');
            }

            window.selectedPropertyPhotos.forEach((blob, index) => {
                const url = URL.createObjectURL(blob);
                const div = document.createElement('div');
                div.className = 'relative aspect-square rounded-xl overflow-hidden group border border-outline-variant/30 dark:border-white/10 shadow-sm cursor-grab active:cursor-grabbing transition-all select-none touch-none';
                div.setAttribute('draggable', 'true');
                div.dataset.index = index;

                const isCover = index === 0;

                div.innerHTML = `
                    <img src="${url}" class="w-full h-full object-cover pointer-events-none select-none">
                    
                    <!-- Badge Portada / Posición -->
                    <div class="absolute top-2 left-2 z-10 pointer-events-none">
                        ${isCover 
                            ? '<span class="bg-primary text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-md flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">star</span>Portada</span>'
                            : `<span class="bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-md">#${index + 1}</span>`
                        }
                    </div>

                    <!-- Botón Eliminar a la derecha -->
                    <button type="button" class="delete-photo-btn absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md shadow-md transition-all group-hover:bg-red-600" title="Eliminar foto">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                `;

                // --- Mouse HTML5 Drag & Drop Handlers ---
                div.addEventListener('dragstart', (e) => {
                    draggedPhotoIndex = index;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index);
                    setTimeout(() => div.classList.add('opacity-30', 'scale-95'), 0);
                });

                div.addEventListener('dragend', () => {
                    draggedPhotoIndex = null;
                    div.classList.remove('opacity-30', 'scale-95');
                });

                div.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    div.classList.add('ring-2', 'ring-primary', 'scale-105');
                });

                div.addEventListener('dragleave', () => {
                    div.classList.remove('ring-2', 'ring-primary', 'scale-105');
                });

                div.addEventListener('drop', (e) => {
                    e.preventDefault();
                    div.classList.remove('ring-2', 'ring-primary', 'scale-105');
                    if (draggedPhotoIndex !== null && draggedPhotoIndex !== index) {
                        const item = window.selectedPropertyPhotos.splice(draggedPhotoIndex, 1)[0];
                        window.selectedPropertyPhotos.splice(index, 0, item);
                        renderPhotoPreviews();
                    }
                });

                // --- Touch Events Drag & Drop Handlers (Pantallas Táctiles - Acelerado por GPU) ---
                let animFrameId = null;

                div.addEventListener('touchstart', (e) => {
                    if (e.target.closest('.delete-photo-btn')) return;
                    if (e.touches.length !== 1) return;

                    const touch = e.touches[0];
                    draggedPhotoIndex = index;

                    const rect = div.getBoundingClientRect();
                    const halfW = rect.width / 2;
                    const halfH = rect.height / 2;

                    touchGhost = div.cloneNode(true);
                    touchGhost.style.position = 'fixed';
                    touchGhost.style.left = '0px';
                    touchGhost.style.top = '0px';
                    touchGhost.style.width = `${rect.width}px`;
                    touchGhost.style.height = `${rect.height}px`;
                    touchGhost.style.zIndex = '999999';
                    touchGhost.style.pointerEvents = 'none';
                    touchGhost.style.transition = 'none'; // Quitar retardos de transición CSS
                    touchGhost.style.willChange = 'transform';
                    touchGhost.style.opacity = '0.92';
                    touchGhost.style.boxShadow = '0 15px 35px rgba(0,0,0,0.5)';
                    touchGhost.style.transform = `translate3d(${touch.clientX - halfW}px, ${touch.clientY - halfH}px, 0) scale(1.06)`;

                    document.body.appendChild(touchGhost);
                    div.classList.add('opacity-30', 'scale-95');
                }, { passive: true });

                div.addEventListener('touchmove', (e) => {
                    if (!touchGhost || e.touches.length !== 1) return;
                    if (e.cancelable) e.preventDefault();

                    const touch = e.touches[0];
                    const clientX = touch.clientX;
                    const clientY = touch.clientY;
                    const rect = div.getBoundingClientRect();
                    const halfW = rect.width / 2;
                    const halfH = rect.height / 2;

                    if (animFrameId) cancelAnimationFrame(animFrameId);

                    animFrameId = requestAnimationFrame(() => {
                        if (!touchGhost) return;
                        // Transform 3D ultra fluido directo por GPU compositor
                        touchGhost.style.transform = `translate3d(${clientX - halfW}px, ${clientY - halfH}px, 0) scale(1.06)`;

                        const elemBelow = document.elementFromPoint(clientX, clientY);
                        const targetCard = elemBelow?.closest('#fotos-preview-container > div, #preview-fotos-grid > div');

                        fotosPreviewContainer.querySelectorAll('div[data-index]').forEach(card => {
                            card.classList.remove('ring-2', 'ring-primary', 'scale-105');
                        });

                        if (targetCard && targetCard !== div) {
                            touchTargetIndex = parseInt(targetCard.dataset.index);
                            targetCard.classList.add('ring-2', 'ring-primary', 'scale-105');
                        } else {
                            touchTargetIndex = null;
                        }
                    });
                }, { passive: false });

                const handleTouchEnd = (e) => {
                    if (animFrameId) cancelAnimationFrame(animFrameId);
                    if (touchGhost) {
                        touchGhost.remove();
                        touchGhost = null;
                    }
                    div.classList.remove('opacity-30', 'scale-95');

                    fotosPreviewContainer.querySelectorAll('div[data-index]').forEach(card => {
                        card.classList.remove('ring-2', 'ring-primary', 'scale-105');
                    });

                    if (draggedPhotoIndex !== null && touchTargetIndex !== null && draggedPhotoIndex !== touchTargetIndex) {
                        const target = touchTargetIndex;
                        const origin = draggedPhotoIndex;
                        draggedPhotoIndex = null;
                        touchTargetIndex = null;
                        const item = window.selectedPropertyPhotos.splice(origin, 1)[0];
                        window.selectedPropertyPhotos.splice(target, 0, item);
                        renderPhotoPreviews();
                    } else {
                        draggedPhotoIndex = null;
                        touchTargetIndex = null;
                    }
                };

                div.addEventListener('touchend', handleTouchEnd);
                div.addEventListener('touchcancel', handleTouchEnd);

                // Delete Button Handler
                const deleteBtn = div.querySelector('.delete-photo-btn');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                        window.selectedPropertyPhotos.splice(index, 1);
                        renderPhotoPreviews();
                    });
                }

                fotosPreviewContainer.appendChild(div);
            });
        }

        async function processAndAddPhotos(files) {
            if (!files || files.length === 0) return;
            const imageFiles = files.filter(f => f.type.startsWith('image/'));

            const cropAndOptimizeImage1to1 = (file) => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = function (ev) {
                        const img = new Image();
                        img.onload = function () {
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

        // Delegated click listener for dropzone to trigger input file picker safely
        document.addEventListener('click', (e) => {
            const dropzone = e.target.closest('#fotos-dropzone') || e.target.closest('#dropzone-fotos');
            if (dropzone) {
                const fotosInput = document.getElementById('fotos-input') || document.getElementById('input-fotos');
                if (fotosInput && e.target !== fotosInput) {
                    fotosInput.click();
                }
            }
        });

        // Delegated change listener for file input selection & pet toggle
        document.addEventListener('change', (e) => {
            if (e.target && (e.target.id === 'fotos-input' || e.target.id === 'input-fotos')) {
                const files = Array.from(e.target.files);
                processAndAddPhotos(files);
            }
            if (e.target && e.target.id === 'permite-mascotas') {
                const detallesContainer = document.getElementById('mascotas-detalles-container');
                const label = document.getElementById('permite-mascotas-label');
                if (e.target.checked) {
                    if (detallesContainer) detallesContainer.classList.remove('hidden');
                    if (label) label.textContent = 'Sí permite';
                } else {
                    if (detallesContainer) detallesContainer.classList.add('hidden');
                    if (label) label.textContent = 'No permite';
                }
            }
            if (e.target && e.target.id === 'usar-agenda-visitas') {
                const detallesContainer = document.getElementById('visitas-detalles-container');
                const label = document.getElementById('usar-agenda-label');
                if (e.target.checked) {
                    if (detallesContainer) detallesContainer.classList.remove('hidden');
                    if (label) label.textContent = 'Sí, activar agenda';
                } else {
                    if (detallesContainer) detallesContainer.classList.add('hidden');
                    if (label) label.textContent = 'No usar agenda';
                }
            }
        });

        // Drag and drop handlers
        document.addEventListener('dragover', (e) => {
            const dropzone = e.target.closest('#fotos-dropzone') || e.target.closest('#dropzone-fotos');
            if (dropzone) {
                e.preventDefault();
                dropzone.classList.add('border-primary', 'dark:border-[#A13333]');
            }
        });
        document.addEventListener('dragleave', (e) => {
            const dropzone = e.target.closest('#fotos-dropzone') || e.target.closest('#dropzone-fotos');
            if (dropzone) {
                dropzone.classList.remove('border-primary', 'dark:border-[#A13333]');
            }
        });
        document.addEventListener('drop', (e) => {
            const dropzone = e.target.closest('#fotos-dropzone') || e.target.closest('#dropzone-fotos');
            if (dropzone) {
                e.preventDefault();
                dropzone.classList.remove('border-primary', 'dark:border-[#A13333]');
                if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                    processAndAddPhotos(Array.from(e.dataTransfer.files));
                }
            }
        });

        // Global Progress Header Helpers
        const getStepName = (step) => {
            const names = { 1: 'Principales', 2: 'Multimedia', 3: 'Extras', 4: 'Preferencias', 5: 'Visitas', 6: 'Publicar' };
            return names[step] || '';
        };

        const updateHeaderProgress = (activeStep) => {
            const mobBadge = document.getElementById('mobile-step-badge');
            const mobPercent = document.getElementById('mobile-step-percent');
            const mobBar = document.getElementById('mobile-progress-bar');

            const percent = Math.round((activeStep / 6) * 100);
            if (mobBadge) mobBadge.innerHTML = `Paso ${activeStep} de 6 &bull; ${getStepName(activeStep)}`;
            if (mobPercent) mobPercent.textContent = `${percent}%`;
            if (mobBar) mobBar.style.width = `${percent}%`;

            for (let i = 1; i <= 6; i++) {
                const pStep = document.getElementById(`progress-step-${i}`);
                const pLine = document.getElementById(`progress-line-${i - 1}`);

                if (pStep) {
                    if (i < activeStep) {
                        pStep.classList.remove('opacity-50');
                        pStep.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-[#A13333]/10 text-primary dark:text-[#A13333] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-[#A13333]/20">
                                <span class="material-symbols-outlined text-[18px]">check</span>
                            </div>
                            <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-xs sm:text-sm text-center">${getStepName(i)}</span>
                        `;
                    } else if (i === activeStep) {
                        pStep.classList.remove('opacity-50');
                        pStep.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-on-primary dark:text-[#ffffff] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">${i}</div>
                            <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-xs sm:text-sm text-center">${getStepName(i)}</span>
                        `;
                    } else {
                        pStep.classList.add('opacity-50');
                        pStep.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-surface-container-high dark:bg-[#282828] text-on-surface dark:text-[#f1f1f1] flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">${i}</div>
                            <span class="font-headline font-bold text-on-surface dark:text-[#f1f1f1] whitespace-nowrap text-xs sm:text-sm text-center">${getStepName(i)}</span>
                        `;
                    }
                }

                if (pLine) {
                    if (i <= activeStep) {
                        pLine.classList.remove('border-surface-dim', 'dark:border-[#1e1e1e]');
                        pLine.classList.add('border-primary', 'dark:border-[#A13333]');
                    } else {
                        pLine.classList.remove('border-primary', 'dark:border-[#A13333]');
                        pLine.classList.add('border-surface-dim', 'dark:border-[#1e1e1e]');
                    }
                }
            }
        };
        window.updateHeaderProgress = updateHeaderProgress;

        // Form 'Multimedia' & 'Extras' Delegated Submit Interceptors
        document.addEventListener('submit', (e) => {
            if (!e.target) return;

            // Form 2: Multimedia -> Step 3
            if (e.target.id === 'form-multimedia') {
                e.preventDefault();

                let isValid = true;
                const fotosErrorMsg = document.getElementById('fotos-error-msg');
                const photoCount = window.selectedPropertyPhotos ? window.selectedPropertyPhotos.length : 0;

                if (photoCount < 5 || photoCount > 50) {
                    isValid = false;
                    const dropzone = document.getElementById('dropzone-fotos') || document.getElementById('fotos-dropzone');
                    if (dropzone) highlightInvalidInput(dropzone);

                    if (fotosErrorMsg) {
                        fotosErrorMsg.innerHTML = `<span class="material-symbols-outlined text-[20px]">warning</span><span>Debes cargar al menos 5 fotos para continuar (máximo 50). Actualmente tienes ${photoCount}.</span>`;
                        fotosErrorMsg.className = 'bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl p-3.5 mt-4 text-sm font-semibold flex items-center gap-2';
                        fotosErrorMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    showValidationToast(`Debés cargar al menos 5 fotos para continuar (máximo 50). Actualmente tenés ${photoCount}.`);
                } else {
                    if (fotosErrorMsg) fotosErrorMsg.classList.add('hidden');
                }

                if (isValid) {
                    console.log('¡Datos Multimedia completos! Transicionando al paso 3: Extras...');

                    const step2Container = document.getElementById('wizard-step-2-container');
                    const step3Container = document.getElementById('wizard-step-3-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');

                    if (title) title.style.opacity = '0';
                    if (subtitle) subtitle.style.opacity = '0';

                    if (step2Container) {
                        step2Container.classList.remove('opacity-100', 'scale-100');
                        step2Container.classList.add('opacity-0', 'scale-95');
                    }

                    setTimeout(() => {
                        if (step2Container) {
                            step2Container.classList.add('hidden');
                            step2Container.style.height = '0';
                        }

                        updateHeaderProgress(3);

                        if (step3Container) {
                            step3Container.classList.remove('hidden');

                            if (title) title.textContent = '¡Agregá los amenities de tu propiedad!';
                            if (subtitle) subtitle.textContent = 'Estos campos opcionales mejoran el posicionamiento de tu aviso.';

                            void step3Container.offsetWidth;

                            if (title) title.style.opacity = '1';
                            if (subtitle) subtitle.style.opacity = '1';

                            step3Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step3Container.style.height = '';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

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

                            window.currentWizardStep = 3;
                        }

                    }, 400);
                }
            }

            // Form 3: Extras -> Step 4 (Preferencias)
            if (e.target.id === 'form-extras') {
                e.preventDefault();

                let isValid = true;

                if (isValid) {
                    console.log('¡Datos Extras completos! Transicionando al paso 4: Preferencias...');

                    const step3Container = document.getElementById('wizard-step-3-container');
                    const step4Container = document.getElementById('wizard-step-4-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');

                    if (title) title.style.opacity = '0';
                    if (subtitle) subtitle.style.opacity = '0';

                    if (step3Container) {
                        step3Container.classList.remove('opacity-100', 'scale-100');
                        step3Container.classList.add('opacity-0', 'scale-95');
                    }

                    setTimeout(() => {
                        if (step3Container) {
                            step3Container.classList.add('hidden');
                            step3Container.style.height = '0';
                        }

                        updateHeaderProgress(4);

                        if (step4Container) {
                            step4Container.classList.remove('hidden');

                            if (title) title.textContent = 'Preferencias de alquiler';
                            if (subtitle) subtitle.textContent = 'Configurá las condiciones para tus futuros inquilinos';

                            void step4Container.offsetWidth;

                            if (title) title.style.opacity = '1';
                            if (subtitle) subtitle.style.opacity = '1';

                            step4Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step4Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step4Container.style.height = '';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            const continueBtnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                            const continueBtnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');

                            if (continueBtnDesk) {
                                continueBtnDesk.textContent = 'Continuar';
                                continueBtnDesk.setAttribute('form', 'form-preferencias');
                            }
                            if (continueBtnMob) {
                                continueBtnMob.textContent = 'Continuar';
                                continueBtnMob.setAttribute('form', 'form-preferencias');
                            }

                            window.currentWizardStep = 4;
                        }

                    }, 400);
                }
            }

            // Form 4: Preferencias -> Step 5 (Visitas Presenciales)
            if (e.target.id === 'form-preferencias') {
                e.preventDefault();

                let isValid = true;

                if (isValid) {
                    console.log('¡Datos Preferencias completos! Transicionando al paso 5: Visitas...');

                    const step4Container = document.getElementById('wizard-step-4-container');
                    const step5Container = document.getElementById('wizard-step-5-container');
                    const title = document.getElementById('publish-main-title');
                    const subtitle = document.getElementById('paso-subtitle');

                    if (title) title.style.opacity = '0';
                    if (subtitle) subtitle.style.opacity = '0';

                    if (step4Container) {
                        step4Container.classList.remove('opacity-100', 'scale-100');
                        step4Container.classList.add('opacity-0', 'scale-95');
                    }

                    setTimeout(() => {
                        if (step4Container) {
                            step4Container.classList.add('hidden');
                            step4Container.style.height = '0';
                        }

                        updateHeaderProgress(5);

                        if (step5Container) {
                            step5Container.classList.remove('hidden');

                            if (title) title.textContent = 'Agenda de Visitas y Tours Presenciales';
                            if (subtitle) subtitle.textContent = 'Configurá tus días, horarios y modalidad para agendar tours y mostrar la propiedad';

                            void step5Container.offsetWidth;

                            if (title) title.style.opacity = '1';
                            if (subtitle) subtitle.style.opacity = '1';

                            step5Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                            step5Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                            step5Container.style.height = '';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            const continueBtnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                            const continueBtnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');

                            if (continueBtnDesk) {
                                continueBtnDesk.textContent = 'Continuar';
                                continueBtnDesk.setAttribute('form', 'form-visitas');
                            }
                            if (continueBtnMob) {
                                continueBtnMob.textContent = 'Continuar';
                                continueBtnMob.setAttribute('form', 'form-visitas');
                            }

                            window.currentWizardStep = 5;
                        }

                    }, 400);
                }
            }

            // Form 5: Visitas -> Step 6 (Publicar/Planes)
            if (e.target.id === 'form-visitas') {
                e.preventDefault();

                console.log('¡Datos Visitas completos! Transicionando al paso 6: Publicar...');

                const step5Container = document.getElementById('wizard-step-5-container');
                const step6Container = document.getElementById('wizard-step-6-container');
                const title = document.getElementById('publish-main-title');
                const subtitle = document.getElementById('paso-subtitle');

                if (title) title.style.opacity = '0';
                if (subtitle) subtitle.style.opacity = '0';

                if (step5Container) {
                    step5Container.classList.remove('opacity-100', 'scale-100');
                    step5Container.classList.add('opacity-0', 'scale-95');
                }

                setTimeout(() => {
                    if (step5Container) {
                        step5Container.classList.add('hidden');
                        step5Container.style.height = '0';
                    }

                    updateHeaderProgress(6);

                    if (step6Container) {
                        step6Container.classList.remove('hidden');

                        if (title) title.textContent = '¡Estás a un paso de terminar!';
                        if (subtitle) subtitle.textContent = 'Revisá y elegí tu plan de publicación';

                        void step6Container.offsetWidth;

                        if (title) title.style.opacity = '1';
                        if (subtitle) subtitle.style.opacity = '1';

                        step6Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                        step6Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                        step6Container.style.height = '';

                        window.scrollTo({ top: 0, behavior: 'smooth' });

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

                        window.currentWizardStep = 6;
                    }

                }, 400);
            }
        });

        // Global Wizard Back Navigation Handler
        window.handleWizardBack = function () {
            const stepOperacion = document.getElementById('step-operacion');
            const stepUbicacion = document.getElementById('step-ubicacion');
            const stepCaracteristicas = document.getElementById('step-caracteristicas');

            const step1Container = document.getElementById('wizard-step-1-container');
            const step2Container = document.getElementById('wizard-step-2-container');
            const step3Container = document.getElementById('wizard-step-3-container');
            const step4Container = document.getElementById('wizard-step-4-container');
            const step5Container = document.getElementById('wizard-step-5-container');
            const step6Container = document.getElementById('wizard-step-6-container');

            const title = document.getElementById('publish-main-title');
            const subtitle = document.getElementById('paso-subtitle');

            const setSubmitButton = (formId, text) => {
                const btnDesk = document.querySelector('#desktop-action-buttons button[type="submit"]');
                const btnMob = document.querySelector('nav.md\\:hidden button[type="submit"]');
                if (btnDesk) { btnDesk.setAttribute('form', formId); btnDesk.textContent = text; }
                if (btnMob) { btnMob.setAttribute('form', formId); btnMob.textContent = text; }
            };

            // Case 0: Step 6 -> Step 5
            if (step6Container && !step6Container.classList.contains('hidden')) {
                step6Container.classList.add('hidden');
                step6Container.style.height = '0';
                if (step5Container) {
                    step5Container.classList.remove('hidden');
                    step5Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    step5Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    step5Container.style.height = '';
                }
                if (title) title.textContent = 'Agenda de Visitas y Tours Presenciales';
                if (subtitle) subtitle.textContent = 'Configurá tus días, horarios y modalidad para agendar tours y mostrar la propiedad';
                updateHeaderProgress(5);
                setSubmitButton('form-visitas', 'Continuar');
                window.currentWizardStep = 5;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 1: Step 5 -> Step 4
            if (step5Container && !step5Container.classList.contains('hidden')) {
                step5Container.classList.add('hidden');
                step5Container.style.height = '0';
                if (step4Container) {
                    step4Container.classList.remove('hidden');
                    step4Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    step4Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    step4Container.style.height = '';
                }
                if (title) title.textContent = 'Preferencias de alquiler';
                if (subtitle) subtitle.textContent = 'Configurá las condiciones para tus futuros inquilinos';
                updateHeaderProgress(4);
                setSubmitButton('form-preferencias', 'Continuar');
                window.currentWizardStep = 4;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 2: Step 4 -> Step 3
            if (step4Container && !step4Container.classList.contains('hidden')) {
                step4Container.classList.add('hidden');
                step4Container.style.height = '0';
                if (step3Container) {
                    step3Container.classList.remove('hidden');
                    step3Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    step3Container.style.height = '';
                }
                if (title) title.textContent = '¡Agregá los amenities de tu propiedad!';
                if (subtitle) subtitle.textContent = 'Estos campos opcionales mejoran el posicionamiento de tu aviso.';
                updateHeaderProgress(3);
                setSubmitButton('form-extras', 'Continuar');
                window.currentWizardStep = 3;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 3: Step 3 -> Step 2
            if (step3Container && !step3Container.classList.contains('hidden')) {
                step3Container.classList.add('hidden');
                step3Container.style.height = '0';
                if (step2Container) {
                    step2Container.classList.remove('hidden');
                    step2Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    step2Container.style.height = '';
                }
                if (title) title.textContent = 'Agregá fotos y videos';
                if (subtitle) subtitle.textContent = 'Mostrá lo mejor de tu propiedad';
                updateHeaderProgress(2);
                setSubmitButton('form-multimedia', 'Continuar');
                window.currentWizardStep = 2;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 4: Step 2 -> Step 1 (Características)
            if (step2Container && !step2Container.classList.contains('hidden')) {
                step2Container.classList.add('hidden');
                step2Container.style.height = '0';
                if (step1Container) {
                    step1Container.classList.remove('hidden');
                    step1Container.classList.remove('opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    step1Container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    step1Container.style.height = '';
                }
                if (stepOperacion) stepOperacion.classList.add('hidden');
                if (stepUbicacion) stepUbicacion.classList.add('hidden');
                if (stepCaracteristicas) stepCaracteristicas.classList.remove('hidden');

                const tabUbicacion = document.getElementById('tab-ubicacion');
                const tabCaracteristicas = document.getElementById('tab-caracteristicas');
                if (tabUbicacion) tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';

                if (title) title.textContent = '¡Empecemos a crear tu aviso!';
                if (subtitle) subtitle.textContent = 'Detalles de tu propiedad';
                updateHeaderProgress(1);
                setSubmitButton('form-caracteristicas', 'Continuar');
                window.currentWizardStep = 1;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 5: Step 1.3 (Características) -> Step 1.2 (Ubicación)
            if (stepCaracteristicas && !stepCaracteristicas.classList.contains('hidden')) {
                stepCaracteristicas.classList.add('hidden');
                if (stepUbicacion) stepUbicacion.classList.remove('hidden');

                const tabOperacion = document.getElementById('tab-operacion');
                const tabUbicacion = document.getElementById('tab-ubicacion');
                const tabCaracteristicas = document.getElementById('tab-caracteristicas');
                if (tabOperacion) tabOperacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30';
                if (tabUbicacion) tabUbicacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';

                if (subtitle) subtitle.textContent = '¿Dónde está ubicada tu propiedad?';
                setSubmitButton('form-ubicacion', 'Continuar');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 6: Step 1.2 (Ubicación) -> Step 1.1 (Operación)
            if (stepUbicacion && !stepUbicacion.classList.contains('hidden')) {
                stepUbicacion.classList.add('hidden');
                if (stepOperacion) stepOperacion.classList.remove('hidden');

                const tabOperacion = document.getElementById('tab-operacion');
                const tabUbicacion = document.getElementById('tab-ubicacion');
                const tabCaracteristicas = document.getElementById('tab-caracteristicas');
                if (tabOperacion) tabOperacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
                if (tabUbicacion) tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
                if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';

                if (subtitle) subtitle.textContent = '¿Qué querés publicar?';
                setSubmitButton('form-principales', 'Continuar');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 7: Step 1.1 (Operación) -> Cancel/Close wizard
            if (window.App && typeof window.App.closePublishWizard === 'function') {
                window.App.closePublishWizard();
            } else {
                const publishView = document.getElementById('publish-property-view');
                if (publishView) publishView.classList.add('hidden');
                if (window.App && typeof window.App.applyPageContext === 'function') {
                    window.App.applyPageContext();
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };

        // Delegated listener for Continue buttons & Day Selection Pill buttons
        document.addEventListener('click', (e) => {
            const diaBtn = e.target.closest('.dia-visita-btn');
            if (diaBtn) {
                e.preventDefault();
                diaBtn.classList.toggle('active-dia');
                if (diaBtn.classList.contains('active-dia')) {
                    diaBtn.classList.remove('bg-surface-container-high', 'dark:bg-[#282828]', 'text-secondary', 'dark:text-[#c7c6c6]', 'border-outline-variant/30', 'dark:border-white/5');
                    diaBtn.classList.add('bg-primary', 'text-white', 'dark:bg-[#A13333]', 'border-primary', 'dark:border-[#A13333]', 'shadow-sm');
                } else {
                    diaBtn.classList.remove('bg-primary', 'text-white', 'dark:bg-[#A13333]', 'border-primary', 'dark:border-[#A13333]', 'shadow-sm');
                    diaBtn.classList.add('bg-surface-container-high', 'dark:bg-[#282828]', 'text-secondary', 'dark:text-[#c7c6c6]', 'border-outline-variant/30', 'dark:border-white/5');
                }
            }

            const btn = e.target.closest('#desktop-action-buttons button[type="submit"]') || e.target.closest('nav.md\\:hidden button[type="submit"]');
            if (btn) {
                const formId = btn.getAttribute('form');
                if (formId) {
                    const form = document.getElementById(formId);
                    if (form) {
                        e.preventDefault();
                        if (typeof form.requestSubmit === 'function') {
                            form.requestSubmit();
                        } else {
                            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                        }
                    }
                }
            }
        });

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
                    <div style="height: 60px; width: 220px; margin-bottom: 2rem; background-color: #811b1e; -webkit-mask: url('img/logo-habitat-web.svg') no-repeat center / contain; mask: url('img/logo-habitat-web.svg') no-repeat center / contain;"></div>
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
                        piso: getVal('piso-propiedad'),
                        depto: getVal('depto-propiedad'),

                        ambientes: getVal('ambientes-new'),
                        dormitorios: getVal('dormitorios-new'),
                        banos: getVal('banos-new'),
                        cocheras: getVal('cocheras-new'),
                        antiguedad: getRadioValue('antiguedad'),
                        amoblado: getRadioValue('amoblado') || 'sin-amoblar',

                        // Ubicacion (Paso 1.1)
                        calleAltura: getVal('calle-altura'),
                        latitud: window.selectedPropertyLat || (typeof window.propertyMarker?.position?.lat === 'function' ? window.propertyMarker.position.lat() : window.propertyMarker?.position?.lat) || null,
                        longitud: window.selectedPropertyLng || (typeof window.propertyMarker?.position?.lng === 'function' ? window.propertyMarker.position.lng() : window.propertyMarker?.position?.lng) || null,
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
                        expensasIncluidas: document.getElementById('expensas-incluidas')?.checked || false,
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
                            orientacion: getCheckedValues('#content-orientacion-adicionales'),
                            frenteTerreno: document.querySelector('#form-extras input[placeholder="0"]:nth-of-type(1)')?.value,
                            largoTerreno: document.querySelector('#form-extras input[placeholder="0"]:nth-of-type(2)')?.value
                        },

                        // Preferencias (Paso 4)
                        preferenciasAlquiler: {
                            permiteMascotas: document.getElementById('permite-mascotas')?.checked || false,
                            mascotas: {
                                gatos: parseInt(document.getElementById('cant-gato')?.value || 0),
                                perrosPequenos: parseInt(document.getElementById('cant-perro-pequeno')?.value || 0),
                                perrosGrandes: parseInt(document.getElementById('cant-perro-grande')?.value || 0),
                                negociable: document.getElementById('mascotas-negociable')?.checked || false,
                                tarifaIngreso: parseFloat(document.getElementById('tarifa-mascota')?.value || 0),
                                tarifaReembolsable: document.getElementById('tarifa-reembolsable')?.value === 'si',
                                alquilerMensualMascota: parseFloat(document.getElementById('alquiler-mascota')?.value || 0)
                            }
                        },

                        // Condiciones del Contrato (Paso 4)
                        condicionesContrato: {
                            duracionContrato: document.getElementById('duracion-contrato')?.value || '24-meses',
                            indiceActualizacion: document.getElementById('indice-actualizacion')?.value || 'ipc',
                            frecuenciaActualizacion: document.getElementById('frecuencia-actualizacion')?.value || 'cuatrimestral'
                        },

                        // Agenda de Visitas / Tours (Paso 4)
                        agendaVisitas: {
                            activo: document.getElementById('usar-agenda-visitas')?.checked || false,
                            modalidad: document.querySelector('input[name="modalidad-visitas"]:checked')?.value || 'confirmar',
                            duracionVisita: document.getElementById('duracion-visita')?.value || '30-min',
                            horaDesde: document.getElementById('visitas-hora-desde')?.value || '09:00',
                            horaHasta: document.getElementById('visitas-hora-hasta')?.value || '18:00',
                            diasDisponibles: Array.from(document.querySelectorAll('#dias-visitas-container .dia-visita-btn.active-dia')).map(b => b.dataset.dia),
                            notasVisitas: document.getElementById('notas-visitas')?.value || ''
                        },

                        // Planes (Paso 5)
                        planPublicacion: 'gratis', // Default plan

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

                    // Remove overlay and redirect to administrator properties view
                    overlay.remove();
                    document.getElementById('btn-back-from-publish')?.click();

                    if (window.location.pathname.includes('administrador.html')) {
                        await App.openAdminDashboard();
                        App.navigateTo('properties-view');
                    } else {
                        window.location.href = 'administrador.html?view=properties';
                    }
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
                if (errProv) errProv.classList.add('hidden');

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
                if (errCiudad) errCiudad.classList.add('hidden');
            });

            selectCiudad.addEventListener('change', () => {
                const errCiudad = document.getElementById('error-ciudad');
                if (errCiudad) errCiudad.classList.add('hidden');
            });

            const calle = document.getElementById('calle-altura');
            if (calle) {
                calle.addEventListener('input', () => {
                    window.selectedPropertyFromGoogle = false;
                    window.selectedPropertyStreetNumber = '';
                    const errCalle = document.getElementById('error-calle');
                    if (errCalle) errCalle.classList.add('hidden');
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
                                if (publishElem) { publishElem.classList.remove('hidden'); window.scrollTo(0, 0); }
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

        if (showRegisterBtn) {
            showRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                document.getElementById('login-form').classList.add('hidden');
                loginText.classList.add('hidden');

                document.getElementById('register-form').classList.remove('hidden');
                registerText.classList.remove('hidden');
            });
        }

        if (showLoginBtn) {
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
                if (content) {
                    content.classList.remove('hidden');
                    content.classList.add('active');
                    // Load specific tab data
                    if (targetTab === 'tab-tenants') App.renderTenants();
                    if (targetTab === 'tab-payments') App.renderPayments();
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
        const quickAddTenantBtn = document.getElementById('quick-add-tenant-btn');
        if (quickAddTenantBtn) {
            quickAddTenantBtn.addEventListener('click', () => {
                // For now, re-use the property modal or show a message
                const addPropFab = document.getElementById('add-property-fab');
                if (addPropFab) addPropFab.click();
                // In a real app, this would open a tenant-specific modal or pre-fill the form
            });
        }


    },

    openPropertyDetails: (property) => {
        const modal = document.getElementById('property-details-modal');
        const infoContainer = document.getElementById('details-info-container');
        const metricsBanner = document.getElementById('details-metrics-banner');
        const actionsBar = document.getElementById('details-actions-bar');
        const closeBtn = document.getElementById('close-details-modal');
        const detailsTitle = document.getElementById('details-title');

        if (!modal || !infoContainer) return;

        // Set Title
        if (detailsTitle) detailsTitle.textContent = property.title || property.address || 'Detalles de Propiedad';

        // 1. Metrics & Hardcoded Fallbacks for Admin Dashboard
        const activeDays = property.created_at
            ? Math.max(1, Math.floor((new Date() - new Date(property.created_at)) / (1000 * 60 * 60 * 24)))
            : (property.activeDays || 14);

        const viewsCount = property.views_count || property.views || 342;
        const inquiriesCount = property.inquiries_count || property.inquiries || 8;
        const rawStatus = property.status || 'disponible';
        const formattedStatus = rawStatus === 'disponible' ? 'Activa' : (rawStatus === 'alquilada' ? 'Alquilada' : 'Pausada');

        let statusPillClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
        let statusDotClass = 'bg-emerald-500';
        if (rawStatus === 'alquilada') {
            statusPillClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
            statusDotClass = 'bg-blue-500';
        } else if (rawStatus === 'pausada') {
            statusPillClass = 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
            statusDotClass = 'bg-amber-500';
        }

        // Render Metrics Banner (Estado, Días activa, Personas que la vieron, Interesados)
        if (metricsBanner) {
            metricsBanner.innerHTML = `
                <div class="bg-surface-container-low dark:bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-200/50 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl">sensors</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Estado</p>
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${statusPillClass} mt-0.5">
                            <span class="w-1.5 h-1.5 rounded-full ${statusDotClass} animate-pulse"></span>
                            ${formattedStatus}
                        </span>
                    </div>
                </div>

                <div class="bg-surface-container-low dark:bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-200/50 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl">schedule</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Días Activa</p>
                        <p class="font-headline font-extrabold text-sm text-zinc-900 dark:text-white truncate">${activeDays} días</p>
                    </div>
                </div>

                <div class="bg-surface-container-low dark:bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-200/50 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl">visibility</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Visualizaciones</p>
                        <p class="font-headline font-extrabold text-sm text-zinc-900 dark:text-white truncate">${viewsCount} vistas</p>
                    </div>
                </div>

                <div class="bg-surface-container-low dark:bg-zinc-800/60 rounded-2xl p-3.5 border border-zinc-200/50 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-xl">group</span>
                    </div>
                    <div class="min-w-0">
                        <p class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Interesados</p>
                        <p class="font-headline font-extrabold text-sm text-zinc-900 dark:text-white truncate">${inquiriesCount} consultas</p>
                    </div>
                </div>
            `;
        }

        // Calculate Expiration Date & Payment Status
        const today = new Date();
        const isOverdue = property.rentDueDay ? today.getDate() > property.rentDueDay : false;
        const paymentStatusHtml = isOverdue
            ? `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">Vencido</span>`
            : `<span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">Al día</span>`;

        const dueYear = today.getFullYear();
        const dueMonth = today.getMonth();
        const maxDaysInMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
        const dueDaySafe = Math.min(property.rentDueDay || 1, maxDaysInMonth);
        const expirationDate = new Date(dueYear, dueMonth, dueDaySafe);
        const expirationDateStr = expirationDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        const formattedPrice = property.price ? `$${parseFloat(property.price).toLocaleString('es-AR')}` : 'No especificado';
        const photoUrl = property.photoUrl || (property.images && property.images.length > 0 ? property.images[0] : null);

        // Populate Left Info Container
        infoContainer.innerHTML = `
            <!-- Main Photo & Address Header Card -->
            <div class="relative overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-800">
                ${photoUrl ? `<img src="${photoUrl}" alt="${property.address || 'Propiedad'}" class="w-full h-44 object-cover">` : ''}
                <div class="p-4">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h4 class="font-headline font-extrabold text-lg text-zinc-900 dark:text-white leading-snug">${property.address || property.title || 'Propiedad sin dirección'}</h4>
                            <p class="font-body text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-1">
                                <span class="material-symbols-outlined text-sm">location_on</span> ${property.address || 'Mendoza, Argentina'}
                            </p>
                        </div>
                        <div class="text-right shrink-0">
                            <span class="font-headline font-extrabold text-xl text-primary dark:text-red-400 block">${formattedPrice}</span>
                            <span class="text-[11px] text-zinc-400 font-medium">/ mes</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-body">
                <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-2.5">
                    <h5 class="font-headline font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Condiciones de Alquiler</h5>
                    <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span class="text-zinc-500 dark:text-zinc-400">Estado de Pago:</span>
                        ${paymentStatusHtml}
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span class="text-zinc-500 dark:text-zinc-400">Día de Cobro:</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">Día ${property.rentDueDay || '10'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span class="text-zinc-500 dark:text-zinc-400">Próx. Vencimiento:</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">${expirationDateStr}</span>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-zinc-500 dark:text-zinc-400">Aumento Programado:</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">${property.increaseRate || '15'}% c/${property.increaseFrequency || '3'} meses</span>
                    </div>
                </div>

                <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200/60 dark:border-zinc-800/80 space-y-2.5">
                    <h5 class="font-headline font-bold text-xs text-zinc-400 uppercase tracking-wider mb-2">Inquilino y Contrato</h5>
                    <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span class="text-zinc-500 dark:text-zinc-400">Inquilino:</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">${property.tenantName || 'Sin asignar'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                        <span class="text-zinc-500 dark:text-zinc-400">Vigencia Contrato:</span>
                        <span class="font-bold text-zinc-800 dark:text-zinc-200">${property.contractStartDate || '01/01/2026'} - ${property.contractEndDate || '31/12/2026'}</span>
                    </div>
                    ${property.contract ? `
                        <div class="pt-2">
                            <a href="${property.contract.data}" download="${property.contract.name}" class="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-red-400 hover:underline">
                                <span class="material-symbols-outlined text-base">description</span> Descargar Contrato (PDF)
                            </a>
                        </div>
                    ` : `
                        <div class="pt-1 text-zinc-400 text-[11px] italic">No hay adjunto en formato digital</div>
                    `}
                </div>
            </div>
        `;

        // Action Buttons Bar
        if (actionsBar) {
            actionsBar.innerHTML = `
                <div class="flex items-center gap-2">
                    <a href="buscar.html" class="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-colors">
                        <span class="material-symbols-outlined text-base">open_in_new</span>
                        Ver en Marketplace
                    </a>
                </div>
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-delete-property-modal" class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors">
                        <span class="material-symbols-outlined text-base">delete</span>
                        Eliminar Propiedad
                    </button>
                </div>
            `;

            const btnDelete = document.getElementById('btn-delete-property-modal');
            if (btnDelete) {
                btnDelete.onclick = async () => {
                    if (confirm('¿Estás seguro de eliminar esta propiedad? Esta acción no se puede deshacer.')) {
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
            }
        }

        // Calendar Navigation Logic
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth();

        const render = () => App.renderCalendar(currentYear, currentMonth, property);

        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');

        if (prevBtn) {
            prevBtn.onclick = () => {
                currentMonth--;
                if (currentMonth < 0) { currentMonth = 11; currentYear--; }
                render();
            };
        }

        if (nextBtn) {
            nextBtn.onclick = () => {
                currentMonth++;
                if (currentMonth > 11) { currentMonth = 0; currentYear++; }
                render();
            };
        }

        render();

        // Show Modal
        modal.classList.remove('hidden');
        document.body.classList.add('no-scroll');

        // Close Handlers
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            };
        }

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
        };
    },

    renderCalendar: (year, month, property) => {
        // Helper to parse date string YYYY-MM-DD as Local Date (avoiding TZ shifts)
        const parseLocalDate = (dateStr) => {
            if (!dateStr) return null;
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
        for (let i = 0; i < firstDay; i++) {
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
        for (let day = 1; day <= daysInMonth; day++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';

            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = day;
            el.appendChild(dayNumber);

            const currentDate = new Date(year, month, day, 12, 0, 0);

            // Checks
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            if (isToday) el.classList.add('is-today');

            // Contract Start/End
            const startDate = parseLocalDate(property.contractStartDate);
            const endDate = parseLocalDate(property.contractEndDate);

            if (startDate && endDate) {
                const isStart = currentDate.getTime() === startDate.getTime();
                const isEnd = currentDate.getTime() === endDate.getTime();

                if (isStart || isEnd) el.classList.add('is-start-end');

                // Rent Due Day & Amount Display
                // Only show if within contract period
                if (currentDate >= startDate && currentDate <= endDate) {
                    if (day === property.rentDueDay) {
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
                        if (currentDate <= endDate) el.classList.add('is-increase');
                    }
                }
            }

            grid.appendChild(el);
            totalCells++;
        }

        // Fill remaining slots to maintain constant height (6 rows * 7 days = 42 cells)
        const totalRows = 6;
        const remainingCells = (totalRows * 7) - totalCells;

        for (let i = 0; i < remainingCells; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            grid.appendChild(el);
        }
    },

    showLogin: () => {
        window.location.href = 'login.html?mode=login';
    },

    openAdminDashboard: async (user = null) => {
        let activeUser = user;

        if (!activeUser) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            activeUser = session?.user || null;
        }

        if (!activeUser) {
            window.location.href = 'login.html?redirect=admin&mode=login';
            return;
        }

        document.getElementById('landing-marketplace-view')?.classList.add('hidden');
        document.getElementById('landing-propietarios-view')?.classList.add('hidden');
        document.getElementById('publish-property-view')?.classList.add('hidden');
        document.getElementById('mis-avisos-view')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');

        await App.showMainApp(activeUser);
        App.navigateTo('home-view');
        window.scrollTo(0, 0);
    },

    showMainApp: async (user) => {
        App.state.currentUser = user;
        document.getElementById('login-view')?.classList.add('hidden');
        document.getElementById('main-layout')?.classList.remove('hidden');
        await App.render();
    },

    showPublishWizard: () => {
        window.currentWizardStep = 1;

        document.querySelectorAll('#landing-marketplace-view, #landing-propietarios-view, #mis-avisos-view, #app, #main-layout, #login-view').forEach(el => {
            if (el) el.classList.add('hidden');
        });

        const publishElem = document.getElementById('publish-property-view');
        if (publishElem) {
            publishElem.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    },

    closePublishWizard: () => {
        window.currentWizardStep = 1;

        const publishElem = document.getElementById('publish-property-view');
        if (publishElem) {
            publishElem.classList.add('hidden');
        }

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

        if (tabOperacion) tabOperacion.className = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap pointer-events-none active-tab';
        if (tabUbicacion) tabUbicacion.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';
        if (tabCaracteristicas) tabCaracteristicas.className = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap pointer-events-none';

        if (publishMainTitle) publishMainTitle.textContent = '¡Empecemos a crear tu aviso!';
        if (pasoSubtitle) pasoSubtitle.textContent = '¿Qué querés publicar?';

        document.querySelectorAll('button[type="submit"]').forEach(btn => {
            if (btn.hasAttribute('form')) btn.setAttribute('form', 'form-principales');
        });

        App.applyPageContext();
        window.scrollTo(0, 0);

        if (window.marketplaceObserver) {
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.classList.remove('is-visible');
                window.marketplaceObserver.observe(el);
            });
        }
    },

    setupMarketPlaceListeners: () => {
        const startBtn = document.getElementById('publish-property-trigger');
        const contactModal = document.getElementById('marketplace-contact-modal');
        const contactForm = document.getElementById('marketplace-contact-form');

        if (startBtn && contactModal) {
            startBtn.addEventListener('click', () => {
                contactModal.classList.remove('hidden');
                document.body.classList.add('no-scroll');
            });
        }

        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Prevent page reload
                // Here we would normally validate and store the contact form data.
                // For now, we proceed to the wizard.
                if (contactModal) contactModal.classList.add('hidden');
                App.showPublishWizard();
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
                    const form = document.getElementById('form-preferencias');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (window.currentWizardStep === 5) {
                    const form = document.getElementById('form-visitas');
                    if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                } else if (window.currentWizardStep === 6) {
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
        const viewEl = document.getElementById(viewId);
        if (viewEl) {
            viewEl.classList.remove('hidden');
        }

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
            loginView?.classList.add('hidden');
            mainLayout?.classList.remove('hidden');
            const userDisplayName = document.getElementById('user-display-name');
            if (userDisplayName) userDisplayName.textContent = currentUser.user_metadata?.full_name || currentUser.email || currentUser.name || 'Usuario';
            await App.refreshData();
            // Ensure we are on a valid view, default to home if none active or if coming from login
            if (document.querySelectorAll('.view:not(.hidden)').length === 0 || App.state.currentView === 'login-view') {
                App.navigateTo('home-view');
            }
        } else {
            if (App.getPageContext() === 'admin') {
                window.location.href = 'login.html?redirect=admin&mode=login';
                return;
            }
            loginView?.classList.add('hidden');
            mainLayout?.classList.add('hidden');
            App.applyPageContext();
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
        if (!tbody) return;

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
        const totalPaid = document.getElementById('payments-total-paid');
        if (totalPaid) totalPaid.textContent = `$${stats.totalPaid.toLocaleString()}`;
        const pendingCount = document.getElementById('payments-pending-count');
        if (pendingCount) pendingCount.textContent = stats.pendingCount;
        const totalTransactions = document.getElementById('payments-total-transactions');
        if (totalTransactions) totalTransactions.textContent = stats.totalTransactions;
    },

    toggleMenu: (event, type, id) => {
        event.stopPropagation();
        const menuId = `menu-${type}-${id}`;
        const menu = document.getElementById(menuId);

        // Close all other menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => {
            if (m.id !== menuId) m.classList.remove('active');
        });

        if (menu) {
            menu.classList.toggle('active');
        }
    },

    handleAction: (action, type, id) => {
        console.log(`Action: ${action}, Type: ${type}, ID: ${id}`);
        // Close menus
        document.querySelectorAll('.dropdown-menu.active').forEach(m => m.classList.remove('active'));

        if (action === 'delete') {
            if (confirm('¿Estás seguro de que deseas eliminar este elemento?')) {
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
                        if (e.target.tagName === 'A' || e.target.closest('a')) return;
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
        if (incomeDisplay) incomeDisplay.textContent = `$${totalIncome.toLocaleString()}`;

        const financeList = document.getElementById('finance-breakdown-list');
        if (financeList) {
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
// Marketplace Property Detail & Photo Gallery Modal
// ============================================================
window.openMarketplacePropertyDetailModal = function (prop) {
    if (!prop) return;

    // Parse extraInfo if description contains 'Detalles: '
    let extraInfo = {};
    let descriptionText = prop.description || prop.note || 'Sin descripción disponible para esta propiedad.';
    if (typeof descriptionText === 'string' && descriptionText.includes('Detalles: ')) {
        const parts = descriptionText.split('Detalles: ');
        descriptionText = parts[0].trim();
        try {
            extraInfo = JSON.parse(parts[1]);
        } catch (e) {
            console.warn('Error parsing extraInfo JSON', e);
        }
    }

    // Collect photos
    let photos = [];
    if (prop.propiedad_imagenes && prop.propiedad_imagenes.length > 0) {
        photos = prop.propiedad_imagenes.sort((a, b) => (a.orden || 0) - (b.orden || 0)).map(i => i.url);
    } else if (Array.isArray(prop.images) && prop.images.length > 0) {
        photos = prop.images;
    } else if (prop.image) {
        photos = [prop.image];
    } else if (prop.photoUrl) {
        photos = [prop.photoUrl];
    }
    if (!photos || photos.length === 0) {
        photos = ['img/hero-marketplace.jpg'];
    }

    // Helper to extract numeric metrics from tags array if extraInfo is missing
    const extractTagMetric = (tags, keywords) => {
        if (!tags || !Array.isArray(tags)) return null;
        for (const tag of tags) {
            const lower = tag.toLowerCase();
            if (keywords.some(k => lower.includes(k))) {
                const match = tag.match(/\d+/);
                if (match) return match[0];
                return tag;
            }
        }
        return null;
    };

    // Normalize property details
    const title = prop.title || 'Propiedad en alquiler';
    const address = prop.address || prop.ubicacion || 'Ubicación no especificada';
    const province = prop.province || extraInfo.provincia || '';
    const fullAddress = (province && !address.toLowerCase().includes(province.toLowerCase()))
        ? `${address}, ${province}`
        : address;

    const moneda = (extraInfo.moneda === 'USD') ? 'U$S' : '$';
    const priceFormatted = prop.price
        ? `${moneda} ${Number(prop.price).toLocaleString('es-AR')}`
        : 'Consultar precio';

    const operacion = (extraInfo.operacion || prop.featured || prop.type || 'En Alquiler').toUpperCase();
    const dormitorios = extraInfo.dormitorios || prop.bedrooms || extractTagMetric(prop.tags, ['dorm', 'habitac']);
    const banos = extraInfo.banos || prop.bathrooms || extractTagMetric(prop.tags, ['baño', 'bano']);
    const ambientes = extraInfo.ambientes || null;
    const supCubierta = extraInfo.sup_cubierta || extractTagMetric(prop.tags, ['m²', 'm2']);
    const petFriendly = extraInfo.mascotas || prop.pet || (prop.tags && prop.tags.some(t => t.toLowerCase().includes('mascota')));
    const verified = prop.verified || (prop.tags && prop.tags.some(t => t.toLowerCase().includes('verificad')));

    // Extract tags list
    let tagsList = prop.tags || [];
    if (extraInfo.caracteristicas && Array.isArray(extraInfo.caracteristicas)) {
        tagsList = Array.from(new Set([...tagsList, ...extraInfo.caracteristicas]));
    }

    let activeImageIndex = 0;

    // Create or select modal container
    let modal = document.getElementById('marketplace-property-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'marketplace-property-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity duration-300 overflow-y-auto';
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'auto';

    modal.innerHTML = `
        <div class="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-zinc-200/60 dark:border-zinc-800 my-auto text-on-background dark:text-white font-body" onclick="event.stopPropagation()">
            
            <!-- Header / Close button -->
            <div class="sticky top-0 z-30 flex items-center justify-between px-5 py-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/50 dark:border-zinc-800">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="px-3 py-1 text-xs font-black tracking-wider rounded-full uppercase bg-red-100 dark:bg-red-950/60 text-primary dark:text-red-400">
                        ${operacion}
                    </span>
                    ${verified ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                            <span class="material-symbols-outlined text-sm">verified</span> Verificado
                        </span>
                    ` : ''}
                    ${petFriendly ? `
                        <span class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            <span class="material-symbols-outlined text-sm">pets</span> Apto Mascotas
                        </span>
                    ` : ''}
                </div>
                <button id="close-marketplace-modal-btn" type="button" aria-label="Cerrar modal" class="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer">
                    <span class="material-symbols-outlined pointer-events-none">close</span>
                </button>
            </div>

            <!-- Scrollable Content -->
            <div class="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1">
                
                <!-- Main Image Gallery Display -->
                <div id="mp-modal-main-img-container" class="relative group rounded-2xl overflow-hidden bg-zinc-950 aspect-[16/10] sm:aspect-[21/9] shadow-md border border-zinc-200/20 dark:border-zinc-800 cursor-pointer">
                    <img id="mp-modal-main-img" src="${photos[0]}" alt="${title}" class="w-full h-full object-cover transition-all duration-500 group-hover:scale-105" onerror="this.src='img/hero-marketplace.jpg'">
                    
                    ${photos.length > 1 ? `
                        <button id="mp-modal-prev-btn" type="button" class="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur flex items-center justify-center transition-all hover:scale-110 shadow-lg cursor-pointer">
                            <span class="material-symbols-outlined pointer-events-none">chevron_left</span>
                        </button>
                        <button id="mp-modal-next-btn" type="button" class="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur flex items-center justify-center transition-all hover:scale-110 shadow-lg cursor-pointer">
                            <span class="material-symbols-outlined pointer-events-none">chevron_right</span>
                        </button>
                        <div id="mp-modal-counter" class="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">
                            1 / ${photos.length}
                        </div>
                    ` : ''}

                    <div class="absolute top-3 left-3 bg-black/60 hover:bg-black/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-lg border border-white/20 transition-all group-hover:scale-105">
                        <span class="material-symbols-outlined text-sm">fullscreen</span>
                        <span>Ver foto completa</span>
                    </div>
                </div>

                <!-- Thumbnails Bar -->
                ${photos.length > 1 ? `
                    <div class="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        ${photos.map((url, i) => `
                            <button type="button" data-img-idx="${i}" class="mp-modal-thumb relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${i === 0 ? 'border-primary dark:border-red-500 ring-2 ring-primary/30 opacity-100 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}">
                                <img src="${url}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='img/hero-marketplace.jpg'">
                            </button>
                        `).join('')}
                    </div>
                ` : ''}

                <!-- Title, Location & Price -->
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-zinc-200/60 dark:border-zinc-800 pb-6">
                    <div class="space-y-2">
                        <h2 class="font-headline text-2xl sm:text-3xl font-extrabold text-on-background dark:text-white leading-tight">
                            ${title}
                        </h2>
                        <p class="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base flex items-center gap-1.5 font-medium">
                            <span class="material-symbols-outlined text-primary dark:text-red-400">location_on</span>
                            ${fullAddress}
                        </p>
                    </div>
                    <div class="sm:text-right shrink-0 bg-zinc-50 dark:bg-zinc-800/60 px-4 py-3 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                        <span class="block text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500 tracking-wider mb-0.5">Precio de alquiler</span>
                        <span class="text-2xl sm:text-3xl font-extrabold text-primary dark:text-red-400">${priceFormatted}</span>
                    </div>
                </div>

                <!-- Features & Spec Cards Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    ${dormitorios ? `
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">bed</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">Dormitorios</span>
                                <span class="font-extrabold text-sm sm:text-base text-on-background dark:text-white">${dormitorios}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${banos ? `
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">bathtub</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">Baños</span>
                                <span class="font-extrabold text-sm sm:text-base text-on-background dark:text-white">${banos}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${ambientes ? `
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">home</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">Ambientes</span>
                                <span class="font-extrabold text-sm sm:text-base text-on-background dark:text-white">${ambientes}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${supCubierta ? `
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/50 flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-primary dark:text-red-400 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined text-xl">square_foot</span>
                            </div>
                            <div>
                                <span class="block text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500">Superficie</span>
                                <span class="font-extrabold text-sm sm:text-base text-on-background dark:text-white">${supCubierta} m²</span>
                            </div>
                        </div>
                    ` : ''}
                </div>

                <!-- Full Description Section -->
                <div class="space-y-2 pt-2">
                    <h3 class="font-headline text-lg font-bold text-on-background dark:text-white">Descripción de la propiedad</h3>
                    <div class="bg-zinc-50/60 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60">
                        <p class="font-body text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                            ${descriptionText}
                        </p>
                    </div>
                </div>

                <!-- Characteristics / Tags Chips -->
                ${tagsList.length > 0 ? `
                    <div class="space-y-3 pt-2">
                        <h3 class="font-headline text-lg font-bold text-on-background dark:text-white">Comodidades y características</h3>
                        <div class="flex flex-wrap gap-2">
                            ${tagsList.map(tag => `
                                <span class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200/50 dark:border-zinc-700/50">
                                    <span class="material-symbols-outlined text-base text-primary dark:text-red-400">check_circle</span>
                                    ${tag}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

            </div>

            <!-- Modal Footer Actions -->
            <div class="sticky bottom-0 z-30 px-5 py-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/60 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="hidden sm:block">
                    <span class="text-[11px] text-zinc-400 uppercase font-bold tracking-wider">Gestión Hábitat</span>
                    <p class="text-xs font-bold text-zinc-700 dark:text-zinc-300">Contrato online, visitas guiadas y postulación directa</p>
                </div>
                <div class="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button id="mp-modal-visit-btn" type="button" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-3 rounded-xl transition-all text-sm shadow-md cursor-pointer">
                        <span class="material-symbols-outlined text-base">calendar_month</span>
                        Agendar Visita
                    </button>
                    <button id="mp-modal-apply-btn" type="button" class="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-white font-bold px-5 py-3 rounded-xl transition-all text-sm shadow-lg shadow-primary/20 cursor-pointer">
                        <span class="material-symbols-outlined text-base">how_to_reg</span>
                        Postularme al Alquiler
                    </button>
                </div>
            </div>

        </div>
    `;

    document.body.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';

    // Fade in modal smoothly
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });

    // Fullscreen Lightbox function
    function openLightbox(startIdx) {
        let lightbox = document.getElementById('mp-lightbox-modal');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'mp-lightbox-modal';
            document.body.appendChild(lightbox);
        }

        lightbox.className = 'fixed inset-0 z-[100000] flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl transition-opacity duration-300 p-4 font-body';
        lightbox.style.display = 'flex';
        lightbox.style.opacity = '0';

        let currentLbIdx = startIdx;

        lightbox.innerHTML = `
            <!-- Lightbox Header -->
            <div class="w-full flex items-center justify-between px-2 sm:px-4 py-2 z-20 shrink-0">
                <div class="text-white text-sm font-bold flex items-center gap-2 max-w-[70%] truncate">
                    <span class="material-symbols-outlined text-red-500">photo_camera</span>
                    <span class="truncate">${title}</span>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span id="lb-counter" class="text-white/90 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
                        ${currentLbIdx + 1} / ${photos.length}
                    </span>
                    <button id="lb-close-btn" type="button" aria-label="Cerrar vista completa" class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer">
                        <span class="material-symbols-outlined pointer-events-none">close</span>
                    </button>
                </div>
            </div>

            <!-- Main Fullscreen Image Container -->
            <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden my-auto p-2 sm:p-4">
                <img id="lb-main-img" src="${photos[currentLbIdx]}" alt="${title}" class="max-w-full max-h-[80vh] sm:max-h-[84vh] object-contain transition-all duration-300 rounded-xl shadow-2xl" onerror="this.src='img/hero-marketplace.jpg'">

                ${photos.length > 1 ? `
                    <button id="lb-prev-btn" type="button" class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/20 cursor-pointer">
                        <span class="material-symbols-outlined pointer-events-none text-2xl">chevron_left</span>
                    </button>
                    <button id="lb-next-btn" type="button" class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/20 cursor-pointer">
                        <span class="material-symbols-outlined pointer-events-none text-2xl">chevron_right</span>
                    </button>
                ` : ''}
            </div>

            <!-- Lightbox Footer Thumbnails -->
            ${photos.length > 1 ? `
                <div class="w-full flex items-center justify-center gap-3 overflow-x-auto py-2 px-2 z-20 scrollbar-thin shrink-0">
                    ${photos.map((url, i) => `
                        <button type="button" data-lb-idx="${i}" class="lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${i === currentLbIdx ? 'border-red-500 ring-2 ring-red-500/50 opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}">
                            <img src="${url}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='img/hero-marketplace.jpg'">
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        `;

        requestAnimationFrame(() => {
            lightbox.style.opacity = '1';
        });

        function setLbImage(idx) {
            if (idx < 0) idx = photos.length - 1;
            if (idx >= photos.length) idx = 0;
            currentLbIdx = idx;

            const lbImg = document.getElementById('lb-main-img');
            const lbCounter = document.getElementById('lb-counter');
            if (lbImg) {
                lbImg.style.opacity = '0.3';
                setTimeout(() => {
                    lbImg.src = photos[currentLbIdx];
                    lbImg.style.opacity = '1';
                }, 100);
            }
            if (lbCounter) {
                lbCounter.textContent = `${currentLbIdx + 1} / ${photos.length}`;
            }

            const thumbs = lightbox.querySelectorAll('.lb-thumb');
            thumbs.forEach((th, i) => {
                if (i === currentLbIdx) {
                    th.className = 'lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all border-red-500 ring-2 ring-red-500/50 opacity-100 scale-105 cursor-pointer';
                } else {
                    th.className = 'lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all border-transparent opacity-50 hover:opacity-100 cursor-pointer';
                }
            });
        }

        const closeLb = () => {
            lightbox.style.opacity = '0';
            window.removeEventListener('keydown', handleLbKey);
            setTimeout(() => {
                lightbox.style.display = 'none';
            }, 250);
        };

        const lbCloseBtn = document.getElementById('lb-close-btn');
        if (lbCloseBtn) {
            lbCloseBtn.onclick = (e) => {
                e.stopPropagation();
                closeLb();
            };
        }

        lightbox.onclick = (e) => {
            if (e.target === lightbox || e.target.id === 'lb-main-img') {
                closeLb();
            }
        };

        const lbPrevBtn = document.getElementById('lb-prev-btn');
        const lbNextBtn = document.getElementById('lb-next-btn');
        if (lbPrevBtn) lbPrevBtn.onclick = (e) => { e.stopPropagation(); setLbImage(currentLbIdx - 1); };
        if (lbNextBtn) lbNextBtn.onclick = (e) => { e.stopPropagation(); setLbImage(currentLbIdx + 1); };

        lightbox.querySelectorAll('.lb-thumb').forEach(th => {
            th.onclick = (e) => {
                e.stopPropagation();
                const idx = Number(th.dataset.lbIdx);
                setLbImage(idx);
            };
        });

        const handleLbKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeLb();
            }
            if (e.key === 'ArrowLeft' && photos.length > 1) {
                e.stopPropagation();
                setLbImage(currentLbIdx - 1);
            }
            if (e.key === 'ArrowRight' && photos.length > 1) {
                e.stopPropagation();
                setLbImage(currentLbIdx + 1);
            }
        };
        window.addEventListener('keydown', handleLbKey);
    }

    // Attach click listener to main photo container to open Lightbox
    const mainImgContainer = document.getElementById('mp-modal-main-img-container');
    if (mainImgContainer) {
        mainImgContainer.onclick = (e) => {
            if (e.target.closest('#mp-modal-prev-btn') || e.target.closest('#mp-modal-next-btn')) return;
            openLightbox(activeImageIndex);
        };
    }

    // Image navigation handler helper
    function setImage(idx) {
        if (idx < 0) idx = photos.length - 1;
        if (idx >= photos.length) idx = 0;
        activeImageIndex = idx;

        const mainImg = document.getElementById('mp-modal-main-img');
        const counter = document.getElementById('mp-modal-counter');
        if (mainImg) {
            mainImg.style.opacity = '0.4';
            setTimeout(() => {
                mainImg.src = photos[activeImageIndex];
                mainImg.style.opacity = '1';
            }, 120);
        }
        if (counter) {
            counter.textContent = `${activeImageIndex + 1} / ${photos.length}`;
        }

        // Update thumbnails UI
        const thumbs = modal.querySelectorAll('.mp-modal-thumb');
        thumbs.forEach((th, i) => {
            if (i === activeImageIndex) {
                th.className = 'mp-modal-thumb relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 shrink-0 transition-all border-primary dark:border-red-500 ring-2 ring-primary/30 opacity-100 scale-105 cursor-pointer';
            } else {
                th.className = 'mp-modal-thumb relative w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 shrink-0 transition-all border-transparent opacity-60 hover:opacity-100 cursor-pointer';
            }
        });
    }

    // Prev / Next button listeners
    const prevBtn = document.getElementById('mp-modal-prev-btn');
    const nextBtn = document.getElementById('mp-modal-next-btn');
    if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); setImage(activeImageIndex - 1); };
    if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); setImage(activeImageIndex + 1); };

    // Thumbnail listeners
    modal.querySelectorAll('.mp-modal-thumb').forEach(th => {
        th.onclick = (e) => {
            e.stopPropagation();
            const idx = Number(th.dataset.imgIdx);
            setImage(idx);
        };
    });

    // Reliable Close handler
    const closeModal = () => {
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        document.body.classList.remove('no-scroll');
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        setTimeout(() => {
            modal.style.display = 'none';
        }, 280);
    };

    const closeBtn = document.getElementById('close-marketplace-modal-btn');
    if (closeBtn) {
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    }

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft' && photos.length > 1) setImage(activeImageIndex - 1);
        if (e.key === 'ArrowRight' && photos.length > 1) setImage(activeImageIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);

    // Visit scheduling button listener
    const visitBtn = document.getElementById('mp-modal-visit-btn');
    if (visitBtn) {
        visitBtn.onclick = (e) => {
            e.preventDefault();
            closeModal();
            if (typeof window.openAgendarVisitaModal === 'function') {
                window.openAgendarVisitaModal(prop);
            }
        };
    }

    // Apply / Postulación button listener
    const applyBtn = document.getElementById('mp-modal-apply-btn');
    if (applyBtn) {
        applyBtn.onclick = (e) => {
            e.preventDefault();
            closeModal();
            if (typeof window.openPostulacionModal === 'function') {
                window.openPostulacionModal(prop);
            }
        };
    }
};

// ============================================================
// Global Modals: Postulación & Agendar Visita
// ============================================================
window.openPostulacionModal = function(prop) {
    const propTitle = prop?.title || prop?.titleAviso || 'Departamento 2 Ambientes en Belgrano';
    const propAddress = prop?.address || prop?.ubicacion || 'Av. Cabildo 1845, CABA';
    const propId = prop?.id || 'prop-101';

    let modal = document.getElementById('habitat-postulacion-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'habitat-postulacion-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300 overflow-y-auto font-body';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 text-on-background dark:text-white my-auto" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                <div>
                    <span class="text-xs font-bold text-primary dark:text-red-400 uppercase tracking-wider">Postulación a Alquiler</span>
                    <h3 class="font-headline text-xl font-extrabold text-zinc-900 dark:text-white">${propTitle}</h3>
                </div>
                <button type="button" id="close-postulacion-modal" class="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <form id="form-postulacion-modal" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Nombre completo</label>
                    <input type="text" id="postula-nombre" required value="Carlos Gómez" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-primary">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Correo Electrónico</label>
                        <input type="email" id="postula-email" required value="carlos.gomez@gmail.com" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-primary">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Teléfono WhatsApp</label>
                        <input type="tel" id="postula-telefono" required value="+54 9 11 4567-8901" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-primary">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Demostración de Ingresos / Garantía</label>
                    <input type="text" id="postula-ingresos" required value="Recibo de Sueldo ($950.000) + Garantía Finaer" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-primary">
                </div>
                <div>
                    <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Mensaje para el propietario (opcional)</label>
                    <textarea id="postula-mensaje" rows="3" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium focus:ring-2 focus:ring-primary" placeholder="Cuéntale un poco sobre ti y tu disponibilidad para ingresar...">¡Hola! Me interesa mucho la propiedad. Cuento con toda la documentación lista para la firma del contrato.</textarea>
                </div>
                <div class="pt-2 flex gap-3">
                    <button type="button" id="btn-cancel-postulacion" class="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        Cancelar
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-base">send</span>
                        Enviar Postulación
                    </button>
                </div>
            </form>
        </div>
    `;

    const closeFn = () => { modal.style.display = 'none'; };
    document.getElementById('close-postulacion-modal').onclick = closeFn;
    document.getElementById('btn-cancel-postulacion').onclick = closeFn;

    document.getElementById('form-postulacion-modal').onsubmit = async (e) => {
        e.preventDefault();
        const appData = {
            propertyId: propId,
            propertyTitle: propTitle,
            propertyAddress: propAddress,
            tenantName: document.getElementById('postula-nombre').value,
            tenantEmail: document.getElementById('postula-email').value,
            tenantPhone: document.getElementById('postula-telefono').value,
            incomeProof: document.getElementById('postula-ingresos').value,
            message: document.getElementById('postula-mensaje').value
        };

        if (window.DataManager) {
            await window.DataManager.submitApplication(appData);
        }
        closeFn();

        if (confirm("¡Tu postulación ha sido enviada con éxito al propietario!\n\n¿Deseas ir a la sección 'Tus Postulaciones' para hacerle seguimiento?")) {
            window.location.href = 'postulaciones.html';
        }
    };
};

window.openAgendarVisitaModal = function(prop) {
    const propTitle = prop?.title || prop?.titleAviso || 'Departamento 2 Ambientes en Belgrano';
    const propAddress = prop?.address || prop?.ubicacion || 'Av. Cabildo 1845, CABA';
    const propId = prop?.id || 'prop-101';

    let modal = document.getElementById('habitat-visita-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'habitat-visita-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300 overflow-y-auto font-body';
    modal.style.display = 'flex';

    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    modal.innerHTML = `
        <div class="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 text-on-background dark:text-white my-auto" onclick="event.stopPropagation()">
            <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-6">
                <div>
                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Agendar Visita</span>
                    <h3 class="font-headline text-xl font-extrabold text-zinc-900 dark:text-white">${propTitle}</h3>
                </div>
                <button type="button" id="close-visita-modal" class="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <form id="form-visita-modal" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Nombre y Apellido</label>
                    <input type="text" id="visita-nombre" required value="Carlos Gómez" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Teléfono de contacto</label>
                        <input type="tel" id="visita-telefono" required value="+54 9 11 4567-8901" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Correo Electrónico</label>
                        <input type="email" id="visita-email" required value="carlos.gomez@gmail.com" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Fecha deseada</label>
                        <input type="date" id="visita-fecha" required value="${tomorrow}" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Horario preferido</label>
                        <select id="visita-horario" required class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                            <option value="10:30 hs">10:30 hs</option>
                            <option value="12:00 hs">12:00 hs</option>
                            <option value="15:30 hs" selected>15:30 hs</option>
                            <option value="17:00 hs">17:00 hs</option>
                            <option value="18:30 hs">18:30 hs</option>
                        </select>
                    </div>
                </div>
                <div class="pt-2 flex gap-3">
                    <button type="button" id="btn-cancel-visita" class="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        Cancelar
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-base">calendar_month</span>
                        Confirmar Visita
                    </button>
                </div>
            </form>
        </div>
    `;

    const closeFn = () => { modal.style.display = 'none'; };
    document.getElementById('close-visita-modal').onclick = closeFn;
    document.getElementById('btn-cancel-visita').onclick = closeFn;

    document.getElementById('form-visita-modal').onsubmit = async (e) => {
        e.preventDefault();
        const visitData = {
            propertyId: propId,
            propertyTitle: propTitle,
            propertyAddress: propAddress,
            visitorName: document.getElementById('visita-nombre').value,
            visitorEmail: document.getElementById('visita-email').value,
            visitorPhone: document.getElementById('visita-telefono').value,
            visitDate: document.getElementById('visita-fecha').value,
            visitTime: document.getElementById('visita-horario').value
        };

        if (window.DataManager) {
            await window.DataManager.scheduleVisit(visitData);
        }
        closeFn();

        if (confirm("¡Tu visita ha sido agendada con éxito!\n\n¿Deseas ir al 'Itinerario de Visitas' para consultar tus turnos agendados?")) {
            window.location.href = 'visitas.html';
        }
    };
};


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
    }[extraInfo.operacion?.toLowerCase()] || extraInfo.operacion?.toUpperCase() || 'EN ALQUILER';

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
    card.onclick = () => {
        if (typeof window.openMarketplacePropertyDetailModal === 'function') {
            window.openMarketplacePropertyDetailModal(prop);
        }
    };

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
                    Ver más y fotos
                    <span class="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
        </div>
    `;

    const btnVerMas = card.querySelector('button');
    if (btnVerMas) {
        btnVerMas.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.openMarketplacePropertyDetailModal === 'function') {
                window.openMarketplacePropertyDetailModal(prop);
            }
        };
    }

    return card;
}
// Real Interactive Map using Google Maps JS API
window.initGoogleMap = async function () {
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
                        if (streetNumber) {
                            window.selectedPropertyFromGoogle = true;
                            window.selectedPropertyStreetNumber = streetNumber;
                        }
                    }
                }
            }
        });
    };

    // Listen for map click
    window.propertyMap.addListener('click', function (e) {
        window.propertyMarker.position = e.latLng;
        window.propertyMap.panTo(e.latLng);
        updateAddressUI(e.latLng);
    });

    // Listen for drag end on AdvancedMarkerElement
    window.propertyMarker.addListener('dragend', function () {
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
            const errCalle = document.getElementById('error-calle');
            if (!place || !place.geometry || !place.geometry.location) {
                window.selectedPropertyFromGoogle = false;
                window.selectedPropertyStreetNumber = '';
                if (errCalle) {
                    errCalle.textContent = 'Debes seleccionar una dirección válida del autocompletado.';
                    errCalle.classList.remove('hidden');
                }
                return;
            }

            // Update map
            window.propertyMap.panTo(place.geometry.location);
            window.propertyMarker.position = place.geometry.location;

            // Store exact lat/lng
            window.selectedPropertyLat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
            window.selectedPropertyLng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;

            const label = document.getElementById('map-address-label');
            if (label) label.textContent = place.formatted_address;

            // Extract components (route, street_number)
            let routeStr = '';
            let streetNumberStr = '';

            if (place.address_components) {
                for (const component of place.address_components) {
                    const types = component.types;
                    if (types.includes('route')) routeStr = component.long_name;
                    if (types.includes('street_number')) streetNumberStr = component.long_name;
                }
            }

            // Fallback: check if a number was typed in the input or formatted_address
            if (!streetNumberStr) {
                const matchNumber = (place.formatted_address || inputCalle.value || '').match(/\b\d{1,5}\b/);
                if (matchNumber) streetNumberStr = matchNumber[0];
            }

            if (routeStr) {
                inputCalle.value = `${routeStr} ${streetNumberStr}`.trim();
            }

            if (!streetNumberStr) {
                window.selectedPropertyFromGoogle = false;
                window.selectedPropertyStreetNumber = '';
                if (errCalle) {
                    errCalle.textContent = 'La dirección seleccionada debe incluir el número de calle (altura).';
                    errCalle.classList.remove('hidden');
                }
            } else {
                window.selectedPropertyFromGoogle = true;
                window.selectedPropertyStreetNumber = streetNumberStr;
                if (errCalle) errCalle.classList.add('hidden');
            }
        });
    }
};

// Toggle for accordions in Step 3
window.toggleAccordion = function (contentId, btn) {
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

// Desktop navigation for landing pages
document.addEventListener('DOMContentLoaded', () => {
    const landingNavs = Array.from(document.querySelectorAll(
        '#landing-marketplace-view > nav, #landing-propietarios-view > nav, #landing-corredores-view > nav, #how-it-works-view > nav, #consultar-valor-view > nav, body > nav'
    ));

    if (!landingNavs.length) return;

    const visibleLanding = () => (
        Array.from(document.querySelectorAll('#landing-marketplace-view, #landing-propietarios-view, #landing-corredores-view, #how-it-works-view, #consultar-valor-view'))
            .find((section) => !section.classList.contains('hidden'))
    );

    const getVisibleTarget = (selectors) => {
        const landing = visibleLanding() || document;
        return selectors
            .map((selector) => landing.querySelector(selector))
            .find(Boolean);
    };

    const scrollToTarget = (target) => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const closeDropdowns = (except = null) => {
        document.querySelectorAll('.landing-desktop-nav__dropdown.is-open').forEach((dropdown) => {
            if (dropdown === except) return;
            dropdown.classList.remove('is-open');
            dropdown.querySelector('.landing-desktop-nav__dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        });
    };

    const handleAction = (action) => {
        closeDropdowns();

        if (action === 'how-it-works') {
            scrollToTarget(getVisibleTarget(['#owner-steps-title', '#tenant-faq-title', '#owner-faq-title']));
        }

        if (action === 'favorites') {
            window.location.href = 'login.html?redirect=favorites&mode=login';
        }

        if (action === 'help-guide') {
            scrollToTarget(getVisibleTarget(['#tenant-faq-title', '#owner-faq-title']));
        }

        if (action === 'contact-agent') {
            scrollToTarget(getVisibleTarget(['footer', '#marketplace-contact-modal']));
        }
    };



    document.addEventListener('click', (event) => {
        const dropdownTrigger = event.target.closest('.landing-desktop-nav__dropdown-trigger');
        if (dropdownTrigger) {
            const dropdown = dropdownTrigger.closest('.landing-desktop-nav__dropdown');
            const shouldOpen = !dropdown.classList.contains('is-open');
            closeDropdowns(dropdown);
            dropdown.classList.toggle('is-open', shouldOpen);
            dropdownTrigger.setAttribute('aria-expanded', String(shouldOpen));
            return;
        }

        const action = event.target.closest('[data-desktop-nav-action]')?.dataset.desktopNavAction;
        if (action) {
            handleAction(action);
            return;
        }

        if (!event.target.closest('.landing-desktop-nav__dropdown')) {
            closeDropdowns();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeDropdowns();
    });
});

// Premium hamburger menu for landing pages
document.addEventListener('DOMContentLoaded', () => {
    const menuButtons = Array.from(document.querySelectorAll(
        'nav .menu-btn'
    ));

    if (!menuButtons.length) return;

    const menu = document.createElement('aside');
    menu.id = 'landing-premium-menu';
    menu.className = 'landing-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML = `
        <div class="landing-menu__scrim" data-menu-close></div>
        <div class="landing-menu__panel" role="dialog" aria-modal="true" aria-label="Menú principal">
            <div class="landing-menu__content">
                <div class="landing-menu__top">
                    <a class="landing-menu__brand" href="index.html" aria-label="Inicio">
                        <img src="img/logo-lite.png" alt="Habitat">
                    </a>
                    <button class="landing-menu__close" type="button" aria-label="Cerrar menú" data-menu-close>
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div class="landing-menu__main p-1 space-y-6">

                    <!-- SECCIÓN 1: PRINCIPAL -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 pb-5">
                        <h4 class="font-headline text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> General
                        </h4>
                        <div class="flex flex-col gap-1.5">
                            <a href="index.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-primary text-xl">home</span>
                                <span>Inicio</span>
                            </a>
                            <a href="como-funciona.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-zinc-500 text-xl">info</span>
                                <span>Cómo funciona</span>
                            </a>
                            <a href="buscar.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-zinc-500 text-xl">search</span>
                                <span>Buscar Alquileres</span>
                            </a>
                            <button type="button" class="menu-item-clean w-full text-left cursor-pointer" data-menu-action="favorites">
                                <span class="material-symbols-outlined text-rose-500 text-xl">favorite</span>
                                <span>Favoritos</span>
                            </button>
                        </div>
                    </div>

                    <!-- SECCIÓN 2: PROPIETARIOS -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 pb-5">
                        <h4 class="font-headline text-xs font-black text-primary dark:text-red-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-primary"></span> Para Propietarios
                        </h4>
                        <div class="flex flex-col gap-2">
                            <a href="administrador.html" class="menu-item-card bg-primary/5 dark:bg-red-950/20 border border-primary/20 hover:border-primary/40 p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01]">
                                <div class="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                                    <span class="material-symbols-outlined text-xl">manage_accounts</span>
                                </div>
                                <div>
                                    <span class="block text-sm font-extrabold text-zinc-900 dark:text-white">Panel del Propietario</span>
                                    <span class="block text-[11px] text-zinc-500">Postulaciones, visitas, cobros e IPC</span>
                                </div>
                            </a>
                            <a href="index.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-primary text-xl">add_home</span>
                                <span>Publicar propiedad en alquiler</span>
                            </a>
                            <a href="consultar-valor.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-zinc-500 text-xl">analytics</span>
                                <span>Consultar valor de mercado</span>
                            </a>
                        </div>
                    </div>

                    <!-- SECCIÓN 3: INQUILINOS -->
                    <div class="landing-menu__section pb-2">
                        <h4 class="font-headline text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Para Inquilinos
                        </h4>
                        <div class="flex flex-col gap-2">
                            <a href="tu-alquiler.html" class="menu-item-card bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/40 p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01]">
                                <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                                    <span class="material-symbols-outlined text-xl">key</span>
                                </div>
                                <div>
                                    <span class="block text-sm font-extrabold text-zinc-900 dark:text-white">Mi Alquiler Activo</span>
                                    <span class="block text-[11px] text-zinc-500">Pagar alquiler, informar pago y tickets</span>
                                </div>
                            </a>
                            <a href="postulaciones.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-emerald-600 text-xl">how_to_reg</span>
                                <span>Mis Postulaciones</span>
                            </a>
                            <a href="visitas.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-emerald-600 text-xl">calendar_month</span>
                                <span>Mis Visitas Agendadas</span>
                            </a>
                        </div>
                    </div>

                    <!-- Autenticación y Cierre -->
                    <div class="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-4 text-xs">
                        <div id="premium-menu-logged-out" class="flex items-center gap-3">
                            <a href="login.html?mode=login" class="font-bold text-zinc-700 dark:text-zinc-300 hover:text-primary">Iniciar sesión</a>
                            <a href="login.html?mode=register" class="font-bold text-white bg-primary px-4 py-2 rounded-xl">Registrarse</a>
                        </div>
                        <div id="premium-menu-logged-in" class="hidden flex items-center justify-between w-full">
                            <span class="text-xs font-bold text-zinc-500">Sesión iniciada</span>
                            <button type="button" id="premium-menu-logout" class="font-bold text-rose-600 dark:text-rose-400 hover:underline">Cerrar sesión</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    const adminToggle = menu.querySelector('#admin-rentals-toggle');
    const adminWrapper = menu.querySelector('#admin-rentals-wrapper');
    const adminIcon = menu.querySelector('#admin-rentals-icon');

    if (adminToggle && adminWrapper && adminIcon) {
        adminToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (adminWrapper.classList.contains('grid-rows-[0fr]')) {
                adminWrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
                adminWrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            } else {
                adminWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
                adminWrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            }

            adminIcon.classList.toggle('rotate-180');
        });
    }

    const searchToggle = menu.querySelector('#search-rentals-toggle');
    const searchWrapper = menu.querySelector('#search-rentals-wrapper');
    const searchIcon = menu.querySelector('#search-rentals-icon');

    if (searchToggle && searchWrapper && searchIcon) {
        searchToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (searchWrapper.classList.contains('grid-rows-[0fr]')) {
                searchWrapper.classList.remove('grid-rows-[0fr]', 'opacity-0');
                searchWrapper.classList.add('grid-rows-[1fr]', 'opacity-100');
            } else {
                searchWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100');
                searchWrapper.classList.add('grid-rows-[0fr]', 'opacity-0');
            }

            searchIcon.classList.toggle('rotate-180');
        });
    }

    const closeButton = menu.querySelector('.landing-menu__close');
    let activeButton = null;
    let closeTimer = null;

    const visibleLanding = () => (
        Array.from(document.querySelectorAll('#landing-marketplace-view, #landing-propietarios-view, #landing-corredores-view, #how-it-works-view, #consultar-valor-view'))
            .find((section) => !section.classList.contains('hidden'))
    );

    const getVisibleTarget = (selectors) => {
        const landing = visibleLanding() || document;
        return selectors
            .map((selector) => landing.querySelector(selector))
            .find(Boolean);
    };

    const openMenu = (button) => {
        if (closeTimer) window.clearTimeout(closeTimer);
        activeButton = button;
        menu.classList.add('is-open');
        document.body.classList.add('landing-menu-open');
        menu.setAttribute('aria-hidden', 'false');
        menuButtons.forEach((item) => {
            item.classList.toggle('active', item === button);
            item.setAttribute('aria-expanded', String(item === button));
        });
        window.requestAnimationFrame(() => closeButton?.focus({ preventScroll: true }));
    };

    const closeMenu = () => {
        menu.classList.remove('is-open');
        document.body.classList.remove('landing-menu-open');

        if (menu.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        menu.setAttribute('aria-hidden', 'true');
        menuButtons.forEach((item) => {
            item.classList.remove('active');
            item.setAttribute('aria-expanded', 'false');
        });

        const buttonToRestore = activeButton;
        closeTimer = window.setTimeout(() => {
            buttonToRestore?.focus({ preventScroll: true });
            activeButton = null;
        }, 220);
    };

    const scrollToTarget = (target) => {
        closeMenu();
        window.setTimeout(() => {
            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 260);
    };

    menuButtons.forEach((button) => {
        button.setAttribute('aria-controls', 'landing-premium-menu');
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (menu.classList.contains('is-open') && activeButton === button) {
                closeMenu();
                return;
            }
            openMenu(button);
        });
    });

    menu.addEventListener('click', (event) => {
        const closeTrigger = event.target.closest('[data-menu-close]');
        if (closeTrigger) {
            closeMenu();
            return;
        }

        const action = event.target.closest('[data-menu-action]')?.dataset.menuAction;
        if (!action) return;

        if (action === 'how-it-works') {
            const target = getVisibleTarget(['#owner-steps-title', '#tenant-faq-title', '#owner-faq-title']);
            scrollToTarget(target);
        }

        if (action === 'favorites') {
            window.location.href = 'login.html?redirect=favorites&mode=login';
        }

        if (action === 'help') {
            const target = getVisibleTarget(['#tenant-faq-title', '#owner-faq-title']);
            scrollToTarget(target);
        }

        if (action === 'contact') {
            const target = getVisibleTarget(['footer', '#marketplace-contact-modal']);
            scrollToTarget(target);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            closeMenu();
        }
    });
});

// Disable number inputs scroll wheel behavior globally
document.addEventListener('wheel', function (event) {
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

    let isDropdownOpen = false;

    // Toggle dropdown
    const openDropdown = () => {
        if (!dropdownMenu || !avatarBtn) return;
        dropdownMenu.classList.remove('hidden');
        // Force reflow for animation
        void dropdownMenu.offsetWidth;
        dropdownMenu.classList.remove('opacity-0');
        dropdownMenu.classList.add('opacity-100');
        avatarBtn.setAttribute('aria-expanded', 'true');
        isDropdownOpen = true;
    };

    const closeDropdown = () => {
        if (!dropdownMenu || !avatarBtn) return;
        dropdownMenu.classList.remove('opacity-100');
        dropdownMenu.classList.add('opacity-0');
        avatarBtn.setAttribute('aria-expanded', 'false');
        isDropdownOpen = false;
        setTimeout(() => {
            if (!isDropdownOpen) {
                dropdownMenu.classList.add('hidden');
            }
        }, 350);
    };

    if (avatarBtn && dropdownMenu) {
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
    }

    // Populate user info from Supabase
    async function populateUserDropdown() {
        try {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session) {
                const user = session.user;
                let profile = null;
                try {
                    profile = await window.DataManager.getUserProfile();
                } catch (e) {
                    console.warn("Failed to get profile, proceeding with user only.", e);
                }

                const nameEl = document.getElementById('dropdown-user-name');
                const idEl = document.getElementById('dropdown-user-id');
                const initialEl = document.getElementById('user-avatar-initial');

                if (nameEl) nameEl.textContent = profile?.full_name || user?.email || 'Usuario';
                if (idEl) idEl.textContent = `Identificador: ${String(user?.id || '').substring(0, 8)}`;
                if (initialEl && (profile?.full_name || user?.email)) {
                    initialEl.textContent = (profile?.full_name || user?.email).charAt(0).toUpperCase();
                }

                const loggedInEl = document.getElementById('drawer-user-logged-in');
                const loggedOutEl = document.getElementById('drawer-user-logged-out');
                if (loggedInEl) loggedInEl.classList.remove('hidden');
                if (loggedOutEl) loggedOutEl.classList.add('hidden');

                const premiumLoggedInEl = document.getElementById('premium-menu-logged-in');
                const premiumLoggedOutEl = document.getElementById('premium-menu-logged-out');
                if (premiumLoggedInEl) premiumLoggedInEl.classList.remove('hidden');
                if (premiumLoggedOutEl) premiumLoggedOutEl.classList.add('hidden');

                document.querySelectorAll('#desktop-nav-logged-in').forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('#desktop-nav-logged-out').forEach(el => el.classList.add('hidden'));

                document.querySelectorAll('.auth-ui-state.logged-in').forEach(el => el.classList.remove('hidden'));
                document.querySelectorAll('.auth-ui-state.logged-out').forEach(el => el.classList.add('hidden'));
                const initialStr = (profile?.full_name || user?.email || 'U').charAt(0).toUpperCase();
                document.querySelectorAll('.auth-user-initial').forEach(el => el.textContent = initialStr);
            } else {
                const loggedInEl = document.getElementById('drawer-user-logged-in');
                const loggedOutEl = document.getElementById('drawer-user-logged-out');
                if (loggedInEl) loggedInEl.classList.add('hidden');
                if (loggedOutEl) loggedOutEl.classList.remove('hidden');

                const premiumLoggedInEl = document.getElementById('premium-menu-logged-in');
                const premiumLoggedOutEl = document.getElementById('premium-menu-logged-out');
                if (premiumLoggedInEl) premiumLoggedInEl.classList.add('hidden');
                if (premiumLoggedOutEl) premiumLoggedOutEl.classList.remove('hidden');

                document.querySelectorAll('#desktop-nav-logged-in').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('#desktop-nav-logged-out').forEach(el => el.classList.remove('hidden'));

                document.querySelectorAll('.auth-ui-state.logged-in').forEach(el => el.classList.add('hidden'));
                document.querySelectorAll('.auth-ui-state.logged-out').forEach(el => el.classList.remove('hidden'));
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

            const loggedInEl = document.getElementById('drawer-user-logged-in');
            const loggedOutEl = document.getElementById('drawer-user-logged-out');
            if (loggedInEl) loggedInEl.classList.add('hidden');
            if (loggedOutEl) loggedOutEl.classList.remove('hidden');

            const premiumLoggedInEl = document.getElementById('premium-menu-logged-in');
            const premiumLoggedOutEl = document.getElementById('premium-menu-logged-out');
            if (premiumLoggedInEl) premiumLoggedInEl.classList.add('hidden');
            if (premiumLoggedOutEl) premiumLoggedOutEl.classList.remove('hidden');

            document.querySelectorAll('#desktop-nav-logged-in').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('#desktop-nav-logged-out').forEach(el => el.classList.remove('hidden'));

            document.querySelectorAll('.auth-ui-state.logged-in').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.auth-ui-state.logged-out').forEach(el => el.classList.remove('hidden'));
        }
    });

    // Initial load
    populateUserDropdown();

    // Logout handler
    const logoutBtn = document.getElementById('menu-logout');
    const doLogout = async () => {
        closeDropdown();
        await window.DataManager.logout();
        // Redirect to marketplace landing
        document.querySelectorAll('#mis-avisos-view, #publish-property-view, #app, #main-layout').forEach(el => {
            if (el) el.classList.add('hidden');
        });
        const landing = document.getElementById('landing-marketplace-view');
        if (landing) landing.classList.remove('hidden');
        window.scrollTo(0, 0);
    };

    if (logoutBtn) {
        logoutBtn.addEventListener('click', doLogout);
    }

    // Use event delegation for dynamic elements or just wait for them to exist
    document.addEventListener('click', (e) => {
        if (e.target.closest('#premium-menu-logout')) {
            doLogout();
            // Also close the premium menu if possible
            document.body.classList.remove('landing-menu-open');
            const menu = document.getElementById('landing-premium-menu');
            if (menu) {
                menu.classList.remove('is-open');
                menu.setAttribute('aria-hidden', 'true');
            }
        }
    });

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
                window.location.href = 'login.html?redirect=admin&mode=login';
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
            const searchable = [a.titulo_aviso, a.calle_altura, a.ciudad, a.provincia, a.tipo_propiedad, String(a.id || '').substring(0, 8)].filter(Boolean).join(' ').toLowerCase();
            return searchable.includes(term);
        });
        if (sortVal === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortVal === 'price-asc') filtered.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
        else if (sortVal === 'price-desc') filtered.sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
        else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
            if (a.tipo_propiedad) tipoMap[a.tipo_propiedad] = (tipoMap[a.tipo_propiedad] || 0) + 1;
            if (a.operacion) opMap[a.operacion] = (opMap[a.operacion] || 0) + 1;
            if (a.ciudad) cityMap[a.ciudad] = (cityMap[a.ciudad] || 0) + 1;
        });
        const tipoLabels = { 'departamento': 'Departamento', 'casa': 'Casa', 'ph': 'PH', 'terreno': 'Terreno', 'local-comercial': 'Local comercial', 'oficina-comercial': 'Oficina comercial', 'quinta-vacacional': 'Quinta Vacacional' };
        const opLabels = { 'venta': 'Venta', 'alquiler': 'Alquiler', 'temporada': 'Temporada', 'on': 'Venta' };
        const makeFilterItem = (label, count) => `<a class="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-red-400 cursor-pointer transition-colors py-0.5"><span>${label}</span><span class="text-xs text-zinc-400">(${count})</span></a>`;
        ['', '-mobile'].forEach(suffix => {
            const tipoEl = document.getElementById('filter-tipo' + suffix);
            const opEl = document.getElementById('filter-operacion' + suffix);
            const cityEl = document.getElementById('filter-ciudad' + suffix);
            if (tipoEl) tipoEl.innerHTML = Object.entries(tipoMap).map(([k, v]) => makeFilterItem(tipoLabels[k] || k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (opEl) opEl.innerHTML = Object.entries(opMap).map(([k, v]) => makeFilterItem(opLabels[k] || k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (cityEl) cityEl.innerHTML = Object.entries(cityMap).map(([k, v]) => makeFilterItem(k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
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

    // Landlord Sub-Tabs Management
    document.querySelectorAll('.avisos-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = tab.getAttribute('data-tab');
            document.querySelectorAll('.avisos-tab').forEach(t => {
                t.classList.remove('active', 'text-red-900', 'dark:text-red-400', 'font-bold', 'border-b-2', 'border-red-900', 'dark:border-red-400');
                t.classList.add('text-zinc-500', 'dark:text-zinc-400');
            });
            tab.classList.add('active', 'text-red-900', 'dark:text-red-400', 'font-bold', 'border-b-2', 'border-red-900', 'dark:border-red-400');
            tab.classList.remove('text-zinc-500', 'dark:text-zinc-400');

            const views = {
                'avisos': 'landlord-view-avisos',
                'postulaciones': 'landlord-view-postulaciones',
                'visitas': 'landlord-view-visitas',
                'alquiler-activo': 'landlord-view-alquiler-activo',
                'mantenimiento': 'landlord-view-mantenimiento'
            };

            Object.values(views).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            const activeEl = document.getElementById(views[targetTab] || 'landlord-view-avisos');
            if (activeEl) activeEl.classList.remove('hidden');

            if (targetTab === 'postulaciones') renderLandlordApplications();
            if (targetTab === 'visitas') renderLandlordVisits();
            if (targetTab === 'alquiler-activo') renderLandlordActiveRental();
            if (targetTab === 'mantenimiento') renderLandlordTickets();
        });
    });

    async function renderLandlordApplications() {
        const container = document.getElementById('landlord-applications-list');
        if (!container || !window.DataManager) return;

        container.innerHTML = '<div class="p-6 text-center text-zinc-400">Cargando postulaciones...</div>';
        try {
            const apps = await window.DataManager.getApplications();
            if (!apps || apps.length === 0) {
                container.innerHTML = '<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">No hay postulaciones recibidas por el momento.</div>';
                return;
            }

            container.innerHTML = apps.map(a => `
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                        <div>
                            <span class="text-xs font-bold text-primary dark:text-red-400 uppercase tracking-wider">${a.property_title}</span>
                            <h3 class="font-headline text-lg font-extrabold text-zinc-900 dark:text-white">${a.tenant_name}</h3>
                            <p class="text-xs text-zinc-500">${a.tenant_email} • ${a.tenant_phone}</p>
                        </div>
                        <div>
                            ${a.status === 'pendiente' ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">Pendiente de Decisión</span>' : ''}
                            ${a.status === 'aceptada' ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">¡Inquilino Seleccionado!</span>' : ''}
                            ${a.status === 'rechazada' ? '<span class="px-3 py-1 text-xs font-bold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500">No Seleccionado</span>' : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                            <span class="block text-zinc-400 font-bold uppercase">Ingresos Demostrables</span>
                            <span class="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">$ ${Number(a.monthly_income).toLocaleString('es-AR')} / mes</span>
                        </div>
                        <div class="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl">
                            <span class="block text-zinc-400 font-bold uppercase">Recibo / Comprobante</span>
                            <a href="${a.income_proof_url}" target="_blank" class="text-sm font-bold text-primary dark:text-red-400 hover:underline flex items-center gap-1 mt-0.5">
                                <span class="material-symbols-outlined text-base">description</span> Ver Recibo Adjunto
                            </a>
                        </div>
                    </div>

                    ${a.message ? `
                        <div class="bg-zinc-50 dark:bg-zinc-800/30 p-3.5 rounded-xl text-xs text-zinc-600 dark:text-zinc-300">
                            <b>Mensaje del postulante:</b> "${a.message}"
                        </div>
                    ` : ''}

                    ${a.status === 'pendiente' ? `
                        <div class="pt-2 flex flex-col sm:flex-row gap-3">
                            <button type="button" class="btn-accept-app flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer" data-id="${a.id}">
                                Aceptar Postulación y Firmar Contrato
                            </button>
                            <button type="button" class="btn-reject-app py-2.5 px-4 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs rounded-xl transition-colors cursor-pointer" data-id="${a.id}">
                                Rechazar
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');

            container.querySelectorAll('.btn-accept-app').forEach(b => {
                b.onclick = async () => {
                    const appId = b.getAttribute('data-id');
                    if (confirm("¿Confirmas la aceptación de este postulante? Esto generará automáticamente el contrato de alquiler activo y notificará a las partes.")) {
                        await window.DataManager.acceptApplication(appId);
                        alert("¡Postulación aceptada exitosamente! El contrato de alquiler ha sido activado.");
                        await renderLandlordApplications();
                    }
                };
            });

            container.querySelectorAll('.btn-reject-app').forEach(b => {
                b.onclick = async () => {
                    const appId = b.getAttribute('data-id');
                    await window.DataManager.rejectApplication(appId);
                    await renderLandlordApplications();
                };
            });

        } catch (err) {
            console.error("Error renderizando postulaciones:", err);
        }
    }

    async function renderLandlordVisits() {
        const container = document.getElementById('landlord-visits-list');
        if (!container || !window.DataManager) return;

        container.innerHTML = '<div class="p-6 text-center text-zinc-400">Cargando visitas...</div>';
        try {
            const visits = await window.DataManager.getVisits();
            if (!visits || visits.length === 0) {
                container.innerHTML = '<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">No hay visitas programadas.</div>';
                return;
            }

            container.innerHTML = visits.map(v => `
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 text-xs font-bold rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">${v.status}</span>
                            <span class="text-xs font-bold text-zinc-400">${v.property_title}</span>
                        </div>
                        <h3 class="font-headline text-base font-extrabold text-zinc-900 dark:text-white">${v.visitor_name}</h3>
                        <p class="text-xs text-zinc-500">${v.visitor_email} • Tel: ${v.visitor_phone}</p>
                    </div>

                    <div class="bg-zinc-50 dark:bg-zinc-800/80 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-right shrink-0">
                        <span class="block text-[10px] font-bold text-zinc-400 uppercase">Fecha y Hora</span>
                        <span class="text-sm font-black text-primary dark:text-red-400">${v.visit_date} a las ${v.visit_time} hs</span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            console.error("Error renderizando visitas:", err);
        }
    }

    async function renderLandlordActiveRental() {
        const container = document.getElementById('landlord-active-rental-dashboard');
        if (!container || !window.DataManager) return;

        container.innerHTML = '<div class="p-6 text-center text-zinc-400">Cargando gestión de alquiler activo...</div>';
        try {
            const contract = await window.DataManager.getActiveContract();
            if (!contract) {
                container.innerHTML = `
                    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
                        No hay ningún alquiler activo actualmente. Acepta una postulación para iniciar la gestión del contrato.
                    </div>
                `;
                return;
            }

            const payment = await window.DataManager.getCurrentPayment(contract.id);
            const punitives = window.DataManager.calculatePunitiveInterests(contract, payment);

            const isPaid = payment && payment.status === 'pagado';
            const isWaived = payment && payment.is_punitive_waived;

            container.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm space-y-6">
                    <!-- Top Banner -->
                    <div class="bg-zinc-100 dark:bg-zinc-800/60 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <span class="px-3 py-1 text-xs font-black rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                                Alquiler En Curso
                            </span>
                            <h2 class="font-headline text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">
                                ${contract.property_title}
                            </h2>
                            <p class="text-xs text-zinc-500">Inquilino: ${contract.tenant_name} (${contract.tenant_email})</p>
                        </div>
                        <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-right">
                            <span class="block text-[10px] font-bold text-zinc-400 uppercase">Canon Locativo Mensual</span>
                            <span class="text-2xl font-black text-primary dark:text-red-400">$ ${Number(contract.monthly_rent).toLocaleString('es-AR')}</span>
                        </div>
                    </div>

                    <!-- Monitor de Cobro del Mes -->
                    <div class="p-6 md:p-8 space-y-6">
                        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                            <div>
                                <h3 class="font-headline text-lg font-bold text-zinc-900 dark:text-white">
                                    Control de Cobro - ${payment ? payment.period : 'Julio 2026'}
                                </h3>
                                <p class="text-xs text-zinc-500">Día de vencimiento: ${contract.payment_due_day} de cada mes</p>
                            </div>
                            <div>
                                ${isPaid ? `
                                    <span class="px-4 py-1.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                        PAGADO (${payment.payment_method || 'Registrado'})
                                    </span>
                                ` : `
                                    <span class="px-4 py-1.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                                        PENDIENTE DE PAGO
                                    </span>
                                `}
                            </div>
                        </div>

                        <!-- Desglose de Punitorios -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div class="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                                <span class="block font-bold uppercase text-zinc-400">Monto Base</span>
                                <span class="text-lg font-extrabold text-zinc-900 dark:text-white">$ ${Number(payment ? payment.amount_base : contract.monthly_rent).toLocaleString('es-AR')}</span>
                            </div>

                            <div class="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50">
                                <span class="block font-bold uppercase text-zinc-400">Intereses Punitorios Automáticos</span>
                                ${isWaived ? `
                                    <span class="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1">Intereses Perdonados ($0)</span>
                                ` : (punitives.punitiveAmount > 0 ? `
                                    <span class="text-lg font-extrabold text-rose-600 dark:text-rose-400">+$ ${Number(punitives.punitiveAmount).toLocaleString('es-AR')}</span>
                                    <span class="block text-[11px] text-rose-500 font-medium">${punitives.daysLate} días de mora (${punitives.dailyRate}% diario)</span>
                                ` : `
                                    <span class="text-lg font-extrabold text-zinc-700 dark:text-zinc-300">$ 0</span>
                                    <span class="block text-[11px] text-emerald-600">Al día</span>
                                `)}
                            </div>

                            <div class="bg-primary/5 dark:bg-red-950/20 p-4 rounded-xl border border-primary/20 dark:border-red-500/20">
                                <span class="block font-bold uppercase text-primary dark:text-red-400">Total a Cobrar</span>
                                <span class="text-xl font-black text-primary dark:text-red-400">$ ${Number(isPaid ? payment.amount_base : punitives.totalAmount).toLocaleString('es-AR')}</span>
                            </div>
                        </div>

                        <!-- Botones de Acción del Propietario -->
                        <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-3">
                            ${!isWaived && punitives.punitiveAmount > 0 && !isPaid ? `
                                <button type="button" id="btn-waive-interests" class="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-base">sentiment_satisfied</span>
                                    Perdonar Intereses Punitorios
                                </button>
                            ` : ''}

                            ${!isPaid ? `
                                <button type="button" id="btn-mark-paid" class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5">
                                    <span class="material-symbols-outlined text-base">check_circle</span>
                                    Marcar como Pagado (Transferencia / Efectivo)
                                </button>
                            ` : ''}

                            <button type="button" id="btn-send-invoice" class="px-4 py-2.5 bg-primary hover:bg-primary-container text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-base">mail</span>
                                Enviar Factura al Mail del Inquilino
                            </button>
                        </div>
                    </div>

                    <!-- Calculadora de Reajuste IPC / ICL -->
                    <div class="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="font-headline text-base font-extrabold text-zinc-900 dark:text-white">Calculadora de Reajuste Automático (IPC / ICL)</h4>
                                <p class="text-xs text-zinc-500">Aplica incrementos oficiales al canon locativo según el índice acordado en el contrato.</p>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Índice Seleccionado</label>
                                <select id="adj-index-select" class="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-xs">
                                    <option value="IPC" selected>IPC (Índice de Precios al Consumidor) ~ 12.8%</option>
                                    <option value="ICL">ICL (Índice para Contratos de Locación) ~ 10.5%</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Frecuencia de Ajuste</label>
                                <select id="adj-freq-select" class="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-xs">
                                    <option value="3" selected>Trimestral (Cada 3 meses)</option>
                                    <option value="4">Cuatrimestral (Cada 4 meses)</option>
                                    <option value="6">Semestral (Cada 6 meses)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Nuevo Monto Calculado</label>
                                <div id="adj-preview-amount" class="px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-sm text-emerald-700 dark:text-emerald-300">
                                    $ ${Math.round(contract.monthly_rent * 1.128).toLocaleString('es-AR')}
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 flex justify-end">
                            <button type="button" id="btn-apply-adjustment" class="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs rounded-xl shadow transition-colors cursor-pointer">
                                Aplicar Reajuste al Contrato
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Action listeners
            const btnWaive = document.getElementById('btn-waive-interests');
            if (btnWaive && payment) {
                btnWaive.onclick = async () => {
                    await window.DataManager.waivePunitiveInterests(payment.id);
                    alert("¡Los intereses punitorios han sido perdonados para este período!");
                    await renderLandlordActiveRental();
                };
            }

            const btnMarkPaid = document.getElementById('btn-mark-paid');
            if (btnMarkPaid && payment) {
                btnMarkPaid.onclick = async () => {
                    await window.DataManager.markPaymentAsPaid(payment.id, "Registrado por Propietario");
                    alert("¡El alquiler ha sido marcado como pagado!");
                    await renderLandlordActiveRental();
                };
            }

            const btnSendInvoice = document.getElementById('btn-send-invoice');
            if (btnSendInvoice && payment) {
                btnSendInvoice.onclick = async () => {
                    const result = await window.DataManager.sendInvoiceEmail(payment.id);
                    openInvoicePreviewModal(result);
                };
            }

            // Adjustment Calculator listeners
            const adjIndex = document.getElementById('adj-index-select');
            const previewEl = document.getElementById('adj-preview-amount');
            const btnApplyAdj = document.getElementById('btn-apply-adjustment');

            const updatePreview = () => {
                const idx = adjIndex.value;
                const pct = idx === 'IPC' ? 12.8 : 10.5;
                const newRent = Math.round(contract.monthly_rent * (1 + pct / 100));
                previewEl.textContent = `$ ${newRent.toLocaleString('es-AR')}`;
                return newRent;
            };

            if (adjIndex) adjIndex.onchange = updatePreview;

            if (btnApplyAdj) {
                btnApplyAdj.onclick = async () => {
                    const idx = adjIndex.value;
                    const pct = idx === 'IPC' ? 12.8 : 10.5;
                    const newRent = Math.round(contract.monthly_rent * (1 + pct / 100));

                    if (confirm(`¿Confirmas la aplicación del reajuste ${idx} (+${pct}%)? El nuevo canon locativo será de $ ${newRent.toLocaleString('es-AR')}.`)) {
                        await window.DataManager.applyIndexAdjustment(contract.id, newRent, idx);
                        alert(`¡Reajuste aplicado! Nuevo canon mensual: $ ${newRent.toLocaleString('es-AR')}`);
                        await renderLandlordActiveRental();
                    }
                };
            }

        } catch (err) {
            console.error("Error renderizando alquiler activo propietario:", err);
        }
    }

    function openInvoicePreviewModal(inv) {
        let modal = document.getElementById('habitat-invoice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'habitat-invoice-modal';
            document.body.appendChild(modal);
        }

        modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300 font-body';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 text-on-background dark:text-white" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-emerald-600 text-2xl">mark_email_read</span>
                        <h3 class="font-headline text-xl font-extrabold">Factura Enviada por Email</h3>
                    </div>
                    <button type="button" id="close-invoice-modal" class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <span class="material-symbols-outlined text-base">close</span>
                    </button>
                </div>

                <div class="space-y-4 text-xs">
                    <div class="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                        <span class="font-bold text-emerald-700 dark:text-emerald-300">¡Email enviado exitosamente!</span>
                        <p class="text-zinc-600 dark:text-zinc-300">Se ha emitido el comprobante de alquiler N° <b>${inv.invoiceNumber}</b> y se envió a <b>${inv.tenantEmail}</b>.</p>
                    </div>

                    <div class="bg-zinc-50 dark:bg-zinc-800 p-4 rounded-xl space-y-2 font-mono text-[11px]">
                        <div class="flex justify-between"><span>Concepto:</span><span>${inv.concept}</span></div>
                        <div class="flex justify-between"><span>Comprobante N°:</span><span>${inv.invoiceNumber}</span></div>
                        <div class="flex justify-between"><span>Monto Total:</span><span class="font-bold text-emerald-600 dark:text-emerald-400">$ ${Number(inv.totalAmount).toLocaleString('es-AR')}</span></div>
                        <div class="flex justify-between"><span>Fecha Emisión:</span><span>${new Date(inv.sentAt).toLocaleString('es-AR')}</span></div>
                    </div>

                    <div class="pt-2 flex justify-end">
                        <button type="button" id="btn-done-invoice" class="px-6 py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow">Aceptar</button>
                    </div>
                </div>
            </div>
        `;

        const closeFn = () => { modal.style.display = 'none'; };
        document.getElementById('close-invoice-modal').onclick = closeFn;
        document.getElementById('btn-done-invoice').onclick = closeFn;
    }

    async function renderLandlordTickets() {
        const container = document.getElementById('landlord-tickets-list');
        if (!container || !window.DataManager) return;

        container.innerHTML = '<div class="p-6 text-center text-zinc-400">Cargando tickets...</div>';
        try {
            const tickets = await window.DataManager.getMaintenanceTickets();
            if (!tickets || tickets.length === 0) {
                container.innerHTML = '<div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">No hay tickets de mantenimiento recibidos.</div>';
                return;
            }

            const statusBadges = {
                abierto: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">Abierto</span>',
                en_proceso: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">En Proceso</span>',
                resuelto: '<span class="px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Resuelto</span>'
            };

            container.innerHTML = tickets.map(t => `
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="flex items-center gap-2">
                            <span class="px-2.5 py-0.5 text-xs font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">${t.category}</span>
                            <span class="text-xs font-bold text-rose-600 dark:text-rose-400">Prioridad ${t.priority}</span>
                        </div>
                        ${statusBadges[t.status] || ''}
                    </div>

                    <div>
                        <h3 class="font-headline text-base font-extrabold text-zinc-900 dark:text-white">${t.title}</h3>
                        <p class="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1">${t.description}</p>
                    </div>

                    <div class="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-3">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Cambiar Estado</label>
                                <select class="tkt-status-select w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold">
                                    <option value="abierto" ${t.status === 'abierto' ? 'selected' : ''}>Abierto</option>
                                    <option value="en_proceso" ${t.status === 'en_proceso' ? 'selected' : ''}>En Proceso</option>
                                    <option value="resuelto" ${t.status === 'resuelto' ? 'selected' : ''}>Resuelto</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Respuesta al Inquilino</label>
                                <input type="text" class="tkt-response-input w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium" value="${t.landlord_response || ''}" placeholder="Ej: Técnico en camino mañana a las 10:00 hs">
                            </div>
                        </div>

                        <button type="button" class="btn-save-ticket-reply px-4 py-2 bg-primary text-white font-bold text-xs rounded-xl shadow cursor-pointer" data-id="${t.id}">
                            Guardar Respuesta y Estado
                        </button>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.btn-save-ticket-reply').forEach(b => {
                b.onclick = async () => {
                    const ticketId = b.getAttribute('data-id');
                    const card = b.closest('.bg-white');
                    const status = card.querySelector('.tkt-status-select').value;
                    const response = card.querySelector('.tkt-response-input').value;

                    await window.DataManager.updateTicketStatus(ticketId, status, response);
                    alert("¡Respuesta y estado del ticket actualizados!");
                    await renderLandlordTickets();
                };
            });

        } catch (err) {
            console.error("Error renderizando tickets en propietario:", err);
        }
    }

    function createAvisoCard(aviso, index) {
        const statusCfg = {
            'disponible': { label: 'Disponible', dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
            'draft': { label: 'Borrador', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-300' },
            'published': { label: 'Publicado', dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
            'alquilada': { label: 'Alquilada', dot: 'bg-blue-400', text: 'text-blue-700 dark:text-blue-300' },
            'mantenimiento': { label: 'Mantenimiento', dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400' },
            'paused': { label: 'Pausado', dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400' },
            'expired': { label: 'Expirado', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400' }
        };
        const st = statusCfg[aviso.status] || statusCfg['draft'];

        // Parse extra info from description JSON if present
        let extraInfo = {};
        if (aviso.description && aviso.description.includes('Detalles: ')) {
            try { extraInfo = JSON.parse(aviso.description.split('Detalles: ')[1]); } catch (e) { }
        }

        const tipoLabels = { 'departamento': 'Departamento', 'casa': 'Casa', 'ph': 'PH', 'terreno': 'Terreno', 'local-comercial': 'Local comercial', 'oficina-comercial': 'Oficina comercial', 'quinta-vacacional': 'Quinta Vacacional' };
        const opLabels = { 'venta': 'Venta', 'alquiler': 'Alquiler', 'temporada': 'Temporada', 'on': 'Venta' };
        const tipo = tipoLabels[extraInfo.tipo_propiedad] || extraInfo.tipo_propiedad || 'Propiedad';
        const op = opLabels[extraInfo.operacion?.toLowerCase()] || extraInfo.operacion || '';
        const moneda = (extraInfo.moneda === 'USD') ? 'U$S' : '$';
        const precio = aviso.price ? `${moneda} ${Number(aviso.price).toLocaleString('es-AR')}` : 'Consultar';
        const ubicacion = aviso.address || 'Sin ubicación';
        const titulo = aviso.title || `${tipo} en ${op}`;
        const date = aviso.created_at ? new Date(aviso.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const shortId = aviso.id ? String(aviso.id).substring(0, 8) : '';

        // Get image from propiedad_imagenes join or images array
        let imgSrc = 'img/hero-marketplace.jpg';
        if (aviso.propiedad_imagenes && aviso.propiedad_imagenes.length > 0) {
            const sorted = aviso.propiedad_imagenes.sort((a, b) => a.orden - b.orden);
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
                    <span class="hidden sm:inline">${dormitorios ? dormitorios + ' dorm.' : ''} ${banos ? banos + ' baños' : ''} ${supCubierta ? supCubierta + 'm²' : ''}</span>
                </div>
                <div class="flex items-center gap-1">
                    <button class="btn-ver-aviso p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Ver"><span class="material-symbols-outlined text-lg">visibility</span></button>
                    <button class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Editar"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button class="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Compartir"><span class="material-symbols-outlined text-lg">share</span></button>
                </div>
            </div>
        `;

        const btnVer = card.querySelector('.btn-ver-aviso');
        if (btnVer) {
            btnVer.onclick = (e) => {
                e.stopPropagation();
                if (typeof window.openMarketplacePropertyDetailModal === 'function') {
                    window.openMarketplacePropertyDetailModal(aviso);
                }
            };
        }

        return card;
    }
});

window.App = App;
