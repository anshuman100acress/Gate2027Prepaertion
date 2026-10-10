import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, cp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCourseCatalog, courseRows, FREE_PYQ_ID } from '../scripts/course-catalog.mjs';
import { exportCoursePreview } from '../scripts/export-course-preview.mjs';
import { buildSite } from '../scripts/build.mjs';
import { publishCourse } from '../scripts/publish-course.mjs';
import offer from '../course-offer.js';

const dir = await mkdtemp(join(tmpdir(), 'gatewise-public-release-'));
try {
  const input = await readCourseCatalog(process.cwd());
  const source = join(dir, 'source');
  if (input.publicOnly) {
    await mkdir(source);
    await cp('data', join(source, 'data'), { recursive: true });
  } else {
    await exportCoursePreview({ outdir: source });
    await assert.rejects(() => exportCoursePreview({ outdir: process.cwd() }), /Do not replace/);
  }
  const catalog = await readCourseCatalog(source);
  assert.equal(catalog.publicOnly, true);
  assert.equal(catalog.info.questionCount, 414);
  assert.equal(catalog.info.pyqCount, 105);
  assert.equal(catalog.syllabus.flatMap(s => s.lessons).filter(l => !l.locked).length, 3);
  assert.equal(catalog.pyqs.length, 1);
  assert.equal(catalog.pyqs[0].id, FREE_PYQ_ID);
  assert.equal(catalog.questions.length + catalog.pyqs.length + catalog['lesson-questions'].length, 10);
  assert.throws(() => courseRows(catalog, 'gate-cs-2027'), /preview-only/);
  let writes = 0;
  await assert.rejects(() => publishCourse({ catalogRoot: source, env: {}, client: { from() { writes++; } } }), /preview-only/);
  assert.equal(writes, 0, 'Publishing previews must never overwrite paid Supabase resources');
  const env = { GATEWISE_SUPABASE_URL: 'https://gatewise-test.supabase.co', GATEWISE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_PUBLIC', GATEWISE_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_PRIVATE', GATEWISE_RAZORPAY_KEY_ID: 'rzp_test_PUBLIC', GATEWISE_RAZORPAY_KEY_SECRET: 'PAYMENT_PRIVATE', GATEWISE_RAZORPAY_WEBHOOK_SECRET: 'WEBHOOK_PRIVATE' };
  const output = join(dir, 'dist');
  const built = await buildSite({ catalogRoot: source, outdir: output, env });
  assert.equal(built.course.mode, 'protected', 'A public release must default to protected mode');
  assert.equal(built.course.checkoutEnabled, true);
  assert.equal(built.course.questionCount, 414);
  assert.equal(built.course.pyqCount, 105);
  assert.equal(JSON.parse(await readFile(join(output, 'data/pyqs.json'), 'utf8')).length, 1);
  await assert.rejects(() => buildSite({ catalogRoot: source, outdir: output, env: { ...env, GATEWISE_COURSE_MODE: 'open' } }), /only previews/);
  await assert.rejects(() => buildSite({ catalogRoot: source, outdir: output, env: {} }), /requires/);
  for (const file of ['course-config.js', 'cloud-config.js', 'course.js', 'pyq-practice.js', 'premium-tools.js', 'data/syllabus.json', 'data/pyqs.json']) {
    const text = await readFile(join(output, file), 'utf8');
    for (const secret of ['sb_secret_PRIVATE', 'PAYMENT_PRIVATE', 'WEBHOOK_PRIVATE']) assert(!text.includes(secret), `${file} leaked a secret`);
  }
  for (const path of ['data/content', 'tests', 'scripts', 'server', 'supabase', '.env']) await assert.rejects(() => access(join(output, path)));
  const syllabusPath = join(source, 'data/syllabus.json');
  const original = await readFile(syllabusPath, 'utf8');
  const syllabus = JSON.parse(original);
  syllabus[0].lessons.find(l => l.locked).sections.push({ title: 'Restricted', body: 'PREMIUM_LEAK' });
  await writeFile(syllabusPath, JSON.stringify(syllabus));
  await assert.rejects(() => readCourseCatalog(source), /restricted syllabus/);
  await writeFile(syllabusPath, original);
  const pyqPath = join(source, 'data/pyqs.json');
  const pyqs = JSON.parse(await readFile(pyqPath, 'utf8'));
  pyqs.push({ ...pyqs[0], id: 'PAID_LEAK' });
  await writeFile(pyqPath, JSON.stringify(pyqs));
  await assert.rejects(() => readCourseCatalog(source), /restricted pyqs/);
  const cutoff = Date.parse(offer.DEFAULT_OFFER_ENDS_AT);
  assert.equal(offer.quote(offer.fromEnv({}), cutoff - 1).priceMinor, 29900);
  assert.equal(offer.quote(offer.fromEnv({}), cutoff).priceMinor, 49900);
  console.log('Public release checks passed: exactly 3 previews/10 samples/1 PYQ, protected defaults, no paid payloads or secrets, preserved full-course counts, safe publishing and offer expiry.');
} finally { await rm(dir, { recursive: true, force: true }); }
