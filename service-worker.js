/* The build inserts only audited public assets and public configuration.
 * Auth, checkout, Supabase and paid content never enter Cache Storage. */
'use strict';
const CACHE_PREFIX = 'gatewise-public-';
const CACHE_NAME = CACHE_PREFIX + '__GATEWISE_VERSION__';
const PUBLIC_ASSETS = __GATEWISE_PUBLIC_ASSETS__;
const OFFLINE_CONFIG = __GATEWISE_OFFLINE_CONFIG__;
const ROOT = new URL('./', self.location);
const allowed = new Set(PUBLIC_ASSETS.map(path => new URL(path, ROOT).href));
const configs = new Map(Object.entries(OFFLINE_CONFIG).map(([path, source]) => [new URL(path, ROOT).href, source]));

function safeRequest(request, url) {
  return request.method === 'GET' && url.origin === ROOT.origin && !url.search &&
    !request.headers.has('authorization') && (allowed.has(url.href) || configs.has(url.href));
}
function publicResponse(response) {
  return response.ok && response.type !== 'opaque' && !response.redirected &&
    !/no-store|private/i.test(response.headers.get('cache-control') || '') &&
    !response.headers.has('set-cookie') && !/authorization|cookie/i.test(response.headers.get('vary') || '');
}
async function cachedPublicResponse(path, response) {
  if (!publicResponse(response)) throw new Error('Only public responses can be saved offline.');
  if (path.startsWith('data/')) {
    // Refuse accidental authoring catalogs even if a host serves them at a public path.
    const value = await response.clone().json();
    if (!Array.isArray(value)) throw new Error('Expected public course data.');
    if (path === 'data/syllabus.json') {
      const lessons = value.flatMap(subject => subject.lessons || []);
      const readable = lessons.filter(lesson => !lesson.locked);
      const previews = new Set(['0-propositions', '3-c-memory', '10-quantitative']);
      if (readable.length !== 3 || readable.some(lesson => !previews.has(lesson.id)) ||
          lessons.some(lesson => ['premiumTopics','examClinic','studyCards','premiumPreviewLessons'].some(key => lesson[key] != null)) ||
          lessons.filter(lesson => lesson.locked).some(lesson => ['sections','examples','tutorials','checks','revision','pitfalls'].some(key => lesson[key]?.length) || lesson.method || ['gateGuide','concept','example','prerequisite'].some(key => lesson[key] != null))) throw new Error('Paid lessons must never be cached.');
    } else if (path === 'data/questions.json' && (value.length !== 3 || value.some(q => q.premium || q.pool === 'mastery'))) throw new Error('Expected three free originals.');
    else if (path === 'data/pyqs.json' && (value.length !== 1 || value[0]?.id !== 'pyq-2026_CS1-GA-3')) throw new Error('Expected the single free PYQ.');
    else if (path === 'data/lesson-questions.json' && (value.length !== 6 || value.some(q => !['0-propositions','3-c-memory','10-quantitative'].includes(q.lesson) || q.premium))) throw new Error('Expected six preview checks.');
  }
  return response;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await Promise.all(PUBLIC_ASSETS.map(async path => {
        const request = new Request(new URL(path, ROOT), { cache: 'reload', credentials: 'omit' });
        const response = await cachedPublicResponse(path, await fetch(request));
        await cache.put(request, response);
      }));
    } catch (error) { await caches.delete(CACHE_NAME); throw error; }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Browsers can retain the hash route in a navigation request's URL.
  url.hash = '';
  // Exact allowlist: authenticated APIs, external domains, PDFs and unknown paths bypass the worker.
  if (!safeRequest(request, url)) return;
  event.respondWith((async () => {
    // Keep one complete app version together until the student accepts an update.
    const cache = await caches.open(CACHE_NAME);
    if (!configs.has(url.href)) {
      const existing = await cache.match(request);
      if (existing) return existing;
    }
    try {
      const response = await fetch(request);
      if (configs.has(url.href)) return response; // Config endpoints use no-store.
      const path = url.pathname.slice(ROOT.pathname.length) || './';
      // A private response is passed through without caching or using an older fallback.
      if (!publicResponse(response)) return response;
      await cachedPublicResponse(path, response);
      await cache.put(request, response.clone());
      return response;
    } catch {
      if (configs.has(url.href)) return new Response(configs.get(url.href), { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store', 'X-Gatewise-Offline': '1' } });
      const cached = await caches.match(request, { cacheName: CACHE_NAME });
      return cached || new Response('Connect to the internet to open this resource.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
