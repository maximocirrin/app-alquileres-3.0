import { readFileSync, writeFileSync } from 'node:fs';
import { minify } from 'terser';

// Keep the editable scripts for other pages and generate the homepage assets.
// Top-level names remain intact because HTML handlers and other scripts use them.
for (const name of ['app', 'data', 'landing-catalog', 'landing-search']) {
    const sourceUrl = new URL(`../js/${name}.js`, import.meta.url);
    const source = readFileSync(sourceUrl, 'utf8').replace(/^\/\/# sourceMappingURL=.*$/gm, '');
    const filename = `${name}.min.js`;
    const result = await minify({ [`${name}.js`]: source }, {
        toplevel: false,
        keep_fnames: true,
        sourceMap: { filename, url: `${filename}.map`, includeSources: true }
    });
    writeFileSync(new URL(`../js/${filename}`, import.meta.url), result.code + '\n');
    writeFileSync(new URL(`../js/${filename}.map`, import.meta.url), result.map + '\n');
    console.log(`${filename}: ${Buffer.byteLength(source)} -> ${Buffer.byteLength(result.code)} bytes`);
}
