import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebClient, htmlToMarkdown, isPublicIp, parseBingRss } from '../lib/web.js';

test('parses Bing RSS results', () => {
  const rss = '<?xml version="1.0"?><rss><channel><item><title>Example &amp; Test</title><link>https://example.com/a?x=1&amp;y=2</link><description>Useful result.</description></item></channel></rss>';
  assert.deepEqual(parseBingRss(rss, 5), [{
    title: 'Example & Test',
    url: 'https://example.com/a?x=1&y=2',
    snippet: 'Useful result.',
    publishedAt: undefined,
  }]);
});

test('blocks private and reserved IP addresses', () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '172.16.0.1', '192.168.1.1', '169.254.1.1', '100.64.0.1', '203.0.113.10', '::1', 'fd00::1']) {
    assert.equal(isPublicIp(address), false, address);
  }
  assert.equal(isPublicIp('1.1.1.1'), true);
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
});

test('converts HTML and resolves links', () => {
  const page = htmlToMarkdown('<title>Doc</title><main><h1>Hello</h1><p>Read <a href="/more">more</a>.</p><script>bad()</script></main>', 'https://example.com/doc');
  assert.equal(page.title, 'Doc');
  assert.match(page.content, /# Hello/);
  assert.match(page.content, /\[more\]\(https:\/\/example\.com\/more\)/);
  assert.doesNotMatch(page.content, /bad/);
});

test('fetch rejects DNS resolving to a private address before HTTP', async () => {
  let called = false;
  const client = createWebClient({}, {
    lookup: async () => [{ address: '127.0.0.1', family: 4 }],
    fetch: async () => { called = true; throw new Error('must not run'); },
  });
  await assert.rejects(client.fetchPage('http://example.test/'), /private|reserved/);
  assert.equal(called, false);
});

test('fetch exposes the upstream HTTP status', async () => {
  const client = createWebClient({}, {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    fetch: async () => new Response('Forbidden', { status: 403, headers: { 'content-type': 'text/plain' } }),
  });
  await assert.rejects(client.fetchPage('https://example.com/blocked'), /HTTP 403.*example\.com/);
});
