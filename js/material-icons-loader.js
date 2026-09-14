// Every page maps the Material icon classes to Material Symbols Outlined.
// Keep the critical CSS guard in place until that actual font has loaded.
(() => {
    const fonts = document.fonts;
    if (!fonts || typeof fonts.load !== 'function') return;

    let pending = false;
    let ready = false;

    function loadIcons() {
        if (pending || ready) return;
        pending = true;
        fonts.load('400 24px "Material Symbols Outlined"', 'home').then(faces => {
            // Before the Google stylesheet arrives, load() can resolve with [].
            // Neither that nor document.fonts.ready proves the icons are ready.
            if (faces.length && faces.every(face => face.status === 'loaded')) {
                ready = true;
                document.documentElement.classList.add('material-icons-ready');
            }
        }).catch(() => {
            // A failed request must never expose the ligature names as text.
        }).finally(() => {
            pending = false;
        });
    }

    document.addEventListener('load', event => {
        if (event.target.tagName === 'LINK' && /fonts\.googleapis\.com/.test(event.target.href)) {
            // Let the stylesheet's media="print" onload handler activate it first.
            setTimeout(loadIcons, 0);
        }
    }, true);
    document.addEventListener('DOMContentLoaded', loadIcons, { once: true });
    fonts.addEventListener('loadingdone', loadIcons);
    window.addEventListener('online', loadIcons);
    loadIcons();
})();
