import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebClient, enrichSearchResults, htmlToMarkdown, isNewsQuery, isPublicIp, parseBingRss, rankAndDedupe, toWebSearchResult } from '../lib/web.js';

test('parses Bing RSS results', () => {
  const rss = '<?xml version="1.0"?><rss><channel><item><title>Example &amp; Test</title><link>https://example.com/a?x=1&amp;y=2</link><description>Useful result.</description></item></channel></rss>';
  assert.deepEqual(parseBingRss(rss, 5), [{
    title: 'Example & Test',
    url: 'https://example.com/a?x=1&y=2',
    snippet: 'Useful result.',
    publishedAt: undefined,
  }]);
});

test('maps local rows to the Harness web provider result', () => {
  assert.deepEqual(toWebSearchResult([{
    title: 'Example',
    url: 'https://example.com/',
    snippet: 'Result text.',
    publishedAt: 'Thu, 30 Oct 2026 00:00:00 GMT',
  }]), {
    content: '[dsh-local-web-search] web provider: local-free; upstream: bing + cn-tech-rss for news queries; DeepSeek Search API: not used.',
    sources: [{
      title: 'Example',
      url: 'https://example.com/',
      snippet: 'Result text.',
      publishedAt: '2026-10-30T00:00:00.000Z',
    }],
    truncated: false,
  });
});

test('labels the selected free upstream in native web_search results', () => {
  const result = toWebSearchResult([], 'duckduckgo');
  assert.equal(result.content, '[dsh-local-web-search] web provider: local-free; upstream: duckduckgo; DeepSeek Search API: not used.');
});

test('auto-fetches top search results and replaces snippets with article excerpts', async () => {
  const rows = [
    { title: 'One', url: 'https://example.com/one', snippet: 'search snippet' },
    { title: 'Two', url: 'https://example.com/two', snippet: 'second snippet' },
  ];
  const client = {
    async fetchPage(url) {
      if (url.endsWith('/two')) throw new Error('blocked');
      return { content: 'Full article body from the locally fetched page.' };
    },
  };
  const enriched = await enrichSearchResults(client, rows, 2);
  assert.equal(enriched.fetchedCount, 1);
  assert.match(enriched.results[0].snippet, /locally fetched article excerpt.*Full article body/);
  assert.equal(enriched.results[1].snippet, 'second snippet');
  assert.match(toWebSearchResult(enriched.results, 'bing', enriched.fetchedCount).content, /auto-fetch verified 1/);
});

test('detects news intent and ranks article pages above portal homepages', () => {
  assert.equal(isNewsQuery('今日科技新闻'), true);
  assert.equal(isNewsQuery('technology news today'), true);
  assert.equal(isNewsQuery('JavaScript URL API'), false);
  const ranked = rankAndDedupe([
    { title: '科技新闻', url: 'https://example.com/', snippet: '' },
    { title: '今日 AI 芯片科技新闻', url: 'https://example.com/news/ai-chip', snippet: '最新报道' },
    { title: '今日 AI 芯片科技新闻', url: 'https://example.com/news/ai-chip?utm_source=test', snippet: '重复结果' },
  ], '今日 AI 科技新闻', 10);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].url, 'https://example.com/news/ai-chip');
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

test('fetch returns readable partial content when a page exceeds the byte cap', async () => {
  const client = createWebClient({ maxFetchBytes: 65536 }, {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
    fetch: async () => new Response('x'.repeat(70000), { headers: { 'content-type': 'text/plain' } }),
  });
  const page = await client.fetchPage('https://example.com/large');
  assert.equal(page.truncated, true);
  assert.equal(page.downloadedBytes, 65536);
  assert.equal(page.content.length, 65536);
});
