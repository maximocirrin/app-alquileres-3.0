const fs = require('fs');

function convertToJs(htmlPath, jsPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const jsContent = `(function() {
    var div = document.createElement('div');
    div.innerHTML = ${JSON.stringify(html)};
    while(div.firstChild) {
        document.currentScript.parentNode.insertBefore(div.firstChild, document.currentScript);
    }
})();`;
    fs.writeFileSync(jsPath, jsContent, 'utf8');
}

convertToJs('components/navbar.html', 'js/navbar.js');
convertToJs('components/publish-property-view.html', 'js/publish-property.js');
console.log('Conversion complete.');
