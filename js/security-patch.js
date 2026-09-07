// Gestor optimizado de cambio de tema (Claro / Oscuro) con bloqueo temporal de transiciones
// para garantizar un cambio 100% instantáneo (0ms) sin desfases visuales ni animaciones asíncronas
window.__vivatApplyTheme = function (theme) {
    const isDark = theme === 'dark';
    const darkBg = '#09090b';
    const lightBg = '#f8fafc';

    // 1. Candado instantáneo de transiciones CSS
    let lock = document.getElementById('vivat-theme-transition-lock');
    if (!lock) {
        lock = document.createElement('style');
        lock.id = 'vivat-theme-transition-lock';
        lock.textContent = `
            *, *::before, *::after {
                -webkit-transition: none !important;
                -moz-transition: none !important;
                -o-transition: none !important;
                -ms-transition: none !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(lock);
    }

    // 2. Aplicación síncrona de clases y atributos en html y body
    const r = document.documentElement;
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

    // Sincronizar checkboxes de tema
    document.querySelectorAll('.theme-switch__checkbox').forEach(cb => {
        cb.checked = isDark;
    });

    // 3. Forzar repintado síncrono del frame
    void r.offsetHeight;

    // 4. Liberar el candado para que las animaciones de interacción (hover, menús) sigan funcionando
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const el = document.getElementById('vivat-theme-transition-lock');
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });
    });
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
        var text = (String(msg || '') + ' ' + String(err?.message || '') + ' ' + String(err?.stack || '')).toLowerCase();
        return text.includes('starttime') || text.includes('reportallchanges') || text.includes('reportall') || (text.includes('autocomplete') && text.includes('placeautocompleteelement'));
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

    // Configuración para permitir iframes (ej. videos de YouTube, mapas)
    const sanitizeOptions = {
        ADD_TAGS: ['iframe', 'style', 'script'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'src', 'defer', 'async', 'type']
    };
})();
