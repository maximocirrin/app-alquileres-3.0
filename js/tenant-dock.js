/**
 * Vivat - Tenant Bottom Floating Dock Navigation
 * Secciones: Mi alquiler, Postulaciones, Visitas, Pasaporte
 */
(function () {
    const SECTIONS = [
        {
            id: 'tu-alquiler',
            label: 'Mi alquiler',
            href: 'tu-alquiler.html#alquiler',
            icon: 'key',
            matches: ['tu-alquiler.html', 'tu-hogar.html']
        },
        {
            id: 'postulaciones',
            label: 'Postulaciones',
            href: 'tu-alquiler.html#postulaciones',
            icon: 'how_to_reg',
            matches: ['postulaciones']
        },
        {
            id: 'visitas',
            label: 'Visitas',
            href: 'tu-alquiler.html#visitas',
            icon: 'calendar_month',
            matches: ['visitas']
        },
        {
            id: 'pasaporte',
            label: 'Tu pasaporte',
            href: 'tu-alquiler.html#pasaporte',
            icon: 'badge',
            matches: ['pasaporte-vivat.html', 'pasaporte']
        }
    ];

    function getActiveSectionId() {
        const path = window.location.pathname.toLowerCase();
        for (const section of SECTIONS) {
            if (section.matches.some(match => path.includes(match.toLowerCase()))) {
                return section.id;
            }
        }
        // Default to tu-alquiler if on a tenant sub-page or default
        return 'tu-alquiler';
    }

    function createDockMarkup(activeId) {
        return `
        <div id="tenant-floating-dock-container" class="fixed bottom-3 left-2 right-2 sm:bottom-4 sm:left-4 sm:right-4 z-[100] max-w-md mx-auto lg:fixed lg:left-0 lg:top-20 lg:bottom-0 lg:right-auto lg:w-[84px] lg:max-w-none lg:mx-0 lg:z-[90] lg:p-0">
            <nav id="floating-dock-nav" class="floating-dock relative rounded-full p-1 sm:p-1.5 flex items-center justify-between shadow-2xl lg:rounded-none lg:border-t-0 lg:border-b-0 lg:border-l-0 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800/80 lg:shadow-none lg:h-full lg:w-full lg:flex-col lg:justify-start lg:pt-6 lg:gap-2 lg:px-2">
                <!-- Burbuja Deslizante Activa -->
                <div id="dock-active-indicator" class="absolute rounded-full z-0 pointer-events-none"></div>

                ${SECTIONS.map(s => {
                    const isActive = s.id === activeId;
                    const activeClasses = isActive ? 'text-white font-extrabold active' : 'text-zinc-500 dark:text-zinc-400 font-medium hover:text-zinc-800 dark:hover:text-white';
                    return `
                    <a href="${s.href}" data-tab="${s.id}" class="tenant-dock-btn relative z-10 flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 px-1 sm:py-1.5 sm:px-2 rounded-full ${activeClasses} transition-colors cursor-pointer text-center no-underline" title="${s.label}">
                        <span class="material-symbols-outlined text-xl lg:text-2xl">${s.icon}</span>
                        <span class="text-[9px] sm:text-[10px] lg:text-[11px] truncate w-full leading-tight font-bold tracking-tight">${s.label}</span>
                    </a>
                    `;
                }).join('')}
            </nav>
        </div>
        `;
    }

    function updateSlidingIndicator(activeBtn) {
        const nav = document.getElementById('floating-dock-nav');
        const indicator = document.getElementById('dock-active-indicator');
        if (!nav || !indicator || !activeBtn) return;

        const navRect = nav.getBoundingClientRect();
        const btnRect = activeBtn.getBoundingClientRect();

        if (btnRect.width === 0 && btnRect.height === 0) return;

        if (window.innerWidth >= 1024) {
            // Modo Escritorio / Vertical (estilo Instagram)
            const topOffset = btnRect.top - navRect.top;
            indicator.style.top = `${topOffset}px`;
            indicator.style.height = `${btnRect.height}px`;
            indicator.style.left = '0.5rem';
            indicator.style.width = 'calc(100% - 1rem)';
            indicator.style.bottom = 'auto';
            indicator.style.right = '0.5rem';
        } else {
            // Modo Móvil / Horizontal (Dock Inferior)
            const leftOffset = btnRect.left - navRect.left;
            indicator.style.left = `${leftOffset}px`;
            indicator.style.width = `${btnRect.width}px`;
            indicator.style.top = '0.375rem';
            indicator.style.bottom = '0.375rem';
            indicator.style.height = 'auto';
            indicator.style.right = 'auto';
        }
    }

    function setupScrollHide() {
        let lastScrollY = window.scrollY;
        let isScrollTicking = false;

        window.addEventListener('scroll', () => {
            if (window.innerWidth >= 1024) return; // Permanente en escritorio
            if (!isScrollTicking) {
                window.requestAnimationFrame(() => {
                    const dockContainer = document.getElementById('tenant-floating-dock-container');
                    const currentScrollY = window.scrollY;
                    if (dockContainer) {
                        const scrollDelta = currentScrollY - lastScrollY;
                        if (Math.abs(scrollDelta) > 6) {
                            if (currentScrollY > lastScrollY && currentScrollY > 60) {
                                dockContainer.classList.add('is-hidden');
                            } else {
                                dockContainer.classList.remove('is-hidden');
                            }
                            lastScrollY = currentScrollY;
                        }
                    }
                    isScrollTicking = false;
                });
                isScrollTicking = true;
            }
        }, { passive: true });
    }

    function initTenantDock() {
        const activeId = getActiveSectionId();
        let dockContainer = document.getElementById('tenant-floating-dock-container');

        if (!dockContainer) {
            const div = document.createElement('div');
            div.innerHTML = createDockMarkup(activeId).trim();
            dockContainer = div.firstElementChild;
            document.body.appendChild(dockContainer);
        } else {
            // Update active states on existing buttons
            const btns = dockContainer.querySelectorAll('.tenant-dock-btn');
            btns.forEach(btn => {
                const tab = btn.getAttribute('data-tab');
                if (tab === activeId) {
                    btn.classList.add('text-white', 'font-extrabold', 'active');
                    btn.classList.remove('text-zinc-500', 'dark:text-zinc-400');
                } else {
                    btn.classList.remove('text-white', 'font-extrabold', 'active');
                    btn.classList.add('text-zinc-500', 'dark:text-zinc-400');
                }
            });
        }

        const activeBtn = dockContainer.querySelector(`.tenant-dock-btn[data-tab="${activeId}"]`) || dockContainer.querySelector('.tenant-dock-btn.active');
        
        function refreshIndicator() {
            if (activeBtn) updateSlidingIndicator(activeBtn);
        }

        // Multiple throttled triggers for smooth font/layout loading
        refreshIndicator();
        requestAnimationFrame(refreshIndicator);
        setTimeout(refreshIndicator, 50);
        setTimeout(refreshIndicator, 150);
        setTimeout(refreshIndicator, 400);

        window.addEventListener('resize', refreshIndicator);
        window.addEventListener('orientationchange', refreshIndicator);

        setupScrollHide();
    }

    window.TenantDock = {
        init: initTenantDock,
        updateIndicator: updateSlidingIndicator
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTenantDock);
    } else {
        initTenantDock();
    }
})();
