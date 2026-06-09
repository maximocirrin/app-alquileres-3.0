const fs = require('fs');
const path = require('path');

const directoryPath = '.'; // Current directory
const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.html'));

const itemsToRemove = [
    /Garant&iacute;as?\s+H&aacute;bitat/i,
    /Alojamiento\s+para\s+estudiantes/i,
    /Alojamiento\s+(para\s+)?n&oacute;madas\s+digitales/i,
    />\s*Blog\s*</i,
    />\s*Instituciones\s*</i,
    />\s*Mapa\s+del\s+sitio\s*</i,
    />\s*Becas\s+postdoctorado\s*</i,
    />\s*&Iacute;ndice\s+Trimestral\s+de\s+Alquileres\s*</i,
    />\s*Hazte\s+partner\s*</i,
    // Add plain text variants just in case
    />\s*Garant[íi]as?\s+H[áa]bitat\s*</i,
    />\s*Alojamiento\s+(para\s+)?n[óo]madas\s+digitales\s*</i,
    />\s*[ÍI]ndice\s+Trimestral\s+de\s+Alquileres\s*</i,
];

let totalRemovals = 0;

files.forEach(file => {
    const filePath = path.join(directoryPath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We want to match <a ...> ... Text ... </a>
    // To do this reliably, let's parse or use a regex for <a> tags.
    // The regex for an <a> tag is: <a\b[^>]*>(.*?)<\/a>
    // We will replace it with empty string if the inner HTML matches our items.
    
    let modifications = 0;
    
    const tagRegex = /<a\b[^>]*>([\s\S]*?)<\/a>\s*/gi;
    content = content.replace(tagRegex, (match, innerHtml) => {
        for (const regex of itemsToRemove) {
            // To test pure string contents like >Blog< we modify the regex matching:
            // Since innerHtml doesn't have the angle brackets, we should test `>${innerHtml}<`
            if (regex.test(`>${innerHtml}<`)) {
                console.log(`Removing from ${file}: ${innerHtml.trim()}`);
                modifications++;
                return '';
            }
        }
        return match;
    });

    if (modifications > 0) {
        fs.writeFileSync(filePath, content, 'utf8');
        totalRemovals += modifications;
        console.log(`Updated ${file}: removed ${modifications} links.`);
    }
});

console.log(`Total removals: ${totalRemovals}`);
