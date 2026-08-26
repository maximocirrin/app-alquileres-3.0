// Supabase Client - Global Scope with Dynamic Environment Variable Support
(function () {
    const DEFAULT_SUPABASE_URL = 'https://djhwqttaiggjaxmswggr.supabase.co';
    const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_MrxixhDAPh1NXACfIR29Eg_ojFWOfU5';

    let initialUrl = window.SUPABASE_URL || DEFAULT_SUPABASE_URL;
    let initialKey = window.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

    // Global HTML Escape Utility for XSS Prevention
    window.escapeHtml = function (str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    if (typeof supabase !== 'undefined' && supabase.createClient) {
        if (!window.supabaseClient) {
            window.supabaseClient = supabase.createClient(initialUrl, initialKey);
            console.log("Supabase Client Initialized (Global)");
        }
    } else {
        console.warn("Supabase CDN script not loaded before supabaseClient.js");
    }

    // Asynchronously fetch backend environment variables from Vercel / Express
    async function syncSupabaseConfig() {
        const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
        if (isLocalDev) return;

        try {
            const res = await fetch('/api/supabase-config');
            if (res.ok) {
                const data = await res.json();
                if (data && data.url && data.key) {
                    if (data.url !== initialUrl || data.key !== initialKey) {
                        window.SUPABASE_URL = data.url;
                        window.SUPABASE_ANON_KEY = data.key;
                        if (typeof supabase !== 'undefined' && supabase.createClient) {
                            window.supabaseClient = supabase.createClient(data.url, data.key);
                            console.log("Supabase Client Re-initialized with server environment variables");
                        }
                    }
                }
            }
        } catch (e) {
            // Silently ignore in static mode
        }
    }

    syncSupabaseConfig();
})();
