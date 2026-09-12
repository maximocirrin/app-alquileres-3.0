const fs = require('fs');
const path = require('path');

const root = 'c:\\Users\\nunim\\OneDrive\\Escritorio\\Proyecto mamu\\app-alquileres-3.0';

// Delete the file
try {
    fs.unlinkSync(path.join(root, 'como-funciona.html'));
    console.log('Deleted como-funciona.html');
} catch (e) {
    console.log('como-funciona.html not found or error deleting');
}

// Remove from HTML files
const htmlFilesToFix = [
    'terminos.html', 'tu-equipo.html', 'tu-alquiler.html', 'propietarios.html', 
    'index.html', 'configuracion.html', 'components/footer.html', 'agentes.html'
];

htmlFilesToFix.forEach(relPath => {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // For single or multi-line a-tags
    content = content.replace(/<a[^>]*href="como-funciona\.html(?:#[^"]*)?"[^>]*>[\s\S]*?<\/a>\s*/gi, '');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated ' + relPath);
});

// Remove from js/app.js
const appJsPath = path.join(root, 'js', 'app.js');
if (fs.existsSync(appJsPath)) {
    let content = fs.readFileSync(appJsPath, 'utf8');
    content = content.replace(/\s*'como-funciona\.html',\s*'como-funciona',/g, '');
    content = content.replace(/<a[^>]*href="como-funciona\.html"[^>]*>[\s\S]*?<\/a>\s*/gi, '');
    fs.writeFileSync(appJsPath, content, 'utf8');
    console.log('Updated app.js');
}
