import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const apiDirectory = new URL('../api/', import.meta.url);

async function findDeployableHandlers(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const handlers = [];

  for (const entry of entries) {
    const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) {
      handlers.push(...await findDeployableHandlers(target));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const source = await readFile(target, 'utf8');
      if (/\bexport\s+default\b/.test(source)) handlers.push(target.pathname);
    }
  }

  return handlers;
}

test('Vercel Hobby deployment stays within the 12-function limit', async () => {
  const handlers = await findDeployableHandlers(apiDirectory);
  assert.ok(
    handlers.length <= 12,
    `Vercel Hobby supports at most 12 functions; found ${handlers.length}:\n${handlers.join('\n')}`
  );
});

test('owner-contracts keeps its public URL through the consolidated payments function', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
  const rewrite = config.rewrites?.find((entry) => entry.source === '/api/owner-contracts');

  assert.deepEqual(rewrite, {
    source: '/api/owner-contracts',
    destination: '/api/pagos?action=owner-contracts'
  });
});
