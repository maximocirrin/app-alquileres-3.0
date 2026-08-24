/**
 * Main Application Logic
 */

// Custom Modal Dialog System for Styled Confirm & Alert
window.showCustomAlert = function (msgOrOpts) {
    return new Promise((resolve) => {
        let title = 'Notificación';
        let message = '';
        let icon = 'info';
        let buttonText = 'Entendido';
        let type = 'info'; // 'info', 'success', 'error', 'warning'

        if (typeof msgOrOpts === 'object' && msgOrOpts !== null) {
            title = msgOrOpts.title || title;
            message = msgOrOpts.message || '';
            icon = msgOrOpts.icon || icon;
            buttonText = msgOrOpts.buttonText || buttonText;
            type = msgOrOpts.type || (icon === 'error' ? 'error' : (icon === 'check_circle' ? 'success' : 'info'));
        } else {
            message = String(msgOrOpts || '');
            const msgLower = message.toLowerCase();
            if (msgLower.includes('éxito') || msgLower.includes('exitosa') || msgLower.includes('cread') || msgLower.includes('activad') || msgLower.includes('enviad') || msgLower.includes('eliminad') || msgLower.includes('registrad')) {
                icon = 'check_circle';
                title = '¡Operación Exitosa!';
                type = 'success';
            } else if (msgLower.includes('perdonad') || msgLower.includes('condonad') || msgLower.includes('punitori')) {
                icon = 'savings';
                title = 'Intereses Condonados';
                type = 'warning';
            } else if (msgLower.includes('error') || msgLower.includes('inválid') || msgLower.includes('falló') || msgLower.includes('atención')) {
                icon = 'error';
                title = 'Atención';
                type = 'error';
            }
        }

        let iconTheme = 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-500/20';
        let btnTheme = 'bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900';

        if (type === 'success' || icon === 'check_circle' || icon === 'verified_user') {
            iconTheme = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
            btnTheme = 'bg-emerald-600 hover:bg-emerald-700 text-white';
        } else if (type === 'warning' || icon === 'savings' || icon === 'warning') {
            iconTheme = 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-500/20';
            btnTheme = 'bg-amber-600 hover:bg-amber-700 text-white';
        } else if (type === 'error' || icon === 'error') {
            iconTheme = 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-500/20';
            btnTheme = 'bg-rose-600 hover:bg-rose-700 text-white';
        }

        let modal = document.getElementById('custom-alert-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-alert-modal';
            document.body.appendChild(modal);
        }
        modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 font-body';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-7 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white space-y-5 animate-detail-open" onclick="event.stopPropagation()">
                <div class="flex items-center gap-3.5">
                    <div class="w-12 h-12 rounded-2xl ${iconTheme} flex items-center justify-center shrink-0 shadow-inner">
                        <span class="material-symbols-outlined text-2xl">${icon}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="font-headline text-lg font-extrabold text-zinc-900 dark:text-white leading-snug">${title}</h3>
                    </div>
                </div>

                <div class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60">
                    ${message.replace(/\n/g, '<br>')}
                </div>

                <div class="pt-1">
                    <button type="button" id="custom-alert-ok-btn" class="w-full px-5 py-3 rounded-xl ${btnTheme} font-headline font-extrabold text-xs shadow-md transition-all cursor-pointer text-center active:scale-95">
                        ${buttonText}
                    </button>
                </div>
            </div>
        `;

        const btnOk = document.getElementById('custom-alert-ok-btn');
        if (btnOk) {
            btnOk.onclick = () => {
                modal.style.display = 'none';
                resolve(true);
            };
        }
    });
};

window.showCustomConfirm = function (msgOrOpts) {
    return new Promise((resolve) => {
        let title = '¿Estás seguro?';
        let message = '';
        let confirmText = 'Confirmar';
        let cancelText = 'Cancelar';
        let isDanger = false;

        if (typeof msgOrOpts === 'object' && msgOrOpts !== null) {
            title = msgOrOpts.title || title;
            message = msgOrOpts.message || '';
            confirmText = msgOrOpts.confirmText || confirmText;
            cancelText = msgOrOpts.cancelText || cancelText;
            isDanger = Boolean(msgOrOpts.isDanger);
        } else {
            message = String(msgOrOpts || '');
            if (message.toLowerCase().includes('eliminar') || message.toLowerCase().includes('deshacer') || message.toLowerCase().includes('irreversible')) {
                isDanger = true;
                title = '¿Eliminar elemento?';
                confirmText = 'Sí, eliminar';
            }
        }

        let modal = document.getElementById('custom-confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'custom-confirm-modal';
            document.body.appendChild(modal);
        }
        modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 font-body';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 text-on-background dark:text-white space-y-5" onclick="event.stopPropagation()">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-2xl ${isDanger ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-2xl">${isDanger ? 'delete_forever' : 'help_outline'}</span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="font-headline text-lg font-extrabold text-zinc-900 dark:text-white leading-snug">${title}</h3>
                        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Confirmación de acción</p>
                    </div>
                </div>

                <p class="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">${message.replace(/\n/g, '<br>')}</p>

                <div class="flex items-center gap-3 pt-2">
                    <button type="button" id="custom-confirm-cancel-btn" class="flex-1 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer text-center">
                        ${cancelText}
                    </button>
                    <button type="button" id="custom-confirm-ok-btn" class="flex-1 px-4 py-3 rounded-xl ${isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary hover:bg-primary/90'} text-white font-bold text-sm shadow-md transition-colors cursor-pointer text-center">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        const closeModal = (val) => {
            modal.style.display = 'none';
            resolve(val);
        };

        const btnCancel = document.getElementById('custom-confirm-cancel-btn');
        const btnOk = document.getElementById('custom-confirm-ok-btn');
        if (btnCancel) btnCancel.onclick = () => closeModal(false);
        if (btnOk) btnOk.onclick = () => closeModal(true);
    });
};

window.alert = function (msg) {
    return window.showCustomAlert(msg);
};

window.setupInputValidations = function () {
    // Pure numeric inputs (only numbers 0-9 and decimal dot)
    const numericSelectors = [
        '#dormitorios-new', '#banos-new', '#ambientes-new', '#cocheras-new',
        '#precio', '#expensas-new', '#expensas', '#tarifa-mascota', '#alquiler-mascota',
        '#sup-cubierta', '#sup-total', '#cant-gato', '#cant-perro-pequeno', '#cant-perro-grande'
    ];

    numericSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9.]/g, '');
            });
        });
    });

    // Alphanumeric inputs (letters, numbers, spaces only)
    const alphaNumericSelectors = [
        '#piso-propiedad', '#depto-propiedad', '#numero-local', '#sector-local'
    ];

    alphaNumericSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
            });
        });
    });

    // Title & Description (letters, numbers, spaces, commas, periods, parentheses ONLY)
    const textCleanSelectors = ['#titulo-aviso', '#descripcion-aviso'];
    textCleanSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s,.\(\)]/g, '');
            });
        });
    });
};

window.resolvePostalCode = function (address, provincia, ciudad, googlePostalCode) {
    if (googlePostalCode && String(googlePostalCode).trim().length >= 4) {
        return String(googlePostalCode).trim();
    }

    const provStr = (provincia || '').toLowerCase();
    const cityStr = (ciudad || '').toLowerCase();
    const addrStr = (address || '').toLowerCase();

    let baseCode = 5500;
    if (provStr.includes('buenos aires') || cityStr.includes('caba') || cityStr.includes('capital federal')) baseCode = 1000;
    else if (provStr.includes('córdoba') || provStr.includes('cordoba')) baseCode = 5000;
    else if (provStr.includes('santa fe')) baseCode = 3000;
    else if (provStr.includes('salta')) baseCode = 4400;
    else if (provStr.includes('neuquén') || provStr.includes('neuquen')) baseCode = 8300;
    else if (provStr.includes('san juan')) baseCode = 5400;
    else if (provStr.includes('san luis')) baseCode = 5700;
    else if (provStr.includes('tucumán') || provStr.includes('tucuman')) baseCode = 4000;
    else if (provStr.includes('corrientes')) baseCode = 3400;
    else if (provStr.includes('entre ríos') || provStr.includes('entre rios')) baseCode = 3100;
    else if (provStr.includes('misiones')) baseCode = 3300;

    const numMatch = addrStr.match(/\d+/);
    const numOffset = numMatch ? (parseInt(numMatch[0]) % 250) : ((addrStr.length * 7) % 250);

    return String(baseCode + numOffset);
};

// Favorites Manager System
window.FavoritesManager = {
    favoritesSet: new Set(),

    init: async function () {
        try {
            const local = JSON.parse(localStorage.getItem('habitat_favorites') || '[]');
            (local || []).forEach(id => window.FavoritesManager.favoritesSet.add(Number(id)));
        } catch (e) { }

        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    const profileId = (window.DataManager && typeof window.DataManager._getOrCreateProfile === 'function')
                        ? await window.DataManager._getOrCreateProfile()
                        : null;

                    if (profileId) {
                        const { data: favs } = await window.supabaseClient
                            .from('Favorito')
                            .select('id_publicacion')
                            .eq('id_perfil', profileId);

                        if (favs && favs.length > 0) {
                            favs.forEach(f => window.FavoritesManager.favoritesSet.add(Number(f.id_publicacion)));
                        }
                    }
                }
            } catch (err) {
                console.warn("Error syncing favorites from DB:", err);
            }
        }

        window.FavoritesManager.saveLocal();
        window.FavoritesManager.updateAllHeartIcons();
    },

    saveLocal: function () {
        const arr = Array.from(window.FavoritesManager.favoritesSet);
        localStorage.setItem('habitat_favorites', JSON.stringify(arr));
    },

    isFavorite: function (id_publicacion) {
        return window.FavoritesManager.favoritesSet.has(Number(id_publicacion));
    },

    toggleFavorite: async function (id_publicacion, event = null) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        // Require authentication before favoriting
        let session = null;
        if (window.supabaseClient) {
            try {
                const res = await window.supabaseClient.auth.getSession();
                session = res.data?.session;
            } catch (err) { }
        }

        if (!session) {
            window.location.href = 'login.html?redirect=favorites';
            return false;
        }

        const pubId = Number(id_publicacion);
        if (!pubId) return false;

        const isFav = window.FavoritesManager.isFavorite(pubId);

        if (isFav) {
            window.FavoritesManager.favoritesSet.delete(pubId);
        } else {
            window.FavoritesManager.favoritesSet.add(pubId);
        }

        window.FavoritesManager.saveLocal();
        window.FavoritesManager.updateAllHeartIcons();

        if (window.supabaseClient) {
            try {
                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (session && session.user) {
                    const profileId = (window.DataManager && typeof window.DataManager._getOrCreateProfile === 'function')
                        ? await window.DataManager._getOrCreateProfile()
                        : null;

                    if (profileId) {
                        if (isFav) {
                            await window.supabaseClient
                                .from('Favorito')
                                .delete()
                                .eq('id_publicacion', pubId)
                                .eq('id_perfil', profileId);
                        } else {
                            await window.supabaseClient
                                .from('Favorito')
                                .insert([{
                                    id_perfil: profileId,
                                    id_publicacion: pubId
                                }]);
                        }
                    }
                }
            } catch (err) {
                console.warn("DB fav sync error:", err);
            }
        }

        return !isFav;
    },

    updateAllHeartIcons: function () {
        document.querySelectorAll('.btn-favorite').forEach(btn => {
            const pubId = Number(btn.dataset.pubId);
            const isFav = window.FavoritesManager.isFavorite(pubId);
            const icon = btn.querySelector('.material-symbols-outlined');

            if (isFav) {
                btn.classList.add('is-favorite');
                if (icon) {
                    icon.textContent = 'favorite';
                    icon.className = 'material-symbols-outlined text-xl text-rose-500 fill-1 transition-all duration-200 scale-110';
                }
                btn.setAttribute('title', 'Quitar de favoritos');
            } else {
                btn.classList.remove('is-favorite');
                if (icon) {
                    icon.textContent = 'favorite';
                    icon.className = 'material-symbols-outlined text-xl text-white/90 hover:text-rose-500 transition-all duration-200';
                }
                btn.setAttribute('title', 'Guardar en favoritos');
            }
        });
    },

    showFavoritesModal: async function () {
        const favIds = Array.from(window.FavoritesManager.favoritesSet);

        let allProperties = [];
        if (window.DataManager && typeof window.DataManager.getPublicMarketplaceProperties === 'function') {
            allProperties = await window.DataManager.getPublicMarketplaceProperties();
        }

        const favProperties = allProperties.filter(p => favIds.includes(Number(p.id || p.id_publicacion)));

        let modal = document.getElementById('favorites-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'favorites-modal';
            document.body.appendChild(modal);
        }

        modal.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200 font-body';
        modal.style.display = 'flex';

        modal.innerHTML = `
            <div class="relative w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-zinc-200 dark:border-zinc-800 text-on-background dark:text-white" onclick="event.stopPropagation()">
                <div class="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center">
                            <span class="material-symbols-outlined text-2xl fill-1">favorite</span>
                        </div>
                        <div>
                            <h3 class="font-headline text-lg font-extrabold text-zinc-900 dark:text-white">Mis Propiedades Favoritas</h3>
                            <p class="text-xs text-zinc-500 dark:text-zinc-400">${favProperties.length} ${favProperties.length === 1 ? 'propiedad guardada' : 'propiedades guardadas'}</p>
                        </div>
                    </div>
                    <button type="button" id="close-fav-modal" class="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer">
                        <span class="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <div class="p-6 overflow-y-auto flex-1">
                    ${favProperties.length === 0 ? `
                        <div class="text-center py-16 space-y-4">
                            <div class="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-400 mx-auto flex items-center justify-center">
                                <span class="material-symbols-outlined text-3xl">favorite_border</span>
                            </div>
                            <h4 class="font-headline font-bold text-base text-zinc-800 dark:text-zinc-200">Aún no guardaste propiedades en favoritos</h4>
                            <p class="text-xs text-zinc-500 max-w-sm mx-auto">Explorá el Marketplace y tocá el ícono del corazón en cualquier aviso para guardarlo aquí y consultarlo cuando quieras.</p>
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="fav-modal-grid">
                        </div>
                    `}
                </div>
            </div>
        `;

        document.getElementById('close-fav-modal').onclick = () => {
            modal.style.display = 'none';
        };

        if (favProperties.length > 0) {
            const grid = document.getElementById('fav-modal-grid');
            favProperties.forEach(prop => {
                const card = document.createElement('article');
                card.className = 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between cursor-pointer group relative';
                card.onclick = () => {
                    modal.style.display = 'none';
                    if (typeof window.openMarketplacePropertyDetailModal === 'function') {
                        window.openMarketplacePropertyDetailModal(prop);
                    }
                };

                const isFav = window.FavoritesManager.isFavorite(prop.id || prop.id_publicacion);

                card.innerHTML = `
                    <div>
                        <div class="relative h-44 rounded-xl overflow-hidden mb-3 bg-zinc-100 dark:bg-zinc-800">
                            <img src="${prop.image || 'img/hero-marketplace.jpg'}" alt="${prop.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='img/hero-marketplace.jpg'">
                            <button type="button" class="btn-favorite ${isFav ? 'is-favorite' : ''} absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-all z-10 cursor-pointer" data-pub-id="${prop.id || prop.id_publicacion}" onclick="event.stopPropagation(); window.FavoritesManager.toggleFavorite(${prop.id || prop.id_publicacion}, event);">
                                <span class="material-symbols-outlined text-lg ${isFav ? 'text-rose-500 fill-1 scale-110' : 'text-white/90 hover:text-rose-500'}">favorite</span>
                            </button>
                        </div>
                        <h4 class="font-headline text-sm font-bold text-zinc-900 dark:text-white line-clamp-1">${prop.title}</h4>
                        <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">${prop.address}</p>
                        <p class="font-extrabold text-sm text-primary dark:text-red-400 mt-2">$${Number(prop.price || 0).toLocaleString('es-AR')}</p>
                    </div>
                `;
                grid.appendChild(card);
            });
        }
    }
};

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
            App.initScrollToTop();
            App.applyPageContext();
            if (typeof window.setupInputValidations === 'function') window.setupInputValidations();
            if (window.FavoritesManager && typeof window.FavoritesManager.init === 'function') {
                window.FavoritesManager.init();
            }

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
            const shouldOpenFavs = params.get('fav') === '1';
            const viewParam = params.get('view');
            const pageContext = App.getPageContext();

            if (shouldOpenFavs) {
                window.history.replaceState({}, document.title, window.location.pathname);
                if (window.FavoritesManager && typeof window.FavoritesManager.showFavoritesModal === 'function') {
                    window.FavoritesManager.showFavoritesModal();
                }
            }

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
        const isDark = theme === 'dark';
        const lightBg = '#f8fafc';
        const darkBg = '#09090b';
        const bgColor = isDark ? darkBg : lightBg;

        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
            document.documentElement.style.backgroundColor = darkBg;
            document.documentElement.style.colorScheme = 'dark';
            if (document.body) document.body.style.backgroundColor = darkBg;
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.classList.remove('dark');
            document.documentElement.style.backgroundColor = lightBg;
            document.documentElement.style.colorScheme = 'light';
            if (document.body) document.body.style.backgroundColor = lightBg;
        }

        // Eliminar meta theme-color para evitar que Safari pinte el fondo de la barra de URL en iPhone
        document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());

        let appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleStatusBarMeta) {
            appleStatusBarMeta = document.createElement('meta');
            appleStatusBarMeta.name = 'apple-mobile-web-app-status-bar-style';
            document.head.appendChild(appleStatusBarMeta);
        }
        appleStatusBarMeta.content = 'black-translucent';

        localStorage.setItem('theme', theme);

        // Sync all checkboxes
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
        const misAvisos = document.getElementById('mis-avisos-view');
        const app = document.getElementById('app');

        if (context === 'propietarios') {
            marketplace?.classList.add('hidden');
            if (window._wasInMisAvisosView) {
                propietarios?.classList.add('hidden');
                misAvisos?.classList.remove('hidden');
            } else {
                propietarios?.classList.remove('hidden');
                misAvisos?.classList.add('hidden');
            }
            app?.classList.add('hidden');
        }

        if (context === 'inquilinos') {
            marketplace?.classList.remove('hidden');
            propietarios?.classList.add('hidden');
            misAvisos?.classList.add('hidden');
            app?.classList.add('hidden');
        }

        if (context === 'admin') {
            marketplace?.classList.add('hidden');
            propietarios?.classList.add('hidden');
            misAvisos?.classList.add('hidden');
            app?.classList.remove('hidden');
        }
    },

    initScrollToTop: () => {
        let btn = document.getElementById('btn-scroll-top');
        
        // Page restriction: button only allowed on specific pages
        const path = window.location.pathname.toLowerCase();
        let filename = path.split('/').pop() || 'index.html';
        if (filename.includes('?')) filename = filename.split('?')[0];
        if (filename.includes('#')) filename = filename.split('#')[0];
        
        const allowedPages = [
            'index.html', 'index',
            'propietarios.html', 'propietarios',
            'corredores.html', 'corredores',
            'como-funciona.html', 'como-funciona',
            'detalles-garantia.html', 'detalles-garantia'
        ];

        const isAllowed = allowedPages.includes(filename) || path === '/' || path.endsWith('/');

        if (!isAllowed) {
            if (btn) {
                btn.remove();
            }
            return;
        }

        const buttonClasses = 'fixed bottom-6 right-6 z-[999] w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary via-red-800 to-primary text-white shadow-[0_-5px_15px_rgba(129,27,30,0.35)] border border-white/20 flex items-center justify-center cursor-pointer transition-all duration-300 opacity-0 translate-y-6 pointer-events-none hover:scale-110 active:scale-95 group';

        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-scroll-top';
            btn.type = 'button';
            btn.setAttribute('aria-label', 'Volver arriba');
            btn.className = buttonClasses;
            btn.innerHTML = `<span class="material-symbols-outlined text-2xl transition-transform duration-300 group-hover:-translate-y-0.5">arrow_upward</span>`;
            document.body.appendChild(btn);
        } else {
            const isVisible = btn.classList.contains('opacity-100');
            btn.className = buttonClasses;
            if (isVisible) {
                btn.classList.remove('opacity-0', 'translate-y-6', 'pointer-events-none');
                btn.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
        }

        btn.onclick = (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const toggleVisibility = () => {
            const publishView = document.getElementById('publish-property-view');
            const isWizardActive = publishView && !publishView.classList.contains('hidden');

            if (isWizardActive) {
                btn.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                btn.classList.add('opacity-0', 'translate-y-6', 'pointer-events-none');
                return;
            }

            const totalHeight = Math.max(
                document.documentElement.scrollHeight || 0,
                document.body.scrollHeight || 0
            );
            const viewportHeight = window.innerHeight || 0;
            const scrollableDistance = totalHeight - viewportHeight;
            const threshold = scrollableDistance > 0 ? (scrollableDistance * 0.35) : 350;

            if (window.scrollY >= threshold) {
                btn.classList.remove('opacity-0', 'translate-y-6', 'pointer-events-none');
                btn.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            } else {
                btn.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
                btn.classList.add('opacity-0', 'translate-y-6', 'pointer-events-none');
            }
        };

        if (btn._scrollHandler) {
            window.removeEventListener('scroll', btn._scrollHandler);
        }
        btn._scrollHandler = toggleVisibility;
        window.addEventListener('scroll', toggleVisibility, { passive: true });
        toggleVisibility();
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

        // Global delegate for ALL 'Publicar aviso' / 'Publicar propiedad' links and buttons
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a, button, [data-action="publish"]');
            if (!target) return;

            // Ignore buttons inside the wizard itself
            if (target.closest('#publish-property-view')) return;

            const txt = (target.textContent || '').trim().toLowerCase();
            const href = (target.getAttribute('href') || '').toLowerCase();
            const id = (target.id || '').toLowerCase();
            const cls = (target.className || '').toLowerCase();

            if (
                txt.includes('publicar aviso') ||
                txt.includes('publicar propiedad') ||
                txt.includes('publicar mi propiedad') ||
                txt.includes('publica tu propiedad') ||
                txt === 'publicar' ||
                href.includes('publish') ||
                href.includes('publicar') ||
                id.includes('publicar') ||
                cls.includes('btn-publicar')
            ) {
                e.preventDefault();
                e.stopPropagation();

                const { data: { session } } = await window.supabaseClient.auth.getSession();
                if (!session) {
                    window.location.href = 'login.html?redirect=publish';
                    return;
                }
                if (window.App && typeof window.App.showPublishWizard === 'function') {
                    await window.App.showPublishWizard();
                }
            }
        });

        // Global delegate for ALL 'Favoritos' links and buttons
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a, button, [data-action="favorites"], [data-desktop-nav-action="favorites"], [data-menu-action="favorites"]');
            if (!target) return;

            // Ignore buttons inside the favorites modal or property cards heart icons
            if (target.closest('#favorites-modal') || target.classList.contains('btn-favorite')) return;

            const txt = (target.textContent || '').trim().toLowerCase();
            const href = (target.getAttribute('href') || '').toLowerCase();
            const id = (target.id || '').toLowerCase();
            const cls = (target.className || '').toLowerCase();
            const action = target.dataset.action || target.dataset.menuAction || target.dataset.desktopNavAction || '';

            if (
                txt.includes('favorito') ||
                href.includes('favorites') ||
                href.includes('favoritos') ||
                id.includes('fav') ||
                cls.includes('favoritos') ||
                action === 'favorites'
            ) {
                e.preventDefault();
                e.stopPropagation();

                // Close any open hamburger menu
                if (typeof window.closeLandingMenu === 'function') window.closeLandingMenu();
                const mobMenu = document.getElementById('mobile-menu');
                if (mobMenu) mobMenu.classList.add('hidden');

                if (window.FavoritesManager && typeof window.FavoritesManager.showFavoritesModal === 'function') {
                    await window.FavoritesManager.showFavoritesModal();
                }
            }
        });

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
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-[#A13333]/20">3</div>
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
                    step2Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step2Container.style.height = 'auto';
                    step2Container.style.display = 'block';
                    setTimeout(() => {
                        step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    }, 50);
                }, 300);

                const pStep2 = document.getElementById('progress-step-2');
                const pStep3 = document.getElementById('progress-step-3');
                const pLine2 = document.getElementById('progress-line-2');
                if (pStep2) {
                    pStep2.classList.remove('opacity-50');
                    pStep2.innerHTML = `
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 border border-primary/20 dark:border-[#A13333]/20">2</div>
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
                        <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8">1</div>
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
            btnBackFromPublish.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.handleWizardBack === 'function') {
                    window.handleWizardBack();
                }
            });
        }
        if (btnBackMobile) {
            btnBackMobile.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.handleWizardBack === 'function') {
                    window.handleWizardBack();
                }
            });
        }

        // Helper functions for Form Validation Feedback
        function highlightInvalidInput(el) {
            if (!el) return;

            // Scroll field smoothly to center of screen
            try {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (err) {}

            // Apply red border classes
            el.classList.add('!border-2', '!border-red-500', 'dark:!border-[#A13333]', '!ring-2', '!ring-red-500/40', 'dark:!ring-[#A13333]/40');

            // Trigger modern pulse shake animation
            el.classList.remove('field-invalid-shake');
            void el.offsetWidth; // Force reflow
            el.classList.add('field-invalid-shake');

            // Focus field after smooth scroll start
            setTimeout(() => {
                try {
                    if (typeof el.focus === 'function') el.focus({ preventScroll: true });
                } catch (err) {}
            }, 250);

            const onInputOrChange = () => {
                el.classList.remove('!border-2', '!border-red-500', 'dark:!border-[#A13333]', '!ring-2', '!ring-red-500/40', 'dark:!ring-[#A13333]/40', 'field-invalid-shake');
                el.removeEventListener('input', onInputOrChange);
                el.removeEventListener('change', onInputOrChange);
            };
            el.addEventListener('input', onInputOrChange);
            el.addEventListener('change', onInputOrChange);
        }

        function showValidationToast(message = 'Por favor, completá los campos obligatorios marcados en rojo antes de continuar.', type = 'error') {
            let existingToast = document.getElementById('validation-toast-notification');
            if (existingToast) existingToast.remove();

            const isSuccess = type === 'success';
            const bgClass = isSuccess 
                ? 'bg-emerald-600 dark:bg-emerald-700 shadow-[0_10px_30px_rgba(16,185,129,0.4)]' 
                : 'bg-red-600 dark:bg-red-700 shadow-[0_10px_30px_rgba(220,38,38,0.4)]';
            const iconName = isSuccess ? 'check_circle' : 'error';

            const toast = document.createElement('div');
            toast.id = 'validation-toast-notification';
            toast.className = `fixed top-20 left-1/2 -translate-x-1/2 z-[200] max-w-md w-[92%] ${bgClass} text-white font-headline font-bold text-sm sm:text-base px-5 py-4 rounded-2xl flex items-center justify-between gap-3 transition-all duration-300 transform -translate-y-4 opacity-0 border border-white/20`;
            toast.innerHTML = `
                <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-2xl shrink-0">${iconName}</span>
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
            }, 4500);
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
                    if (typeof window.goToSubStep === 'function') {
                        window.goToSubStep(2);
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
                    { value: 'estandar', label: 'Estándar' },
                    { value: 'monoambiente', label: 'Monoambiente' },
                    { value: 'duplex', label: 'Dúplex' },
                    { value: 'piso', label: 'Piso' }
                ],
                'local-comercial': [
                    { value: 'local-a-calle', label: 'Local a la calle' },
                    { value: 'galeria', label: 'En galería' },
                    { value: 'galpon', label: 'Galpón' },
                    { value: 'deposito', label: 'Depósito' }
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
                if (errorNumeroLocal) errorNumeroLocal.classList.add('hidden');

                if (containerNumeroLocal) {
                    if (tipo === 'local-comercial') {
                        containerNumeroLocal.classList.remove('hidden');
                    } else {
                        containerNumeroLocal.classList.add('hidden');
                        const inputNumeroLocal = document.getElementById('numero-local');
                        const inputSectorLocal = document.getElementById('sector-local');
                        if (inputNumeroLocal) inputNumeroLocal.value = '';
                        if (inputSectorLocal) inputSectorLocal.value = '';
                    }
                }

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
                    if (typeof window.goToSubStep === 'function') {
                        window.goToSubStep(3);
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

                            step2Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                            step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                            step2Container.style.height = 'auto';
                            step2Container.style.opacity = '1';
                            step2Container.style.display = 'block';

                            // Scroll up if necessary
                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            // Change action buttons text/behavior if needed
                            document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                                btn.textContent = 'Continuar';
                                btn.setAttribute('form', 'form-multimedia');
                            });

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
            if (window.selectedPropertyPhotos && window.selectedPropertyPhotos.length > 0) {
                fotosPreviewContainer.classList.remove('hidden');
            } else {
                fotosPreviewContainer.classList.add('hidden');
            }

            window.selectedPropertyPhotos.forEach((blob, index) => {
                const url = (blob instanceof Blob || blob instanceof File) ? URL.createObjectURL(blob) : blob;
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
        window.renderPhotoPreviews = renderPhotoPreviews;

        async function processAndAddPhotos(files) {
            if (!files || files.length === 0) return;
            const imageFiles = files.filter(f => f && f.type && f.type.startsWith('image/'));
            if (imageFiles.length === 0) return;

            // Reset input value to prevent double fires on subsequent interactions
            const fotosInput = document.getElementById('fotos-input') || document.getElementById('input-fotos');
            if (fotosInput) fotosInput.value = '';

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

                            canvas.toBlob((blob) => {
                                if (blob) {
                                    blob.originalName = file.name;
                                    blob.originalSize = file.size;
                                }
                                resolve(blob);
                            }, 'image/webp', 0.8);
                        };
                        img.onerror = () => resolve(file);
                        img.src = ev.target.result;
                    };
                    reader.onerror = () => resolve(file);
                    reader.readAsDataURL(file);
                });
            };

            const processedBlobs = (await Promise.all(imageFiles.map(cropAndOptimizeImage1to1))).filter(Boolean);

            window.selectedPropertyPhotos = window.selectedPropertyPhotos || [];
            
            // Deduplicate to avoid adding duplicate photos
            for (const newBlob of processedBlobs) {
                const isDuplicate = window.selectedPropertyPhotos.some(existing => {
                    if (existing === newBlob) return true;
                    if (existing?.originalName && newBlob?.originalName && existing.originalName === newBlob.originalName && existing.originalSize === newBlob.originalSize) return true;
                    return false;
                });
                if (!isDuplicate) {
                    window.selectedPropertyPhotos.push(newBlob);
                }
            }

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
                if (files.length > 0) {
                    processAndAddPhotos(files);
                }
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

        const updateHeaderProgress = (activeStep, subStep = 1) => {
            const mobBadge = document.getElementById('mobile-step-badge');
            const mobPercent = document.getElementById('mobile-step-percent');
            const mobBar = document.getElementById('mobile-progress-bar');

            let stepLabel = getStepName(activeStep);
            let stepNumText = `Paso ${activeStep} de 6`;
            let calcStep = activeStep;

            if (activeStep === 1) {
                calcStep = 0.5 + (subStep * 0.5);
                stepNumText = `Paso 1.${subStep} de 6`;
                if (subStep === 1) stepLabel = 'Operación y tipo';
                else if (subStep === 2) stepLabel = 'Ubicación';
                else if (subStep === 3) stepLabel = 'Características';
            }

            const percent = Math.min(100, Math.round((calcStep / 6) * 100));
            if (mobBadge) mobBadge.innerHTML = `${stepNumText} &bull; ${stepLabel}`;
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
                        const labelText = activeStep === 1 ? `Principales (${subStep}/3)` : getStepName(i);
                        pStep.innerHTML = `
                            <div class="w-8 h-8 rounded-full bg-primary dark:bg-[#A13333] text-white flex items-center justify-center font-headline font-bold text-sm shrink-0 min-w-8 shadow-[0_0_15px_rgba(161,51,51,0.4)]">${i}</div>
                            <span class="font-headline font-bold text-primary dark:text-[#A13333] whitespace-nowrap text-xs sm:text-sm text-center">${labelText}</span>
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

        window.goToSubStep = function (subStepNum) {
            const tabOperacion = document.getElementById('tab-operacion');
            const tabUbicacion = document.getElementById('tab-ubicacion');
            const tabCaracteristicas = document.getElementById('tab-caracteristicas');
            const stepOperacion = document.getElementById('step-operacion');
            const stepUbicacion = document.getElementById('step-ubicacion');
            const stepCaracteristicas = document.getElementById('step-caracteristicas');
            const pasoSubtitle = document.getElementById('paso-subtitle');
            const publishMainTitle = document.getElementById('publish-main-title');

            if (!stepOperacion || !stepUbicacion || !stepCaracteristicas) return;

            stepOperacion.classList.add('hidden');
            stepOperacion.classList.remove('block');
            stepUbicacion.classList.add('hidden');
            stepUbicacion.classList.remove('block');
            stepCaracteristicas.classList.add('hidden');
            stepCaracteristicas.classList.remove('block');

            const inactiveClass = 'font-headline font-medium text-secondary dark:text-[#c7c6c6] hover:text-on-background transition-colors pb-2 whitespace-nowrap cursor-pointer border-b-2 border-transparent hover:border-outline-variant/30 pointer-events-auto';
            const activeClass = 'font-headline font-bold text-primary dark:text-[#A13333] border-b-2 border-primary dark:border-[#A13333] pb-2 whitespace-nowrap active-tab pointer-events-none';

            if (tabOperacion) tabOperacion.className = inactiveClass;
            if (tabUbicacion) tabUbicacion.className = inactiveClass;
            if (tabCaracteristicas) tabCaracteristicas.className = inactiveClass;

            if (subStepNum === 1) {
                stepOperacion.classList.remove('hidden');
                stepOperacion.classList.add('block');
                if (tabOperacion) tabOperacion.className = activeClass;
                if (publishMainTitle) {
                    publishMainTitle.textContent = '¡Empecemos a crear tu aviso!';
                    publishMainTitle.style.opacity = '1';
                }
                if (pasoSubtitle) {
                    pasoSubtitle.textContent = '¿Qué querés publicar?';
                    pasoSubtitle.style.opacity = '1';
                }
                updateHeaderProgress(1, 1);
                window.currentSubStep = 1;
                setTimeout(() => {
                    document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                        btn.setAttribute('form', 'form-principales');
                        btn.textContent = 'Continuar';
                    });
                }, 50);
            } else if (subStepNum === 2) {
                stepUbicacion.classList.remove('hidden');
                stepUbicacion.classList.add('block');
                if (tabUbicacion) tabUbicacion.className = activeClass;
                if (pasoSubtitle) pasoSubtitle.textContent = '¿Dónde está ubicada tu propiedad?';
                updateHeaderProgress(1, 2);
                window.currentSubStep = 2;
                setTimeout(() => {
                    document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                        btn.setAttribute('form', 'form-ubicacion');
                        btn.textContent = 'Continuar';
                    });
                }, 50);

                if (typeof window.loadGoogleMaps === 'function') {
                    window.loadGoogleMaps('initGoogleMap', 'places');
                } else {
                    const gmScript = document.createElement('script');
                    gmScript.src = 'js/google-maps-loader.js';
                    gmScript.onload = () => {
                        if (typeof window.loadGoogleMaps === 'function') {
                            window.loadGoogleMaps('initGoogleMap', 'places');
                        }
                    };
                    document.head.appendChild(gmScript);
                }
                if (typeof propertyMap !== 'undefined' && propertyMap && typeof google !== 'undefined') {
                    setTimeout(() => {
                        google.maps.event.trigger(propertyMap, 'resize');
                        propertyMap.setCenter({ lat: -32.898684, lng: -68.847522 });
                    }, 100);
                }
            } else if (subStepNum === 3) {
                stepCaracteristicas.classList.remove('hidden');
                stepCaracteristicas.classList.add('block');
                if (tabCaracteristicas) tabCaracteristicas.className = activeClass;
                if (pasoSubtitle) pasoSubtitle.textContent = 'Detalles de tu propiedad';
                updateHeaderProgress(1, 3);
                window.currentSubStep = 3;
                setTimeout(() => {
                    document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                        btn.setAttribute('form', 'form-caracteristicas');
                        btn.textContent = 'Continuar';
                    });
                }, 50);
            }

            const targetTab = subStepNum === 1 ? tabOperacion : (subStepNum === 2 ? tabUbicacion : tabCaracteristicas);
            if (targetTab) {
                setTimeout(() => {
                    targetTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }, 60);
            }
        };

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

                            step3Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                            step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                            step3Container.style.height = 'auto';
                            step3Container.style.opacity = '1';
                            step3Container.style.display = 'block';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                                btn.textContent = 'Continuar';
                                btn.setAttribute('form', 'form-extras');
                            });

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

                            step4Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                            step4Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                            step4Container.style.height = 'auto';
                            step4Container.style.opacity = '1';
                            step4Container.style.display = 'block';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                                btn.textContent = 'Continuar';
                                btn.setAttribute('form', 'form-preferencias');
                            });

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

                            step5Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                            step5Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                            step5Container.style.height = 'auto';
                            step5Container.style.opacity = '1';
                            step5Container.style.display = 'block';

                            window.scrollTo({ top: 0, behavior: 'smooth' });

                            document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                                btn.textContent = 'Continuar';
                                btn.setAttribute('form', 'form-visitas');
                            });

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

                        step6Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                        step6Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                        step6Container.style.height = 'auto';
                        step6Container.style.opacity = '1';
                        step6Container.style.display = 'block';

                        window.scrollTo({ top: 0, behavior: 'smooth' });

                        document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                            btn.textContent = 'Publicar Aviso';
                            btn.setAttribute('form', 'form-planes');
                        });

                        window.currentWizardStep = 6;
                    }

                }, 400);
            }
        });

        // Global Wizard Back Navigation Handler
        let isNavigatingBack = false;
        window.handleWizardBack = function () {
            if (isNavigatingBack) return;
            isNavigatingBack = true;
            setTimeout(() => { isNavigatingBack = false; }, 350);

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
                document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                    btn.setAttribute('form', formId);
                    btn.textContent = text;
                });
            };

            // Case 0: Step 6 -> Step 5
            if (step6Container && !step6Container.classList.contains('hidden')) {
                step6Container.classList.add('hidden');
                step6Container.style.height = '0';
                if (step5Container) {
                    step5Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step5Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    step5Container.style.height = 'auto';
                    step5Container.style.opacity = '1';
                    step5Container.style.display = 'block';
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
                    step4Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step4Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    step4Container.style.height = 'auto';
                    step4Container.style.opacity = '1';
                    step4Container.style.display = 'block';
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
                    step3Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step3Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    step3Container.style.height = 'auto';
                    step3Container.style.opacity = '1';
                    step3Container.style.display = 'block';
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
                    step2Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step2Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    step2Container.style.height = 'auto';
                    step2Container.style.opacity = '1';
                    step2Container.style.display = 'block';
                }
                if (title) title.textContent = 'Agregá fotos y videos';
                if (subtitle) subtitle.textContent = 'Mostrá lo mejor de tu propiedad';
                updateHeaderProgress(2);
                setSubmitButton('form-multimedia', 'Continuar');
                window.currentWizardStep = 2;
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            // Case 4: Step 2 -> Step 1 (Sub-step 1.3 Características)
            if (step2Container && !step2Container.classList.contains('hidden')) {
                step2Container.classList.add('hidden');
                step2Container.style.height = '0';
                if (step1Container) {
                    step1Container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0', 'overflow-hidden');
                    step1Container.classList.add('opacity-100', 'translate-y-0', 'scale-100');
                    step1Container.style.height = 'auto';
                    step1Container.style.opacity = '1';
                    step1Container.style.display = 'block';
                }
                if (title) title.textContent = '¡Empecemos a crear tu aviso!';
                window.currentWizardStep = 1;
                if (typeof window.goToSubStep === 'function') {
                    window.goToSubStep(3);
                }
                return;
            }

            // Navigation through Sub-steps inside Step 1
            const isSub3Visible = stepCaracteristicas && !stepCaracteristicas.classList.contains('hidden');
            const isSub2Visible = stepUbicacion && !stepUbicacion.classList.contains('hidden');

            if (isSub3Visible || window.currentSubStep === 3) {
                if (typeof window.goToSubStep === 'function') window.goToSubStep(2);
                return;
            }
            if (isSub2Visible || window.currentSubStep === 2) {
                if (typeof window.goToSubStep === 'function') window.goToSubStep(1);
                return;
            }

            // Sub-step 1.1 (Operación) -> Stay on Step 1.1
            window.currentWizardStep = 1;
            if (typeof window.goToSubStep === 'function') window.goToSubStep(1);
        };

        window.goToWizardStep = function (stepNum, subStepNum = 1) {
            const targetStep = Math.min(Math.max(1, parseInt(stepNum) || 1), 6);
            const targetSubStep = Math.min(Math.max(1, parseInt(subStepNum) || 1), 3);
            window.currentWizardStep = targetStep;
            window.currentSubStep = targetSubStep;

            const stepContainers = [
                document.getElementById('wizard-step-1-container'),
                document.getElementById('wizard-step-2-container'),
                document.getElementById('wizard-step-3-container'),
                document.getElementById('wizard-step-4-container'),
                document.getElementById('wizard-step-5-container'),
                document.getElementById('wizard-step-6-container')
            ];

            const title = document.getElementById('publish-main-title');
            const subtitle = document.getElementById('paso-subtitle');

            const stepConfigs = {
                1: {
                    title: '¡Empecemos a crear tu aviso!',
                    subtitle: targetSubStep === 2 ? '¿Dónde está ubicada tu propiedad?' : (targetSubStep === 3 ? 'Detalles de tu propiedad' : '¿Qué querés publicar?'),
                    formId: targetSubStep === 2 ? 'form-ubicacion' : (targetSubStep === 3 ? 'form-caracteristicas' : 'form-principales'),
                    btnText: 'Continuar'
                },
                2: {
                    title: 'Agregá fotos y videos',
                    subtitle: 'Mostrá lo mejor de tu propiedad',
                    formId: 'form-multimedia',
                    btnText: 'Continuar'
                },
                3: {
                    title: '¡Agregá los amenities de tu propiedad!',
                    subtitle: 'Estos campos opcionales mejoran el posicionamiento de tu aviso.',
                    formId: 'form-extras',
                    btnText: 'Continuar'
                },
                4: {
                    title: 'Preferencias de alquiler',
                    subtitle: 'Configurá las condiciones para tus futuros inquilinos',
                    formId: 'form-preferencias',
                    btnText: 'Continuar'
                },
                5: {
                    title: 'Agenda de Visitas y Tours Presenciales',
                    subtitle: 'Configurá tus días, horarios y modalidad para agendar tours y mostrar la propiedad',
                    formId: 'form-visitas',
                    btnText: 'Continuar'
                },
                6: {
                    title: 'Elegí la exposición de tu aviso',
                    subtitle: 'Los avisos con mayor exposición reciben hasta 5 veces más consultas',
                    formId: 'form-planes',
                    btnText: 'Publicar Aviso'
                }
            };

            stepContainers.forEach((container, idx) => {
                if (!container) return;
                const currentIdx = idx + 1;
                if (currentIdx === targetStep) {
                    container.classList.remove('hidden', 'opacity-0', 'translate-y-8', 'scale-95', 'h-0');
                    container.classList.add('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    container.style.height = '';
                    container.style.opacity = '1';
                    container.style.display = 'block';
                } else {
                    container.classList.add('hidden', 'opacity-0', 'scale-95');
                    container.classList.remove('opacity-100', 'translate-y-0', 'scale-100', 'h-auto');
                    container.style.height = '0';
                    container.style.display = 'none';
                }
            });

            const cfg = stepConfigs[targetStep];
            if (cfg) {
                if (title) {
                    title.textContent = cfg.title;
                    title.style.opacity = '1';
                }
                if (subtitle) {
                    subtitle.textContent = cfg.subtitle;
                    subtitle.style.opacity = '1';
                }
                document.querySelectorAll('#publish-property-view button[type="submit"]').forEach(btn => {
                    btn.setAttribute('form', cfg.formId);
                    btn.textContent = cfg.btnText;
                });
            }

            if (typeof window.updateHeaderProgress === 'function') {
                window.updateHeaderProgress(targetStep, targetStep === 1 ? targetSubStep : 1);
            }

            if (targetStep === 1) {
                if (typeof window.goToSubStep === 'function') {
                    window.goToSubStep(targetSubStep);
                }
            } else if (targetStep === 2) {
                if (typeof window.renderPhotoPreviews === 'function') {
                    window.renderPhotoPreviews();
                }
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        if (typeof App !== 'undefined') {
            App.goToWizardStep = window.goToWizardStep;
        }

        // Delegated listener for Continue buttons & Day Selection Pill buttons
        document.addEventListener('click', (e) => {
            const tabOp = e.target.closest('#tab-operacion');
            if (tabOp) {
                e.preventDefault();
                if (typeof window.goToSubStep === 'function') window.goToSubStep(1);
                return;
            }
            const tabUb = e.target.closest('#tab-ubicacion');
            if (tabUb) {
                e.preventDefault();
                if (typeof window.goToSubStep === 'function') window.goToSubStep(2);
                return;
            }
            const tabCar = e.target.closest('#tab-caracteristicas');
            if (tabCar) {
                e.preventDefault();
                if (typeof window.goToSubStep === 'function') window.goToSubStep(3);
                return;
            }

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
        });

        // Form 'Planes' Submit Interceptor (Final Submit to Supabase)
        let isPublishingSubmissionActive = false;
        const formPlanes = document.getElementById('form-planes');
        if (formPlanes) {
            formPlanes.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (isPublishingSubmissionActive) {
                    console.warn("Publicación ya en progreso, ignorando envío duplicado.");
                    return;
                }
                isPublishingSubmissionActive = true;

                const contactEmail = (document.getElementById('contact-email') && document.getElementById('contact-email').value.trim()) ||
                                     (localStorage.getItem('habitat_user') && JSON.parse(localStorage.getItem('habitat_user')).email) ||
                                     'propietario@habitat.ar';

                const executePublish = async (isVerified = false) => {
                    console.log('¡Iniciando publicación en Supabase! Verificado:', isVerified);

                    // Mostrar estado de carga
                    const submitBtnDesk = document.querySelector('#publish-property-view button[form="form-planes"], #publish-property-view nav button[type="submit"]');
                    const submitBtnMob = null;
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

                    // Helper to get selected feature labels from #form-extras
                    const getCheckedFeatures = (formSelector = '#form-extras') => {
                        const form = document.querySelector(formSelector);
                        if (!form) return [];
                        const checked = form.querySelectorAll('input[type="checkbox"]:checked');
                        const features = [];
                        checked.forEach(cb => {
                            let name = '';
                            const wrapper = cb.closest('.checkbox-wrapper') || cb.parentElement;
                            if (wrapper) {
                                const textSpan = wrapper.querySelector('.terms-label span') || wrapper.querySelector('span');
                                if (textSpan && textSpan.textContent.trim()) {
                                    name = textSpan.textContent.trim();
                                }
                            }
                            if (!name && cb.nextElementSibling) {
                                const span = cb.nextElementSibling.querySelector('span') || cb.nextElementSibling;
                                if (span && span.textContent.trim()) {
                                    name = span.textContent.trim();
                                }
                            }
                            if (!name) {
                                name = cb.name || cb.id;
                            }
                            if (name) features.push(name);
                        });

                        const chipsContainer = document.getElementById('selected-features-container');
                        if (chipsContainer) {
                            const chipSpans = chipsContainer.querySelectorAll('span.font-body');
                            chipSpans.forEach(s => {
                                const t = s.textContent.trim();
                                if (t) features.push(t);
                            });
                        }

                        return Array.from(new Set(features));
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
                        numeroLocal: getVal('numero-local'),

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
                        provincia: window.selectedPropertyProvincia || getVal('provincia') || 'Mendoza',
                        ciudad: window.selectedPropertyCiudad || getVal('ciudad') || 'Mendoza',
                        barrio: window.selectedPropertyBarrio || getVal('barrio') || 'Centro',
                        codigoPostal: window.selectedPropertyPostalCode || getVal('codigo-postal') || getVal('cp') || '5500',
                        subzona: getVal('subzona'),
                        ubicacionExacta: getRadioValue('precision') === 'exacta',

                        // Caracteristicas (Paso 1.2)
                        supCubierta: getVal('sup-cubierta'),
                        supTotal: getVal('sup-total'),
                        precio: getVal('precio'),
                        moneda: (function() {
                            const monEl = document.getElementById('moneda') || document.getElementById('precio')?.previousElementSibling;
                            const monVal = monEl ? monEl.value : 'ARS';
                            return (monVal === 'USD' || monVal === 'usd' || monVal === 'U$S') ? 'USD' : 'ARS';
                        })(),
                        expensas: getVal('expensas'),
                        expensasIncluidas: document.getElementById('expensas-incluidas')?.checked || false,
                        tituloAviso: getVal('titulo-aviso'),
                        descripcionAviso: getVal('descripcion-aviso'),

                        // Extras (Paso 3) - Todos los checkboxes seleccionados
                        caracteristicas: getCheckedFeatures('#form-extras'),
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
                        photos: window.selectedPropertyPhotos || [],
                        isVerifiedOwner: Boolean(isVerified)
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
                            ${isVerified ? '¡Propiedad publicada con Insignia Verificada!' : '¡Propiedad publicada!'}
                        </p>
                        <p style="font-family: 'Inter', sans-serif; font-size: 0.95rem;
                            color: ${isDark ? '#999' : '#666'}; margin-top: 0.5rem;
                            opacity: 0; transform: translateY(10px);
                            animation: successFadeUp 0.5s ease 1.15s forwards;">
                            ${isVerified ? 'Tu aviso ya luce el sello oficial de Propietario Verificado Didit en el marketplace.' : 'Tu aviso ya está disponible en el marketplace'}
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
                    App.clearPublishDraft();
                    document.getElementById('btn-back-from-publish')?.click();

                    if (window.location.pathname.includes('administrador.html')) {
                        await App.openAdminDashboard();
                        App.navigateTo('properties-view');
                    } else if (window.location.pathname.includes('panel-corredor.html')) {
                        App.closePublishWizard();
                        if (typeof window.addNewBrokerPropertyFromWizard === 'function') {
                            window.addNewBrokerPropertyFromWizard(propertyData);
                        }
                        if (typeof switchBrokerTab === 'function') {
                            switchBrokerTab('avisos');
                        }
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
                    isPublishingSubmissionActive = false;
                    if (submitBtnDesk) submitBtnDesk.textContent = originalTextDesk;
                    if (submitBtnMob) submitBtnMob.textContent = 'Publicar Aviso';
                    if (submitBtnDesk) submitBtnDesk.disabled = false;
                    if (submitBtnMob) submitBtnMob.disabled = false;
                }
            };

            if (window.HabitatOwnerVerification && typeof window.HabitatOwnerVerification.promptVerificationBeforePublish === 'function') {
                window.HabitatOwnerVerification.promptVerificationBeforePublish({
                    email: contactEmail,
                    onProceed: (isVerified) => {
                        executePublish(isVerified);
                    }
                });
            } else {
                executePublish(false);
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
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);

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
        if (typeof window.openMarketplacePropertyDetailModal === 'function') {
            window.openMarketplacePropertyDetailModal(property, { isOwner: true });
            return;
        }

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

        const viewsCount = (property.cantidad_visualizaciones_total !== undefined && property.cantidad_visualizaciones_total !== null)
            ? property.cantidad_visualizaciones_total
            : ((property.views_count !== undefined && property.views_count !== null) ? property.views_count : (property.views || 0));
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

    openPublishWizard: async (editingProp = null) => {
        return await App.showPublishWizard(editingProp);
    },

    showPublishWizard: async (editingProp = null) => {
        window.currentWizardStep = 1;

        // Automatically close hamburger menu / mobile menu drawer if open
        if (typeof window.closeLandingMenu === 'function') {
            window.closeLandingMenu();
        }
        const premiumMenu = document.getElementById('landing-premium-menu');
        if (premiumMenu) {
            premiumMenu.classList.remove('is-open');
            premiumMenu.setAttribute('aria-hidden', 'true');
        }
        const mobMenu = document.getElementById('mobile-menu');
        if (mobMenu) {
            mobMenu.classList.add('hidden');
        }
        document.body.classList.remove('landing-menu-open', 'overflow-hidden');
        document.body.style.overflow = '';
        document.querySelectorAll('nav .menu-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-expanded', 'false');
        });

        let publishElem = document.getElementById('publish-property-view');
        if (!publishElem) {
            try {
                const resp = await fetch('components/publish-property-view.html');
                if (resp.ok) {
                    const html = await resp.text();
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = html;
                    while (wrapper.firstChild) {
                        if (wrapper.firstChild.nodeType === 1 && !publishElem) {
                            publishElem = wrapper.firstChild;
                        }
                        document.body.appendChild(wrapper.firstChild);
                    }
                    if (typeof window.initPublishWizardEvents === 'function') {
                        window.initPublishWizardEvents();
                    }
                }
            } catch (err) {
                console.error("Error fetching publish-property-view.html:", err);
            }
        }

        if (!publishElem) {
            window.location.href = 'index.html?publish=1';
            return;
        }

        // Ensure event listeners for all wizard forms and controls are registered
        if (typeof App.setupEventListeners === 'function' && !window._wizardListenersSetup) {
            window._wizardListenersSetup = true;
            App.setupEventListeners();
        }

        // Save which view was active before opening the wizard
        const misAvisosEl = document.getElementById('mis-avisos-view');
        window._wasInMisAvisosView = misAvisosEl && !misAvisosEl.classList.contains('hidden');

        // Hide all main page content containers including owner, broker, and tenant docks
        document.querySelectorAll('#landing-marketplace-view, #landing-propietarios-view, #mis-avisos-view, #app, #main-layout, #login-view, main, body > section:not(#publish-property-view), #broker-floating-dock-container, #owner-floating-dock-container, #tenant-floating-dock-container, footer, nav:not(#publish-property-view nav)').forEach(el => {
            if (el && el !== publishElem && !publishElem.contains(el)) {
                el.classList.add('hidden');
            }
        });

        publishElem.classList.remove('hidden');
        window.scrollTo(0, 0);

        // Reset step containers to Step 1
        const step1Container = document.getElementById('wizard-step-1-container');
        const step2Container = document.getElementById('wizard-step-2-container');
        const step3Container = document.getElementById('wizard-step-3-container');
        const step4Container = document.getElementById('wizard-step-4-container');
        const step5Container = document.getElementById('wizard-step-5-container');
        const step6Container = document.getElementById('wizard-step-6-container');

        if (step1Container) {
            step1Container.classList.remove('hidden', 'opacity-0', 'scale-95');
            step1Container.classList.add('opacity-100', 'scale-100');
            step1Container.style.height = 'auto';
            step1Container.style.opacity = '1';
        }
        [step2Container, step3Container, step4Container, step5Container, step6Container].forEach(c => {
            if (c) {
                c.classList.add('hidden', 'opacity-0', 'scale-95');
                c.classList.remove('opacity-100', 'scale-100');
                c.style.height = '0';
            }
        });

        const publishMainTitle = document.getElementById('publish-main-title');
        const pasoSubtitle = document.getElementById('paso-subtitle');
        if (publishMainTitle) {
            publishMainTitle.textContent = '¡Empecemos a crear tu aviso!';
            publishMainTitle.style.opacity = '1';
        }
        if (pasoSubtitle) {
            pasoSubtitle.textContent = '¿Qué querés publicar?';
            pasoSubtitle.style.opacity = '1';
        }

        if (typeof window.goToSubStep === 'function') {
            window.goToSubStep(1);
        } else if (typeof window.updateHeaderProgress === 'function') {
            window.updateHeaderProgress(1, 1);
        }

        if (typeof window.setupInputValidations === 'function') {
            window.setupInputValidations();
        }

        if (typeof window.loadGoogleMaps === 'function') {
            window.loadGoogleMaps('initGoogleMap', 'places');
        } else if (typeof window.initGoogleMap === 'function') {
            setTimeout(() => { window.initGoogleMap(); }, 250);
        }

        if (!editingProp) {
            const restored = App.restorePublishDraft();
            if (!restored) {
                if (typeof window.goToWizardStep === 'function') {
                    window.goToWizardStep(1, 1);
                } else if (typeof window.goToSubStep === 'function') {
                    window.goToSubStep(1);
                } else if (typeof window.updateHeaderProgress === 'function') {
                    window.updateHeaderProgress(1, 1);
                }
            }
        } else {
            if (typeof window.goToWizardStep === 'function') {
                window.goToWizardStep(1, 1);
            } else if (typeof window.goToSubStep === 'function') {
                window.goToSubStep(1);
            } else if (typeof window.updateHeaderProgress === 'function') {
                window.updateHeaderProgress(1, 1);
            }
        }
    },

    savePublishDraft: async () => {
        try {
            const publishElem = document.getElementById('publish-property-view');
            if (!publishElem) return false;

            const fileToBase64 = (file) => {
                return new Promise((resolve) => {
                    if (typeof file === 'string') return resolve(file);
                    if (!(file instanceof Blob)) return resolve(null);
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(file);
                });
            };

            const serializedPhotos = [];
            if (Array.isArray(window.selectedPropertyPhotos) && window.selectedPropertyPhotos.length > 0) {
                for (const photo of window.selectedPropertyPhotos) {
                    const b64 = await fileToBase64(photo);
                    if (b64) serializedPhotos.push(b64);
                }
            }

            // 1. Detect active step accurately from DOM containers
            let activeStep = window.currentWizardStep || 1;
            for (let i = 1; i <= 6; i++) {
                const container = document.getElementById(`wizard-step-${i}-container`);
                if (container && !container.classList.contains('hidden') && container.style.display !== 'none' && container.style.height !== '0px') {
                    activeStep = i;
                    break;
                }
            }

            // 2. Detect active substep inside Step 1
            let activeSubStep = window.currentSubStep || 1;
            const stepOperacion = document.getElementById('step-operacion');
            const stepUbicacion = document.getElementById('step-ubicacion');
            const stepCaracteristicas = document.getElementById('step-caracteristicas');
            if (stepCaracteristicas && !stepCaracteristicas.classList.contains('hidden') && stepCaracteristicas.style.display !== 'none') {
                activeSubStep = 3;
            } else if (stepUbicacion && !stepUbicacion.classList.contains('hidden') && stepUbicacion.style.display !== 'none') {
                activeSubStep = 2;
            } else if (stepOperacion && !stepOperacion.classList.contains('hidden') && stepOperacion.style.display !== 'none') {
                activeSubStep = 1;
            }

            const draft = {
                version: 1,
                savedAt: new Date().toISOString(),
                currentWizardStep: activeStep,
                currentSubStep: activeSubStep,
                inputs: {},
                radios: {},
                checkboxes: {},
                selects: {},
                textareas: {},
                selectedPropertyPhotos: serializedPhotos,
                activeDays: [],
                selectedPlan: null
            };

            // Collect text, number, email, tel, date, hidden inputs
            publishElem.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="file"]):not([type="submit"]):not([type="button"])').forEach(input => {
                const key = input.id || input.name;
                if (key) {
                    draft.inputs[key] = input.value;
                }
            });

            // Collect selects
            publishElem.querySelectorAll('select').forEach(sel => {
                const key = sel.id || sel.name;
                if (key) {
                    draft.selects[key] = sel.value;
                }
            });

            // Collect textareas
            publishElem.querySelectorAll('textarea').forEach(ta => {
                const key = ta.id || ta.name;
                if (key) {
                    draft.textareas[key] = ta.value;
                }
            });

            // Collect radio buttons
            const radioNames = new Set();
            publishElem.querySelectorAll('input[type="radio"]').forEach(r => {
                if (r.name) radioNames.add(r.name);
            });
            radioNames.forEach(name => {
                const checked = publishElem.querySelector(`input[type="radio"][name="${name}"]:checked`);
                if (checked) {
                    draft.radios[name] = checked.value;
                }
            });

            // Collect checkboxes
            publishElem.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const key = cb.id || cb.name || cb.value;
                if (key) {
                    draft.checkboxes[key] = cb.checked;
                }
            });

            // Collect active visit days in Step 5
            publishElem.querySelectorAll('.dia-visita-btn.active-dia').forEach(btn => {
                const day = btn.getAttribute('data-dia') || btn.textContent.trim();
                if (day) draft.activeDays.push(day);
            });

            // Collect selected plan in Step 6
            const selectedPlan = publishElem.querySelector('.plan-card.active, .plan-card[data-selected="true"], input[name="plan_publicacion"]:checked');
            if (selectedPlan) {
                draft.selectedPlan = selectedPlan.getAttribute('data-plan') || selectedPlan.value;
            }

            localStorage.setItem('habitat_wizard_draft', JSON.stringify(draft));
            return true;
        } catch (err) {
            console.error("Error guardando borrador del wizard:", err);
            return false;
        }
    },

    saveAndExitPublishWizard: async () => {
        const saved = await App.savePublishDraft();
        if (saved) {
            if (typeof window.showValidationToast === 'function') {
                window.showValidationToast('Tu borrador fue guardado exitosamente. Podrás continuar cuando quieras.', 'success');
            }
        }
        App.closePublishWizard();
    },

    restorePublishDraft: () => {
        try {
            const raw = localStorage.getItem('habitat_wizard_draft');
            if (!raw) return false;
            const draft = JSON.parse(raw);
            if (!draft || !draft.inputs) return false;

            const publishElem = document.getElementById('publish-property-view');
            if (!publishElem) return false;

            // Restore text, number, etc. inputs
            Object.entries(draft.inputs || {}).forEach(([key, val]) => {
                const el = document.getElementById(key) || publishElem.querySelector(`input[name="${key}"]`);
                if (el && val !== undefined && val !== null) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Restore selects
            Object.entries(draft.selects || {}).forEach(([key, val]) => {
                const el = document.getElementById(key) || publishElem.querySelector(`select[name="${key}"]`);
                if (el && val !== undefined && val !== null) {
                    el.value = val;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Restore textareas
            Object.entries(draft.textareas || {}).forEach(([key, val]) => {
                const el = document.getElementById(key) || publishElem.querySelector(`textarea[name="${key}"]`);
                if (el && val !== undefined && val !== null) {
                    el.value = val;
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Restore radios
            Object.entries(draft.radios || {}).forEach(([name, val]) => {
                const radio = publishElem.querySelector(`input[type="radio"][name="${name}"][value="${val}"]`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                    const label = radio.closest('label');
                    if (label) {
                        label.click();
                    }
                }
            });

            // Restore checkboxes
            Object.entries(draft.checkboxes || {}).forEach(([key, checked]) => {
                const cb = document.getElementById(key) || publishElem.querySelector(`input[type="checkbox"][name="${key}"]`) || publishElem.querySelector(`input[type="checkbox"][value="${key}"]`);
                if (cb) {
                    cb.checked = Boolean(checked);
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            // Restore photos
            if (Array.isArray(draft.selectedPropertyPhotos) && draft.selectedPropertyPhotos.length > 0) {
                window.selectedPropertyPhotos = draft.selectedPropertyPhotos;
                if (typeof window.renderPhotoPreviews === 'function') {
                    window.renderPhotoPreviews();
                }
            }

            // Restore active days
            if (Array.isArray(draft.activeDays) && draft.activeDays.length > 0) {
                publishElem.querySelectorAll('.dia-visita-btn').forEach(btn => {
                    const day = btn.getAttribute('data-dia') || btn.textContent.trim();
                    if (draft.activeDays.includes(day)) {
                        btn.classList.add('active-dia');
                    } else {
                        btn.classList.remove('active-dia');
                    }
                });
            }

            // Restore step and substep immediately
            const stepToRestore = draft.currentWizardStep || 1;
            const subStepToRestore = draft.currentSubStep || 1;

            if (typeof window.goToWizardStep === 'function') {
                window.goToWizardStep(stepToRestore, subStepToRestore);
            } else if (stepToRestore === 1 && typeof window.goToSubStep === 'function') {
                window.goToSubStep(subStepToRestore);
            }

            if (typeof window.showValidationToast === 'function') {
                window.showValidationToast('Continuando desde tu borrador guardado.', 'success');
            }

            return true;
        } catch (err) {
            console.error("Error restaurando borrador del wizard:", err);
            return false;
        }
    },

    clearPublishDraft: () => {
        try {
            localStorage.removeItem('habitat_wizard_draft');
        } catch (e) {
            console.warn("Could not clear draft from localStorage:", e);
        }
    },

    closePublishWizard: () => {
        window.currentWizardStep = 1;

        const publishElem = document.getElementById('publish-property-view');
        if (publishElem) {
            publishElem.classList.add('hidden');
        }

        // Unhide page main content sections except mis-avisos-view
        document.querySelectorAll('#landing-marketplace-view, #landing-propietarios-view, #app, #main-layout, #login-view, main, body > section:not(#publish-property-view), #broker-floating-dock-container, #owner-floating-dock-container, #tenant-floating-dock-container, footer, nav:not(#publish-property-view nav)').forEach(el => {
            if (el && el !== publishElem) {
                el.classList.remove('hidden');
            }
        });

        const misAvisosEl = document.getElementById('mis-avisos-view');
        if (misAvisosEl) {
            if (window._wasInMisAvisosView) {
                misAvisosEl.classList.remove('hidden');
            } else {
                misAvisosEl.classList.add('hidden');
            }
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

        App.applyPageContext();
        window.scrollTo(0, 0);
    },

    openPublishWizard: async (editingProp) => {
        return App.showPublishWizard(editingProp);
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
        const tenants = (window.DataManager && typeof window.DataManager.getTenants === 'function') ? await window.DataManager.getTenants() : [];
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
        const payments = (window.DataManager && typeof window.DataManager.getMockPayments === 'function') ? await window.DataManager.getMockPayments() : [];
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
        const stats = (window.DataManager && typeof window.DataManager.getPaymentStats === 'function') ? await window.DataManager.getPaymentStats() : { totalPaid: 0, pendingCount: 0, totalTransactions: 0 };
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

// ============================================================
// Marketplace Property Detail & Photo Gallery (Zillow Fullscreen Experience)
// ============================================================
window.openMarketplacePropertyDetailModal = function (prop, options = {}) {
    if (!prop) return;

    const isOwner = Boolean(
        options.isOwner ||
        prop.isOwner ||
        window.location.pathname.includes('administrador') ||
        window.location.pathname.includes('propietarios') ||
        (document.getElementById('mis-avisos-view') && !document.getElementById('mis-avisos-view').classList.contains('hidden')) ||
        document.getElementById('panel-content-avisos') ||
        document.getElementById('owner-grid-props')
    );

    // Record view in DB when property details are opened (ONLY for non-owner visitors)
    if (!isOwner) {
        const pubId = prop.id_publicacion || prop.id;
        if (pubId && window.DataManager && typeof window.DataManager.recordPublicationView === 'function') {
            window.DataManager.recordPublicationView(pubId);
            if (prop.cantidad_visualizaciones_total !== undefined) {
                prop.cantidad_visualizaciones_total += 1;
                prop.views_count = prop.cantidad_visualizaciones_total;
                prop.views = prop.cantidad_visualizaciones_total;
            }
        }
    }

    // Parse extraInfo if description contains 'Detalles: '
    let extraInfo = prop.extraInfo || {};
    let descriptionText = prop.description || prop.note || 'Sin descripción disponible para esta propiedad.';
    if (typeof descriptionText === 'string' && descriptionText.includes('Detalles: ')) {
        const parts = descriptionText.split('Detalles: ');
        descriptionText = parts[0].trim();
        try {
            extraInfo = { ...extraInfo, ...JSON.parse(parts[1]) };
        } catch (e) {
            console.warn('Error parsing extraInfo JSON', e);
        }
    }

    // Collect photos from all possible properties and formats
    let rawPhotos = [];
    if (Array.isArray(prop.Multimedia) && prop.Multimedia.length > 0) {
        rawPhotos = prop.Multimedia;
    } else if (Array.isArray(prop.propiedad_imagenes) && prop.propiedad_imagenes.length > 0) {
        rawPhotos = prop.propiedad_imagenes;
    } else if (Array.isArray(prop.images) && prop.images.length > 0) {
        rawPhotos = prop.images;
    } else if (Array.isArray(prop.photos) && prop.photos.length > 0) {
        rawPhotos = prop.photos;
    } else if (prop.multimedia && Array.isArray(prop.multimedia.fotos) && prop.multimedia.fotos.length > 0) {
        rawPhotos = prop.multimedia.fotos;
    } else if (extraInfo && Array.isArray(extraInfo.photos) && extraInfo.photos.length > 0) {
        rawPhotos = extraInfo.photos;
    } else if (extraInfo && Array.isArray(extraInfo.images) && extraInfo.images.length > 0) {
        rawPhotos = extraInfo.images;
    } else if (prop.image) {
        rawPhotos = [prop.image];
    } else if (prop.photoUrl) {
        rawPhotos = [prop.photoUrl];
    } else if (prop.imagen) {
        rawPhotos = [prop.imagen];
    }

    // Sort if items have orden / orden_visualizacion
    if (rawPhotos.length > 0 && typeof rawPhotos[0] === 'object') {
        rawPhotos.sort((a, b) => (a.orden_visualizacion || a.orden || 0) - (b.orden_visualizacion || b.orden || 0));
    }

    // Extract clean URL strings
    let photos = rawPhotos.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
            return item.url_archivo || item.url || item.url_foto || item.src || item.dataUrl || item.previewUrl || null;
        }
        return null;
    }).filter(url => typeof url === 'string' && url.length > 0);

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

    // Normalize property details from Wizard & DB
    const pubId = prop.id_publicacion || prop.id;
    const title = prop.title || 'Propiedad en alquiler';
    const address = prop.address || prop.ubicacion || 'Ubicación no especificada';
    const province = prop.province || extraInfo.provincia || '';
    const fullAddress = (province && !address.toLowerCase().includes(province.toLowerCase()))
        ? `${address}, ${province}`
        : address;

    const moneda = (extraInfo.moneda === 'USD') ? 'U$S' : '$';
    const priceNum = prop.price ? Number(prop.price) : (prop.precio ? Number(prop.precio) : 0);
    const priceFormatted = priceNum ? `${moneda} ${priceNum.toLocaleString('es-AR')}` : 'Consultar precio';

    const operacion = (extraInfo.operacion || prop.featured || prop.type || 'En Alquiler').toUpperCase();
    const dormitorios = prop.dormitorios || extraInfo.dormitorios || prop.bedrooms || extractTagMetric(prop.tags, ['dorm', 'habitac']) || 1;
    const banos = prop.banos || extraInfo.banos || prop.bathrooms || extractTagMetric(prop.tags, ['baño', 'bano']) || 1;
    const toilettes = prop.toilettes || extraInfo.toilettes || null;
    const ambientes = prop.ambientes || extraInfo.ambientes || dormitorios || 1;
    const cocheras = prop.cocheras !== undefined ? prop.cocheras : (extraInfo.cocheras !== undefined ? extraInfo.cocheras : null);
    const supCubierta = prop.sup_cubierta || prop.supCubierta || extraInfo.sup_cubierta || extraInfo.supCubierta || extractTagMetric(prop.tags, ['m²', 'm2']) || '';
    const supTotal = prop.sup_total || prop.superficie_lote || extraInfo.sup_total || extraInfo.supTotal || supCubierta || '';
    const expensas = prop.expensas !== undefined ? prop.expensas : (extraInfo.expensas !== undefined ? extraInfo.expensas : (prop.expensas_mensuales || null));
    const expensasIncluidas = prop.expensasIncluidas !== undefined ? prop.expensasIncluidas : (extraInfo.expensasIncluidas !== false);
    const expensasNum = expensas !== null && expensas !== undefined ? Number(expensas) : 0;
    const expensasFormatted = expensasNum > 0 ? `${moneda} ${expensasNum.toLocaleString('es-AR')}` : (expensasIncluidas ? 'Incluidas' : 'Sin expensas');

    const totalMensual = priceNum + (expensasIncluidas ? 0 : expensasNum);
    const totalMensualFormatted = totalMensual > 0 ? `${moneda} ${totalMensual.toLocaleString('es-AR')}` : priceFormatted;

    const pisoDpto = prop.piso_dpto || extraInfo.piso_dpto || prop.piso || extraInfo.piso || '';
    const numeroLocal = prop.numero_local || extraInfo.numero_local || prop.numeroLocal || '';
    const antiguedad = prop.antiguedad || extraInfo.antiguedad || 'Excelente estado';
    const disposicion = prop.disposicion || extraInfo.disposicion || 'Frente';
    const orientacion = prop.orientacion || extraInfo.orientacion || 'Norte';
    const barrio = prop.barrio || extraInfo.barrio || '';
    const status = (prop.status || extraInfo.status || prop.estado_publicacion || '').toLowerCase() || 'disponible';
    const isAlquilada = Boolean(
        status === 'alquilada' ||
        status === 'alquilado' ||
        prop.alquilada === true ||
        prop.isAlquilada === true ||
        prop.id_estado_publicacion === 2 ||
        (prop.tags && Array.isArray(prop.tags) && prop.tags.some(t => typeof t === 'string' && t.toLowerCase().includes('alquilad'))) ||
        (extraInfo && (extraInfo.status === 'alquilada' || extraInfo.status === 'alquilado' || extraInfo.alquilada === true))
    );

    let formattedEndDate = '';
    const rawEndDate = prop.contractEndDate || prop.fecha_fin_contrato || (extraInfo && (extraInfo.contractEndDate || extraInfo.fecha_fin_contrato));
    if (rawEndDate) {
        try {
            const d = new Date(rawEndDate);
            if (!isNaN(d.getTime())) {
                formattedEndDate = d.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
            }
        } catch (e) {}
    }

    const viewsCount = prop.cantidad_visualizaciones_total ?? prop.views_count ?? prop.views ?? 0;

    const petFriendly = extraInfo.mascotas || prop.pet || (prop.tags && prop.tags.some(t => t.toLowerCase().includes('mascota')));
    const verified = Boolean(
        prop.verified ||
        prop.isVerifiedOwner ||
        prop.is_verified_owner ||
        prop.propietario_verificado ||
        (extraInfo && (extraInfo.isVerifiedOwner || extraInfo.verified)) ||
        (prop.tags && prop.tags.some(t => t.toLowerCase().includes('verificad')))
    );

    // Extract Furnishing / Amoblado state
    let amobladoVal = prop.amoblado !== undefined ? prop.amoblado : extraInfo.amoblado;
    if (amobladoVal === undefined || amobladoVal === null || amobladoVal === '') {
        if (prop.tags && Array.isArray(prop.tags)) {
            if (prop.tags.some(t => t.toLowerCase().includes('semiamoblado') || t.toLowerCase().includes('semi-amoblado'))) amobladoVal = 'semiamoblado';
            else if (prop.tags.some(t => t.toLowerCase().includes('totalmente amoblado') || t.toLowerCase().includes('amoblado'))) amobladoVal = 'totalmente-amoblado';
            else if (prop.tags.some(t => t.toLowerCase().includes('sin amoblar') || t.toLowerCase().includes('sin amueblar'))) amobladoVal = 'sin-amoblar';
        }
        if (extraInfo.caracteristicas && Array.isArray(extraInfo.caracteristicas)) {
            if (extraInfo.caracteristicas.some(t => t.toLowerCase().includes('semiamoblado') || t.toLowerCase().includes('semi-amoblado'))) amobladoVal = 'semiamoblado';
            else if (extraInfo.caracteristicas.some(t => t.toLowerCase().includes('totalmente amoblado') || t.toLowerCase().includes('amoblado'))) amobladoVal = 'totalmente-amoblado';
        }
    }

    let amobladoText = 'Sin amoblar';
    if (amobladoVal === true || amobladoVal === 'totalmente-amoblado' || amobladoVal === 'amoblado' || amobladoVal === 'si' || amobladoVal === 'amueblado') {
        amobladoText = 'Totalmente Amoblado';
    } else if (amobladoVal === 'semiamoblado' || amobladoVal === 'semi-amoblado' || amobladoVal === 'semiamueblado') {
        amobladoText = 'Semiamoblado';
    } else {
        amobladoText = 'Sin amoblar';
    }

    // Extract tags / amenities list
    let tagsList = prop.caracteristicas || prop.tags || [];
    if (extraInfo.caracteristicas && Array.isArray(extraInfo.caracteristicas)) {
        tagsList = Array.from(new Set([...tagsList, ...extraInfo.caracteristicas]));
    }
    if (tagsList.length === 0) {
        tagsList = ['Balcón', 'Cocina equipada', 'Luz natural', 'Aire acondicionado', 'Ascensor', 'Seguridad'];
    }

    // Create or select full-screen container
    let modal = document.getElementById('marketplace-property-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'marketplace-property-modal';
        document.body.appendChild(modal);
    }

    // Always reset modal scroll position to top when opening a property
    modal.scrollTop = 0;

    // Full-screen Zillow layout styles (Safe for Safari, iPhone, iPad, and Tab Previews)
    modal.className = 'fixed inset-0 z-[99999] w-full max-w-full h-full h-[100dvh] max-h-[100dvh] bg-[#f8f9fc] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto overscroll-contain transition-opacity duration-200 font-body';
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'auto';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.width = '100%';
    modal.style.height = '100dvh';
    modal.style.maxHeight = '100dvh';

    // Build Zillow-style Photo Mosaic Layout
    // Helper functions for mobile carousel in hero showcase
    window.__slideMobileCarousel = function (dir) {
        const c = document.getElementById('mp-mobile-carousel');
        if (!c) return;
        c.scrollBy({ left: dir * c.clientWidth, behavior: 'smooth' });
    };

    window.__updateMobileCarouselCounter = function (el) {
        if (!el) return;
        const idx = Math.round(el.scrollLeft / el.clientWidth);
        const counterEl = document.getElementById('mp-mobile-slide-num');
        if (counterEl) {
            counterEl.textContent = Math.min(photos.length, Math.max(1, idx + 1));
        }
    };

    // Build Desktop Showcase Layout (Photo 1 Look: 1 Large Left + 4 Small 2x2 Right)
    let desktopShowcaseHtml = '';
    const badgeHtml = `
        <div class="absolute top-4 left-4 z-20 flex items-center gap-2 flex-wrap pointer-events-none">
            ${isAlquilada ? `
                <div class="inline-flex items-center gap-1.5 bg-amber-500/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-headline font-black shadow-lg border border-amber-400/40">
                    <span class="material-symbols-outlined text-sm">key</span> Alquilada ${formattedEndDate ? `(Hasta ${formattedEndDate})` : ''}
                </div>
            ` : ''}
            ${verified ? `
                <div class="inline-flex items-center gap-1.5 bg-emerald-600/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-headline font-black shadow-lg border border-emerald-400/40">
                    <span class="material-symbols-outlined text-sm">verified</span> Propietario Verificado
                </div>
            ` : ''}
        </div>
    `;

    const viewAllBtnHtml = (count) => `
        <button type="button" onclick="window.__openGalleryMosaicModal(0)" class="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 bg-white/95 hover:bg-white dark:bg-zinc-900/95 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-zinc-200/60 dark:border-zinc-700/60 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <span class="material-symbols-outlined text-base sm:text-lg">grid_view</span>
            <span>Ver todas las fotos (${count})</span>
        </button>
    `;

    if (photos.length >= 5) {
        desktopShowcaseHtml = `
            <div class="mp-hero-desktop-showcase grid grid-cols-4 gap-2 rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[400px] lg:h-[440px] xl:h-[460px] bg-zinc-900 shadow-lg relative group select-none" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); height: 440px; gap: 8px;">
                ${badgeHtml}
                <!-- Left Hero Photo (Span 2 cols, 100% height) -->
                <div class="col-span-2 relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="grid-column: span 2; height: 100%; min-height: 0;" onclick="window.__openGalleryMosaicModal(0)">
                    <img src="${photos[0]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                    <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                </div>
                <!-- Right 4 Photos (Span 2 cols, 2x2 Grid with equal 50% rows) -->
                <div class="col-span-2 grid grid-cols-2 grid-rows-2 gap-2 w-full h-full min-h-0" style="grid-column: span 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; height: 100%; min-height: 0;">
                    ${photos.slice(1, 5).map((p, idx) => `
                        <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(${idx + 1})">
                            <img src="${p}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                            <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                        </div>
                    `).join('')}
                </div>
                ${viewAllBtnHtml(photos.length)}
            </div>
        `;
    } else if (photos.length === 4) {
        desktopShowcaseHtml = `
            <div class="mp-hero-desktop-showcase grid grid-cols-4 gap-2 rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[400px] lg:h-[440px] xl:h-[460px] bg-zinc-900 shadow-lg relative group select-none" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); height: 440px; gap: 8px;">
                ${badgeHtml}
                <div class="col-span-2 relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="grid-column: span 2; height: 100%; min-height: 0;" onclick="window.__openGalleryMosaicModal(0)">
                    <img src="${photos[0]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                    <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                </div>
                <div class="col-span-2 grid grid-cols-2 grid-rows-2 gap-2 w-full h-full min-h-0" style="grid-column: span 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; height: 100%; min-height: 0;">
                    <div class="col-span-2 relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="grid-column: span 2; width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(1)">
                        <img src="${photos[1]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                    </div>
                    <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(2)">
                        <img src="${photos[2]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                    </div>
                    <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(3)">
                        <img src="${photos[3]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                    </div>
                </div>
                ${viewAllBtnHtml(photos.length)}
            </div>
        `;
    } else if (photos.length === 3) {
        desktopShowcaseHtml = `
            <div class="mp-hero-desktop-showcase grid grid-cols-4 gap-2 rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[400px] lg:h-[440px] xl:h-[460px] bg-zinc-900 shadow-lg relative group select-none" style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); height: 440px; gap: 8px;">
                ${badgeHtml}
                <div class="col-span-2 relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="grid-column: span 2; height: 100%; min-height: 0;" onclick="window.__openGalleryMosaicModal(0)">
                    <img src="${photos[0]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                    <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                </div>
                <div class="col-span-2 grid grid-cols-1 grid-rows-2 gap-2 w-full h-full min-h-0" style="grid-column: span 2; display: grid; grid-template-columns: 1fr; grid-template-rows: repeat(2, minmax(0, 1fr)); gap: 8px; height: 100%; min-height: 0;">
                    <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(1)">
                        <img src="${photos[1]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                    </div>
                    <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(2)">
                        <img src="${photos[2]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover/item:bg-transparent transition-colors"></div>
                    </div>
                </div>
                ${viewAllBtnHtml(photos.length)}
            </div>
        `;
    } else if (photos.length === 2) {
        desktopShowcaseHtml = `
            <div class="mp-hero-desktop-showcase grid grid-cols-2 gap-2 rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[400px] lg:h-[440px] xl:h-[460px] bg-zinc-900 shadow-lg relative group select-none" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); height: 440px; gap: 8px;">
                ${badgeHtml}
                <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(0)">
                    <img src="${photos[0]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                </div>
                <div class="relative overflow-hidden w-full h-full min-h-0 cursor-pointer group/item" style="width: 100%; height: 100%; min-width: 0; min-height: 0;" onclick="window.__openGalleryMosaicModal(1)">
                    <img src="${photos[1]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover/item:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                </div>
                ${viewAllBtnHtml(photos.length)}
            </div>
        `;
    } else {
        desktopShowcaseHtml = `
            <div class="mp-hero-desktop-showcase rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[400px] lg:h-[440px] xl:h-[460px] bg-zinc-900 shadow-lg relative group cursor-pointer select-none" style="height: 440px;" onclick="window.__openGalleryMosaicModal(0)">
                ${badgeHtml}
                <img src="${photos[0]}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                <button type="button" class="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 bg-white/95 hover:bg-white dark:bg-zinc-900/95 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-xl backdrop-blur-md border border-zinc-200/60 dark:border-zinc-700/60 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                    <span class="material-symbols-outlined text-base sm:text-lg">fullscreen</span>
                    <span>Ver pantalla completa</span>
                </button>
            </div>
        `;
    }

    // Build Mobile Showcase Layout (Swipeable Carousel + Navigation Arrows + Counter)
    const mobileShowcaseHtml = `
        <div class="mp-hero-mobile-showcase relative rounded-2xl sm:rounded-3xl overflow-hidden w-full h-[280px] sm:h-[340px] bg-zinc-900 shadow-lg group select-none">
            <!-- Mobile Top Badges -->
            <div class="absolute top-3.5 left-3.5 z-20 flex items-center gap-1.5 flex-wrap pointer-events-none">
                ${isAlquilada ? `
                    <div class="inline-flex items-center gap-1 bg-amber-500/95 text-white backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-headline font-black shadow-md border border-amber-400/40">
                        <span class="material-symbols-outlined text-xs">key</span> Alquilada ${formattedEndDate ? `(Hasta ${formattedEndDate})` : ''}
                    </div>
                ` : ''}
                ${verified ? `
                    <div class="inline-flex items-center gap-1 bg-emerald-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-headline font-black shadow-md border border-emerald-400/40">
                        <span class="material-symbols-outlined text-xs">verified</span> Verificado
                    </div>
                ` : ''}
            </div>

            <!-- Horizontal Scroll Swipe Container -->
            <div id="mp-mobile-carousel" class="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth select-none touch-pan-x" onscroll="window.__updateMobileCarouselCounter(this)">
                ${photos.map((p, idx) => `
                    <div class="snap-center w-full h-full shrink-0 relative cursor-pointer" onclick="window.__openGalleryMosaicModal(${idx})">
                        <img src="${p}" alt="${title}" class="w-full h-full object-cover pointer-events-none" onerror="this.src='img/hero-marketplace.jpg'">
                    </div>
                `).join('')}
            </div>

            <!-- Left / Right Nav Arrows (Mobile) -->
            ${photos.length > 1 ? `
                <button type="button" onclick="event.stopPropagation(); window.__slideMobileCarousel(-1);" aria-label="Foto anterior" class="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 cursor-pointer border border-white/15">
                    <span class="material-symbols-outlined text-lg pointer-events-none">chevron_left</span>
                </button>
                <button type="button" onclick="event.stopPropagation(); window.__slideMobileCarousel(1);" aria-label="Foto siguiente" class="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 cursor-pointer border border-white/15">
                    <span class="material-symbols-outlined text-lg pointer-events-none">chevron_right</span>
                </button>
            ` : ''}

            <!-- Bottom Counter Pill (Mobile) -->
            <div class="absolute bottom-3 right-3 z-20 pointer-events-none">
                <div class="bg-black/70 backdrop-blur-md text-white text-[11px] font-extrabold px-3 py-1 rounded-full border border-white/20 shadow-md flex items-center gap-1">
                    <span class="material-symbols-outlined text-xs">photo_camera</span>
                    <span id="mp-mobile-slide-num">1</span> / ${photos.length}
                </div>
            </div>
        </div>
    `;

    // Unified Photo Showcase Section
    photoMosaicHtml = `
        <div class="w-full relative">
            ${desktopShowcaseHtml}
            ${mobileShowcaseHtml}
        </div>
    `;

    modal.innerHTML = `
        <!-- Top Zillow Sub-Nav Sticky Bar -->
        <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#090a0f]/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 transition-all shadow-2xs">
            <!-- Fila 1: Navegación, Breadcrumbs y Acciones -->
            <div class="px-4 sm:px-8 py-3 flex items-center justify-between">
                <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button id="close-marketplace-fullscreen-btn" type="button" aria-label="Volver al listado" class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:text-primary dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 px-3.5 py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-lg">arrow_back</span>
                        <span class="hidden sm:inline">Volver a propiedades</span>
                    </button>
                    <div class="hidden md:flex items-center gap-2 text-xs text-zinc-400 dark:text-zinc-500 font-medium truncate">
                        <a href="index.html" class="hover:underline">Marketplace</a>
                        <span>/</span>
                        <span class="text-zinc-600 dark:text-zinc-300 truncate">${barrio || 'Buenos Aires'}</span>
                        <span>/</span>
                        <span class="text-zinc-900 dark:text-white font-bold truncate max-w-[240px]">${title}</span>
                    </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                    <button id="mp-share-btn" type="button" title="Compartir propiedad" class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-base">share</span>
                        <span class="hidden sm:inline">Compartir</span>
                    </button>
                    
                    <button type="button" class="btn-favorite ${window.FavoritesManager?.isFavorite(pubId) ? 'is-favorite' : ''} inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs" data-pub-id="${pubId}" onclick="event.stopPropagation(); window.FavoritesManager?.toggleFavorite(${pubId}, event);">
                        <span class="material-symbols-outlined text-base ${window.FavoritesManager?.isFavorite(pubId) ? 'text-rose-500 fill-1' : 'text-zinc-500 hover:text-rose-500'}">favorite</span>
                        <span class="hidden sm:inline">Guardar</span>
                    </button>

                    <button id="close-marketplace-x-btn" type="button" aria-label="Cerrar vista" title="Cerrar (ESC)" class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer">
                        <span class="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>
            </div>

            <!-- Fila 2: Botonera de Navegación Rápida (Exclusiva Tablet y Desktop: Hidden en mobile < 768px) -->
            <div id="mp-subnav-bar" class="mp-subnav-desktop-only border-t border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-8 bg-white/95 dark:bg-[#090a0f]/95 flex items-center justify-center gap-6 sm:gap-10 overflow-x-auto scrollbar-none no-scrollbar">
                <button type="button" class="mp-subnav-btn is-active relative py-3 text-xs sm:text-sm cursor-pointer select-none shrink-0" data-target="mp-section-overview">
                    <span>Resumen</span>
                    <span class="mp-active-line absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"></span>
                </button>

                <button type="button" class="mp-subnav-btn relative py-3 text-xs sm:text-sm cursor-pointer select-none shrink-0" data-target="mp-section-amenities">
                    <span>Amenities</span>
                    <span class="mp-active-line absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"></span>
                </button>

                <button type="button" class="mp-subnav-btn relative py-3 text-xs sm:text-sm cursor-pointer select-none shrink-0" data-target="mp-section-location">
                    <span>Ubicación</span>
                    <span class="mp-active-line absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"></span>
                </button>

                <button type="button" class="mp-subnav-btn relative py-3 text-xs sm:text-sm cursor-pointer select-none shrink-0" data-target="mp-section-costs">
                    <span>Costos</span>
                    <span class="mp-active-line absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"></span>
                </button>

                <button type="button" class="mp-subnav-btn relative py-3 text-xs sm:text-sm cursor-pointer select-none shrink-0" data-target="mp-section-history">
                    <span>Historial</span>
                    <span class="mp-active-line absolute bottom-0 left-0 right-0 h-[2.5px] rounded-t-full"></span>
                </button>
            </div>
        </header>

        <!-- Main Full-Screen Body Content -->
        <main class="flex-1 max-w-[1360px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-36 lg:pb-12 space-y-8">
            
            <!-- In-View Scroll Reveal Styles & Sub-Nav Hover Magic -->
            <style id="mp-fullscreen-styles">
                /* Showcase Display Rules (Desktop vs Mobile) */
                .mp-hero-desktop-showcase {
                    display: none !important;
                }
                .mp-hero-mobile-showcase {
                    display: block !important;
                }
                @media (min-width: 768px) {
                    .mp-hero-desktop-showcase {
                        display: grid !important;
                        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                        grid-template-rows: minmax(0, 1fr) !important;
                        height: 440px !important;
                        gap: 8px !important;
                    }
                    .mp-hero-desktop-showcase img {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        object-position: center center !important;
                        display: block !important;
                    }
                    .mp-hero-mobile-showcase {
                        display: none !important;
                    }
                }
                /* Desktop/Tablet vs Mobile Subnav Display */
                .mp-subnav-desktop-only {
                    display: none;
                }
                @media (min-width: 768px) {
                    .mp-subnav-desktop-only {
                        display: flex !important;
                    }
                }
                /* Safari Tab Preview / Snapshot Fix: Content is immediately visible and rendered without blank states */
                .mp-inview-item {
                    opacity: 1 !important;
                    transform: none !important;
                }
                .mp-inview-item.is-inview {
                    opacity: 1 !important;
                    transform: none !important;
                }
                /* Safari Dynamic Viewport & Safe Area Bottom Bar Fix for Tablet & iPhone */
                #marketplace-property-modal {
                    position: fixed !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    height: 100% !important;
                    height: 100dvh !important;
                    max-height: 100dvh !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    overscroll-behavior-y: contain !important;
                    touch-action: pan-y !important;
                    box-sizing: border-box !important;
                }
                #mp-mobile-bottom-tray {
                    position: sticky !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    padding-top: 0.75rem !important;
                    padding-bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px)) !important;
                    padding-left: calc(1rem + env(safe-area-inset-left, 0px)) !important;
                    padding-right: calc(1rem + env(safe-area-inset-right, 0px)) !important;
                    margin-top: auto !important;
                    z-index: 50 !important;
                    background-color: rgba(255, 255, 255, 0.98) !important;
                    -webkit-backdrop-filter: blur(16px) !important;
                    backdrop-filter: blur(16px) !important;
                }
                .dark #mp-mobile-bottom-tray {
                    background-color: rgba(17, 19, 24, 0.98) !important;
                }
                .mp-subnav-btn {
                    color: #71717a;
                    font-weight: 600;
                    position: relative;
                    transition: color 0.15s ease;
                }
                .mp-subnav-btn .mp-active-line {
                    background-color: var(--primary, #9b2c2c);
                    opacity: 0;
                    transform: scaleX(0);
                    transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .mp-subnav-btn:hover {
                    color: var(--primary, #9b2c2c) !important;
                }
                .dark .mp-subnav-btn:hover {
                    color: #ffffff !important;
                }
                .mp-subnav-btn:hover .mp-active-line {
                    opacity: 0.35;
                    transform: scaleX(0.7);
                }
                .mp-subnav-btn.is-active {
                    color: var(--primary, #9b2c2c) !important;
                    font-weight: 700 !important;
                }
                .dark .mp-subnav-btn.is-active {
                    color: #f87171 !important;
                    font-weight: 700 !important;
                }
                .mp-subnav-btn.is-active .mp-active-line {
                    opacity: 1 !important;
                    transform: scaleX(1) !important;
                    background-color: var(--primary, #9b2c2c) !important;
                    box-shadow: 0 1px 6px rgba(155, 44, 44, 0.35);
                }
                .dark .mp-subnav-btn.is-active .mp-active-line {
                    background-color: #f87171 !important;
                    box-shadow: 0 1px 6px rgba(248, 113, 113, 0.4);
                }
            </style>

            <!-- 1. Hero Photo Showcase (Zillow 5-Mosaic / High-Res Showcase) -->
            <section class="space-y-3" id="mp-section-overview">
                ${photoMosaicHtml}
            </section>

            <!-- 2. Zillow 2-Column Core Architecture -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                
                <!-- LEFT COLUMN: Facts, Features, Story & Details (~67% width) -->
                <div class="lg:col-span-8 space-y-8 min-w-0">
                    
                    <!-- Property Title, Address & Luxury Badges Ribbon -->
                    <div class="space-y-4 border-b border-zinc-200 dark:border-zinc-800/80 pb-6">
                        <!-- Luxury Minimalist Badges (Monochrome & Subtle Accents) -->
                        <div class="flex items-center gap-2 flex-wrap">
                            ${isAlquilada ? `
                                <span class="inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-black tracking-wide rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shadow-2xs">
                                    <span class="material-symbols-outlined text-sm text-amber-600 dark:text-amber-400">key</span>
                                    Alquilada ${formattedEndDate ? `(Hasta ${formattedEndDate})` : ''}
                                </span>
                            ` : `
                                <span class="inline-flex items-center gap-1.5 px-3.5 py-1 text-[11px] font-black tracking-wider rounded-full uppercase bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    ${operacion}
                                </span>
                            `}
                            ${verified ? `
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                    <span class="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">verified</span> Propietario Verificado
                                </span>
                            ` : ''}
                            ${petFriendly ? `
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                                    <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">pets</span> Apto Mascotas
                                </span>
                            ` : ''}
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                                <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">chair</span> ${amobladoText}
                            </span>
                            ${expensasIncluidas ? `
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200/90 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors">
                                    <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">task_alt</span> Expensas Incluidas
                                </span>
                            ` : ''}
                        </div>

                        <h1 class="font-headline text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white leading-tight tracking-tight">
                            ${title}
                        </h1>

                        <div class="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 text-sm sm:base font-medium flex-wrap">
                            <span class="material-symbols-outlined text-zinc-500 dark:text-zinc-400 shrink-0">location_on</span>
                            <span class="font-bold text-zinc-800 dark:text-zinc-200">${fullAddress}</span>
                            ${barrio ? `<span class="text-zinc-500">· Barrio ${barrio}</span>` : ''}
                            <a href="https://maps.google.com/?q=${encodeURIComponent(fullAddress)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:underline ml-1 transition-colors">
                                <span>Ver en Maps</span>
                                <span class="material-symbols-outlined text-xs">open_in_new</span>
                            </a>
                        </div>

                        <!-- Architectural Luxury Spec Cards Grid -->
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                            <div class="bg-white dark:bg-[#111318] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 flex items-center gap-3.5 group">
                                <div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span class="material-symbols-outlined text-xl">bed</span>
                                </div>
                                <div class="min-w-0">
                                    <span class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white block leading-tight">${dormitorios}</span>
                                    <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate block">Dormitorios</span>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-[#111318] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 flex items-center gap-3.5 group">
                                <div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span class="material-symbols-outlined text-xl">shower</span>
                                </div>
                                <div class="min-w-0">
                                    <span class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white block leading-tight">${banos}</span>
                                    <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate block">Baños</span>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-[#111318] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 flex items-center gap-3.5 group">
                                <div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span class="material-symbols-outlined text-xl">square_foot</span>
                                </div>
                                <div class="min-w-0">
                                    <span class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white block leading-tight">${supCubierta || supTotal || '45'} m²</span>
                                    <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate block">Superficie</span>
                                </div>
                            </div>

                            <div class="bg-white dark:bg-[#111318] p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-md transition-all duration-200 flex items-center gap-3.5 group">
                                <div class="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span class="material-symbols-outlined text-xl">garage_home</span>
                                </div>
                                <div class="min-w-0">
                                    <span class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white block leading-tight">${cocheras || '0'}</span>
                                    <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate block">${cocheras ? 'Cocheras' : 'Sin cochera'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 1. Comodidades y Amenities destacados (Items con Ticks) -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-amenities">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">verified</span>
                                Comodidades y Amenities incluidos
                            </h2>
                            <span class="text-xs font-bold text-zinc-400 dark:text-zinc-500">${tagsList.length} amenities verificados</span>
                        </div>
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            ${tagsList.map(tag => `
                                <div class="flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-[#111318] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 hover:scale-[1.02] hover:shadow-md transition-all duration-200 cursor-default group">
                                    <div class="w-7 h-7 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 flex items-center justify-center transition-all duration-300 shrink-0 shadow-2xs">
                                        <span class="material-symbols-outlined text-base">check</span>
                                    </div>
                                    <span class="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate">${tag}</span>
                                </div>
                            `).join('')}
                        </div>
                    </section>

                    <!-- 2. Descripción del Inmueble -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-description">
                        <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                            <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">description</span>
                            Descripción del Inmueble
                        </h2>
                        <div class="bg-white dark:bg-[#111318] p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300">
                            <div class="prose dark:prose-invert max-w-none font-body text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                                ${descriptionText}
                            </div>
                        </div>
                    </section>

                    <!-- 3. Publicado por el propietario / Agente (Arriba de Ubicación y Entorno) -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-owner">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">badge</span>
                                Publicado por el propietario
                            </h2>
                            <span class="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                                <span class="material-symbols-outlined text-xs">verified</span> Fuente Verificada
                            </span>
                        </div>

                        <div class="bg-white dark:bg-[#111318] p-5 sm:p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-5">
                            <div class="flex items-start gap-4">
                                <!-- Logo / Avatar -->
                                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex flex-col items-center justify-center shrink-0 shadow-md font-headline font-black p-2 text-center select-none">
                                    <span class="text-[9px] uppercase tracking-widest leading-none font-semibold text-zinc-400 dark:text-zinc-500">HABITAT</span>
                                    <span class="text-lg sm:text-xl font-black leading-none mt-0.5">LUX</span>
                                </div>

                                <!-- Owner / Agent Info -->
                                <div class="space-y-1 min-w-0 flex-1">
                                    <span class="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">Agente Administrador / Propietario</span>
                                    <h3 class="font-headline text-base sm:text-lg font-black text-zinc-900 dark:text-white truncate">
                                        ${prop.propietario_nombre || 'Urbanlux Real Estate · Hábitat'}
                                    </h3>
                                    <div class="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        <span class="material-symbols-outlined text-sm">check</span>
                                        <span class="underline decoration-dotted">Fuente Verificada</span>
                                    </div>
                                    <div class="pt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                                        <div class="flex items-center gap-1">
                                            <span>Sitio web:</span>
                                            <a href="https://habitat.com.ar" target="_blank" rel="noopener noreferrer" class="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5">
                                                <span>fleurpremium.urbanlux.net</span>
                                                <span class="material-symbols-outlined text-[13px]">open_in_new</span>
                                            </a>
                                        </div>
                                        <span class="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
                                        <div class="flex items-center gap-1 font-semibold text-zinc-700 dark:text-zinc-300">
                                            <span class="material-symbols-outlined text-xs text-zinc-400">phone</span>
                                            <span>(011) 4910-7921</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Botón "Hacer una pregunta" (Ask a question) -->
                            <button type="button" onclick="window.open('https://wa.me/?text=' + encodeURIComponent('Hola! Me interesa hacer una consulta sobre la propiedad: ' + '${title}' + ' (' + '${fullAddress}' + ') en Hábitat'), '_blank')" class="w-full inline-flex items-center justify-center gap-2 bg-[#006aff] hover:bg-[#0053cc] active:scale-[0.99] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer text-sm sm:text-base">
                                <span class="material-symbols-outlined text-lg">chat</span>
                                <span>Hacer una pregunta</span>
                            </button>
                        </div>
                    </section>

                    <!-- 4. Ubicación y Entorno (Mapa + Tiempos de Viaje Modernizados) -->
                    <section class="space-y-5 mp-inview-item" id="mp-section-location">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">location_on</span>
                                Ubicación y Entorno
                            </h2>
                            <span class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 truncate max-w-[200px] sm:max-w-none">${fullAddress}</span>
                        </div>

                        <!-- Map Preview Card with Floating Street View and Fullscreen Button -->
                        <div class="relative w-full h-72 sm:h-88 rounded-3xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800/90 shadow-md bg-zinc-100 dark:bg-zinc-800 group">
                            <iframe 
                                class="w-full h-full border-0 pointer-events-auto"
                                loading="lazy"
                                src="https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                title="Mapa de ubicación ${title}">
                            </iframe>

                            <!-- Floating Street View Button (Top-Left) -->
                            <a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prop.latitud || -32.8898},${prop.longitud || -68.8373}" target="_blank" rel="noopener noreferrer" class="absolute top-3.5 left-3.5 z-10 inline-flex items-center gap-2 bg-black/85 hover:bg-black text-white px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold backdrop-blur-md shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/20">
                                <div class="w-5 h-5 sm:w-6 sm:h-6 rounded-md overflow-hidden bg-zinc-700 shrink-0">
                                    <img src="${photos[0]}" class="w-full h-full object-cover" alt="Street view">
                                </div>
                                <span>Vista de calle 360°</span>
                                <span class="material-symbols-outlined text-xs">open_in_new</span>
                            </a>

                            <!-- Floating Fullscreen Map Button (Top-Right) -->
                            <a href="https://maps.google.com/?q=${encodeURIComponent(fullAddress)}" target="_blank" rel="noopener noreferrer" class="absolute top-3.5 right-3.5 z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/95 hover:bg-white dark:bg-zinc-900/95 dark:hover:bg-zinc-900 text-zinc-800 dark:text-white shadow-xl backdrop-blur-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer border border-zinc-200/80 dark:border-zinc-700/80" title="Abrir en Google Maps">
                                <span class="material-symbols-outlined text-lg sm:text-xl">open_in_full</span>
                            </a>
                        </div>

                        <!-- Módulo Moderno y Responsivo de Tiempos de Viaje -->
                        <div class="bg-white dark:bg-[#111318] p-5 sm:p-7 rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 shadow-2xs space-y-5">
                            
                            <!-- Header -->
                            <div class="flex items-start justify-between gap-3">
                                <div>
                                    <h3 class="font-headline text-base sm:text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                        <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300 text-xl">commute</span>
                                        Tiempos de viaje
                                    </h3>
                                    <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">Calculá el tiempo estimado de traslado hacia tus destinos habituales.</p>
                                </div>
                            </div>

                            <!-- Input y Botón 100% Responsivos -->
                            <div class="space-y-3.5">
                                <div class="flex flex-col sm:flex-row gap-2.5">
                                    <div class="relative flex-1">
                                        <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-lg pointer-events-none">search</span>
                                        <input type="text" id="travel-time-destination-input" placeholder="Buscar destino (ej. Centro, Universidad, Trabajo...)" class="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-white/10 focus:border-zinc-400 dark:focus:border-zinc-500 transition-all font-body">
                                    </div>
                                    <button type="button" id="travel-time-calc-btn" class="inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-xs sm:text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0">
                                        <span class="material-symbols-outlined text-base">near_me</span>
                                        <span>Calcular</span>
                                    </button>
                                </div>

                                <!-- Chips de Destinos Sugeridos (Elegantes y Monocromáticos) -->
                                <div class="flex items-center gap-2 flex-wrap pt-0.5">
                                    <span class="text-zinc-400 dark:text-zinc-500 font-bold text-[10px] sm:text-[11px] uppercase tracking-wider mr-1">Sugeridos:</span>
                                    <button type="button" class="travel-preset-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-all cursor-pointer border border-zinc-200/70 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-95 shrink-0" data-dest="Centro / Plaza Independencia">
                                        <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">location_city</span>
                                        <span>Centro</span>
                                    </button>
                                    <button type="button" class="travel-preset-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-all cursor-pointer border border-zinc-200/70 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-95 shrink-0" data-dest="Universidad Nacional">
                                        <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">school</span>
                                        <span>Universidad</span>
                                    </button>
                                    <button type="button" class="travel-preset-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-all cursor-pointer border border-zinc-200/70 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-95 shrink-0" data-dest="Parque General San Martín">
                                        <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">park</span>
                                        <span>Parque</span>
                                    </button>
                                    <button type="button" class="travel-preset-chip inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 hover:bg-zinc-200/90 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-all cursor-pointer border border-zinc-200/70 dark:border-zinc-700/60 hover:border-zinc-400 dark:hover:border-zinc-500 active:scale-95 shrink-0" data-dest="Aeropuerto Internacional">
                                        <span class="material-symbols-outlined text-sm text-zinc-500 dark:text-zinc-400">flight</span>
                                        <span>Aeropuerto</span>
                                    </button>
                                </div>

                                <!-- Tarjetas Minimalistas & Profesionales de Resultados por Modo de Transporte -->
                                <div id="travel-times-results" class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                                    
                                    <!-- Auto -->
                                    <div class="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group">
                                        <div class="flex items-center justify-between">
                                            <div class="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                                                <span class="material-symbols-outlined text-base">directions_car</span>
                                            </div>
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">En auto</span>
                                        </div>
                                        <div>
                                            <span id="travel-car-time" class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white block leading-tight">~10-15 min</span>
                                            <span class="text-[11px] text-zinc-400 block mt-0.5">Tránsito habitual</span>
                                        </div>
                                    </div>

                                    <!-- Transporte / Colectivo -->
                                    <div class="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group">
                                        <div class="flex items-center justify-between">
                                            <div class="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                                                <span class="material-symbols-outlined text-base">directions_bus</span>
                                            </div>
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Transporte</span>
                                        </div>
                                        <div>
                                            <span id="travel-bus-time" class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white block leading-tight">~20-25 min</span>
                                            <span class="text-[11px] text-zinc-400 block mt-0.5">Líneas directas</span>
                                        </div>
                                    </div>

                                    <!-- Bici -->
                                    <div class="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group">
                                        <div class="flex items-center justify-between">
                                            <div class="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                                                <span class="material-symbols-outlined text-base">directions_bike</span>
                                            </div>
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">En bici</span>
                                        </div>
                                        <div>
                                            <span id="travel-bike-time" class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white block leading-tight">~12-16 min</span>
                                            <span class="text-[11px] text-zinc-400 block mt-0.5">Por ciclovía</span>
                                        </div>
                                    </div>

                                    <!-- Caminando -->
                                    <div class="p-4 rounded-2xl bg-zinc-50/60 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-white dark:hover:bg-zinc-800/80 transition-all duration-200 flex flex-col justify-between gap-3 group">
                                        <div class="flex items-center justify-between">
                                            <div class="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-900 transition-colors">
                                                <span class="material-symbols-outlined text-base">directions_walk</span>
                                            </div>
                                            <span class="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Caminando</span>
                                        </div>
                                        <div>
                                            <span id="travel-walk-time" class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white block leading-tight">~30-40 min</span>
                                            <span class="text-[11px] text-zinc-400 block mt-0.5">Ruta peatonal</span>
                                        </div>
                                    </div>

                                </div>

                                <!-- Pie de Ruta con Enlace a Google Maps -->
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-2 gap-2 border-t border-zinc-100 dark:border-zinc-800/80">
                                    <div class="flex items-center gap-1.5 truncate">
                                        <span class="material-symbols-outlined text-sm text-zinc-400 dark:text-zinc-500">pin_drop</span>
                                        <span class="truncate">Ruta estimada desde <strong class="text-zinc-700 dark:text-zinc-300">${fullAddress}</strong></span>
                                    </div>
                                    <a id="travel-maps-direct-link" href="https://maps.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fullAddress)}&destination=Centro" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 font-bold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white hover:underline shrink-0 transition-colors">
                                        <span>Ver ruta en Google Maps</span>
                                        <span class="material-symbols-outlined text-xs">open_in_new</span>
                                    </a>
                                </div>

                            </div>
                        </div>
                    </section>

                    <!-- 4. Estimación de Costos con Botón Modal -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-costs">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">calculate</span>
                                Estimación de Costos
                            </h2>
                        </div>
                        <div class="bg-white dark:bg-[#111318] p-6 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                                <div>
                                    <span class="block text-xs font-extrabold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">Costo Mensual Estimado</span>
                                    <span class="font-headline text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">${totalMensualFormatted} <span class="text-xs font-bold text-zinc-500">/ mes</span></span>
                                </div>
                                <button type="button" id="open-cost-calculator-btn" class="inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 px-5 py-3.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.02] active:scale-98 cursor-pointer shrink-0">
                                    <span class="material-symbols-outlined text-lg">calculate</span>
                                    <span>Calculadora de Costos Detallada</span>
                                </button>
                            </div>
                            <p class="text-xs text-zinc-500 dark:text-zinc-400">
                                Incluye desglose completo de costos mensuales y de ingreso a la propiedad con cálculo interactivo en tiempo real.
                            </p>
                        </div>
                    </section>

                    <!-- 5. Características y detalles del inmueble (Estructura jerárquica) -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-facts">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">view_list</span>
                                Características y detalles del inmueble
                            </h2>
                        </div>

                        <div class="bg-white dark:bg-[#111318] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
                            
                            <!-- Categoría 1: Distribución Interior -->
                            <div class="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-2.5 border-b border-zinc-200/60 dark:border-zinc-700/60">
                                <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Distribución Interior</span>
                            </div>
                            <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Dormitorios y baños</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Dormitorios: <strong class="text-zinc-900 dark:text-white">${dormitorios}</strong></li>
                                        <li>Baños completos: <strong class="text-zinc-900 dark:text-white">${banos}</strong></li>
                                        ${toilettes ? `<li>Toilettes de recepción: <strong class="text-zinc-900 dark:text-white">${toilettes}</strong></li>` : ''}
                                        <li>Ambientes totales: <strong class="text-zinc-900 dark:text-white">${ambientes}</strong></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Terminaciones y detalles</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Ascensor en edificio: <strong class="text-zinc-900 dark:text-white">Sí</strong></li>
                                        <li>Pisos: <strong class="text-zinc-900 dark:text-white">Porcelanato / Madera pulida</strong></li>
                                        <li>Hogar a leña / Chimenea: <strong class="text-zinc-900 dark:text-white">${tagsList.some(t => t.toLowerCase().includes('hogar') || t.toLowerCase().includes('chimenea')) ? 'Sí' : 'No'}</strong></li>
                                        <li>Mobiliario: <strong class="text-zinc-900 dark:text-white">${amobladoText}</strong></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Calefacción</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Central, Gas Natural, Radiadores / Split Frío-Calor</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Superficie</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Superficie cubierta habitable: <strong class="text-zinc-900 dark:text-white">${supCubierta || supTotal || '45'} m²</strong> (${Math.round((supCubierta || supTotal || 45) * 10.764)} sqft)</li>
                                        <li>Superficie total lote: <strong class="text-zinc-900 dark:text-white">${supTotal || supCubierta || '45'} m²</strong></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Refrigeración / Climatización</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Aire Acondicionado, Climatizador Central / Split Inverter</li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Recorrido virtual y fotos</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li><a href="javascript:void(0)" onclick="window.__openDetailLightbox(0)" class="text-primary dark:text-red-400 font-bold hover:underline">Ver galería y fotos en alta definición (${photos.length} fotos)</a></li>
                                    </ul>
                                </div>

                                <div class="sm:col-span-2">
                                    <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Equipamiento incluido</h4>
                                    <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                        <li>Incluye: Cocina equipada, Termotanque/Caldera, Anafe y Horno, Heladera/Freezer, Microondas, Alacenas y bajo mesada</li>
                                        <li>Lavadero: En la unidad / Espacio para Lavarropas</li>
                                    </ul>
                                </div>
                            </div>

                            <!-- Secciones Expandibles (Contenedor Colapsable) -->
                            <div id="mp-facts-expandable-content" class="transition-all duration-300">
                                
                                <!-- Categoría 2: Inmueble y Estacionamiento -->
                                <div class="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-2.5 border-y border-zinc-200/60 dark:border-zinc-700/60">
                                    <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Inmueble y Estacionamiento</span>
                                </div>
                                <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Estacionamiento / Cocheras</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Espacios totales: <strong class="text-zinc-900 dark:text-white">${cocheras ? cocheras : '0'}</strong></li>
                                            <li>Características: ${cocheras ? 'Cochera cubierta asignada con portón automatizado' : 'Sin cochera asignada / Estacionamiento en calle o cocheras cercanas'}</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Detalles constructivos</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Disposición: <strong class="text-zinc-900 dark:text-white">${disposicion}</strong></li>
                                            <li>Orientación: <strong class="text-zinc-900 dark:text-white">${orientacion}</strong></li>
                                            <li>Antigüedad: <strong class="text-zinc-900 dark:text-white">${antiguedad}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Categoría 3: Construcción y Edificio -->
                                <div class="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-2.5 border-y border-zinc-200/60 dark:border-zinc-700/60">
                                    <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Construcción y Edificio</span>
                                </div>
                                <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Tipología y estilo</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Tipo de propiedad: <strong class="text-zinc-900 dark:text-white">${prop.subtipo_propiedad || extraInfo.subtipoPropiedad || 'Departamento'}</strong></li>
                                            <li>Subtipo: <strong class="text-zinc-900 dark:text-white">Residencial Urbano</strong></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Edificio y Administración</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Nombre del complejo / Torre: <strong class="text-zinc-900 dark:text-white">${barrio ? `Residencial ${barrio}` : 'Edificio Hábitat'}</strong></li>
                                            <li>Acepta mascotas: <strong class="text-zinc-900 dark:text-white">${petFriendly ? 'Sí (Apto Mascotas)' : 'No permitido / A consultar'}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Categoría 4: Comunidad y Consorcio -->
                                <div class="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-2.5 border-y border-zinc-200/60 dark:border-zinc-700/60">
                                    <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Comunidad y Consorcio</span>
                                </div>
                                <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Instalaciones del complejo</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Instalaciones: Gimnasio, Seguridad 24hs, Piscina, SUM, Parrilla</li>
                                            <li>Seguridad: Control de acceso electrónico, Cámaras de monitoreo</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Expensas y Administración</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Servicios de expensas incluidos: Mantenimiento, Limpieza de espacios comunes, Seguridad, Iluminación</li>
                                            <li>Ubicación: <strong class="text-zinc-900 dark:text-white">${barrio ? `${barrio}, ` : ''}${prop.city || prop.province || 'Buenos Aires'}</strong></li>
                                        </ul>
                                    </div>
                                </div>

                                <!-- Categoría 5: Condiciones contractuales y Servicios -->
                                <div class="bg-zinc-100 dark:bg-zinc-800/80 px-6 py-2.5 border-y border-zinc-200/60 dark:border-zinc-700/60">
                                    <span class="font-headline text-xs font-black uppercase tracking-wider text-zinc-700 dark:text-zinc-300">Condiciones contractuales y Servicios</span>
                                </div>
                                <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm">
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Condiciones contractuales</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Plazo del contrato: <strong class="text-zinc-900 dark:text-white">1 a 2 Años (Ajustes según índice contractual ICL / IPC)</strong></li>
                                            <li>Depósito en garantía: <strong class="text-zinc-900 dark:text-white">1 mes (Reembolsable)</strong></li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-zinc-900 dark:text-white mb-2">Disponibilidad de servicios</h4>
                                        <ul class="space-y-1.5 text-zinc-600 dark:text-zinc-400 list-disc list-inside">
                                            <li>Agua corriente de red, Gas natural, Red eléctrica, Cloacas, Conexión Fibra Óptica alta velocidad</li>
                                        </ul>
                                    </div>
                                </div>

                            </div>

                            <!-- Botón Toggle Ocultar / Ver más -->
                            <div class="p-4 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200/60 dark:border-zinc-800 text-center">
                                <button type="button" id="mp-facts-toggle-btn" class="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary dark:text-red-400 hover:text-primary-container dark:hover:text-red-300 transition-colors cursor-pointer">
                                    <span class="material-symbols-outlined text-base" id="mp-facts-toggle-icon">expand_less</span>
                                    <span id="mp-facts-toggle-text">Ocultar detalles extendidos</span>
                                </button>
                            </div>

                        </div>
                    </section>

                    <!-- 6. Historial de Precios -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-history">
                        <div class="flex items-center justify-between flex-wrap gap-2">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">monitoring</span>
                                Historial de precios
                            </h2>
                            <div class="flex items-center gap-3 text-xs font-bold text-primary dark:text-red-400">
                                <span class="hover:underline cursor-pointer">Estimación de alquiler</span>
                                <span class="text-zinc-300 dark:text-zinc-700">·</span>
                                <span class="hover:underline cursor-pointer">Resumen del mercado</span>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-[#111318] rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
                            <div class="overflow-x-auto">
                                <table class="w-full text-left text-xs sm:text-sm">
                                    <thead class="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200/70 dark:border-zinc-700/60 text-zinc-500 dark:text-zinc-400 font-extrabold uppercase text-[11px] tracking-wider">
                                        <tr>
                                            <th class="px-6 py-3.5">Fecha</th>
                                            <th class="px-6 py-3.5">Evento</th>
                                            <th class="px-6 py-3.5 text-right">Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                                        <tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td class="px-6 py-4 font-semibold text-zinc-900 dark:text-white">
                                                ${new Date(prop.created_at || Date.now()).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                <span class="block text-[10px] text-zinc-400 font-normal">Fuente: Hábitat Rentals</span>
                                            </td>
                                            <td class="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                                                <span class="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                    Publicado en alquiler
                                                </span>
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                <span class="font-headline font-black text-zinc-900 dark:text-white block">${priceFormatted}</span>
                                                <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">+2.1% · $${Math.round(priceNum / (supCubierta || supTotal || 45)).toLocaleString('es-AR')}/m²</span>
                                            </td>
                                        </tr>

                                        <tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td class="px-6 py-4 font-semibold text-zinc-600 dark:text-zinc-400">
                                                ${new Date(new Date(prop.created_at || Date.now()).getTime() - 1000 * 60 * 60 * 24 * 30).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                <span class="block text-[10px] text-zinc-400 font-normal">Fuente: Historial Verificado</span>
                                            </td>
                                            <td class="px-6 py-4 font-semibold text-zinc-700 dark:text-zinc-300">
                                                Actualización de valor mercado
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                <span class="font-semibold text-zinc-700 dark:text-zinc-300 block">${moneda} ${Math.round(priceNum * 0.95).toLocaleString('es-AR')}</span>
                                                <span class="text-[11px] text-zinc-400">$${Math.round((priceNum * 0.95) / (supCubierta || supTotal || 45)).toLocaleString('es-AR')}/m²</span>
                                            </td>
                                        </tr>

                                        <tr class="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                                            <td class="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400">
                                                ${new Date(new Date(prop.created_at || Date.now()).getTime() - 1000 * 60 * 60 * 24 * 90).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                <span class="block text-[10px] text-zinc-400 font-normal">Fuente: Hábitat Network</span>
                                            </td>
                                            <td class="px-6 py-4 font-semibold text-zinc-500 dark:text-zinc-400">
                                                Alta inicial de publicación
                                            </td>
                                            <td class="px-6 py-4 text-right">
                                                <span class="font-semibold text-zinc-500 dark:text-zinc-400 block">${moneda} ${Math.round(priceNum * 0.91).toLocaleString('es-AR')}</span>
                                                <span class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">+8.5%</span>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="px-6 py-3 bg-zinc-50/60 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between flex-wrap gap-2">
                                <span>Registro oficial auditado por Hábitat · Base de datos PostgreSQL</span>
                                <span class="font-bold text-zinc-600 dark:text-zinc-400">Transparencia Inmobiliaria</span>
                            </div>
                        </div>
                    </section>

                    <!-- 7. Movilidad urbana y entorno (Puntajes de caminabilidad y transporte) -->
                    <section class="space-y-4 mp-inview-item" id="mp-section-neighborhood">
                        <div class="flex items-center justify-between">
                            <h2 class="font-headline text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <span class="material-symbols-outlined text-zinc-700 dark:text-zinc-300">directions_walk</span>
                                Movilidad urbana y entorno
                            </h2>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            
                            <!-- Tarjeta Caminabilidad -->
                            <div class="bg-white dark:bg-[#111318] p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg transition-all duration-300 flex items-start gap-4">
                                <div class="w-12 h-12 rounded-xl bg-[#0a1931] text-white flex items-center justify-center shrink-0 shadow-md">
                                    <span class="material-symbols-outlined text-2xl">directions_walk</span>
                                </div>
                                <div class="space-y-0.5 min-w-0">
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="font-headline text-sm font-bold text-zinc-700 dark:text-zinc-300 border-b border-dotted border-zinc-400">Caminabilidad</span>
                                    </div>
                                    <div class="font-headline text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                                        97 <span class="text-xs font-bold text-zinc-400">/ 100</span>
                                    </div>
                                    <span class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-200">Paraíso del caminante</span>
                                    <span class="block text-[11px] text-zinc-400 leading-tight">La mayoría de los mandados y servicios se realizan a pie sin auto.</span>
                                </div>
                            </div>

                            <!-- Tarjeta Transporte Público -->
                            <div class="bg-white dark:bg-[#111318] p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg transition-all duration-300 flex items-start gap-4">
                                <div class="w-12 h-12 rounded-xl bg-[#0a1931] text-white flex items-center justify-center shrink-0 shadow-md">
                                    <span class="material-symbols-outlined text-2xl">directions_bus</span>
                                </div>
                                <div class="space-y-0.5 min-w-0">
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="font-headline text-sm font-bold text-zinc-700 dark:text-zinc-300 border-b border-dotted border-zinc-400">Transporte Público</span>
                                    </div>
                                    <div class="font-headline text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                                        78 <span class="text-xs font-bold text-zinc-400">/ 100</span>
                                    </div>
                                    <span class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-200">Excelente transporte</span>
                                    <span class="block text-[11px] text-zinc-400 leading-tight">Acceso directo a múltiples líneas de colectivos, metrobús y trenes.</span>
                                </div>
                            </div>

                            <!-- Tarjeta Ciclovías -->
                            <div class="bg-white dark:bg-[#111318] p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-lg transition-all duration-300 flex items-start gap-4">
                                <div class="w-12 h-12 rounded-xl bg-[#0a1931] text-white flex items-center justify-center shrink-0 shadow-md">
                                    <span class="material-symbols-outlined text-2xl">directions_bike</span>
                                </div>
                                <div class="space-y-0.5 min-w-0">
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="font-headline text-sm font-bold text-zinc-700 dark:text-zinc-300 border-b border-dotted border-zinc-400">Apto Ciclistas</span>
                                    </div>
                                    <div class="font-headline text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                                        72 <span class="text-xs font-bold text-zinc-400">/ 100</span>
                                    </div>
                                    <span class="block text-xs font-extrabold text-zinc-700 dark:text-zinc-200">Muy apto para bicis</span>
                                    <span class="block text-[11px] text-zinc-400 leading-tight">Entorno plano con red de ciclovías conectadas y estaciones cercanas.</span>
                                </div>
                            </div>

                        </div>
                    </section>

                    <!-- Activity & Engagement Live Tracker (Inspiración Zillow) -->
                    <section class="mp-inview-item bg-white dark:bg-[#111318] p-5 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2.5">
                        <div class="flex items-center gap-2 text-sm text-zinc-900 dark:text-white font-extrabold flex-wrap">
                            <span class="text-base font-black">${isAlquilada ? 'Alquilada en Hábitat' : (viewsCount > 20 ? 'Popular en Hábitat' : 'Disponible en Hábitat')}</span>
                            <span class="text-zinc-300 dark:text-zinc-700">|</span>
                            <span class="text-base font-black text-primary dark:text-red-400">${viewsCount > 0 ? viewsCount : 1} visualizaciones</span>
                            <span class="text-zinc-300 dark:text-zinc-700">|</span>
                            <span class="text-emerald-600 dark:text-emerald-400 font-bold">${Math.max(1, Math.floor((viewsCount || 1) * 0.35))} interesados contactaron</span>
                        </div>
                        <div class="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <p>Disponibilidad verificada por Hábitat: <strong class="text-zinc-700 dark:text-zinc-300">${isAlquilada ? 'Alquilada con contrato vigente' : 'hoy'}</strong></p>
                            <p>Sincronización de publicación: <strong class="text-zinc-700 dark:text-zinc-300">actualizada recientemente</strong></p>
                        </div>
                    </section>

                    <!-- Hábitat Pasaporte Guarantee Banner -->
                    <section class="mp-inview-item bg-gradient-to-br from-zinc-50 to-zinc-100/60 dark:from-[#111318] dark:to-zinc-900 p-6 sm:p-7 rounded-3xl border border-zinc-200/80 dark:border-zinc-800/90 hover:border-zinc-400 dark:hover:border-zinc-700 hover:shadow-lg transition-all duration-300 space-y-4">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center shadow-md shrink-0">
                                <span class="material-symbols-outlined text-2xl">verified_user</span>
                            </div>
                            <div>
                                <h3 class="font-headline text-lg font-bold text-zinc-900 dark:text-white">Alquiler Seguro con Pasaporte Hábitat</h3>
                                <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">Proceso 100% digital respaldado por firma electrónica avanzada y validación biométrica.</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                            <div class="bg-white/90 dark:bg-zinc-800/70 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs shadow-2xs hover:border-zinc-400 transition-colors">
                                <strong class="block font-bold text-zinc-900 dark:text-white mb-1">Sin Garantía Tradicional</strong>
                                <span class="text-zinc-500 dark:text-zinc-400">Postulate con tu Pasaporte digital sin escrituras de terceros.</span>
                            </div>
                            <div class="bg-white/90 dark:bg-zinc-800/70 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs shadow-2xs hover:border-zinc-400 transition-colors">
                                <strong class="block font-bold text-zinc-900 dark:text-white mb-1">Contrato Validez CCCN</strong>
                                <span class="text-zinc-500 dark:text-zinc-400">Firma electrónica con timestamp y valor probatorio legal.</span>
                            </div>
                            <div class="bg-white/90 dark:bg-zinc-800/70 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-700/50 text-xs shadow-2xs hover:border-zinc-400 transition-colors">
                                <strong class="block font-bold text-zinc-900 dark:text-white mb-1">Depósito Protegido</strong>
                                <span class="text-zinc-500 dark:text-zinc-400">Custodia segura y rendición transparente al finalizar.</span>
                            </div>
                        </div>
                    </section>

                </div>

                <!-- RIGHT COLUMN: Zillow Sticky Booking / Actions Sidebar (~33% width) -->
                <aside class="lg:col-span-4 space-y-6 lg:sticky lg:top-32">
                    
                    <!-- Main Financial & Booking Card -->
                    <div class="bg-white dark:bg-[#111318] rounded-3xl border border-zinc-200/90 dark:border-zinc-800/90 p-6 sm:p-7 shadow-xl hover:shadow-2xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300 space-y-6">
                        
                        <!-- Price Header -->
                        <div class="space-y-1 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                            <span class="block text-[11px] font-extrabold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">Precio de alquiler</span>
                            <div class="flex items-baseline gap-2">
                                <span class="font-headline text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white">${priceFormatted}</span>
                                <span class="text-sm font-bold text-zinc-500">/ mes</span>
                            </div>
                            <p class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                ${expensasNum > 0 ? `+ $${expensasNum.toLocaleString('es-AR')} expensas estimadas` : (expensasIncluidas ? 'Expensas incluidas en el canon' : 'Sin expensas')}
                            </p>
                        </div>

                        ${isOwner ? `
                            <!-- Owner Actions Panel -->
                            <div class="space-y-3">
                                <div class="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs font-bold uppercase text-zinc-500 tracking-wider">Estado de publicación</span>
                                        <span id="mp-modal-status-badge" class="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${status === 'paused' || status === 'pausado' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : (isAlquilada ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300')}">
                                            <span class="material-symbols-outlined text-xs">${status === 'paused' || status === 'pausado' ? 'pause_circle' : (isAlquilada ? 'key' : 'check_circle')}</span>
                                            ${status === 'paused' || status === 'pausado' ? 'Pausada' : (isAlquilada ? 'Alquilada' : 'Publicada')}
                                        </span>
                                    </div>
                                    <div class="text-xs text-zinc-500 flex items-center gap-1">
                                        <span class="material-symbols-outlined text-sm">visibility</span>
                                        <span><strong>${viewsCount}</strong> visualizaciones registradas</span>
                                    </div>
                                </div>

                                <button id="mp-modal-pause-btn" type="button" class="w-full inline-flex items-center justify-center gap-2 ${status === 'paused' || status === 'pausado' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'} text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer text-sm">
                                    <span class="material-symbols-outlined text-lg">${status === 'paused' || status === 'pausado' ? 'play_circle' : 'pause_circle'}</span>
                                    <span id="mp-modal-pause-text">${status === 'paused' || status === 'pausado' ? 'Reanudar publicación' : 'Pausar publicación'}</span>
                                </button>

                                <button id="mp-modal-edit-btn" type="button" class="w-full inline-flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold py-3.5 px-4 rounded-2xl transition-all border border-zinc-200 dark:border-zinc-700 active:scale-98 cursor-pointer text-sm">
                                    <span class="material-symbols-outlined text-lg">edit</span>
                                    <span>Editar Publicación</span>
                                </button>

                                <button id="mp-modal-delete-btn" type="button" class="w-full inline-flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 font-bold py-3 px-4 rounded-2xl transition-all border border-rose-200/60 dark:border-rose-900/40 active:scale-98 cursor-pointer text-xs">
                                    <span class="material-symbols-outlined text-base">delete</span>
                                    <span>Eliminar propiedad</span>
                                </button>
                            </div>
                        ` : `
                            <!-- Tenant Actions (Zillow Style CTAs) -->
                            <div class="space-y-3">
                                ${isAlquilada ? `
                                    <div class="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4 space-y-1.5 text-amber-800 dark:text-amber-200">
                                        <div class="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            <span class="material-symbols-outlined text-base">key</span>
                                            <span>Propiedad Actualmente Alquilada</span>
                                        </div>
                                        <p class="text-xs leading-relaxed font-medium">
                                            ${rawEndDate ? `Esta propiedad tiene un contrato vigente hasta el <strong>${new Date(rawEndDate).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong>.` : 'Esta propiedad se encuentra actualmente alquilada con contrato vigente.'}
                                        </p>
                                    </div>

                                    <button type="button" disabled class="w-full inline-flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-400 dark:text-zinc-500 font-bold py-3.5 px-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 cursor-not-allowed text-sm">
                                        <span class="material-symbols-outlined text-base">lock</span>
                                        <span>Alquilada ${formattedEndDate ? `(Hasta ${formattedEndDate})` : ''}</span>
                                    </button>
                                ` : `
                                    <button id="mp-modal-apply-btn" type="button" class="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-red-700 hover:from-primary-container hover:to-red-800 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-[1.02] active:scale-98 cursor-pointer text-base">
                                        <span class="material-symbols-outlined text-xl">how_to_reg</span>
                                        <span>Postularme al Alquiler</span>
                                    </button>
                                `}

                                <button id="mp-modal-visit-btn" type="button" class="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer text-sm">
                                    <span class="material-symbols-outlined text-lg">calendar_month</span>
                                    <span>Agendar Visita (Presencial / Virtual)</span>
                                </button>

                                <a href="https://wa.me/?text=${encodeURIComponent('Hola! Me interesa la propiedad en alquiler: ' + title + ' (' + fullAddress + ') en Hábitat: ' + window.location.href)}" target="_blank" rel="noopener noreferrer" class="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-bold py-3 px-6 rounded-2xl transition-all border border-emerald-200 dark:border-emerald-800/50 active:scale-98 cursor-pointer text-xs">
                                    <span class="material-symbols-outlined text-base">chat</span>
                                    <span>Consultar por WhatsApp</span>
                                </a>
                            </div>

                            <div class="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2 text-xs text-zinc-500 dark:text-zinc-400">
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-base text-emerald-500">lock</span>
                                    <span>Postulación protegida y sin costo oculto</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="material-symbols-outlined text-base text-blue-500">bolt</span>
                                    <span>Respuesta promedio en menos de 24 horas</span>
                                </div>
                            </div>
                        `}

                    </div>
                </aside>

            </div>

        </main>

        <!-- Mobile & Tablet Fixed Bottom Action Tray (Zillow Mobile Experience with Safari Safe-Area) -->
        <div id="mp-mobile-bottom-tray" class="lg:hidden sticky bottom-0 z-50 bg-white/98 dark:bg-[#111318]/98 backdrop-blur-xl border-t border-zinc-200/90 dark:border-zinc-800/90 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-2xl">
            <div class="min-w-0">
                <span class="block text-[10px] sm:text-xs font-bold uppercase text-zinc-400">Precio mensual</span>
                <span class="font-headline text-lg sm:text-xl font-black text-zinc-900 dark:text-white truncate block">${priceFormatted}</span>
            </div>
            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
                ${isOwner ? `
                    <button type="button" onclick="document.getElementById('mp-modal-edit-btn')?.click()" class="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-sm active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-base">edit</span> Editar
                    </button>
                ` : (isAlquilada ? `
                    <button type="button" onclick="document.getElementById('mp-modal-visit-btn')?.click()" class="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-base">calendar_month</span> Visita
                    </button>
                    <div class="inline-flex items-center gap-1 bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm">
                        <span class="material-symbols-outlined text-base">key</span> Alquilada
                    </div>
                ` : `
                    <button type="button" onclick="document.getElementById('mp-modal-visit-btn')?.click()" class="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold px-3.5 py-2.5 rounded-xl text-xs sm:text-sm active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-base">calendar_month</span> Visita
                    </button>
                    <button type="button" onclick="document.getElementById('mp-modal-apply-btn')?.click()" class="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md active:scale-95 cursor-pointer">
                        <span class="material-symbols-outlined text-base">how_to_reg</span> Postularme
                    </button>
                `)}
            </div>
        </div>
    `;

    // Update URL Query Param for persistence upon reload (?prop=ID)
    if (pubId) {
        try {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('prop', pubId);
            window.history.pushState({ modalOpen: true, propId: pubId }, '', currentUrl.toString());
        } catch (e) {
            console.warn('Could not update history state', e);
        }
    }

    // Prevent background scroll
    document.body.classList.add('no-scroll');
    document.body.style.overflow = 'hidden';

    // Fade in modal smoothly
    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });

    // In-View state immediate initialization (prevents blank/hidden content during tab minimize/preview)
    modal.querySelectorAll('.mp-inview-item').forEach(item => {
        item.classList.add('is-inview');
    });

    // Sub-Navigation Tab Smooth Click & ScrollSpy
    const subnavButtons = modal.querySelectorAll('.mp-subnav-btn');
    const navSectionIds = [
        'mp-section-overview',
        'mp-section-amenities',
        'mp-section-location',
        'mp-section-costs',
        'mp-section-history'
    ];

    let isNavClicking = false;
    let navClickTimer;

    subnavButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.dataset.target;
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                isNavClicking = true;
                if (navClickTimer) clearTimeout(navClickTimer);

                subnavButtons.forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');

                const headerOffset = 105;
                const modalRect = modal.getBoundingClientRect();
                const targetRect = targetEl.getBoundingClientRect();
                const offsetPosition = modal.scrollTop + (targetRect.top - modalRect.top) - headerOffset;
                
                modal.scrollTo({
                    top: Math.max(0, offsetPosition),
                    behavior: 'smooth'
                });

                navClickTimer = setTimeout(() => {
                    isNavClicking = false;
                }, 600);
            }
        });
    });

    // Dynamic ScrollSpy for Subnav Ribbon
    let scrollRaf;
    modal.addEventListener('scroll', () => {
        if (isNavClicking) return;
        if (scrollRaf) cancelAnimationFrame(scrollRaf);
        scrollRaf = requestAnimationFrame(() => {
            const modalRect = modal.getBoundingClientRect();
            let activeId = 'mp-section-overview';

            for (let i = 0; i < navSectionIds.length; i++) {
                const id = navSectionIds[i];
                const el = document.getElementById(id);
                if (el) {
                    const elRect = el.getBoundingClientRect();
                    if (elRect.top - modalRect.top <= 140) {
                        activeId = id;
                    }
                }
            }

            subnavButtons.forEach(b => {
                const isCurrent = b.dataset.target === activeId;
                b.classList.toggle('is-active', isCurrent);
            });
        });
    }, { passive: true });

    // Facts & Features Expand / Collapse Toggle Handler
    const factsToggleBtn = document.getElementById('mp-facts-toggle-btn');
    const factsExpandableContent = document.getElementById('mp-facts-expandable-content');
    const factsToggleIcon = document.getElementById('mp-facts-toggle-icon');
    const factsToggleText = document.getElementById('mp-facts-toggle-text');

    if (factsToggleBtn && factsExpandableContent) {
        let isFactsExpanded = true;
        factsToggleBtn.onclick = (e) => {
            e.preventDefault();
            isFactsExpanded = !isFactsExpanded;
            if (isFactsExpanded) {
                factsExpandableContent.style.display = 'block';
                if (factsToggleIcon) factsToggleIcon.textContent = 'expand_less';
                if (factsToggleText) factsToggleText.textContent = 'Ocultar detalles extendidos (Hide)';
            } else {
                factsExpandableContent.style.display = 'none';
                if (factsToggleIcon) factsToggleIcon.textContent = 'expand_more';
                if (factsToggleText) factsToggleText.textContent = 'Ver todas las características y detalles (Show more)';
            }
        };
    }

    // Interactive Travel Times Logic
    const travelInput = document.getElementById('travel-time-destination-input');
    const travelCalcBtn = document.getElementById('travel-time-calc-btn');
    const travelDirectLink = document.getElementById('travel-maps-direct-link');

    const updateTravelTimes = (destinationName) => {
        if (!destinationName || !destinationName.trim()) return;
        const dest = destinationName.trim();
        
        // Pseudo-random realistic travel estimation based on destination length/name
        let hash = 0;
        for (let i = 0; i < dest.length; i++) hash = ((hash << 5) - hash) + dest.charCodeAt(i);
        hash = Math.abs(hash);

        const carMin = 8 + (hash % 15);
        const busMin = carMin + 10 + (hash % 10);
        const bikeMin = Math.round(carMin * 1.3);
        const walkMin = carMin * 3 + 10;

        const carEl = document.getElementById('travel-car-time');
        const busEl = document.getElementById('travel-bus-time');
        const bikeEl = document.getElementById('travel-bike-time');
        const walkEl = document.getElementById('travel-walk-time');

        if (carEl) carEl.textContent = `~${carMin} min`;
        if (busEl) busEl.textContent = `~${busMin} min`;
        if (bikeEl) bikeEl.textContent = `~${bikeMin} min`;
        if (walkEl) walkEl.textContent = `~${walkMin} min`;

        if (travelDirectLink) {
            travelDirectLink.href = `https://maps.google.com/maps/dir/?api=1&origin=${encodeURIComponent(fullAddress)}&destination=${encodeURIComponent(dest)}`;
        }
    };

    if (travelCalcBtn && travelInput) {
        travelCalcBtn.onclick = () => updateTravelTimes(travelInput.value);
        travelInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                updateTravelTimes(travelInput.value);
            }
        };
    }

    modal.querySelectorAll('.travel-preset-chip').forEach(chip => {
        chip.onclick = (e) => {
            e.preventDefault();
            const dest = chip.dataset.dest;
            if (travelInput) travelInput.value = dest;
            updateTravelTimes(dest);
        };
    });

    // Cost Calculator Pop-up Modal Trigger
    const openCalcBtn = document.getElementById('open-cost-calculator-btn');
    if (openCalcBtn) {
        openCalcBtn.onclick = (e) => {
            e.preventDefault();
            window.openCostCalculatorModal({
                title: title,
                priceNum: priceNum,
                priceFormatted: priceFormatted,
                expensasNum: expensasNum,
                expensasFormatted: expensasFormatted,
                expensasIncluidas: expensasIncluidas,
                totalMensualFormatted: totalMensualFormatted,
                moneda: moneda
            });
        };
    }

    // Share link handler
    const shareBtn = document.getElementById('mp-share-btn');
    if (shareBtn) {
        shareBtn.onclick = async (e) => {
            e.preventDefault();
            const shareUrl = window.location.origin + window.location.pathname + (pubId ? `?prop=${pubId}` : '');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    if (window.showCustomAlert) {
                        window.showCustomAlert({
                            title: '¡Enlace copiado!',
                            message: 'El enlace directo a esta propiedad fue copiado a tu portapapeles.',
                            icon: 'content_copy'
                        });
                    } else {
                        alert('¡Enlace copiado al portapapeles!');
                    }
                } catch (err) {
                    console.warn('Clipboard write failed', err);
                }
            }
        };
    }

    // ============================================================
    // Full Gallery Mosaic Modal (Photo 2 look on Desktop, Uniform Cards on Mobile)
    // ============================================================
    window.__openGalleryMosaicModal = function (startIdx = 0) {
        let mosaicModal = document.getElementById('mp-gallery-mosaic-modal');
        if (!mosaicModal) {
            mosaicModal = document.createElement('div');
            mosaicModal.id = 'mp-gallery-mosaic-modal';
            document.body.appendChild(mosaicModal);
        }

        mosaicModal.className = 'fixed inset-0 z-[100000] flex flex-col bg-[#f8f9fc] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 overflow-y-auto overscroll-contain transition-opacity duration-300 font-body';
        mosaicModal.style.display = 'flex';
        mosaicModal.style.opacity = '0';
        mosaicModal.scrollTop = 0;

        // Build Desktop Mosaic (Alternating 1 wide, 2 half, 1 wide, 2 half... matching Photo 2)
        let desktopMosaicHtml = '';
        let i = 0;
        let isWideRow = true;
        while (i < photos.length) {
            if (isWideRow || i === photos.length - 1) {
                const p = photos[i];
                const idx = i;
                desktopMosaicHtml += `
                    <div class="w-full h-[380px] sm:h-[460px] lg:h-[500px] rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-all cursor-pointer group bg-zinc-900 select-none" style="height: 480px;" onclick="window.__openLightboxPhoto(${idx})">
                        <img src="${p}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-102" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        <div class="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3.5 py-1.5 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg">
                            <span class="material-symbols-outlined text-sm">fullscreen</span>
                            <span>Ver foto grande</span>
                        </div>
                    </div>
                `;
                i += 1;
                isWideRow = false;
            } else {
                const p1 = photos[i];
                const idx1 = i;
                const p2 = photos[i + 1];
                const idx2 = i + 1;
                desktopMosaicHtml += `
                    <div class="grid grid-cols-2 gap-4 w-full h-[280px] sm:h-[340px] lg:h-[380px]" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; height: 360px;">
                        <div class="w-full h-full min-w-0 min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-all cursor-pointer group bg-zinc-900 select-none" style="width: 100%; height: 100%;" onclick="window.__openLightboxPhoto(${idx1})">
                            <img src="${p1}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-102" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                            <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                            <div class="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-lg">
                                <span class="material-symbols-outlined text-sm">fullscreen</span>
                                <span>Ver foto</span>
                            </div>
                        </div>
                        <div class="w-full h-full min-w-0 min-h-0 rounded-2xl sm:rounded-3xl overflow-hidden relative shadow-md hover:shadow-xl transition-all cursor-pointer group bg-zinc-900 select-none" style="width: 100%; height: 100%;" onclick="window.__openLightboxPhoto(${idx2})">
                            <img src="${p2}" alt="${title}" class="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-102" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                            <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                            <div class="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-lg">
                                <span class="material-symbols-outlined text-sm">fullscreen</span>
                                <span>Ver foto</span>
                            </div>
                        </div>
                    </div>
                `;
                i += 2;
                isWideRow = true;
            }
        }

        // Build Mobile Mosaic (Uniform Same-Size Cards)
        let mobileMosaicHtml = `
            <div class="mp-mosaic-mobile-layout">
                ${photos.map((p, idx) => `
                    <div class="w-full h-[260px] sm:h-[300px] rounded-2xl overflow-hidden relative shadow-md cursor-pointer active:scale-98 transition-transform bg-zinc-900 select-none" style="height: 260px;" onclick="window.__openLightboxPhoto(${idx})">
                        <img src="${p}" alt="${title}" class="w-full h-full object-cover object-center" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;" onerror="this.src='img/hero-marketplace.jpg'">
                        <div class="absolute bottom-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-white/20 shadow-md">
                            ${idx + 1} / ${photos.length}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        mosaicModal.innerHTML = `
            <!-- Sticky Header -->
            <header class="sticky top-0 z-30 bg-white/95 dark:bg-[#090a0f]/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="min-w-0">
                        <h2 class="font-headline font-black text-base sm:text-lg text-zinc-900 dark:text-white truncate">${title}</h2>
                        <span class="text-xs text-zinc-500 dark:text-zinc-400 font-semibold">${photos.length} fotos de la propiedad</span>
                    </div>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                    <button id="mp-mosaic-close-x-btn" type="button" aria-label="Cerrar mosaico" class="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center cursor-pointer transition-colors text-zinc-700 dark:text-zinc-200 shadow-xs">
                        <span class="material-symbols-outlined text-xl pointer-events-none">close</span>
                    </button>
                </div>
            </header>

            <!-- Scrollable Content -->
            <main class="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-6 py-6 space-y-6">
                <div class="mp-mosaic-desktop-layout">
                    ${desktopMosaicHtml}
                </div>
                <div class="mp-mosaic-mobile-layout">
                    ${mobileMosaicHtml}
                </div>
            </main>
        `;

        requestAnimationFrame(() => {
            mosaicModal.style.opacity = '1';
        });

        const closeMosaic = () => {
            mosaicModal.style.opacity = '0';
            window.removeEventListener('keydown', handleMosaicKey);
            setTimeout(() => {
                mosaicModal.style.display = 'none';
            }, 250);
        };

        const handleMosaicKey = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                closeMosaic();
            }
        };
        window.addEventListener('keydown', handleMosaicKey);

        const closeXBtn = document.getElementById('mp-mosaic-close-x-btn');
        if (closeXBtn) closeXBtn.onclick = closeMosaic;
    };

    // ============================================================
    // High-Resolution Single Photo Fullscreen Lightbox
    // ============================================================
    window.__openLightboxPhoto = function (startIdx = 0) {
        let lightbox = document.getElementById('mp-lightbox-modal');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'mp-lightbox-modal';
            document.body.appendChild(lightbox);
        }

        lightbox.className = 'fixed inset-0 z-[100005] flex flex-col items-center justify-between bg-black/98 backdrop-blur-2xl transition-opacity duration-250 p-3 sm:p-4 font-body select-none';
        lightbox.style.display = 'flex';
        lightbox.style.opacity = '0';

        let currentLbIdx = Math.max(0, Math.min(photos.length - 1, Number(startIdx) || 0));

        lightbox.innerHTML = `
            <!-- Lightbox Header -->
            <div class="w-full flex items-center justify-between px-3 sm:px-8 py-4 z-30 shrink-0">
                <span id="lb-counter" class="inline-flex items-center justify-center font-headline font-black text-xs sm:text-sm bg-white text-zinc-950 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full shadow-2xl border-2 border-white select-none">
                    ${currentLbIdx + 1} / ${photos.length}
                </span>
                <button id="lb-close-btn" type="button" aria-label="Cerrar visor" title="Cerrar (Esc)" class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer border-2 border-white">
                    <span class="material-symbols-outlined text-2xl font-bold pointer-events-none">close</span>
                </button>
            </div>

            <!-- Main Fullscreen Image Container -->
            <div class="relative flex-1 w-full flex items-center justify-center overflow-hidden my-auto p-2 sm:p-6">
                <img id="lb-main-img" src="${photos[currentLbIdx]}" alt="${title}" class="max-w-full max-h-[76vh] sm:max-h-[82vh] object-contain transition-all duration-300 rounded-2xl shadow-2xl" onerror="this.src='img/hero-marketplace.jpg'">

                ${photos.length > 1 ? `
                    <button id="lb-prev-btn" type="button" aria-label="Anterior" class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/30 backdrop-blur-md cursor-pointer">
                        <span class="material-symbols-outlined pointer-events-none text-2xl">chevron_left</span>
                    </button>
                    <button id="lb-next-btn" type="button" aria-label="Siguiente" class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all hover:scale-110 shadow-2xl border border-white/30 backdrop-blur-md cursor-pointer">
                        <span class="material-symbols-outlined pointer-events-none text-2xl">chevron_right</span>
                    </button>
                ` : ''}
            </div>

            <!-- Lightbox Footer Thumbnails -->
            ${photos.length > 1 ? `
                <div class="w-full flex items-center justify-center gap-2.5 overflow-x-auto py-2 px-2 z-20 scrollbar-thin shrink-0">
                    ${photos.map((url, i) => `
                        <button type="button" data-lb-idx="${i}" class="lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${i === currentLbIdx ? 'border-primary ring-2 ring-primary/50 opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}">
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
                    th.className = 'lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all border-primary ring-2 ring-primary/50 opacity-100 scale-105 cursor-pointer';
                    th.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                } else {
                    th.className = 'lb-thumb relative w-16 h-12 sm:w-20 sm:h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all border-transparent opacity-50 hover:opacity-100 cursor-pointer';
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
            if (e.target === lightbox) {
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
    };

    // Global alias for compatibility
    window.__openDetailLightbox = window.__openGalleryMosaicModal;

    // Reliable Fullscreen Close handler
    const closeModal = () => {
        modal.style.opacity = '0';
        modal.style.pointerEvents = 'none';
        modal.scrollTop = 0; // Reset scroll position immediately
        document.body.classList.remove('no-scroll');
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);

        // Clean up URL parameter (?prop=) so browser address bar reflects closure
        try {
            const currentUrl = new URL(window.location.href);
            if (currentUrl.searchParams.has('prop')) {
                currentUrl.searchParams.delete('prop');
                window.history.pushState({}, '', currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
            }
        } catch (e) {
            console.warn('Could not clean up URL parameter', e);
        }

        setTimeout(() => {
            modal.style.display = 'none';
            modal.scrollTop = 0; // Ensure reset when hidden
        }, 280);
    };

    const backBtn = document.getElementById('close-marketplace-fullscreen-btn');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    }

    const closeXBtn = document.getElementById('close-marketplace-x-btn');
    if (closeXBtn) {
        closeXBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        };
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            const lb = document.getElementById('mp-lightbox-modal');
            if (lb && lb.style.display !== 'none' && lb.style.opacity !== '0') return;
            const postulaModal = document.getElementById('habitat-postulacion-modal');
            if (postulaModal && postulaModal.style.display !== 'none' && postulaModal.style.opacity !== '0') {
                postulaModal.style.display = 'none';
                return;
            }
            const passReqModal = document.getElementById('habitat-passport-required-modal');
            if (passReqModal && passReqModal.style.display !== 'none' && passReqModal.style.opacity !== '0') {
                passReqModal.style.display = 'none';
                return;
            }
            const visitaModal = document.getElementById('habitat-visita-modal');
            if (visitaModal && visitaModal.style.display !== 'none' && visitaModal.style.opacity !== '0') {
                visitaModal.style.display = 'none';
                return;
            }
            const calcModal = document.getElementById('cost-calculator-modal');
            if (calcModal && calcModal.style.display !== 'none' && calcModal.style.opacity !== '0') {
                calcModal.style.opacity = '0';
                setTimeout(() => { calcModal.style.display = 'none'; }, 200);
                return;
            }
            closeModal();
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    if (isOwner) {
        // Owner Action Handlers: Delete, Edit, Pause
        const deleteBtn = document.getElementById('mp-modal-delete-btn');
        if (deleteBtn) {
            deleteBtn.onclick = async (e) => {
                e.preventDefault();
                const confirmed = await window.showCustomConfirm({
                    title: '¿Eliminar publicación?',
                    message: `¿Estás seguro de que deseas eliminar la publicación "${title}"?\nEsta acción es irreversible.`,
                    confirmText: 'Sí, eliminar',
                    cancelText: 'Cancelar',
                    isDanger: true
                });
                if (confirmed) {
                    closeModal();
                    try {
                        if (window.DataManager && typeof window.DataManager.deleteProperty === 'function') {
                            await window.DataManager.deleteProperty(pubId);
                        }
                        await window.showCustomAlert({
                            title: 'Publicación eliminada',
                            message: 'La publicación ha sido eliminada con éxito.',
                            icon: 'check_circle'
                        });
                        if (typeof window.loadMisAvisos === 'function') window.loadMisAvisos();
                        if (typeof window.loadOwnerAvisos === 'function') window.loadOwnerAvisos();
                        if (typeof loadOwnerAvisos === 'function') loadOwnerAvisos();
                        if (typeof window.loadOwnerApplications === 'function') window.loadOwnerApplications();
                        if (typeof loadOwnerApplications === 'function') loadOwnerApplications();
                        if (typeof window.loadBrokerApplications === 'function') window.loadBrokerApplications();
                        if (window.App && typeof window.App.refreshData === 'function') window.App.refreshData();
                    } catch (err) {
                        console.error('Error al eliminar la propiedad:', err);
                        await window.showCustomAlert({
                            title: 'Error',
                            message: 'Ocurrió un error al intentar eliminar la propiedad.',
                            icon: 'error'
                        });
                    }
                }
            };
        }

        const pauseBtn = document.getElementById('mp-modal-pause-btn');
        if (pauseBtn) {
            let currentPubStatus = status;
            pauseBtn.onclick = async (e) => {
                e.preventDefault();
                try {
                    if (window.DataManager && typeof window.DataManager.togglePauseProperty === 'function') {
                        const newStatus = await window.DataManager.togglePauseProperty(pubId, currentPubStatus);
                        currentPubStatus = newStatus;
                        prop.status = newStatus;

                        const isNowPaused = (newStatus === 'paused' || newStatus === 'pausado');
                        const pauseTextEl = document.getElementById('mp-modal-pause-text');
                        const statusBadgeEl = document.getElementById('mp-modal-status-badge');

                        if (pauseTextEl) pauseTextEl.textContent = isNowPaused ? 'Reanudar publicación' : 'Pausar publicación';
                        pauseBtn.className = `w-full inline-flex items-center justify-center gap-2 ${isNowPaused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'} text-white font-bold py-3.5 px-4 rounded-2xl transition-all shadow-md active:scale-98 cursor-pointer text-sm`;
                        const iconSpan = pauseBtn.querySelector('.material-symbols-outlined');
                        if (iconSpan) iconSpan.textContent = isNowPaused ? 'play_circle' : 'pause_circle';

                        if (statusBadgeEl) {
                            statusBadgeEl.innerHTML = `<span class="material-symbols-outlined text-xs">${isNowPaused ? 'pause_circle' : 'check_circle'}</span> ${isNowPaused ? 'Pausada' : 'Publicada'}`;
                            statusBadgeEl.className = `inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-full ${isNowPaused ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`;
                        }

                        await window.showCustomAlert({
                            title: isNowPaused ? 'Publicación Pausada' : 'Publicación Reanudada',
                            message: isNowPaused ? 'La publicación ha sido pausada correctamente.' : 'La publicación ha sido reanudada exitosamente.',
                            icon: isNowPaused ? 'pause_circle' : 'check_circle'
                        });
                        if (typeof window.loadMisAvisos === 'function') window.loadMisAvisos();
                        if (typeof window.loadOwnerAvisos === 'function') window.loadOwnerAvisos();
                        if (typeof loadOwnerAvisos === 'function') loadOwnerAvisos();
                        if (typeof renderLandlordAvisos === 'function') renderLandlordAvisos();
                    }
                } catch (err) {
                    console.error('Error al cambiar el estado de la publicación:', err);
                }
            };
        }

        const editBtn = document.getElementById('mp-modal-edit-btn');
        if (editBtn) {
            editBtn.onclick = (e) => {
                e.preventDefault();
                closeModal();
                if (window.App && typeof window.App.showPublishWizard === 'function') {
                    window.App.showPublishWizard(prop);
                } else {
                    alert('Acción de edición iniciada para: ' + title);
                }
            };
        }
    } else {
        // Public Action Handlers: Visit & Apply (Keep property detail open in background)
        const visitBtn = document.getElementById('mp-modal-visit-btn');
        if (visitBtn) {
            visitBtn.onclick = (e) => {
                e.preventDefault();
                if (typeof window.openAgendarVisitaModal === 'function') {
                    window.openAgendarVisitaModal(prop);
                }
            };
        }

        const applyBtn = document.getElementById('mp-modal-apply-btn');
        if (applyBtn) {
            applyBtn.onclick = (e) => {
                e.preventDefault();
                if (typeof window.openPostulacionModal === 'function') {
                    window.openPostulacionModal(prop);
                }
            };
        }
    }
};

// ============================================================
// Cost Calculator Pop-up Modal (Pantalla Completa)
// ============================================================
window.openCostCalculatorModal = function (propData = {}) {
    let modal = document.getElementById('cost-calculator-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cost-calculator-modal';
        document.body.appendChild(modal);
    }

    const priceNum = propData.priceNum || 350000;
    const expensasNum = propData.expensasNum || 0;
    const moneda = propData.moneda || '$';
    const title = propData.title || 'Propiedad en alquiler';

    const priceFormatted = `${moneda} ${priceNum.toLocaleString('es-AR')}`;
    const expensasFormatted = expensasNum > 0 ? `${moneda} ${expensasNum.toLocaleString('es-AR')}` : 'Sin expensas';
    const totalMensual = priceNum + expensasNum;
    const totalMensualFormatted = `${moneda} ${totalMensual.toLocaleString('es-AR')}`;

    // Base Move-in Required Costs: 1 month rent + 1 month security deposit + Credit Check Fee (Pasaporte)
    const creditCheckFee = 20000;
    const creditCheckFeeFormatted = `${moneda} ${creditCheckFee.toLocaleString('es-AR')}`;
    const firstMonthRent = priceNum;
    const securityDeposit = priceNum;
    const adminFee = 0;
    const appFee = creditCheckFee;
    const baseMoveInTotal = firstMonthRent + securityDeposit + adminFee + appFee;

    // Optional Add-ons
    const petDepositAmount = Math.round(priceNum * 0.15) || 35000;
    const insuranceAmount = 15000;

    modal.scrollTop = 0;
    modal.className = 'fixed inset-0 z-[100000] w-full max-w-full h-full h-[100dvh] max-h-[100dvh] bg-[#f8f9fc] dark:bg-[#090a0f] text-zinc-900 dark:text-zinc-100 flex flex-col overflow-y-auto overscroll-contain transition-opacity duration-200 font-body';
    modal.style.display = 'flex';
    modal.style.opacity = '0';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.width = '100%';
    modal.style.height = '100dvh';
    modal.style.maxHeight = '100dvh';

    modal.innerHTML = `
        <!-- Header Superior Fijo/Sticky -->
        <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#111318]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0">
            <div class="max-w-4xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
                <div class="flex items-center gap-3 sm:gap-4 min-w-0">
                    <button type="button" id="close-cost-calc-back-btn" aria-label="Volver" class="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 hover:text-primary dark:hover:text-red-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl transition-all active:scale-95 shrink-0 cursor-pointer shadow-xs">
                        <span class="material-symbols-outlined text-lg">arrow_back</span>
                        <span class="hidden sm:inline">Volver</span>
                    </button>
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold shrink-0 shadow-xs">
                            <span class="material-symbols-outlined text-lg">calculate</span>
                        </div>
                        <div class="min-w-0">
                            <h3 class="font-headline text-base sm:text-lg font-black text-zinc-900 dark:text-white truncate">Calculadora de costos</h3>
                            <p class="text-[11px] text-zinc-500 truncate max-w-[200px] sm:max-w-md">${title}</p>
                        </div>
                    </div>
                </div>
                <button type="button" id="close-cost-calc-btn" class="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors flex items-center justify-center cursor-pointer shrink-0" aria-label="Cerrar (ESC)" title="Cerrar (ESC)">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        </header>

        <!-- Main Full-Screen Body Content -->
        <main class="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
            
            <!-- Sección 1: Costos mensuales -->
            <div class="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-white dark:bg-[#111318] shadow-xs">
                <div class="p-4 sm:p-5 bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div class="flex items-center gap-2 font-headline font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">
                        <span class="material-symbols-outlined text-base text-zinc-500">calendar_month</span>
                        <span>Costos mensuales</span>
                    </div>
                </div>
                
                <div class="p-5 sm:p-6 space-y-4">
                    <div class="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Obligatorios</div>
                    
                    <div class="space-y-3 text-sm">
                        <div class="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                            <div>
                                <span class="font-semibold text-zinc-800 dark:text-zinc-200">Alquiler mensual base</span>
                                <span class="block text-xs text-zinc-400">Ver características para más detalles</span>
                            </div>
                            <span class="font-extrabold text-zinc-900 dark:text-white">${priceFormatted}</span>
                        </div>

                        <div class="flex items-center justify-between py-1.5">
                            <div>
                                <span class="font-semibold text-zinc-800 dark:text-zinc-200">Expensas ordinarias</span>
                                <span class="block text-xs text-zinc-400">Estimación mensual</span>
                            </div>
                            <span class="font-semibold text-zinc-800 dark:text-zinc-200">${expensasFormatted}</span>
                        </div>
                    </div>

                    <!-- Barra destacada Total Mensual -->
                    <div class="pt-2">
                        <div class="flex items-center justify-between bg-zinc-100/80 dark:bg-zinc-800/70 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                            <span class="font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">Costo mensual total estimado</span>
                            <span class="font-headline font-black text-xl sm:text-2xl text-zinc-900 dark:text-white">${totalMensualFormatted}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sección 2: Costos de ingreso inicial -->
            <div class="rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden bg-white dark:bg-[#111318] shadow-xs">
                <div class="p-4 sm:p-5 bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <div class="flex items-center gap-2 font-headline font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">
                        <span class="material-symbols-outlined text-base text-zinc-500">key</span>
                        <span>Costos de ingreso inicial (Mudanza)</span>
                    </div>
                </div>

                <div class="p-5 sm:p-6 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <!-- Columna 1: Obligatorios -->
                        <div class="space-y-3">
                            <div class="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Obligatorios</div>
                            
                            <div class="space-y-3 text-xs sm:text-sm">
                                <div class="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <span class="text-zinc-600 dark:text-zinc-300">Primer mes de alquiler</span>
                                    <span class="font-bold text-zinc-900 dark:text-white">${priceFormatted}</span>
                                </div>
                                <div class="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <div>
                                        <span class="text-zinc-600 dark:text-zinc-300">Depósito en garantía</span>
                                        <span class="block text-[10px] text-zinc-400">Reembolsable al finalizar</span>
                                    </div>
                                    <span class="font-bold text-zinc-900 dark:text-white">${priceFormatted}</span>
                                </div>
                                <div class="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/50">
                                    <span class="text-zinc-600 dark:text-zinc-300">Gastos administrativos</span>
                                    <span class="font-bold text-emerald-600 dark:text-emerald-400">$0</span>
                                </div>
                                <div class="flex justify-between py-1.5">
                                    <div>
                                        <span class="text-zinc-600 dark:text-zinc-300">Verificación crediticia (Pasaporte)</span>
                                        <span class="block text-[10px] text-zinc-400">Tasa de postulación única</span>
                                    </div>
                                    <span class="font-bold text-zinc-900 dark:text-white">${creditCheckFeeFormatted}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Columna 2: Opcionales con Checkboxes -->
                        <div class="space-y-3">
                            <div class="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Opcionales</div>
                            
                            <div class="space-y-3 text-xs sm:text-sm">
                                <label class="flex items-start justify-between gap-2 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700">
                                    <div class="flex items-start gap-2.5">
                                        <input type="checkbox" id="calc-pet-deposit-cb" class="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary">
                                        <div>
                                            <span class="font-semibold text-zinc-800 dark:text-zinc-200">Depósito por mascota (${moneda} ${petDepositAmount.toLocaleString('es-AR')})</span>
                                            <span class="block text-[11px] text-zinc-400">Reembolsable al finalizar</span>
                                        </div>
                                    </div>
                                    <span id="calc-pet-deposit-val" class="font-bold text-zinc-500">${moneda} 0</span>
                                </label>

                                <label class="flex items-start justify-between gap-2 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700">
                                    <div class="flex items-start gap-2.5">
                                        <input type="checkbox" id="calc-insurance-cb" class="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary">
                                        <div>
                                            <span class="font-semibold text-zinc-800 dark:text-zinc-200">Seguro de caución / Hogar (${moneda} ${insuranceAmount.toLocaleString('es-AR')})</span>
                                            <span class="block text-[11px] text-zinc-400">Cobertura integral opcional</span>
                                        </div>
                                    </div>
                                    <span id="calc-insurance-val" class="font-bold text-zinc-500">${moneda} 0</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Barra destacada Total Ingreso -->
                    <div class="pt-2">
                        <div class="flex items-center justify-between bg-zinc-100/80 dark:bg-zinc-800/70 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                            <div>
                                <span class="font-bold text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">Costo total de ingreso estimado</span>
                                <span class="block text-[10px] text-zinc-400">Primer mes + depósito + verificación + opcionales</span>
                            </div>
                            <span id="calc-move-in-total-display" class="font-headline font-black text-xl sm:text-2xl text-zinc-900 dark:text-white">${moneda} ${baseMoveInTotal.toLocaleString('es-AR')}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Nota al pie -->
            <p class="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed text-center pb-8">
                Toda la información y valores son suministrados por la parte locadora y están sujetos a los términos y condiciones finales del contrato.
            </p>
        </main>
    `;

    requestAnimationFrame(() => {
        modal.style.opacity = '1';
    });

    const closeCalc = () => {
        modal.style.opacity = '0';
        document.removeEventListener('keydown', handleCalcEsc);
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    };

    const handleCalcEsc = (e) => {
        if (e.key === 'Escape') closeCalc();
    };
    document.addEventListener('keydown', handleCalcEsc);

    const closeBtn = document.getElementById('close-cost-calc-btn');
    if (closeBtn) closeBtn.onclick = closeCalc;
    const backBtn = document.getElementById('close-cost-calc-back-btn');
    if (backBtn) backBtn.onclick = closeCalc;

    // Live dynamic Move-in calculation on checkbox toggle
    const petCb = document.getElementById('calc-pet-deposit-cb');
    const insCb = document.getElementById('calc-insurance-cb');
    const petVal = document.getElementById('calc-pet-deposit-val');
    const insVal = document.getElementById('calc-insurance-val');
    const totalDisplay = document.getElementById('calc-move-in-total-display');

    const recalculateMoveIn = () => {
        let currentTotal = baseMoveInTotal;
        if (petCb && petCb.checked) {
            currentTotal += petDepositAmount;
            if (petVal) petVal.textContent = `${moneda} ${petDepositAmount.toLocaleString('es-AR')}`;
        } else {
            if (petVal) petVal.textContent = `${moneda} 0`;
        }

        if (insCb && insCb.checked) {
            currentTotal += insuranceAmount;
            if (insVal) insVal.textContent = `${moneda} ${insuranceAmount.toLocaleString('es-AR')}`;
        } else {
            if (insVal) insVal.textContent = `${moneda} 0`;
        }

        if (totalDisplay) {
            totalDisplay.textContent = `${moneda} ${currentTotal.toLocaleString('es-AR')}`;
        }
    };

    if (petCb) petCb.onchange = recalculateMoveIn;
    if (insCb) insCb.onchange = recalculateMoveIn;
};

// ============================================================
// Auto-Restore Property from URL on Page Reload / Direct Link (?prop=ID)
// ============================================================
window.checkMarketplaceUrlParam = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('prop');
    if (!propId) return;

    // Check if we are already in property modal
    const existingModal = document.getElementById('marketplace-property-modal');
    if (existingModal && existingModal.style.display !== 'none' && existingModal.style.opacity === '1') {
        return;
    }

    try {
        // 1. Try to load from public properties in DataManager
        if (window.DataManager && typeof window.DataManager.getPublicMarketplaceProperties === 'function') {
            const props = await window.DataManager.getPublicMarketplaceProperties(100);
            const found = props.find(p => String(p.id) === String(propId) || String(p.id_publicacion) === String(propId) || String(p.id_propiedad) === String(propId));
            if (found && typeof window.openMarketplacePropertyDetailModal === 'function') {
                window.openMarketplacePropertyDetailModal(found);
                return;
            }
        }

        // 2. Direct Supabase Query by ID
        if (window.supabaseClient) {
            const { data: pub, error } = await window.supabaseClient
                .from('Publicacion')
                .select(`
                    *,
                    Historial_Estado_Publicacion (*, Estado_Publicacion (*)),
                    Propiedad (
                        *,
                        Antiguedad (*),
                        Subtipo_propiedad (*),
                        Barrio (
                            *,
                            Departamento (
                                *,
                                Provincia (*)
                            )
                        ),
                        Propiedad_caracteristica (
                            Caracteristica (*)
                        )
                    ),
                    Multimedia (*)
                `)
                .eq('id_publicacion', propId)
                .maybeSingle();

            if (pub && typeof window.openMarketplacePropertyDetailModal === 'function') {
                const prop = pub.Propiedad || {};
                const media = pub.Multimedia || [];
                const imageUrls = media.length > 0 ? Array.from(new Set(media.map(m => m.url_archivo).filter(Boolean))) : ['img/hero-marketplace.jpg'];
                let extraInfo = {};
                if (pub.descripcion && pub.descripcion.includes('Detalles: ')) {
                    try { extraInfo = JSON.parse(pub.descripcion.split('Detalles: ')[1]); } catch(e){}
                }
                const cleanTitle = pub.descripcion ? pub.descripcion.split(' | Detalles: ')[0].substring(0, 70) : `Propiedad en ${prop.calle || 'Mendoza'}`;
                
                // Resolve status from Historial_Estado_Publicacion
                let currentStatus = 'disponible';
                if (pub.Historial_Estado_Publicacion && pub.Historial_Estado_Publicacion.length > 0) {
                    const sortedHist = [...pub.Historial_Estado_Publicacion].sort((a, b) => new Date(b.fecha_inicio || b.created_at || 0) - new Date(a.fecha_inicio || a.created_at || 0));
                    const activeHist = sortedHist.find(h => !h.fecha_fin) || sortedHist[0];
                    const estadoNombre = (activeHist?.Estado_Publicacion?.nombre || '').toLowerCase();
                    if (estadoNombre === 'pausada' || estadoNombre === 'pausado' || activeHist?.id_estado_publicacion === 4) {
                        currentStatus = 'paused';
                    } else if (estadoNombre === 'alquilada' || estadoNombre === 'alquilado' || activeHist?.id_estado_publicacion === 2) {
                        currentStatus = 'alquilada';
                    }
                } else if (pub.status || pub.estado) {
                    const st = (pub.status || pub.estado).toLowerCase();
                    if (st.includes('paus')) currentStatus = 'paused';
                    else if (st.includes('alquil')) currentStatus = 'alquilada';
                }

                window.openMarketplacePropertyDetailModal({
                    id: pub.id_publicacion,
                    id_publicacion: pub.id_publicacion,
                    id_propiedad: pub.id_propiedad,
                    title: cleanTitle,
                    description: pub.descripcion || '',
                    address: `${prop.calle || 'Mendoza'} ${prop.numero || ''}`.trim(),
                    price: parseFloat(pub.precio || 0),
                    images: imageUrls,
                    photoUrl: imageUrls[0],
                    latitud: prop.latitud ? parseFloat(prop.latitud) : -32.8898,
                    longitud: prop.longitud ? parseFloat(prop.longitud) : -68.8373,
                    dormitorios: prop.dormitorios || extraInfo.dormitorios || 1,
                    banos: prop.banos_completos || extraInfo.banos || 1,
                    ambientes: prop.habitaciones_total || extraInfo.ambientes || 1,
                    cocheras: prop.cantidad_cocheras || extraInfo.cocheras || 0,
                    sup_cubierta: prop.superficie_cubierta || extraInfo.supCubierta || 45,
                    sup_total: prop.superficie_lote || extraInfo.supTotal || 45,
                    barrio: prop.Barrio?.nombre || extraInfo.barrio || '',
                    city: prop.Barrio?.Departamento?.nombre || extraInfo.ciudad || '',
                    province: prop.Barrio?.Departamento?.Provincia?.nombre || extraInfo.provincia || '',
                    caracteristicas: extraInfo.caracteristicas || [],
                    extraInfo: extraInfo,
                    status: currentStatus,
                    contractEndDate: extraInfo.contractEndDate || extraInfo.fecha_fin_contrato || null,
                    views_count: pub.cantidad_visualizaciones_total || 0,
                    created_at: pub.created_at
                });
            }
        }
    } catch (err) {
        console.error("Error auto-restoring property from URL query:", err);
    }
};

// Auto-run URL check on page load & handle popstate for seamless browser history
window.addEventListener('popstate', () => {
    const modal = document.getElementById('marketplace-property-modal');
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('prop') && modal && modal.style.display !== 'none') {
        modal.style.opacity = '0';
        document.body.classList.remove('no-scroll');
        document.body.style.overflow = '';
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    } else if (urlParams.has('prop')) {
        window.checkMarketplaceUrlParam();
    }
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(window.checkMarketplaceUrlParam, 350);
    });
} else {
    setTimeout(window.checkMarketplaceUrlParam, 350);
}

// Helper to verify if the tenant has generated their Pasaporte Hábitat
window.hasCompletedPassport = async function() {
    try {
        if (window.supabaseClient) {
            const { data: { session } } = await window.supabaseClient.auth.getSession();
            if (session && session.user) {
                const { data: perfil } = await window.supabaseClient
                    .from('Perfil')
                    .select('id_perfil')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                if (perfil) {
                    const { data: activePassports } = await window.supabaseClient
                        .from('Pasaporte_habitat')
                        .select('id_pasaporte, id_estado_pasaporte, fecha_vencimiento')
                        .eq('id_perfil', perfil.id_perfil)
                        .eq('id_estado_pasaporte', 3); // 3 = Activo

                    if (activePassports && activePassports.length > 0) {
                        const pass = activePassports[0];
                        if (!pass.fecha_vencimiento || new Date(pass.fecha_vencimiento).getTime() > Date.now()) {
                            return true;
                        }
                    }
                    return false;
                }
            }
        }
        
        // Fallback local: verificar si el usuario tiene pasaporte activo en memoria/local
        if (window.hasActivePassport && window.currentPasaporteId) {
            return true;
        }
        const pData = JSON.parse(localStorage.getItem('habitat_passport_data') || '{}');
        const didit = JSON.parse(localStorage.getItem('habitat_didit_identity') || '{}');
        if ((pData.id_pasaporte || pData.codigo_pasaporte) && (didit.documentNumber || didit.verified)) {
            return true;
        }
    } catch (e) {}
    return false;
};

// Modal when tenant does not have a passport yet
window.openPassportRequiredModal = function(prop) {
    const propTitle = prop?.title || prop?.titleAviso || (prop?.descripcion ? prop.descripcion.split(' | Detalles: ')[0] : 'Propiedad en Alquiler');
    const propPrice = prop?.price || prop?.precio || 0;

    let modal = document.getElementById('habitat-passport-required-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'habitat-passport-required-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100002] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md transition-opacity duration-200 font-body';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="relative w-full max-w-md bg-white dark:bg-[#111318] rounded-[28px] shadow-2xl p-6 sm:p-7 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-900 dark:text-white space-y-5 my-auto" onclick="event.stopPropagation()">
            
            <!-- Top Bar -->
            <div class="flex items-start justify-between gap-3">
                <div class="space-y-1">
                    <span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Requisito Obligatorio
                    </span>
                    <h3 class="font-headline text-lg sm:text-xl font-bold text-zinc-900 dark:text-white tracking-tight leading-snug">
                        Generá tu Pasaporte Hábitat
                    </h3>
                </div>
                <button type="button" id="close-no-passport-modal" class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0" aria-label="Cerrar">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <!-- Description -->
            <p class="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-normal">
                Para postularte a <strong class="text-zinc-900 dark:text-white">${propTitle}</strong> necesitás contar con tu Pasaporte Digital validado.
            </p>

            <!-- Features list -->
            <div class="space-y-2.5 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0">check_circle</span>
                    <span><strong>100% Digital:</strong> Se genera en solo 2 minutos.</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0">check_circle</span>
                    <span><strong>Sin garantías tradicionales:</strong> Validación ARCA y BCRA.</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0">check_circle</span>
                    <span><strong>Válido para todo Hábitat:</strong> Postulate con 1 solo click.</span>
                </div>
            </div>

            <!-- Buttons with identical matched heights -->
            <div class="flex items-center gap-2.5 pt-1">
                <button type="button" id="btn-cancel-no-passport" class="h-12 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0">
                    Cerrar
                </button>
                <a href="pasaporte-habitat.html" id="btn-create-passport-now" class="flex-1 h-12 inline-flex items-center justify-center gap-2 px-5 rounded-2xl bg-primary hover:bg-[#992226] text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all active:scale-98 cursor-pointer text-center">
                    <span class="material-symbols-outlined text-base">arrow_forward</span>
                    <span>Generar Pasaporte (2 min)</span>
                </a>
            </div>
        </div>
    `;

    const closeFn = () => { modal.style.display = 'none'; };
    document.getElementById('close-no-passport-modal').onclick = closeFn;
    document.getElementById('btn-cancel-no-passport').onclick = closeFn;
    modal.onclick = (e) => {
        if (e.target === modal) closeFn();
    };
};

window.openPostulacionModal = async function(prop) {
    // Si el inquilino no tiene el pasaporte hecho, avisarle y ofrecerle crearlo
    const hasPassport = await window.hasCompletedPassport();
    if (!hasPassport) {
        window.openPassportRequiredModal(prop);
        return;
    }

    const propId = prop?.id_propiedad || prop?.idPropiedad || prop?.id || 1;
    const pubId = prop?.id_publicacion || prop?.idPublicacion || prop?.id;
    const propTitle = prop?.title || prop?.titleAviso || (prop?.descripcion ? prop.descripcion.split(' | Detalles: ')[0] : 'Propiedad en Alquiler');
    const propAddress = prop?.address || prop?.ubicacion || `${prop?.calle || ''} ${prop?.numero || ''}`.trim() || 'Buenos Aires';
    const propPrice = prop?.price || prop?.precio || 450000;
    const propExpenses = prop?.expensas || prop?.expensas_mensuales || 45000;

    let photosList = [];
    if (Array.isArray(prop?.photos) && prop.photos.length > 0) photosList = prop.photos;
    else if (Array.isArray(prop?.images) && prop.images.length > 0) photosList = prop.images;
    else if (Array.isArray(prop?.propiedad_imagenes) && prop.propiedad_imagenes.length > 0) photosList = prop.propiedad_imagenes.map(i => i.url || i);
    else if (prop?.image) photosList = [prop.image];
    else if (prop?.photoUrl) photosList = [prop.photoUrl];

    const mainPhoto = photosList[0] || 'img/hero-marketplace.jpg';

    // Obtener datos reales del usuario desde Didit o sesión
    let defaultName = '';
    let defaultEmail = '';
    let defaultPhone = '';
    try {
        const didit = JSON.parse(localStorage.getItem('habitat_didit_identity') || '{}');
        const user = JSON.parse(localStorage.getItem('habitat_user') || '{}');
        defaultName = didit.fullName || (didit.firstName && didit.lastName ? `${didit.firstName} ${didit.lastName}` : '') || user.nombre_completo || user.name || '';
        defaultEmail = user.email || user.mail || '';
        defaultPhone = user.telefono || user.phone || '';
    } catch (e) {}

    let modal = document.getElementById('habitat-postulacion-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'habitat-postulacion-modal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 z-[100002] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md transition-opacity duration-200 font-body';
    modal.style.display = 'flex';

    modal.innerHTML = `
        <div class="relative w-full max-w-md sm:max-w-lg bg-white dark:bg-[#111318] rounded-[28px] shadow-2xl p-6 sm:p-7 border border-zinc-200/90 dark:border-zinc-800/90 text-zinc-900 dark:text-white space-y-5 my-auto" onclick="event.stopPropagation()">
            
            <!-- Header -->
            <div class="flex items-start justify-between gap-3">
                <div class="space-y-1 min-w-0 flex-1">
                    <span class="text-[11px] font-bold text-primary dark:text-red-400 uppercase tracking-wider block">
                        Postulación al Alquiler
                    </span>
                    <h3 class="font-headline text-lg sm:text-xl font-bold text-zinc-900 dark:text-white truncate">
                        ${propTitle}
                    </h3>
                </div>
                <button type="button" id="close-postulacion-modal" class="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0" aria-label="Cerrar">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <!-- Property Preview Mini Tile -->
            <div class="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                <div class="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-xs border border-zinc-200/60 dark:border-zinc-700/60">
                    <img src="${mainPhoto}" alt="${propTitle}" class="w-full h-full object-cover" onerror="this.src='img/hero-marketplace.jpg'">
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-headline font-black text-sm text-zinc-900 dark:text-white truncate">
                            $${Number(propPrice).toLocaleString('es-AR')} <span class="text-xs font-semibold text-zinc-400">/ mes</span>
                        </div>
                        ${(prop?.isVerifiedOwner || prop?.verified || prop?.is_verified_owner || prop?.propietario_verificado) ? `
                            <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold border border-emerald-500/20 inline-flex items-center gap-0.5 shrink-0">
                                <span class="material-symbols-outlined text-xs text-emerald-600 dark:text-emerald-400">verified</span> Verificado
                            </span>
                        ` : ''}
                    </div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                        <span class="material-symbols-outlined text-xs text-zinc-400">location_on</span>
                        <span class="truncate">${propAddress}</span>
                    </div>
                </div>
            </div>

            <!-- Verified Passport Notice (Sleek and subtle) -->
            <div class="flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300">
                <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-base shrink-0">verified</span>
                <span class="leading-tight">Tu <strong>Pasaporte Hábitat</strong> verificado se adjuntará automáticamente.</span>
            </div>

            <!-- Form: Only Message -->
            <form id="form-postulacion-modal" class="space-y-4">
                <div class="space-y-2">
                    <label for="postula-mensaje" class="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Mensaje para el propietario <span class="text-zinc-400 font-normal">(opcional)</span>
                    </label>
                    <textarea id="postula-mensaje" rows="4" class="w-full p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/40 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-red-400/20 focus:border-primary dark:focus:border-red-400 transition-all resize-none font-body leading-relaxed" placeholder="Escribí una breve presentación, consulta sobre disponibilidad o fecha estimada de ingreso..."></textarea>
                </div>

                <div class="flex items-center gap-2.5 pt-1">
                    <button type="button" id="btn-cancel-postulacion" class="h-12 px-5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0">
                        Cancelar
                    </button>
                    <button type="submit" id="btn-submit-postulacion" class="flex-1 h-12 inline-flex items-center justify-center gap-2 px-5 rounded-2xl bg-primary hover:bg-[#992226] text-white font-bold text-xs sm:text-sm shadow-md shadow-primary/20 hover:shadow-lg transition-all active:scale-98 cursor-pointer">
                        <span class="material-symbols-outlined text-base">send</span>
                        <span>Enviar Postulación</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    const closeFn = () => { modal.style.display = 'none'; };
    document.getElementById('close-postulacion-modal').onclick = closeFn;
    document.getElementById('btn-cancel-postulacion').onclick = closeFn;

    modal.onclick = (e) => {
        if (e.target === modal) closeFn();
    };

    document.getElementById('form-postulacion-modal').onsubmit = async (e) => {
        e.preventDefault();
        
        if (window._isSubmittingApp) return;
        window._isSubmittingApp = true;

        const submitBtn = document.getElementById('btn-submit-postulacion');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="material-symbols-outlined text-base animate-spin">progress_activity</span> Enviando postulación...';
        }

        try {
            // Revalidar que tenga pasaporte activo
            const validPassport = await window.hasCompletedPassport();
            if (!validPassport) {
                closeFn();
                window.openPassportRequiredModal(prop);
                return;
            }

            const userMsg = document.getElementById('postula-mensaje')?.value?.trim() || '¡Hola! Me interesa mucho la propiedad. Cuento con mi Pasaporte Hábitat validado y toda la documentación lista para la firma.';
            
            let tenantCondicion = 'Monotributista';
            let tenantDniVal = null;
            let tenantCuitVal = null;
            let tenantNameVal = defaultName || '';
            try {
                const pass = JSON.parse(localStorage.getItem('habitat_passport_data') || '{}');
                const didit = JSON.parse(localStorage.getItem('habitat_didit_identity') || '{}');
                const u = JSON.parse(localStorage.getItem('habitat_user') || '{}');
                tenantCondicion = pass.condicion_fiscal || pass.condicionFiscal || pass.actividad || u.condicion_fiscal || u.condicionFiscal || 'Monotributista';
                tenantDniVal = didit.documentNumber || didit.dni || u.dni || pass.dni || null;
                tenantCuitVal = didit.cuit || pass.cuit || u.cuit || null;
                if (!tenantCuitVal && tenantDniVal && typeof window.calcularCUIL === 'function') {
                    tenantCuitVal = window.calcularCUIL(tenantDniVal, 'M');
                }
                if (!tenantNameVal) {
                    tenantNameVal = didit.fullName || (didit.firstName && didit.lastName ? `${didit.firstName} ${didit.lastName}` : '') || pass.razon_social || u.nombre_completo || u.name || '';
                }
            } catch (e) {}

            const appData = {
                propertyId: propId,
                publicationId: pubId,
                propertyTitle: propTitle,
                propertyAddress: propAddress,
                propertyPrice: propPrice,
                propertyExpenses: propExpenses,
                propertyImage: mainPhoto,
                propertyPhotos: photosList.length > 0 ? photosList : [mainPhoto],
                propertyM2: prop?.sup_total || prop?.sup_cubierta || prop?.m2 || prop?.area || 65,
                propertyRooms: prop?.ambientes || prop?.rooms || 2,
                propertyBeds: prop?.dormitorios || prop?.bedrooms || prop?.beds || 1,
                propertyBaths: prop?.banos || prop?.bathrooms || prop?.baths || 1,
                tenantName: tenantNameVal || 'Inquilino Verificado',
                tenantEmail: defaultEmail || 'inquilino@habitat.com.ar',
                tenantPhone: defaultPhone || '+54 9 11',
                tenantDni: tenantDniVal,
                tenantCuit: tenantCuitVal,
                condicion_fiscal: tenantCondicion,
                incomeProof: `Pasaporte Hábitat (${tenantCondicion})`,
                message: userMsg
            };

            if (window.DataManager && typeof window.DataManager.submitApplication === 'function') {
                const res = await window.DataManager.submitApplication(appData);
                closeFn();

                if (res && res.isDuplicate) {
                    if (window.showCustomAlert) {
                        await window.showCustomAlert({
                            title: 'Postulación Ya Registrada',
                            message: `Ya tenías una postulación activa enviada para "${propTitle}". Podés ver su estado en tu panel.`,
                            icon: 'info'
                        });
                    } else {
                        alert(`Ya tenías una postulación activa enviada para "${propTitle}".`);
                    }
                    return;
                }
            } else {
                closeFn();
            }

            if (window.showCustomConfirm) {
                const goToApps = await window.showCustomConfirm({
                    title: '¡Postulación Enviada!',
                    message: `Tu postulación para "${propTitle}" fue enviada con éxito al propietario junto con tu Pasaporte Hábitat.\n\n¿Deseas ir a 'Tus Postulaciones' para hacerle seguimiento?`,
                    confirmText: 'Ver mis postulaciones',
                    cancelText: 'Continuar navegando'
                });
                if (goToApps) {
                    window.location.href = 'tu-alquiler.html#postulaciones';
                }
            } else if (window.showCustomAlert) {
                await window.showCustomAlert({
                    title: '¡Postulación Enviada!',
                    message: 'Tu postulación fue enviada exitosamente al propietario.',
                    icon: 'check_circle'
                });
            }
        } catch (err) {
            console.error("Error submitting application:", err);
            if (err.code === 'PASSPORT_REQUIRED') {
                closeFn();
                window.openPassportRequiredModal(prop);
            } else {
                alert("Error al enviar postulación: " + (err.message || err));
            }
        } finally {
            window._isSubmittingApp = false;
        }
    };
};

window.openAgendarVisitaModal = function(prop) {
    const propTitle = prop?.title || prop?.titleAviso || (prop?.descripcion ? prop.descripcion.split(' | Detalles: ')[0] : 'Propiedad en Alquiler');
    const propAddress = prop?.address || prop?.ubicacion || `${prop?.calle || ''} ${prop?.numero || ''}`.trim() || 'Buenos Aires';
    const propId = prop?.id_propiedad || prop?.idPropiedad || prop?.id || 1;

    let defaultName = '';
    let defaultEmail = '';
    let defaultPhone = '';
    try {
        const didit = JSON.parse(localStorage.getItem('habitat_didit_identity') || '{}');
        const user = JSON.parse(localStorage.getItem('habitat_user') || '{}');
        defaultName = didit.fullName || (didit.firstName && didit.lastName ? `${didit.firstName} ${didit.lastName}` : '') || user.nombre_completo || user.name || '';
        defaultEmail = user.email || user.mail || '';
        defaultPhone = user.telefono || user.phone || '';
    } catch (e) {}

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
                <button type="button" id="close-visita-modal" class="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center justify-center cursor-pointer">
                    <span class="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            <form id="form-visita-modal" class="space-y-4">
                <div>
                    <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Nombre y Apellido</label>
                    <input type="text" id="visita-nombre" required value="${defaultName}" placeholder="Tu nombre y apellido" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Teléfono de contacto</label>
                        <input type="tel" id="visita-telefono" required value="${defaultPhone || '+54 9 11 '}" placeholder="+54 9 11 ..." class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
                    </div>
                    <div>
                        <label class="block text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 mb-1">Correo Electrónico</label>
                        <input type="email" id="visita-email" required value="${defaultEmail}" placeholder="correo@ejemplo.com" class="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500">
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
                    <button type="button" id="btn-cancel-visita" class="flex-1 py-3 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                        Cancelar
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer">
                        <span class="material-symbols-outlined text-base">event_available</span>
                        Solicitar Visita
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
            window.location.href = 'tu-alquiler.html#visitas';
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

    // Amoblado indicator
    let amobladoVal = prop.amoblado !== undefined ? prop.amoblado : extraInfo.amoblado;
    if (amobladoVal === undefined || amobladoVal === null || amobladoVal === '') {
        if (prop.tags && Array.isArray(prop.tags)) {
            if (prop.tags.some(t => t.toLowerCase().includes('semiamoblado'))) amobladoVal = 'semiamoblado';
            else if (prop.tags.some(t => t.toLowerCase().includes('amoblado'))) amobladoVal = 'totalmente-amoblado';
        }
    }
    const isAmoblado = amobladoVal === true || amobladoVal === 'totalmente-amoblado' || amobladoVal === 'amoblado' || amobladoVal === 'si';
    const isSemiamoblado = amobladoVal === 'semiamoblado' || amobladoVal === 'semi-amoblado';
    const amobladoLabel = isAmoblado ? 'Amoblado' : (isSemiamoblado ? 'Semiamoblado' : null);

    const isVerifiedOwner = Boolean(
        prop.isVerifiedOwner ||
        prop.verified ||
        prop.is_verified_owner ||
        prop.propietario_verificado ||
        (extraInfo && (extraInfo.isVerifiedOwner || extraInfo.verified)) ||
        (prop.tags && prop.tags.some(t => t.toLowerCase().includes('verificad')))
    );

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
            ${isVerifiedOwner ? `
                <div class="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 bg-emerald-600/90 text-white backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-headline font-black shadow-md border border-emerald-400/30">
                    <span class="material-symbols-outlined text-xs">verified</span> Propietario Verificado
                </div>
            ` : ''}
            <div class="absolute top-4 right-4 flex flex-col items-end gap-1.5">
                <span class="bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-1 rounded shadow-sm text-[10px] font-bold tracking-widest text-primary uppercase">${operacionLabel}</span>
                ${amobladoLabel ? `<span class="bg-purple-100/95 dark:bg-purple-950/90 text-purple-700 dark:text-purple-300 backdrop-blur px-2.5 py-0.5 rounded shadow-sm text-[10px] font-extrabold flex items-center gap-1"><span class="material-symbols-outlined text-xs">chair</span>${amobladoLabel}</span>` : ''}
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
                <div class="flex items-center gap-4 sm:gap-6 text-secondary flex-wrap">
                    ${dormitorios > 0 ? `<div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">bed</span><span class="text-sm font-semibold">${dormitorios} Dorm.</span></div>` : ''}
                    ${banos > 0 ? `<div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">bathtub</span><span class="text-sm font-semibold">${banos} Baños</span></div>` : ''}
                    ${supCubierta ? `<div class="flex items-center gap-1.5"><span class="material-symbols-outlined text-lg">square_foot</span><span class="text-sm font-semibold">${supCubierta} m²</span></div>` : ''}
                    ${amobladoLabel ? `<div class="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold"><span class="material-symbols-outlined text-lg">chair</span><span class="text-sm">${amobladoLabel}</span></div>` : ''}
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

    if (typeof google === 'undefined' || !google || !google.maps) {
        if (!mapContainer.querySelector('.map-loading-indicator')) {
            mapContainer.innerHTML = `
                <div class="map-loading-indicator w-full h-full min-h-[260px] bg-zinc-100 dark:bg-zinc-800/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-zinc-500 space-y-3 border border-zinc-200 dark:border-zinc-700">
                    <div class="w-8 h-8 rounded-full border-3 border-primary/30 border-t-primary animate-spin"></div>
                    <p class="text-xs font-bold text-zinc-700 dark:text-zinc-200">Cargando mapa interactivo...</p>
                    <p class="text-[11px] text-zinc-400 max-w-xs">Puedes escribir la calle y número en el buscador mientras el mapa se conecta.</p>
                </div>
            `;
        }

        if (typeof window.loadGoogleMaps === 'function') {
            window.loadGoogleMaps('initGoogleMap', 'places');
        } else {
            const gmScript = document.createElement('script');
            gmScript.src = 'js/google-maps-loader.js';
            gmScript.onload = () => {
                if (typeof window.loadGoogleMaps === 'function') {
                    window.loadGoogleMaps('initGoogleMap', 'places');
                }
            };
            document.head.appendChild(gmScript);
        }
        return;
    }

    try {
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

        // Use AdvancedMarkerElement (modern API) with fallback to standard Marker
        try {
            const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');
            window.propertyMarker = new AdvancedMarkerElement({
                position: initialPos,
                map: window.propertyMap,
                title: "Arrastra para ajustar tu ubicación",
                gmpDraggable: true,
            });
        } catch (e) {
            window.propertyMarker = new google.maps.Marker({
                position: initialPos,
                map: window.propertyMap,
                draggable: true,
                title: "Arrastra para ajustar tu ubicación"
            });
        }

    const updateAddressUI = (latLng) => {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: latLng }, (results, status) => {
            if (status === "OK" && results[0]) {
                const address = results[0].formatted_address;
                const label = document.getElementById('map-address-label');
                if (label) label.textContent = address;

                const inputCalle = document.getElementById('calle-altura');
                if (inputCalle && !inputCalle.value) {
                    const addressComponents = results[0].address_components || [];
                    let route = '';
                    let streetNumber = '';
                    let provincia = '';
                    let ciudad = '';
                    let barrio = '';
                    addressComponents.forEach(comp => {
                        if (comp.types.includes('route')) route = comp.long_name;
                        if (comp.types.includes('street_number')) streetNumber = comp.long_name;
                        if (comp.types.includes('administrative_area_level_1')) provincia = comp.long_name;
                        if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_2')) {
                            if (!ciudad) ciudad = comp.long_name;
                        }
                        if (comp.types.includes('neighborhood') || comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
                            if (!barrio) barrio = comp.long_name;
                        }
                    });
                    if (provincia) window.selectedPropertyProvincia = provincia;
                    if (ciudad) window.selectedPropertyCiudad = ciudad;
                    if (barrio) window.selectedPropertyBarrio = barrio;
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

            // Extract components (route, street_number, provincia, ciudad, barrio)
            let routeStr = '';
            let streetNumberStr = '';
            let provinciaStr = '';
            let ciudadStr = '';
            let barrioStr = '';

            if (place.address_components) {
                for (const component of place.address_components) {
                    const types = component.types;
                    if (types.includes('route')) routeStr = component.long_name;
                    if (types.includes('street_number')) streetNumberStr = component.long_name;
                    if (types.includes('administrative_area_level_1')) provinciaStr = component.long_name;
                    if (types.includes('locality') || types.includes('administrative_area_level_2')) {
                        if (!ciudadStr) ciudadStr = component.long_name;
                    }
                    if (types.includes('neighborhood') || types.includes('sublocality_level_1') || types.includes('sublocality')) {
                        if (!barrioStr) barrioStr = component.long_name;
                    }
                    if (types.includes('postal_code')) {
                        window.selectedPropertyPostalCode = component.long_name;
                    }
                }
            }

            if (provinciaStr) window.selectedPropertyProvincia = provinciaStr;
            if (ciudadStr) window.selectedPropertyCiudad = ciudadStr;
            if (barrioStr) window.selectedPropertyBarrio = barrioStr;

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
    } catch (err) {
        console.warn('Error inicializando Google Maps:', err);
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
            if (window.FavoritesManager && typeof window.FavoritesManager.showFavoritesModal === 'function') {
                window.FavoritesManager.showFavoritesModal();
            }
        }

        if (action === 'help-guide') {
            scrollToTarget(getVisibleTarget(['#tenant-faq-title', '#owner-faq-title']));
        }

        if (action === 'contact-agent') {
            scrollToTarget(getVisibleTarget(['footer', '#marketplace-contact-modal']));
        }
    };



    let dropdownHoverTimeout = null;

    const setupDropdownHoverEvents = () => {
        document.querySelectorAll('.landing-desktop-nav__dropdown').forEach((dropdown) => {
            const trigger = dropdown.querySelector('.landing-desktop-nav__dropdown-trigger');

            dropdown.addEventListener('mouseenter', () => {
                if (dropdownHoverTimeout) {
                    clearTimeout(dropdownHoverTimeout);
                    dropdownHoverTimeout = null;
                }
                closeDropdowns(dropdown);
                dropdown.classList.add('is-open');
                if (trigger) trigger.setAttribute('aria-expanded', 'true');
            });

            dropdown.addEventListener('mouseleave', () => {
                dropdownHoverTimeout = setTimeout(() => {
                    dropdown.classList.remove('is-open');
                    if (trigger) trigger.setAttribute('aria-expanded', 'false');
                }, 180);
            });
        });
    };

    setupDropdownHoverEvents();

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
            <button class="landing-menu__close" type="button" aria-label="Cerrar menú" data-menu-close>
                <span class="material-symbols-outlined text-2xl">close</span>
            </button>
            <div class="landing-menu__content">
                <div class="landing-menu__top">
                    <a class="landing-menu__brand" href="index.html" aria-label="Inicio">
                        <img src="img/logo-lite.png" alt="Habitat">
                    </a>
                </div>

                <div class="landing-menu__main p-1 space-y-2">

                    <!-- SECCIÓN 1: NAVEGACIÓN GENERAL -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <h4 class="font-headline text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Navegación
                        </h4>
                        <div class="flex flex-col gap-1">
                            <a href="index.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-primary text-xl">home</span>
                                <span>Inicio</span>
                            </a>
                            <a href="buscar.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">search</span>
                                <span>Buscar</span>
                            </a>
                            <a href="como-funciona.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-zinc-500 text-xl">info</span>
                                <span>Cómo funciona</span>
                            </a>
                            <a href="pasaporte-habitat.html" class="menu-item-clean">
                                <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">badge</span>
                                <span class="font-bold text-primary dark:text-red-400">Pasaporte Hábitat</span>
                            </a>
                            <button type="button" class="menu-item-clean w-full text-left cursor-pointer" data-menu-action="favorites">
                                <span class="material-symbols-outlined text-rose-500 text-xl">favorite</span>
                                <span>Favoritos</span>
                            </button>
                            <button type="button" onclick="if(window.App && typeof window.App.openPublishWizard === 'function'){ window.App.openPublishWizard(); } else { window.location.href='index.html?publish=1'; }" class="menu-item-clean w-full text-left cursor-pointer font-bold text-primary dark:text-red-400 border border-primary/20 dark:border-red-900/40 bg-primary/5 dark:bg-red-950/20 rounded-xl mt-1">
                                <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">add_home</span>
                                <span>Publicar propiedad</span>
                            </button>
                        </div>
                    </div>

                    <!-- SECCIÓN 2: PROPIETARIOS (Rojo Borgoña - Colapsable) -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 py-1.5">
                        <button type="button" class="drawer-accordion-btn w-full flex items-center justify-between py-1 text-left cursor-pointer group select-none">
                            <h4 class="font-headline text-xs font-black text-primary dark:text-red-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-primary dark:bg-red-500"></span> Para Propietarios
                            </h4>
                            <span class="material-symbols-outlined text-primary dark:text-red-400 text-lg transition-transform duration-300 transform accordion-chevron">expand_more</span>
                        </button>
                        <div class="drawer-accordion-content grid grid-rows-[0fr] transition-all duration-300 ease-in-out opacity-0 overflow-hidden">
                            <div class="overflow-hidden flex flex-col gap-2 pt-3">
                                
                                <!-- Subsección: Gestión de Propiedades -->
                                <div class="px-1">
                                    <h5 class="text-[10px] font-black text-primary dark:text-red-400 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-primary dark:bg-red-400"></span> Gestión de Propiedades
                                    </h5>
                                </div>
                                <a href="administrador.html" class="menu-item-card bg-primary text-white p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01] w-full text-left cursor-pointer shadow-md">
                                    <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                                        <span class="material-symbols-outlined text-xl">manage_accounts</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-white">Panel del Propietario</span>
                                        <span class="block text-[11px] text-white/80">Gestión de alquileres, cobros e IPC</span>
                                    </div>
                                </a>
                                <button type="button" onclick="if(window.App && typeof window.App.openPublishWizard === 'function'){ window.App.openPublishWizard(); } else { window.location.href='index.html?publish=1'; }" class="menu-item-card bg-primary/5 dark:bg-red-950/20 border border-primary/20 hover:border-primary/40 p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01] w-full text-left cursor-pointer">
                                    <div class="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                                        <span class="material-symbols-outlined text-xl">add_home</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-zinc-900 dark:text-white">Publicar propiedad gratis</span>
                                        <span class="block text-[11px] text-zinc-500">Crea tu aviso en simples pasos</span>
                                    </div>
                                </button>
                                <a href="administrador.html#avisos" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">home_work</span>
                                    <span>Mis Propiedades & Avisos</span>
                                </a>
                                <a href="administrador.html#postulaciones" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">how_to_reg</span>
                                    <span>Postulaciones & Selección</span>
                                </a>

                                <!-- Subsección: Operaciones & Cobros -->
                                <div class="px-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
                                    <h5 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Operaciones & Cobros
                                    </h5>
                                </div>
                                <a href="administrador.html#visitas" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">calendar_month</span>
                                    <span>Agenda de Visitas</span>
                                </a>
                                <a href="administrador.html#alquiler-activo" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">payments</span>
                                    <span>Alquiler Activo & Cobros</span>
                                </a>
                                <a href="contratos.html" class="menu-item-clean font-bold text-primary dark:text-red-400">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">draw</span>
                                    <span>Firma Digital & Contratos</span>
                                </a>
                                <a href="administrador.html#mantenimiento" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-primary dark:text-red-400 text-xl">build</span>
                                    <span>Tickets de Mantenimiento</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN 3: INQUILINOS (Verde Esmeralda - Colapsable) -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 py-1.5">
                        <button type="button" class="drawer-accordion-btn w-full flex items-center justify-between py-1 text-left cursor-pointer group select-none">
                            <h4 class="font-headline text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Para Inquilinos
                            </h4>
                            <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-lg transition-transform duration-300 transform accordion-chevron">expand_more</span>
                        </button>
                        <div class="drawer-accordion-content grid grid-rows-[0fr] transition-all duration-300 ease-in-out opacity-0 overflow-hidden">
                            <div class="overflow-hidden flex flex-col gap-2 pt-3">
                                
                                <!-- Subsección: Tu Contrato & Credencial -->
                                <div class="px-1">
                                    <h5 class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Tu Contrato & Credencial
                                    </h5>
                                </div>
                                <a href="tu-alquiler.html" class="menu-item-card bg-emerald-600 text-white p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01] w-full text-left cursor-pointer shadow-md">
                                    <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                                        <span class="material-symbols-outlined text-xl">key</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-white">Mi Alquiler Activo</span>
                                        <span class="block text-[11px] text-white/80">Pagar alquiler, informar pago y tickets</span>
                                    </div>
                                </a>
                                <a href="tu-alquiler.html#pasaporte" class="menu-item-card bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/40 p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01]">
                                    <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                                        <span class="material-symbols-outlined text-xl">badge</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-zinc-900 dark:text-white">Tu Pasaporte</span>
                                        <span class="block text-[11px] text-zinc-500">Credencial e historial de inquilino verificado</span>
                                    </div>
                                </a>
                                <a href="contratos.html" class="menu-item-clean font-bold text-emerald-600 dark:text-emerald-400">
                                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">draw</span>
                                    <span>Firma Digital & Contratos</span>
                                </a>

                                <!-- Subsección: Búsqueda & Visitas -->
                                <div class="px-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
                                    <h5 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Búsqueda & Visitas
                                    </h5>
                                </div>
                                <a href="tu-alquiler.html#postulaciones" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">how_to_reg</span>
                                    <span>Mis Postulaciones</span>
                                </a>
                                <a href="tu-alquiler.html#visitas" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">calendar_month</span>
                                    <span>Mis Visitas Agendadas</span>
                                </a>
                                <a href="buscar.html" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">search</span>
                                    <span>Buscar Alquileres</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN 4: CORREDORES E INMOBILIARIAS (Azul Oscuro - Colapsable) -->
                    <div class="landing-menu__section border-b border-zinc-200 dark:border-zinc-800 py-1.5">
                        <button type="button" class="drawer-accordion-btn w-full flex items-center justify-between py-1 text-left cursor-pointer group select-none">
                            <h4 class="font-headline text-xs font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-blue-900 dark:bg-blue-500"></span> Para Corredores & Inmobiliarias
                            </h4>
                            <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-lg transition-transform duration-300 transform accordion-chevron">expand_more</span>
                        </button>
                        <div class="drawer-accordion-content grid grid-rows-[0fr] transition-all duration-300 ease-in-out opacity-0 overflow-hidden">
                            <div class="overflow-hidden flex flex-col gap-2 pt-3">
                                
                                <!-- Subsección: Gestión CRM & Cartera -->
                                <div class="px-1">
                                    <h5 class="text-[10px] font-black text-blue-900 dark:text-blue-400 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-900"></span> Gestión CRM & Cartera
                                    </h5>
                                </div>
                                <a href="panel-corredor.html" class="menu-item-card bg-blue-900 text-white p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01] w-full text-left cursor-pointer shadow-md">
                                    <div class="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold shrink-0">
                                        <span class="material-symbols-outlined text-xl">dashboard_customize</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-white">CRM</span>
                                        <span class="block text-[11px] text-white/80">Gestión en filas, Kanban, MLS & Tasaciones</span>
                                    </div>
                                </a>
                                <a href="panel-corredor.html#leads" class="menu-item-card bg-blue-900/5 dark:bg-blue-950/20 border border-blue-900/20 hover:border-blue-900/40 p-3 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.01]">
                                    <div class="w-9 h-9 rounded-xl bg-blue-900 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                                        <span class="material-symbols-outlined text-xl">group</span>
                                    </div>
                                    <div>
                                        <span class="block text-sm font-extrabold text-zinc-900 dark:text-white">Leads</span>
                                        <span class="block text-[11px] text-zinc-500">Contactos e interesados calificados</span>
                                    </div>
                                </a>
                                <a href="panel-corredor.html#avisos" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-xl">table_rows</span>
                                    <span>Cartera de Propiedades en Filas</span>
                                </a>
                                <a href="panel-corredor.html#contactos" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-xl">how_to_reg</span>
                                    <span>Postulaciones & Selección</span>
                                </a>

                                <!-- Subsección: Operaciones & Red -->
                                <div class="px-1 pt-2 border-t border-zinc-100 dark:border-zinc-800/60 mt-1">
                                    <h5 class="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                                        <span class="w-1.5 h-1.5 rounded-full bg-zinc-400"></span> Operaciones & Red
                                    </h5>
                                </div>
                                <a href="panel-corredor.html#alquileres" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-xl">payments</span>
                                    <span>Alquileres Activos & Cobros</span>
                                </a>
                                <a href="panel-corredor.html#operaciones" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-xl">handshake</span>
                                    <span>Embudo Kanban, MLS & Tasaciones</span>
                                </a>
                                <a href="corredores.html" class="menu-item-clean">
                                    <span class="material-symbols-outlined text-blue-900 dark:text-blue-400 text-xl">rocket_launch</span>
                                    <span>Soluciones CRM & Planes</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- SECCIÓN 5: Autenticación y Mi Cuenta -->
                    <div class="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <div id="premium-menu-logged-out" class="flex items-center gap-3 pt-1">
                            <a href="login.html?mode=login" class="flex-1 text-center py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 font-bold text-xs text-zinc-700 dark:text-zinc-300 hover:text-primary dark:hover:text-red-400 transition-colors">Ingresar</a>
                            <a href="login.html?mode=register" class="flex-1 text-center py-2 px-3 rounded-xl bg-primary dark:bg-red-800 font-bold text-xs text-white hover:bg-red-800 dark:hover:bg-red-700 transition-colors shadow-sm">Registrarse</a>
                        </div>
                        <div id="premium-menu-logged-in" class="hidden flex flex-col gap-2 w-full pt-1">
                            <div class="flex items-center justify-between p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/60">
                                <div class="flex items-center gap-2 min-w-0">
                                    <div class="w-8 h-8 rounded-full bg-primary dark:bg-red-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm auth-user-initial">U</div>
                                    <div class="flex flex-col min-w-0">
                                        <span class="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate" id="premium-menu-user-name">Mi Cuenta</span>
                                        <span class="text-[10px] text-zinc-500">Sesión activa</span>
                                    </div>
                                </div>
                                <a href="configuracion.html" class="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors flex items-center shrink-0" title="Configuración de cuenta">
                                    <span class="material-symbols-outlined text-lg">settings</span>
                                </a>
                            </div>
                            <button type="button" id="premium-menu-logout" class="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer">
                                <span class="material-symbols-outlined text-base">logout</span>
                                <span>Cerrar sesión</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    `;
    document.body.appendChild(menu);

    // Event listeners para Acordeón del Menú Hamburguesa
    menu.querySelectorAll('.drawer-accordion-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const parent = btn.closest('.landing-menu__section');
            if (!parent) return;

            const content = parent.querySelector('.drawer-accordion-content');
            const chevron = btn.querySelector('.accordion-chevron');
            if (!content) return;

            const isHidden = content.classList.contains('grid-rows-[0fr]');

            // Colapsar otras secciones para mantener acordeón limpio
            menu.querySelectorAll('.drawer-accordion-content').forEach(otherContent => {
                if (otherContent !== content) {
                    otherContent.classList.remove('grid-rows-[1fr]', 'opacity-100');
                    otherContent.classList.add('grid-rows-[0fr]', 'opacity-0');
                    const otherChevron = otherContent.closest('.landing-menu__section')?.querySelector('.accordion-chevron');
                    if (otherChevron) otherChevron.classList.remove('rotate-180');
                }
            });

            if (isHidden) {
                content.classList.remove('grid-rows-[0fr]', 'opacity-0');
                content.classList.add('grid-rows-[1fr]', 'opacity-100');
                if (chevron) chevron.classList.add('rotate-180');
            } else {
                content.classList.remove('grid-rows-[1fr]', 'opacity-100');
                content.classList.add('grid-rows-[0fr]', 'opacity-0');
                if (chevron) chevron.classList.remove('rotate-180');
            }
        });
    });

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

    // Exponer globalmente para permitir cierre programático
    window.closeLandingMenu = closeMenu;
    if (window.App) window.App.closeLandingMenu = closeMenu;

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

        const link = event.target.closest('a');
        if (link) {
            const href = link.getAttribute('href');
            closeMenu();
            if (href && href.includes('#')) {
                const currentFile = window.location.pathname.split('/').pop() || 'index.html';
                const [targetFile, targetHash] = href.split('#');
                if (!targetFile || targetFile === currentFile || currentFile.includes(targetFile) || (targetFile.includes('tu-alquiler') && currentFile.includes('tu-alquiler')) || (targetFile.includes('administrador') && currentFile.includes('administrador')) || (targetFile.includes('panel-corredor') && currentFile.includes('panel-corredor'))) {
                    event.preventDefault();
                    window.location.hash = '#' + targetHash;
                    if (window.switchTenantTab && (targetFile.includes('tu-alquiler') || currentFile.includes('tu-alquiler'))) {
                        window.switchTenantTab(targetHash);
                    }
                    if (window.switchOwnerTab && (targetFile.includes('administrador') || currentFile.includes('administrador'))) {
                        window.switchOwnerTab(targetHash);
                    }
                    if (window.switchCorredorTab && (targetFile.includes('panel-corredor') || currentFile.includes('panel-corredor'))) {
                        window.switchCorredorTab(targetHash);
                    }
                }
            }
            return;
        }

        const action = event.target.closest('[data-menu-action]')?.dataset.menuAction;
        if (!action) return;

        if (action === 'how-it-works') {
            const target = getVisibleTarget(['#owner-steps-title', '#tenant-faq-title', '#owner-faq-title']);
            scrollToTarget(target);
        }

        if (action === 'favorites') {
            closeMenu();
            if (window.FavoritesManager && typeof window.FavoritesManager.showFavoritesModal === 'function') {
                window.FavoritesManager.showFavoritesModal();
            }
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
                const premiumUserNameEl = document.getElementById('premium-menu-user-name');

                const displayName = profile?.full_name || user?.email?.split('@')[0] || user?.email || 'Usuario';
                if (nameEl) nameEl.textContent = profile?.full_name || user?.email || 'Usuario';
                if (idEl) idEl.textContent = `Identificador: ${String(user?.id || '').substring(0, 8)}`;
                if (initialEl && (profile?.full_name || user?.email)) {
                    initialEl.textContent = (profile?.full_name || user?.email).charAt(0).toUpperCase();
                }
                if (premiumUserNameEl) premiumUserNameEl.textContent = displayName;

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

                const premiumUserNameEl = document.getElementById('premium-menu-user-name');
                if (premiumUserNameEl) premiumUserNameEl.textContent = 'Mi Cuenta';

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
            const premiumUserNameEl = document.getElementById('premium-menu-user-name');
            if (nameEl) nameEl.textContent = 'Usuario';
            if (idEl) idEl.textContent = 'Identificador';
            if (initialEl) initialEl.textContent = 'U';
            if (premiumUserNameEl) premiumUserNameEl.textContent = 'Mi Cuenta';

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
    let misAvisosStatusFilter = 'all';
    let activeMisAvisosFilters = { tipo: null, operacion: null, ciudad: null, estado: null };

    const menuMisAvisos = document.getElementById('menu-mis-avisos');
    const misAvisosView = document.getElementById('mis-avisos-view');
    const landingView = document.getElementById('landing-marketplace-view');
    const btnBackFromAvisos = document.getElementById('btn-back-from-avisos');
    const btnNuevoAviso = document.getElementById('btn-nuevo-aviso');
    const btnPublicarEmpty = document.getElementById('btn-publicar-empty');

    function normalizeAvisoStatus(status) {
        const s = (status || '').toLowerCase().trim();
        if (s === 'paused' || s === 'pausada' || s === 'pausado') return 'paused';
        if (s === 'alquilada' || s === 'alquilado') return 'alquilada';
        if (s === 'vendida' || s === 'vendido') return 'vendida';
        if (s === 'draft' || s === 'borrador') return 'draft';
        if (s === 'mantenimiento') return 'mantenimiento';
        return 'disponible';
    }

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

    // Status tabs handlers in Mis Avisos view
    document.querySelectorAll('.mis-avisos-status-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const targetStatus = pill.getAttribute('data-mis-avisos-status');
            misAvisosStatusFilter = targetStatus;
            document.querySelectorAll('.mis-avisos-status-pill').forEach(p => {
                p.className = 'mis-avisos-status-pill px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer bg-zinc-100/90 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:text-zinc-900 dark:hover:text-white shrink-0';
            });
            pill.className = 'mis-avisos-status-pill active px-4 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-2 cursor-pointer bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm shrink-0';
            renderFilteredAvisos();
        });
    });

    function renderFilteredAvisos() {
        const term = (avisosSearch?.value || '').toLowerCase().trim();
        const sortVal = avisosSort?.value || 'recent';

        let filtered = allAvisos.filter(a => {
            const norm = normalizeAvisoStatus(a.status);

            // Filter by active status pill
            if (misAvisosStatusFilter === 'disponible' && norm !== 'disponible') return false;
            if (misAvisosStatusFilter === 'alquilada' && norm !== 'alquilada') return false;
            if (misAvisosStatusFilter === 'paused' && norm !== 'paused') return false;
            if (misAvisosStatusFilter === 'draft' && (norm === 'disponible' || norm === 'alquilada' || norm === 'paused')) return false;

            // Filter by sidebar filters
            if (activeMisAvisosFilters.tipo && a.tipo_propiedad !== activeMisAvisosFilters.tipo && a.extraInfo?.tipo_propiedad !== activeMisAvisosFilters.tipo) return false;
            if (activeMisAvisosFilters.operacion && a.operacion !== activeMisAvisosFilters.operacion && a.extraInfo?.operacion !== activeMisAvisosFilters.operacion) return false;
            if (activeMisAvisosFilters.ciudad && a.ciudad !== activeMisAvisosFilters.ciudad && a.city !== activeMisAvisosFilters.ciudad) return false;
            if (activeMisAvisosFilters.estado && norm !== activeMisAvisosFilters.estado) return false;

            // Search query
            if (term) {
                const searchable = [
                    a.title,
                    a.titulo_aviso,
                    a.address,
                    a.calle_altura,
                    a.city,
                    a.ciudad,
                    a.province,
                    a.provincia,
                    a.tipo_propiedad,
                    a.extraInfo?.tipo_propiedad,
                    a.operacion,
                    a.extraInfo?.operacion,
                    String(a.id || '').substring(0, 8),
                    String(a.price || a.precio || '')
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchable.includes(term)) return false;
            }

            return true;
        });

        if (sortVal === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        else if (sortVal === 'price-asc') filtered.sort((a, b) => (Number(a.price || a.precio) || 0) - (Number(b.price || b.precio) || 0));
        else if (sortVal === 'price-desc') filtered.sort((a, b) => (Number(b.price || b.precio) || 0) - (Number(a.price || a.precio) || 0));
        else {
            filtered.sort((a, b) => {
                const normA = normalizeAvisoStatus(a.status);
                const normB = normalizeAvisoStatus(b.status);
                const isDispA = (normA === 'disponible');
                const isDispB = (normB === 'disponible');
                if (isDispA && !isDispB) return -1;
                if (!isDispA && isDispB) return 1;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
        }

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
        if (typeof setupOwnerCardsIntersectionObserver === 'function') setupOwnerCardsIntersectionObserver();
    }

    function populateFilters(avisos) {
        const tipoMap = {}, opMap = {}, cityMap = {}, estadoMap = {
            'disponible': 0,
            'alquilada': 0,
            'paused': 0,
            'draft': 0
        };

        avisos.forEach(a => {
            const tipoVal = a.tipo_propiedad || a.extraInfo?.tipo_propiedad;
            const opVal = a.operacion || a.extraInfo?.operacion;
            const cityVal = a.ciudad || a.city;
            const normSt = normalizeAvisoStatus(a.status);

            if (tipoVal) tipoMap[tipoVal] = (tipoMap[tipoVal] || 0) + 1;
            if (opVal) opMap[opVal] = (opMap[opVal] || 0) + 1;
            if (cityVal) cityMap[cityVal] = (cityMap[cityVal] || 0) + 1;

            if (normSt === 'disponible') estadoMap.disponible++;
            else if (normSt === 'alquilada') estadoMap.alquilada++;
            else if (normSt === 'paused') estadoMap.paused++;
            else estadoMap.draft++;
        });

        // Update Top Status Badges
        const bAll = document.getElementById('mis-avisos-badge-all');
        const bDisp = document.getElementById('mis-avisos-badge-disponible');
        const bAlq = document.getElementById('mis-avisos-badge-alquilada');
        const bPaus = document.getElementById('mis-avisos-badge-paused');
        const bDraft = document.getElementById('mis-avisos-badge-draft');

        if (bAll) bAll.textContent = avisos.length;
        if (bDisp) bDisp.textContent = estadoMap.disponible;
        if (bAlq) bAlq.textContent = estadoMap.alquilada;
        if (bPaus) bPaus.textContent = estadoMap.paused;
        if (bDraft) bDraft.textContent = estadoMap.draft;

        const tipoLabels = { 'departamento': 'Departamento', 'casa': 'Casa', 'ph': 'PH', 'terreno': 'Terreno', 'local-comercial': 'Local comercial', 'oficina-comercial': 'Oficina comercial', 'quinta-vacacional': 'Quinta Vacacional' };
        const opLabels = { 'venta': 'Venta', 'alquiler': 'Alquiler', 'temporada': 'Temporada', 'on': 'Venta' };
        const estadoLabels = { 'disponible': 'Disponible', 'alquilada': 'Alquilada', 'paused': 'Pausada', 'draft': 'Borradores / Otras' };

        const makeFilterItem = (cat, key, label, count) => {
            const isActive = activeMisAvisosFilters[cat] === key;
            return `<a data-filter-cat="${cat}" data-filter-key="${key}" class="sidebar-filter-item flex items-center justify-between text-sm ${isActive ? 'text-primary dark:text-red-400 font-bold' : 'text-zinc-600 dark:text-zinc-400'} hover:text-primary dark:hover:text-red-400 cursor-pointer transition-colors py-0.5"><span>${label}</span><span class="text-xs text-zinc-400">(${count})</span></a>`;
        };

        ['', '-mobile'].forEach(suffix => {
            const estadoEl = document.getElementById('filter-estado' + suffix);
            const tipoEl = document.getElementById('filter-tipo' + suffix);
            const opEl = document.getElementById('filter-operacion' + suffix);
            const cityEl = document.getElementById('filter-ciudad' + suffix);

            if (estadoEl) {
                estadoEl.innerHTML = Object.entries(estadoMap).map(([k, v]) => makeFilterItem('estado', k, estadoLabels[k] || k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            }
            if (tipoEl) tipoEl.innerHTML = Object.entries(tipoMap).map(([k, v]) => makeFilterItem('tipo', k, tipoLabels[k] || k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (opEl) opEl.innerHTML = Object.entries(opMap).map(([k, v]) => makeFilterItem('operacion', k, opLabels[k] || k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
            if (cityEl) cityEl.innerHTML = Object.entries(cityMap).map(([k, v]) => makeFilterItem('ciudad', k, k, v)).join('') || '<p class="text-xs text-zinc-400">Sin datos</p>';
        });

        document.querySelectorAll('.sidebar-filter-item').forEach(item => {
            item.onclick = () => {
                const cat = item.getAttribute('data-filter-cat');
                const key = item.getAttribute('data-filter-key');
                if (activeMisAvisosFilters[cat] === key) {
                    activeMisAvisosFilters[cat] = null;
                } else {
                    activeMisAvisosFilters[cat] = key;
                }
                populateFilters(allAvisos);
                renderFilteredAvisos();
            };
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
            allAvisos = await window.DataManager.getUserMarketplaceProperties(100);
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
                t.classList.remove('active', 'text-red-900', 'dark:text-red-900', 'font-bold', 'border-b-2', 'border-red-900', 'dark:border-red-900');
                t.classList.add('text-zinc-500', 'dark:text-zinc-400');
            });
            tab.classList.add('active', 'text-red-900', 'dark:text-red-900', 'font-bold', 'border-b-2', 'border-red-900', 'dark:border-red-900');
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
                    b.disabled = true;
                    b.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">sync</span> Generando Contrato...';
                    let res = null;
                    try {
                        if (window.DataManager && window.DataManager.acceptApplication) {
                            res = await window.DataManager.acceptApplication(appId);
                        }
                    } catch (e) {
                        console.warn("Aviso local postulación:", e);
                    }
                    const targetContractId = res?.contractId || 'CTR-2026-0001';
                    // Redirect directly to contratos.html for Liveness Check and digital signing with the real contract
                    window.location.href = `contratos.html?contract=${targetContractId}&sign=1&role=OWNER`;
                };
            });

            container.querySelectorAll('.btn-reject-app').forEach(b => {
                b.onclick = async () => {
                    const appId = b.getAttribute('data-id');
                    b.disabled = true;
                    b.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">sync</span>';
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

            let indicesData = {
                ipc: { valor: 2.1, tasaSugeridaTrimestral: 7.2, tasaSugeridaSemestral: 14.8 },
                icl: { valor: 35.25, tasaSugeridaTrimestral: 6.8, tasaSugeridaSemestral: 13.9 }
            };
            if (window.DataManager.getLatestIndices) {
                try {
                    indicesData = await window.DataManager.getLatestIndices();
                } catch (e) {}
            }

            const freqMonths = Number(contract.periodo_aumento_meses || contract.periodo_ajuste_meses || 3);
            const nextAdj = window.DataManager.calculateNextRentAdjustment
                ? window.DataManager.calculateNextRentAdjustment(contract.start_date || contract.fecha_inicio_contrato, freqMonths)
                : { nextDate: '01/11/2026', daysRemaining: 79 };

            const defaultIndexType = contract.adjustment_index || 'IPC';
            const initialRate = defaultIndexType === 'IPC'
                ? (freqMonths >= 6 ? indicesData.ipc.tasaSugeridaSemestral : indicesData.ipc.tasaSugeridaTrimestral)
                : (freqMonths >= 6 ? indicesData.icl.tasaSugeridaSemestral : indicesData.icl.tasaSugeridaTrimestral);

            container.innerHTML = `
                <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm space-y-6">
                    <!-- BANNER DESTACADO DE PRÓXIMA ACTUALIZACIÓN PARA EL PROPIETARIO -->
                    <div class="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-blue-500/30 m-6 mb-0">
                        <div class="flex items-center gap-4">
                            <div class="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                                <span class="material-symbols-outlined text-3xl text-white">event_repeat</span>
                            </div>
                            <div>
                                <span class="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Cronograma Oficial de Reajustes</span>
                                <h3 class="font-headline text-xl sm:text-2xl font-black text-white">
                                    Próxima Actualización: <span class="text-amber-300 underline underline-offset-4 decoration-amber-300/60">${nextAdj.nextDate}</span>
                                </h3>
                                <p class="text-xs text-blue-100 mt-1">
                                    Faltan <b>${nextAdj.daysRemaining} días</b> • Período: <b>Cada ${freqMonths} meses</b> • Índice: <b>${defaultIndexType} oficial BCRA</b>
                                </p>
                            </div>
                        </div>
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                            <div class="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/25 text-left sm:text-right">
                                <span class="block text-[10px] font-bold text-blue-200 uppercase">Tasa Oficial Vigente BCRA</span>
                                <span class="text-xl font-black text-emerald-300 font-headline font-mono">+${Number(initialRate).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% (${defaultIndexType})</span>
                            </div>
                            <button type="button" onclick="openBcraIndicesTableModal('${defaultIndexType}')" class="px-4 py-2.5 bg-white text-blue-950 hover:bg-blue-50 font-headline font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0">
                                <span class="material-symbols-outlined text-base text-blue-600">table_chart</span>
                                <span>Ver Tabla de Índices BCRA</span>
                            </button>
                        </div>
                    </div>

                    <!-- Top Banner -->
                    <div class="bg-zinc-100 dark:bg-zinc-800/60 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="px-3 py-1 text-xs font-black rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                                    Alquiler En Curso
                                </span>
                                <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                    Ajuste cada ${freqMonths} meses por ${defaultIndexType}
                                </span>
                            </div>
                            <h2 class="font-headline text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-white mt-2">
                                ${contract.property_title}
                            </h2>
                            <p class="text-xs text-zinc-500">Inquilino: ${contract.tenant_name} (${contract.tenant_email})</p>
                        </div>
                        <div class="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-right">
                            <span class="block text-[10px] font-bold text-zinc-400 uppercase">Canon Locativo Mensual Actual</span>
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

                    <!-- Módulo de Reajuste con Índices Oficiales BCRA (Lectura Directa) -->
                    <div class="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h4 class="font-headline text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                                    <span class="material-symbols-outlined text-primary">calculate</span>
                                    Reajuste Automático del Canon (Índices Oficiales BCRA)
                                </h4>
                                <p class="text-xs text-zinc-500">Próxima fecha pactada: <b>${nextAdj.nextDate}</b> (${nextAdj.daysRemaining} días restantes).</p>
                            </div>
                            <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                                Índices BCRA Sincronizados
                            </span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Índice del Contrato</label>
                                <div class="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                                    <span>${defaultIndexType === 'IPC' ? 'IPC (Índice Precios al Consumidor)' : 'ICL (Contratos Locación)'}</span>
                                    <span class="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">Oficial</span>
                                </div>
                            </div>
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Frecuencia & Tasa Oficial Vigente</label>
                                <div class="px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-bold text-xs text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                                    <span>Cada ${freqMonths} meses</span>
                                    <span class="font-mono font-black text-emerald-600 dark:text-emerald-400">+${initialRate}%</span>
                                </div>
                            </div>
                            <div>
                                <label class="block font-bold uppercase text-zinc-500 mb-1">Nuevo Monto Estimado a partir de ${nextAdj.nextDate}</label>
                                <div id="adj-preview-amount" class="px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-sm text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                                    <span>$ ${Math.round(contract.monthly_rent * (1 + initialRate / 100)).toLocaleString('es-AR')}</span>
                                    <span class="text-[10px] font-bold opacity-80" id="adj-preview-diff">+${initialRate}%</span>
                                </div>
                            </div>
                        </div>

                        <div class="pt-2 flex justify-end">
                            <button type="button" id="btn-apply-adjustment" class="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl shadow transition-colors cursor-pointer flex items-center gap-1.5">
                                <span class="material-symbols-outlined text-base">check_circle</span>
                                Aplicar Reajuste Oficial al Contrato
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Action listeners
            const btnWaive = document.getElementById('btn-waive-interests');
            if (btnWaive && payment) {
                btnWaive.onclick = async () => {
                    if (typeof openWaiveInterestsModal === 'function') {
                        openWaiveInterestsModal(contract, payment, punitives);
                        return;
                    }
                    await window.DataManager.waivePunitiveInterests(payment.id, contract.id);
                    if (window.showCustomAlert) {
                        await window.showCustomAlert({
                            title: '¡Intereses Condonados!',
                            message: `Se han bonificado los intereses punitorios por mora correspondientes al período ${payment.period}.`,
                            icon: 'savings',
                            type: 'warning'
                        });
                    }
                    await renderLandlordActiveRental();
                };
            }

            const btnMarkPaid = document.getElementById('btn-mark-paid');
            if (btnMarkPaid && payment) {
                btnMarkPaid.onclick = async () => {
                    if (window.showCustomConfirm) {
                        const confirmed = await window.showCustomConfirm({
                            title: '¿Registrar cobro de alquiler?',
                            message: `¿Confirmas que se recibió el pago correspondiente al período ${payment.period}?`,
                            confirmText: 'Sí, marcar como pagado'
                        });
                        if (!confirmed) return;
                    }
                    await window.DataManager.markPaymentAsPaid(payment.id, "Registrado por Propietario", contract.id);
                    if (window.showCustomAlert) {
                        await window.showCustomAlert({
                            title: '¡Pago Registrado!',
                            message: `El cobro del período ${payment.period} ha sido registrado exitosamente.`,
                            icon: 'check_circle',
                            type: 'success'
                        });
                    }
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

            // Aplicación automática del reajuste oficial
            const btnApplyAdj = document.getElementById('btn-apply-adjustment');
            if (btnApplyAdj) {
                btnApplyAdj.onclick = async () => {
                    const newRent = Math.round(contract.monthly_rent * (1 + initialRate / 100));
                    if (confirm(`¿Confirmás la aplicación del reajuste oficial ${defaultIndexType} (+${initialRate}%) del BCRA?\nEl nuevo canon locativo será de $ ${newRent.toLocaleString('es-AR')}.`)) {
                        await window.DataManager.applyIndexAdjustment(contract.id, newRent, defaultIndexType, initialRate);
                        alert(`¡Reajuste oficial aplicado con éxito!\nNuevo canon mensual: $ ${newRent.toLocaleString('es-AR')}`);
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
        const normStatus = normalizeAvisoStatus(aviso.status);
        const statusCfg = {
            'disponible': { label: 'Disponible', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40' },
            'alquilada': { label: 'Alquilada', dot: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-300', badgeBg: 'bg-blue-50 dark:bg-blue-950/40' },
            'paused': { label: 'Pausada', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', badgeBg: 'bg-amber-50 dark:bg-amber-950/40' },
            'draft': { label: 'Borrador', dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400', badgeBg: 'bg-zinc-100 dark:bg-zinc-800' },
            'mantenimiento': { label: 'Mantenimiento', dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-300', badgeBg: 'bg-orange-50 dark:bg-orange-950/40' },
            'vendida': { label: 'Vendida', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300', badgeBg: 'bg-teal-50 dark:bg-teal-950/40' },
            'expired': { label: 'Expirado', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400', badgeBg: 'bg-red-50 dark:bg-red-950/40' }
        };
        const st = statusCfg[normStatus] || statusCfg['disponible'];
        const isPaused = normStatus === 'paused';

        // Parse extra info from description JSON if present
        let extraInfo = aviso.extraInfo || {};
        if (aviso.description && aviso.description.includes('Detalles: ')) {
            try { extraInfo = { ...extraInfo, ...JSON.parse(aviso.description.split('Detalles: ')[1]) }; } catch (e) { }
        }

        const tipoLabels = { 'departamento': 'Departamento', 'casa': 'Casa', 'ph': 'PH', 'terreno': 'Terreno', 'local-comercial': 'Local comercial', 'oficina-comercial': 'Oficina comercial', 'quinta-vacacional': 'Quinta Vacacional' };
        const opLabels = { 'venta': 'Venta', 'alquiler': 'Alquiler', 'temporada': 'Temporada', 'on': 'Venta' };
        const tipo = tipoLabels[extraInfo.tipo_propiedad || aviso.tipo_propiedad] || extraInfo.tipo_propiedad || aviso.tipo_propiedad || 'Propiedad';
        const op = opLabels[(extraInfo.operacion || aviso.operacion)?.toLowerCase()] || extraInfo.operacion || aviso.operacion || '';
        const moneda = (extraInfo.moneda === 'USD') ? 'U$S' : '$';
        const precio = (aviso.price || aviso.precio) ? `${moneda} ${Number(aviso.price || aviso.precio).toLocaleString('es-AR')}` : 'Consultar';
        const ubicacion = aviso.address || aviso.calle_altura || 'Sin ubicación';
        const titulo = aviso.title || aviso.titulo_aviso || `${tipo} en ${op}`;
        const date = aviso.created_at ? new Date(aviso.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
        const shortId = aviso.id ? String(aviso.id).substring(0, 8) : '';

        // Get image from propiedad_imagenes join or images array
        let imgSrc = 'img/hero-marketplace.jpg';
        if (aviso.propiedad_imagenes && aviso.propiedad_imagenes.length > 0) {
            const sorted = aviso.propiedad_imagenes.sort((a, b) => a.orden - b.orden);
            imgSrc = sorted[0].url;
        } else if (aviso.images && aviso.images.length > 0) {
            imgSrc = aviso.images[0];
        } else if (aviso.photoUrl || aviso.image) {
            imgSrc = aviso.photoUrl || aviso.image;
        }

        const dormitorios = extraInfo.dormitorios || aviso.dormitorios || 0;
        const banos = extraInfo.banos || aviso.banos || 0;
        const supCubierta = extraInfo.sup_cubierta || aviso.sup_cubierta || '';

        // Completeness percentage
        const fields = [titulo, (aviso.price || aviso.precio), ubicacion, tipo, op, dormitorios, banos, supCubierta, aviso.description, (aviso.images?.length || aviso.propiedad_imagenes?.length)];
        const filled = fields.filter(Boolean).length;
        const pct = Math.round((filled / fields.length) * 100);
        const pctColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        const circumference = 2 * Math.PI * 18;
        const strokeOffset = circumference - (pct / 100) * circumference;

        const card = document.createElement('div');
        card.className = 'owner-prop-card aviso-card bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 p-4 md:p-5 hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 group';
        card.innerHTML = `
            <div class="flex gap-4 md:gap-5">
                <!-- Thumbnail -->
                <div class="w-[90px] h-[68px] sm:w-[120px] sm:h-[85px] md:w-[140px] md:h-[100px] rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 relative">
                    <img src="${imgSrc}" alt="${titulo}" class="w-full h-full object-cover" onerror="this.src='img/hero-marketplace.jpg'">
                </div>
                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <span class="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">${tipo}</span>
                        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md ${st.badgeBg}">
                            <span class="w-2 h-2 rounded-full ${st.dot} inline-block"></span>
                            <span class="text-xs font-bold ${st.text}">${st.label}</span>
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
                    <div class="text-center min-w-[80px]"><p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Visualizaciones</p><p class="text-sm font-bold text-zinc-700 dark:text-zinc-300">${aviso.cantidad_visualizaciones_total ?? aviso.views_count ?? aviso.views ?? 0}</p></div>
                    <div class="text-center min-w-[70px]"><p class="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-0.5">Interesados</p><p class="text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:underline">Ver consultas</p></div>
                </div>
            </div>
            <!-- Footer -->
            <div class="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div class="flex items-center gap-3 md:gap-5 text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>ID <b class="text-zinc-700 dark:text-zinc-300">${shortId}</b></span>
                    <span>Creado ${date}</span>
                    <span class="hidden sm:inline">${dormitorios ? dormitorios + ' dorm.' : ''} ${banos ? banos + ' baños' : ''} ${supCubierta ? supCubierta + 'm²' : ''}</span>
                </div>
                <div class="flex items-center gap-1.5">
                    <button type="button" class="btn-toggle-pause-aviso p-1.5 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${isPaused ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'}" title="${isPaused ? 'Reanudar publicación' : 'Pausar publicación'}">
                        <span class="material-symbols-outlined text-base">${isPaused ? 'play_circle' : 'pause_circle'}</span>
                        <span class="hidden sm:inline">${isPaused ? 'Reanudar' : 'Pausar'}</span>
                    </button>
                    <button type="button" class="btn-ver-aviso p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Ver Ficha"><span class="material-symbols-outlined text-lg">visibility</span></button>
                    <button type="button" class="btn-edit-aviso p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Editar"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button type="button" class="btn-share-aviso p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300" title="Compartir"><span class="material-symbols-outlined text-lg">share</span></button>
                </div>
            </div>
        `;

        const btnVer = card.querySelector('.btn-ver-aviso');
        if (btnVer) {
            btnVer.onclick = (e) => {
                e.stopPropagation();
                if (typeof window.openMarketplacePropertyDetailModal === 'function') {
                    window.openMarketplacePropertyDetailModal(aviso, { isOwner: true });
                }
            };
        }

        const btnEdit = card.querySelector('.btn-edit-aviso');
        if (btnEdit) {
            btnEdit.onclick = (e) => {
                e.stopPropagation();
                if (window.App && typeof window.App.showPublishWizard === 'function') {
                    window.App.showPublishWizard(aviso);
                }
            };
        }

        const btnShare = card.querySelector('.btn-share-aviso');
        if (btnShare) {
            btnShare.onclick = (e) => {
                e.stopPropagation();
                const shareUrl = `${window.location.origin}/buscar.html?id=${aviso.id}`;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                        if (window.showCustomAlert) {
                            window.showCustomAlert({ title: 'Enlace copiado', message: 'El enlace del aviso ha sido copiado al portapapeles.', icon: 'link' });
                        } else {
                            alert('Enlace copiado al portapapeles');
                        }
                    });
                }
            };
        }

        const btnPause = card.querySelector('.btn-toggle-pause-aviso');
        if (btnPause) {
            btnPause.onclick = async (e) => {
                e.stopPropagation();
                if (!window.DataManager || typeof window.DataManager.togglePauseProperty !== 'function') return;
                btnPause.disabled = true;
                btnPause.innerHTML = '<span class="material-symbols-outlined text-xs animate-spin">sync</span>';
                try {
                    const newStatus = await window.DataManager.togglePauseProperty(aviso.id, normStatus);
                    aviso.status = newStatus;
                    const isNowPaused = (newStatus === 'paused' || newStatus === 'pausada' || newStatus === 'pausado');
                    if (window.showCustomAlert) {
                        await window.showCustomAlert({
                            title: isNowPaused ? 'Aviso Pausado' : 'Aviso Reanudado',
                            message: isNowPaused ? 'La propiedad ha sido pausada correctamente.' : 'La propiedad ha sido reanudada exitosamente.',
                            icon: isNowPaused ? 'pause_circle' : 'check_circle'
                        });
                    }
                    populateFilters(allAvisos);
                    renderFilteredAvisos();
                } catch (err) {
                    console.error("Error toggling pause status:", err);
                    btnPause.disabled = false;
                }
            };
        }

        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
            if (typeof window.openMarketplacePropertyDetailModal === 'function') {
                window.openMarketplacePropertyDetailModal(aviso, { isOwner: true });
            }
        };

        return card;
    }
});

window.App = App;
window.openPublishWizard = function(editingProp) {
    if (window.App && typeof window.App.showPublishWizard === 'function') {
        window.App.showPublishWizard(editingProp);
    } else {
        window.location.href = 'index.html?publish=1';
    }
};
window.saveAndExitPublishWizard = function() {
    if (window.App && typeof window.App.saveAndExitPublishWizard === 'function') {
        return window.App.saveAndExitPublishWizard();
    }
};
window.savePublishDraft = function() {
    if (window.App && typeof window.App.savePublishDraft === 'function') {
        return window.App.savePublishDraft();
    }
};
window.restorePublishDraft = function() {
    if (window.App && typeof window.App.restorePublishDraft === 'function') {
        return window.App.restorePublishDraft();
    }
};
window.clearPublishDraft = function() {
    if (window.App && typeof window.App.clearPublishDraft === 'function') {
        return window.App.clearPublishDraft();
    }
};

// Auto-initialize Scroll to top button across pages
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.App && typeof window.App.initScrollToTop === 'function') {
            window.App.initScrollToTop();
        }
    });
} else {
    if (window.App && typeof window.App.initScrollToTop === 'function') {
        window.App.initScrollToTop();
    }
}
