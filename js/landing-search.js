// The text search works without Maps; load address suggestions only on focus.
(() => {
    const input = document.getElementById('index-location-search');
    if (!input || input.__vivatAutocompleteAttached) return;
    input.__vivatAutocompleteAttached = true;
    let requested = false;
    let autocomplete;
    let isAligning = false;
    let pacObserver = null;

    function cleanupDuplicates() {
        if (typeof document?.querySelectorAll !== 'function') return;
        const pacs = document.querySelectorAll('.pac-container');
        if (pacs.length > 1) {
            for (let i = 1; i < pacs.length; i++) {
                pacs[i].remove();
            }
        }
    }

    function alignPacContainer() {
        cleanupDuplicates();
        if (isAligning || typeof document?.querySelector !== 'function') return;
        const pac = document.querySelector('.pac-container');
        if (!pac || pac.style.display === 'none') return;
        const pill = (typeof input.closest === 'function' ? input.closest('.rounded-full') : null) || input;
        if (!pill || typeof pill.getBoundingClientRect !== 'function') return;
        const rect = pill.getBoundingClientRect();
        const scrollX = (typeof window !== 'undefined' && (window.pageXOffset || document.documentElement?.scrollLeft)) || 0;
        const scrollY = (typeof window !== 'undefined' && (window.pageYOffset || document.documentElement?.scrollTop)) || 0;
        const targetLeft = `${Math.round(rect.left + scrollX)}px`;
        const targetTop = `${Math.round(rect.bottom + scrollY + 8)}px`;
        const targetWidth = `${Math.round(rect.width)}px`;

        if (pac.style.left !== targetLeft || pac.style.top !== targetTop || pac.style.width !== targetWidth) {
            isAligning = true;
            pac.style.setProperty('width', targetWidth, 'important');
            pac.style.setProperty('left', targetLeft, 'important');
            pac.style.setProperty('top', targetTop, 'important');
            if (typeof setTimeout === 'function') {
                setTimeout(() => { isAligning = false; }, 0);
            } else {
                isAligning = false;
            }
        }
    }

    function observePac() {
        if (pacObserver || typeof document?.querySelector !== 'function' || typeof MutationObserver !== 'function') return;
        const pac = document.querySelector('.pac-container');
        if (!pac) return;
        pacObserver = new MutationObserver(() => {
            if (document.activeElement === input) {
                alignPacContainer();
            }
        });
        pacObserver.observe(pac, { attributes: true, attributeFilter: ['style', 'class'] });
    }

    function enableSuggestions() {
        if (requested || autocomplete || typeof window.loadGoogleMaps !== 'function') return;
        requested = true;
        window.loadGoogleMaps(() => {
            try {
                if (!autocomplete && window.google?.maps?.places) {
                    autocomplete = new window.google.maps.places.Autocomplete(input, {
                        componentRestrictions: { country: 'ar' },
                        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
                        types: ['(regions)']
                    });

                    if (autocomplete && typeof autocomplete.addListener === 'function') {
                        autocomplete.addListener('place_changed', () => {
                            const place = autocomplete.getPlace();
                            if (place && (place.name || place.formatted_address)) {
                                const form = typeof input.closest === 'function' ? input.closest('form') : null;
                                if (form) form.submit();
                            }
                        });
                    }

                    if (typeof setTimeout === 'function') {
                        setTimeout(() => {
                            observePac();
                            alignPacContainer();
                        }, 100);
                    }
                }
            } finally {
                requested = false;
            }
        }, 'places');
    }

    input.addEventListener('focus', () => {
        enableSuggestions();
        if (typeof setTimeout === 'function') {
            setTimeout(() => {
                observePac();
                alignPacContainer();
            }, 150);
        }
    });

    input.addEventListener('input', () => {
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(() => {
                observePac();
                alignPacContainer();
            });
        } else {
            observePac();
            alignPacContainer();
        }
    });

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', alignPacContainer, { passive: true });
        window.addEventListener('scroll', alignPacContainer, { passive: true });
        window.addEventListener('vivat:google_maps_error', () => { requested = false; });
    }

    if (document.activeElement === input) enableSuggestions();
})();

