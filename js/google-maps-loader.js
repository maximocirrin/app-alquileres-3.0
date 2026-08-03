(function () {
    const DEFAULT_KEY = "AIzaSyAdp8M6rgF6dB-KYmC8B1JLlpP37Yf0pI8";

    async function getApiKey() {
        if (window.GOOGLE_MAPS_API_KEY) {
            return window.GOOGLE_MAPS_API_KEY;
        }
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        if (isLocalDev) {
            return DEFAULT_KEY;
        }
        try {
            const res = await fetch('/api/google-maps-key');
            if (res.ok) {
                const data = await res.json();
                if (data && data.apiKey) {
                    window.GOOGLE_MAPS_API_KEY = data.apiKey;
                    return data.apiKey;
                }
            }
        } catch (e) {
            // Silently fallback if endpoint is not reachable (e.g. static local preview)
        }
        return DEFAULT_KEY;
    }

    /**
     * Dynamically loads Google Maps JavaScript API script.
     * @param {string|function} callback Name of global callback function or callback function itself
     * @param {string} libraries Comma-separated libraries (default: 'places')
     */
    async function loadGoogleMaps(callback, libraries = 'places') {
        const apiKey = await getApiKey();

        let callbackName = typeof callback === 'string' ? callback : '';
        if (typeof callback === 'function') {
            callbackName = 'googleMapsCallback_' + Math.random().toString(36).substring(2, 9);
            window[callbackName] = callback;
        }

        const scriptId = 'google-maps-js-sdk';
        const existingScript = document.getElementById(scriptId);
        
        if (existingScript) {
            if (window.google && window.google.maps) {
                if (callbackName && typeof window[callbackName] === 'function') {
                    window[callbackName]();
                }
            } else if (callbackName && typeof window[callbackName] === 'function') {
                const prevCb = window.googleMapsLoadedCallback;
                window.googleMapsLoadedCallback = function() {
                    if (typeof prevCb === 'function') prevCb();
                    if (typeof window[callbackName] === 'function') window[callbackName]();
                };
            }
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        const cbParam = callbackName ? `&callback=${encodeURIComponent(callbackName)}` : '';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${encodeURIComponent(libraries)}${cbParam}&loading=async&v=weekly`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }

    window.loadGoogleMaps = loadGoogleMaps;
})();
