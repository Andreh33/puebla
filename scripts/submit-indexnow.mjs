/** Run after the reviewed production release. Receipt means received, not indexed. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await fs.readFile(path.join(root, 'data/indexnow.json'), 'utf8'));
const site = `https://${config.host}`;
const submit = process.argv.includes('--submit');
const outputArg = process.argv.find((arg) => arg.startsWith('--receipt='));
if (submit && !outputArg) throw new Error('Supply --receipt=/absolute/evidence/path.json when submitting');
const urls = new Set();
const sitemaps = ['/sitemap.xml', '/sitemap-products.xml', '/sitemap-posts.xml'];
const xmlUnescape = (text) => text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
for (const route of sitemaps) {
  const response = await fetch(site + route, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!response.ok) throw new Error(`Sitemap ${route} returned ${response.status}`);
  const body = await response.text();
  if (!body.includes('<urlset')) throw new Error(`Expected URL sitemap: ${route}`);
  for (const match of body.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)) {
    const url = new URL(xmlUnescape(match[1].trim()));
    if (url.origin !== site || url.search || url.hash) throw new Error(`Unexpected sitemap URL: ${url}`);
    if (/^\/(?:api|admin)(?:\/|$)/.test(url.pathname)) throw new Error('Private URL in sitemap');
    urls.add(url.href);
  }
}
if (urls.size < 1521) throw new Error(`Inventory unexpectedly small: ${urls.size}`);
const receipt = { createdAt: new Date().toISOString(), host: config.host, submitted: submit, uniqueUrlCount: urls.size, sitemaps, batches: [], meaning: 'Search-engine receipt does not guarantee crawling, indexation or ranking.' };
if (submit) {
  const keyResponse = await fetch(config.keyLocation, { signal: AbortSignal.timeout(30000), redirect: 'error' });
  if (!keyResponse.ok || (await keyResponse.text()).trim() !== config.key) throw new Error('Production IndexNow key verification failed; deploy first');
  const list = [...urls];
  for (let offset = 0; offset < list.length; offset += 10000) {
    const batch = list.slice(offset, offset + 10000);
    const response = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ ...config, urlList: batch }), signal: AbortSignal.timeout(60000) });
    const status = response.status;
    receipt.batches.push({ offset, count: batch.length, status, response: (await response.text()).slice(0, 2000) });
    if (status !== 200 && status !== 202) {
      await fs.writeFile(outputArg.slice('--receipt='.length), JSON.stringify(receipt, null, 2) + '\n');
      throw new Error(`IndexNow returned ${status}; do not retry blindly`);
    }
  }
}
if (outputArg) await fs.writeFile(outputArg.slice('--receipt='.length), JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify(receipt, null, 2));
