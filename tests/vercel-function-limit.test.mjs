import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const projectRoot = new URL('../', import.meta.url);

test('Hobby deployment stays within the 12 function limit', async () => {
  const files = await readdir(new URL('api/', projectRoot));
  const deployableFunctions = files.filter((name) => name.endsWith('.js') && !name.startsWith('_'));
  assert.ok(
    deployableFunctions.length <= 12,
    `Expected at most 12 deployable functions, found ${deployableFunctions.length}`
  );
});

test('legacy owner-contracts URL is consolidated into pagos', async () => {
  const config = JSON.parse(await readFile(new URL('vercel.json', projectRoot), 'utf8'));
  const rewrite = config.rewrites?.find((item) => item.source === '/api/owner-contracts');
  assert.deepEqual(rewrite, {
    source: '/api/owner-contracts',
    destination: '/api/pagos?action=owner-contracts'
  });
});
