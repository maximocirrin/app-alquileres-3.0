const fs = require('fs');

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
    const jsContent = `(function() {
    var html = ${JSON.stringify(html)};
    var div = document.createElement('div');
    div.innerHTML = html;
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
    if (!document.querySelector('script[src*="footer.js"]')) {
        var fScript = document.createElement('script');
        fScript.src = 'js/footer.js';
        document.head.appendChild(fScript);
    }
})();`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
}

convertNavbarToJs('components/navbar.html', 'js/navbar.js');
convertFooterToJs('components/footer.html', 'js/footer.js');
console.log('Conversion complete.');
