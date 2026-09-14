import { readFileSync, writeFileSync } from 'node:fs';

const scriptUrl = new URL('../js/app.js', import.meta.url);
const mapUrl = new URL('../js/app.js.map', import.meta.url);
const current = readFileSync(scriptUrl, 'utf8');
const newline = current.includes('\r\n') ? '\r\n' : '\n';
const directive = '//# sourceMappingURL=app.js.map';
// Remove only our trailing directive, so repeated builds preserve the source.
const source = current.replace(/\/\/# sourceMappingURL=app\.js\.map\r?\n?$/, '');
const sourceWithNewline = source.endsWith('\n') ? source : source + newline;
const lineCount = sourceWithNewline.split('\n').length - 1;

// app.js is served without transpilation or minification. Map each generated
// line to the same original line (VLQ: AAAA = first line, AACA = next line).
// Embed the source so DevTools does not need an additional source-file request.
const map = {
    version: 3,
    file: 'app.js',
    sources: ['app.js'],
    sourcesContent: [sourceWithNewline],
    names: [],
    mappings: Array.from({ length: lineCount }, (_, index) => index === 0 ? 'AAAA' : 'AACA').join(';'),
};

writeFileSync(mapUrl, JSON.stringify(map) + '\n');
writeFileSync(scriptUrl, sourceWithNewline + directive + newline);
console.log(`Generated js/app.js.map (${lineCount} source lines).`);
