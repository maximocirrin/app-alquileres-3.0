import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
const robots = readFileSync(resolve(root, 'robots.txt'), 'utf8');
const vercel = JSON.parse(readFileSync(resolve(root, 'vercel.json'), 'utf8'));

function sitemapUrls() {
  return [...sitemap.matchAll(/<loc>(https:\/\/vivat\.com\.ar(?:\/[^<]*)?)<\/loc>/g)]
    .map((match) => new URL(match[1]));
}

test('every sitemap URL maps to a real public file', () => {
  const urls = sitemapUrls();
  assert.ok(urls.length > 0);

  for (const url of urls) {
    assert.equal(url.hostname, 'vivat.com.ar');
    if (url.pathname === '/') continue;
    assert.equal(url.pathname.endsWith('.html'), true, url.pathname);
    assert.equal(existsSync(resolve(root, url.pathname.slice(1))), true, url.pathname);
  }
});

test('private dashboards are not advertised in the sitemap', () => {
  assert.doesNotMatch(sitemap, /administrador\.html|panel-corredor\.html|tu-alquiler\.html|contratos\.html/);
  assert.match(robots, /Sitemap: https:\/\/vivat\.com\.ar\/sitemap\.xml/);
});

test('legacy duplicate homepage URLs redirect to the canonical root', () => {
  const redirects = vercel.redirects || [];
  for (const source of ['/index.html', '/como-funciona.html']) {
    assert.deepEqual(
      redirects.find((entry) => entry.source === source),
      { source, destination: '/', permanent: true }
    );
  }
});
