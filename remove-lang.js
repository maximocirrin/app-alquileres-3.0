const fs = require('fs');
const path = require('path');

const dir = 'c:\\\\Users\\\\maxim\\\\OneDrive\\\\Escritorio\\\\Proyectos\\\\PropManager\\\\app-alquileres-3.0';

function walkDir(d, callback) {
    fs.readdirSync(d).forEach(f => {
        let dirPath = path.join(d, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (f !== 'node_modules' && f !== '.git') {
            isDirectory ? walkDir(dirPath, callback) : callback(path.join(d, f));
        }
    });
}

function removeLanguageFeatures(file) {
    if (!file.endsWith('.html') && !file.endsWith('.js') && !file.endsWith('.css')) return;
    
    // We don't want to modify this script itself or fix-lang.js
    if (file.endsWith('remove-lang.js') || file.endsWith('fix-lang.js')) return;

    let content;
    try {
        content = fs.readFileSync(file, 'utf8');
        // Handle utf16le if not utf8
        if (content.indexOf('<!DOCTYPE html>') === -1 && content.indexOf('<html') === -1 && file.endsWith('.html')) {
            content = fs.readFileSync(file, 'utf16le');
        }
    } catch (e) {
        return;
    }

    let original = content;

    // 1. Remove Google Translate Custom Overrides CSS
    content = content.replace(/\/\*\s*Google Translate Custom Overrides\s*\*\/[\s\S]*?(?:#goog-gt-tt\s*{\s*display:\s*none\s*!important;\s*}\s*|#goog-gt-tt\s*\{\s*display:\s*none\s*!important;\s*\})?/g, '');

    // Also remove any remaining skiptranslate CSS if the above misses
    content = content.replace(/iframe\.goog-te-banner-frame\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.goog-te-banner-frame\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.goog-te-banner-frame\.skiptranslate\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.skiptranslate>iframe\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.VIpgJd-ZVi9od-aZ2wEe-wOHMyf\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.VIpgJd-ZVi9od-ORHb-OEVmcd\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/#google_translate_element\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.goog-tooltip\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.goog-tooltip:hover\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/\.goog-text-highlight\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/font\s*{\s*background-color:\s*transparent\s*!important;\s*box-shadow:\s*none\s*!important;\s*}\s*/g, '');
    content = content.replace(/#goog-gt-tt\s*{[\s\S]*?}\s*/g, '');

    // Remove Google Translate Integration scripts and divs
    content = content.replace(/<!--\s*Google Translate Integration\s*-->[\s\S]*?<div id="google_translate_element"[^>]*><\/div>/g, '');
    content = content.replace(/<div id="google_translate_element"[^>]*><\/div>\s*/g, '');
    
    // Remove the script that has googleTranslateElementInit and changeLanguage
    content = content.replace(/<script type="text\/javascript">\s*function googleTranslateElementInit\(\)[\s\S]*?<\/script>\s*/g, '');
    // Also remove the tag that loads it
    content = content.replace(/<script[^>]*src="https:\/\/translate\.google\.com\/translate_a\/element\.js\?cb=googleTranslateElementInit"[^>]*><\/script>\s*/g, '');

    // Remove Custom Language Selector div from UI (the one with group inline-block z-[110])
    content = content.replace(/<!--\s*Custom Language Selector\s*-->\s*/g, '');
    content = content.replace(/<div class="relative group inline-block z-\[110\]">[\s\S]*?<\/ul>\s*<\/div>\s*<\/div>\s*/g, '');
    
    // For index.html that might have language selector commented differently
    content = content.replace(/<!-- Right: Language Selector -->\s*/g, '');
    
    // Remove login.html language elements
    content = content.replace(/\.owner-auth-language\s*{[\s\S]*?}\s*/g, '');
    content = content.replace(/<div class="owner-auth-language"[^>]*>[\s\S]*?<\/div>\s*/g, '');

    // Remove <span class="current-lang-display"... and related stuff if they are standalone
    content = content.replace(/<span class="current-lang-display[^>]*>.*?<\/span>\s*/g, '');
    
    // Clean up empty style blocks
    content = content.replace(/<style>\s*<\/style>/g, '');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Cleaned:', file);
    }
}

walkDir(dir, removeLanguageFeatures);

// Delete fix-lang.js
const fixLangPath = path.join(dir, 'fix-lang.js');
if (fs.existsSync(fixLangPath)) {
    fs.unlinkSync(fixLangPath);
    console.log('Deleted fix-lang.js');
}

console.log('Done.');
