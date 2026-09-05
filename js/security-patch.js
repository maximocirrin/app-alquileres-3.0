// Silenciar excepciones no controladas de extensiones de navegador o librerías de rendimiento externas (Web Vitals / reportAllChanges / startTime)
(function () {
    function isExternalIgnorableError(msg, err) {
        var text = (String(msg || '') + ' ' + String(err?.message || '') + ' ' + String(err?.stack || '')).toLowerCase();
        return text.includes('starttime') || text.includes('reportallchanges') || text.includes('reportall');
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

(function() {
    if (typeof window.DOMPurify === 'undefined') {
        console.warn('DOMPurify no está cargado. La sanitización de seguridad global no está activa.');
        return;
    }

    // Configuración para permitir iframes (ej. videos de YouTube, mapas)
    const sanitizeOptions = {
        ADD_TAGS: ['iframe', 'style', 'script'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'target', 'src', 'defer', 'async', 'type']
    };

    /*
    // Parche global para Element.prototype.innerHTML
    const originalSetHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').set;
    Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
            originalSetHTML.call(this, window.DOMPurify.sanitize(value, sanitizeOptions));
        }
    });

    // Parche global para Element.prototype.insertAdjacentHTML
    const originalInsertAdjacentHTML = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function(position, text) {
        originalInsertAdjacentHTML.call(this, position, window.DOMPurify.sanitize(text, sanitizeOptions));
    };
    */
    console.log('[Security] Parche global temporalmente desactivado para no bloquear Tailwind CDN.');
})();
