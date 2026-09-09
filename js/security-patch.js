// Gestor ultrarrápido y fluido de cambio de tema (Claro / Oscuro)
// Elimina desincronizaciones y elementos trabados bloqueando transiciones lentas en elementos generales,
// pero permitiendo que el interruptor (.theme-switch) se anime con total fluidez a 60/120fps.
window.__vivatApplyTheme = function (theme) {
    const isDark = theme === 'dark';
    const darkBg = '#09090b';
    const lightBg = '#f8fafc';
    const r = document.documentElement;

    // Si ya está en ese tema, solo asegurar checkboxes y salir
    const currentlyDark = r.classList.contains('dark') || r.getAttribute('data-theme') === 'dark';
    if (currentlyDark === isDark && window.__vivatCurrentTheme === theme) {
        document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
            if (cb.checked !== isDark) cb.checked = isDark;
        });
        return;
    }
    window.__vivatCurrentTheme = theme;

    // 1. Candado instantáneo de transiciones: excluye explícitamente el interruptor animado (.theme-switch)
    // para que el toggle deslice suavemente mientras los 100+ elementos de la página cambian sin lag ni retrasos.
    let lock = document.getElementById('vivat-theme-transition-lock');
    if (!lock) {
        lock = document.createElement('style');
        lock.id = 'vivat-theme-transition-lock';
        lock.textContent = `
            *:not(.theme-switch, .theme-switch *, .theme-switch__container, .theme-switch__container *),
            *:not(.theme-switch, .theme-switch *, .theme-switch__container, .theme-switch__container *)::before,
            *:not(.theme-switch, .theme-switch *, .theme-switch__container, .theme-switch__container *)::after {
                -webkit-transition: none !important;
                -moz-transition: none !important;
                -o-transition: none !important;
                -ms-transition: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(lock);
    }

    // 2. Aplicación de atributos y estilos de fondo de manera síncrona
    if (isDark) {
        r.setAttribute('data-theme', 'dark');
        r.classList.add('dark');
        r.style.backgroundColor = darkBg;
        r.style.colorScheme = 'dark';
        if (document.body) {
            document.body.style.backgroundColor = darkBg;
            document.body.classList.add('dark');
        }
    } else {
        r.removeAttribute('data-theme');
        r.classList.remove('dark');
        r.style.backgroundColor = lightBg;
        r.style.colorScheme = 'light';
        if (document.body) {
            document.body.style.backgroundColor = lightBg;
            document.body.classList.remove('dark');
        }
    }

    try {
        localStorage.setItem('theme', theme);
    } catch (e) {}

    // Sincronizar todos los interruptores sin disparar eventos en cascada
    document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
        if (cb.checked !== isDark) cb.checked = isDark;
    });

    // 3. Forzar que el motor de renderizado asimile el cambio de tema de inmediato sin transiciones
    if (document.body) {
        void window.getComputedStyle(document.body).opacity;
    }

    // 4. Liberar el candado en el próximo ciclo para que las interacciones normales (hover, modales) sigan activas
    setTimeout(() => {
        const el = document.getElementById('vivat-theme-transition-lock');
        if (el && el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }, 20);
};

// Reintento automático de scripts CDN ante desconexiones de red (ej. net::ERR_NETWORK_CHANGED)
window.__vivatRetryScript = function (scriptEl, maxRetries = 2) {
    if (!scriptEl || !scriptEl.src) return;
    let retries = parseInt(scriptEl.getAttribute('data-retries') || '0', 10);
    if (retries < maxRetries) {
        scriptEl.setAttribute('data-retries', String(retries + 1));
        const delay = (retries + 1) * 1500;
        setTimeout(() => {
            const nextScript = document.createElement('script');
            const baseSrc = scriptEl.src.split('#')[0];
            nextScript.src = baseSrc + (baseSrc.includes('?') ? '&' : '?') + '_rt=' + Date.now();
            nextScript.onerror = function () {
                window.__vivatRetryScript(nextScript, maxRetries);
            };
            document.head.appendChild(nextScript);
        }, delay);
    }
};

// Interceptar y silenciar advertencias de obsolescencia de librerías de terceros (Google Maps Places Autocomplete, Tailwind CDN)
(function () {
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;

    function shouldSuppress(text) {
        const lower = String(text || '').toLowerCase();
        return (
            lower.includes('cdn.tailwindcss.com should not be used in production') ||
            lower.includes('google.maps.places.autocomplete is not available to new customers') ||
            lower.includes('placeautocompleteelement is recommended over google.maps.places.autocomplete') ||
            (lower.includes('autocomplete') && lower.includes('placeautocompleteelement'))
        );
    }

    console.warn = function (...args) {
        const fullText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a || ''))).join(' ');
        if (shouldSuppress(fullText)) return;
        originalConsoleWarn.apply(console, args);
    };

    console.error = function (...args) {
        const fullText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a || ''))).join(' ');
        if (shouldSuppress(fullText)) return;
        originalConsoleError.apply(console, args);
    };
})();

// Silenciar excepciones no controladas de extensiones de navegador o librerías de rendimiento externas (Web Vitals / reportAllChanges / startTime)
(function () {
    function isExternalIgnorableError(msg, err) {
        var text = (String(msg || '') + ' ' + String(err?.message || '') + ' ' + String(err?.stack || '') + ' ' + String(err || '')).toLowerCase();
        return text.includes('starttime') || text.includes('reportallchanges') || text.includes('reportall') || (text.includes('autocomplete') && text.includes('placeautocompleteelement'));
    }

    // Interceptar requestIdleCallback donde se ejecutan los cálculos asíncronos de Web Vitals / reportAllChanges
    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
        var origRequestIdleCallback = window.requestIdleCallback;
        window.requestIdleCallback = function (cb, options) {
            return origRequestIdleCallback.call(window, function (deadline) {
                try {
                    return cb(deadline);
                } catch (err) {
                    if (isExternalIgnorableError(err?.message, err)) {
                        return; // Suprimir silenciosamente el error de la librería externa
                    }
                    throw err;
                }
            }, options);
        };
    }

    var prevOnError = window.onerror;
    window.onerror = function (message, source, lineno, colno, error) {
        if (isExternalIgnorableError(message, error)) {
            return true; // Suprime el error en la consola del navegador
        }
        if (typeof prevOnError === 'function') {
            return prevOnError.apply(this, arguments);
        }
        return false;
    };

    window.addEventListener('error', function (event) {
        if (isExternalIgnorableError(event.message, event.error)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return true;
        }
    }, true);

    window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason;
        if (isExternalIgnorableError(reason?.message, reason)) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return true;
        }
    }, true);
})();


// Redirección canónica automática al nuevo dominio oficial vivat.com.ar
(function() {
    try {
        if (typeof window !== 'undefined' && window.location) {
            var host = window.location.hostname;
            if (host === 'app-alquileres-3-0.vercel.app' || (host.endsWith('.vercel.app') && host !== 'localhost')) {
                var target = 'https://vivat.com.ar' + window.location.pathname + window.location.search + window.location.hash;
                window.location.replace(target);
                return;
            }
        }
    } catch (e) {
        // Ignorar de forma segura
    }
})();

(function() {
    if (typeof window.DOMPurify === 'undefined') {
        return;
    }

    // Do not extend DOMPurify to permit executable content. Individual callers
    // may opt into narrowly-scoped iframe handling after validating its origin.
    const sanitizeOptions = {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'src']
    };
})();
