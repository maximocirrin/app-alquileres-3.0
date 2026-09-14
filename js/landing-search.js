// The text search works without Maps; load address suggestions only on focus.
(() => {
    const input = document.getElementById('index-location-search');
    if (!input) return;
    let requested = false;
    let autocomplete;

    function enableSuggestions() {
        if (requested || autocomplete || typeof window.loadGoogleMaps !== 'function') return;
        requested = true;
        window.loadGoogleMaps(() => {
            try {
                if (!autocomplete && window.google?.maps?.places) {
                    autocomplete = new window.google.maps.places.Autocomplete(input, {
                        componentRestrictions: { country: 'ar' },
                        fields: ['address_components', 'geometry', 'name'],
                        types: ['(regions)']
                    });
                }
            } finally {
                requested = false;
            }
        }, 'places');
    }

    input.addEventListener('focus', enableSuggestions);
    window.addEventListener('vivat:google_maps_error', () => { requested = false; });
    if (document.activeElement === input) enableSuggestions();
})();
