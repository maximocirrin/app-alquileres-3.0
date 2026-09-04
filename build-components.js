import fs from 'fs';

function convertFooterToJs(htmlPath, jsPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const jsContent = `(function() {
    if (window.location.pathname.endsWith('login.html')) return;
    var footerHTML = ${JSON.stringify(html)};
    function renderUnifiedFooter() {
        var existingFooter = document.querySelector('footer');
        if (existingFooter) {
            existingFooter.outerHTML = footerHTML;
        } else {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderUnifiedFooter);
    } else {
        renderUnifiedFooter();
    }
})();`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
}

function convertNavbarToJs(htmlPath, jsPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const b64 = Buffer.from(html, 'utf8').toString('base64');
    const jsContent = `(function() {
    var b64 = '${b64}';
    var decoded = decodeURIComponent(escape(window.atob(b64)));
    var div = document.createElement('div');
    div.innerHTML = decoded;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
    try {
        var isDarkTheme = localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
        var themeCb = document.querySelector('.theme-switch__checkbox');
        if (themeCb) {
            themeCb.checked = isDarkTheme;
        }
    } catch (e) {}
    if (!document.querySelector('script[src*="notifications.js"]')) {
        var nScript = document.createElement('script');
        nScript.src = 'js/notifications.js';
        document.head.appendChild(nScript);
    }
})();
`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
}

convertNavbarToJs('components/navbar.html', 'js/navbar.js');
convertFooterToJs('components/footer.html', 'js/footer.js');
console.log('Conversion complete.');
