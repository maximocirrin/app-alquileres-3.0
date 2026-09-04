(function () {
    const DEFAULT_KEY = "AIzaSyAdp8M6rgF6dB-KYmC8B1JLlpP37Yf0pI8";
    const pendingCallbacks = [];
    let isScriptLoading = false;

    async function getApiKey() {
        if (window.GOOGLE_MAPS_API_KEY) {
            return window.GOOGLE_MAPS_API_KEY;
        }
        const hostname = window.location.hostname || '';
        const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.') || window.location.protocol === 'file:';
        if (isLocal) {
            return DEFAULT_KEY;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            const res = await fetch('/api/google-maps-key', { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                if (data && data.apiKey) {
                    window.GOOGLE_MAPS_API_KEY = data.apiKey;
                    return data.apiKey;
                }
            }
        } catch (e) {
            // Silently fallback to default key
        }
        return DEFAULT_KEY;
    }

    /**
     * Dynamically loads Google Maps JavaScript API script.
     * @param {string|function} callback Name of global callback function or callback function itself
     * @param {string} libraries Comma-separated libraries (default: 'places')
     */
    async function loadGoogleMaps(callback, libraries = 'places') {
        if (typeof callback === 'function') {
            pendingCallbacks.push(callback);
        } else if (typeof callback === 'string' && callback && typeof window[callback] === 'function') {
            pendingCallbacks.push(window[callback]);
        }

        // Si ya está listo, ejecutar callbacks de inmediato
        if (window.google && window.google.maps) {
            while (pendingCallbacks.length > 0) {
                const cb = pendingCallbacks.shift();
                try { cb(); } catch (e) { console.error('[Google Maps Callback Error]:', e); }
            }
            return;
        }

        const scriptId = 'google-maps-js-sdk';
        const existingScript = document.getElementById(scriptId);

        if (existingScript || isScriptLoading) {
            return;
        }

        isScriptLoading = true;
        const apiKey = await getApiKey();

        window.__vivatGoogleMapsGlobalReady = function () {
            isScriptLoading = false;
            while (pendingCallbacks.length > 0) {
                const cb = pendingCallbacks.shift();
                try { cb(); } catch (e) { console.error('[Google Maps Callback Error]:', e); }
            }
        };

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${encodeURIComponent(libraries)}&callback=__vivatGoogleMapsGlobalReady&loading=async&v=weekly`;
        script.async = true;
        script.defer = true;
        script.onerror = function (err) {
            isScriptLoading = false;
            console.warn('[Google Maps SDK] Error al cargar desde Google CDN (posible bloqueador de anuncios o red):', err);
            window.dispatchEvent(new CustomEvent('vivat:google_maps_error', { detail: err }));
        };

        document.head.appendChild(script);
    }

    window.loadGoogleMaps = loadGoogleMaps;
})();
