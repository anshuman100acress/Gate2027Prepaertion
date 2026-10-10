import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
import { buildSite } from '../scripts/build.mjs';
import { buildPwa } from '../scripts/build-pwa.mjs';

const root = resolve(import.meta.dirname, '..');
const output = await mkdtemp(join(tmpdir(), 'gatewise-pwa-'));
try {
  const env = { GATEWISE_COURSE_MODE: 'protected', GATEWISE_SUPABASE_URL: 'https://gatewise-test.supabase.co', GATEWISE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_PUBLIC', GATEWISE_SUPABASE_SERVICE_ROLE_KEY: 'PRIVATE_SERVICE_CANARY', GATEWISE_RAZORPAY_KEY_ID: 'rzp_test_PUBLIC', GATEWISE_RAZORPAY_KEY_SECRET: 'PRIVATE_PAYMENT_CANARY', GATEWISE_RAZORPAY_WEBHOOK_SECRET: 'PRIVATE_WEBHOOK_CANARY' };
  const built = await buildSite({ outdir: output, env });
  const worker = await readFile(join(output, 'service-worker.js'), 'utf8');
  for (const secret of ['PRIVATE_SERVICE_CANARY', 'PRIVATE_PAYMENT_CANARY', 'PRIVATE_WEBHOOK_CANARY']) assert(!worker.includes(secret));
  const manifest = JSON.parse(await readFile(join(output, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone'); assert.equal(manifest.start_url, '/#dashboard');
  assert(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const png = await readFile(join(output, icon.src));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  }
  const handlers = {}, stores = new Map(); let offline = false, claimed = false, skipped = false;
  const key = request => { const url = new URL(typeof request === 'string' ? request : request.url); url.hash = ''; return url.href; };
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return { async put(request, response) { entries.set(key(request), response.clone()); }, async match(request) { return entries.get(key(request))?.clone(); } };
    },
    async match(request, options) { return stores.get(options.cacheName)?.get(key(request))?.clone(); }
  };
  const origin = 'https://gatewise.example';
  const sandbox = vm.createContext({ URL, Request, Response, Set, Map, caches,
    self: { location: `${origin}/service-worker.js`, clients: { async claim() { claimed = true; } }, skipWaiting() { skipped = true; }, addEventListener(type, callback) { handlers[type] = callback; } },
    async fetch(request) {
      if (offline) throw new Error('Network disconnected');
      const path = new URL(key(request)).pathname.slice(1) || 'index.html';
      return new Response(await readFile(join(output, path)), { headers: { 'Cache-Control': path.endsWith('config.js') ? 'no-store' : 'public' } });
    }
  });
  vm.runInContext(worker, sandbox);
  let install;
  handlers.install({ waitUntil(promise) { install = promise; } }); await install;
  const cacheNames = await caches.keys(); assert.equal(cacheNames.length, 1);
  const entries = stores.get(cacheNames[0]);
  assert(entries.has(`${origin}/mobile.js`)); assert(entries.has(`${origin}/data/syllabus.json`));
  assert(!entries.has(`${origin}/course-config.js`)); assert(!entries.has(`${origin}/cloud-config.js`));
  assert([...entries.keys()].every(url => !/\/api\/|\/rest\/|\/auth\/|\.pdf|data\/content|\/tests\//.test(url)));
  function intercepted(url, options) {
    let response; handlers.fetch({ request: new Request(url, options), respondWith(promise) { response = promise; } }); return response;
  }
  sandbox.fetch = async () => { throw new Error('A complete installed version should use its public cache.'); };
  assert((await (await intercepted(`${origin}/mobile.js`)).text()).includes('GatewiseMobile'));
  for (const [url, options] of [
    [`${origin}/api/checkout`, { method: 'POST' }], [`${origin}/api/checkout`, {}],
    ['https://gatewise-test.supabase.co/rest/v1/course_resources', {}], ['https://checkout.razorpay.com/v1/checkout.js', {}],
    [`${origin}/data/content/premium.py`, {}], [`${origin}/data/questions.json?token=private`, {}],
    [`${origin}/data/questions.json`, { headers: { Authorization: 'Bearer PRIVATE_USER_CANARY' } }],
    [`${origin}/papers/2026_CS1.pdf`, {}]
  ]) assert.equal(intercepted(url, options), undefined, `The worker intercepted a restricted request: ${url}`);
  offline = true;
  assert((await (await intercepted(`${origin}/`)).text()).includes('id="app"'));
  assert((await (await intercepted(`${origin}/#dashboard`)).text()).includes('id="app"'));
  const preview = await (await intercepted(`${origin}/data/syllabus.json`)).json();
  assert.equal(preview.flatMap(s => s.lessons).filter(l => !l.locked).length, 3);
  const config = await intercepted(`${origin}/course-config.js`); assert.equal(config.headers.get('Cache-Control'), 'no-store');
  assert.equal(config.headers.get('X-Gatewise-Offline'), '1');
  assert((await config.text()).includes('"mode":"protected"'));
  const publicQuestions = JSON.parse(await readFile(join(output, 'data/questions.json'), 'utf8'));
  const syllabus = JSON.parse(await readFile(join(output, 'data/syllabus.json'), 'utf8'));
  const check = (path, value, headers = {}) => sandbox.cachedPublicResponse(path, new Response(JSON.stringify(value), { headers }));
  await assert.rejects(() => check('data/questions.json', [...publicQuestions, { id: 'PRIVATE_QUESTION_CANARY', premium: true }]), /free originals/);
  syllabus[0].lessons[0].examClinic = { questions: [{ prompt: 'PRIVATE_CLINIC_CANARY' }] };
  await assert.rejects(() => check('data/syllabus.json', syllabus), /Paid lessons/);
  delete syllabus[0].lessons[0].examClinic;
  syllabus[0].lessons.find(l => l.locked).gateGuide = { method: ['PRIVATE_METHOD_CANARY'] };
  await assert.rejects(() => check('data/syllabus.json', syllabus), /Paid lessons/);
  await assert.rejects(() => check('data/questions.json', publicQuestions, { 'Cache-Control': 'private, no-store' }), /public responses/);
  const allBodies = (await Promise.all([...entries.values()].map(r => r.clone().text()))).join('');
  for (const secret of ['PRIVATE_USER_CANARY','PRIVATE_QUESTION_CANARY','PRIVATE_CLINIC_CANARY','PRIVATE_METHOD_CANARY']) assert(!allBodies.includes(secret));
  stores.set('gatewise-public-stale', new Map()); stores.set('unrelated-app', new Map());
  let activation; handlers.activate({ waitUntil(promise) { activation = promise; } }); await activation;
  assert(claimed); assert(!stores.has('gatewise-public-stale')); assert(stores.has('unrelated-app'));
  handlers.message({ data: { type: 'OTHER' } }); assert(!skipped);
  handlers.message({ data: { type: 'SKIP_WAITING' } }); assert(skipped);
  await writeFile(join(output, 'mobile.css'), (await readFile(join(output, 'mobile.css'), 'utf8')) + '\n/* A new release */');
  await buildPwa(output, built, root);
  const updatedWorker = await readFile(join(output, 'service-worker.js'), 'utf8');
  assert.notEqual(worker.match(/CACHE_PREFIX \+ '([^']+)'/)[1], updatedWorker.match(/CACHE_PREFIX \+ '([^']+)'/)[1]);
  console.log('PWA checks passed: manifest/icons, offline shell and previews, public-only caches, unsafe-request bypass, paid-payload rejection, no secrets, version updates and cache cleanup.');
} finally { await rm(output, { recursive: true, force: true }); }
