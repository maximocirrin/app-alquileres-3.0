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
