import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('bundle routes built-in web_search to the free provider', async () => {
  const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8');
  assert.doesNotMatch(patch, /- id: web\r?\n\s+disabled: true/);
  assert.match(patch, /- id: web-search-deepseek\r?\n\s+disabled: true/);
  assert.match(patch, /- id: web\r?\n\s+config:\r?\n\s+searchProvider: local-free/);
  assert.match(patch, /fetchProvider: local-free/);
  assert.doesNotMatch(patch, /preset-(standard|ptc|cordis)/);
  assert.match(patch, /- id: local-web-search\r?\n\s+name: dsh-local-web-search/);
});
