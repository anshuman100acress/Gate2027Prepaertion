import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readCourseCatalog, protectedCatalog, FREE_PYQ_ID, courseSettings } from '../scripts/course-catalog.mjs';
import offer from '../course-offer.js';

const catalog = await readCourseCatalog(process.cwd());
if (catalog.publicOnly) {
  await import('./course_release.mjs');
  console.log('Full PYQ answer verification runs in the private authoring workspace.');
  process.exit(0);
}
const questions = catalog.pyqs;
const papers = JSON.parse(await readFile('data/papers.json', 'utf8'));
const keys = JSON.parse(await readFile('data/content/pyq-keys.json', 'utf8'));
const lessons = new Set(catalog.syllabus.flatMap(s => s.lessons.map(l => l.id)));
assert.equal(questions.length, 105);
assert.equal(new Set(questions.map(q => q.source.paper)).size, 24);
assert.equal(new Set(questions.map(q => q.id)).size, 105);
assert.equal(papers.reduce((n, p) => n + p.pyqCount, 0), 105);
for (const q of questions) {
  const p = papers.find(p => p.id === q.source.paper);
  assert(p && q.source.year === p.year && q.source.page >= 1 && q.source.page <= p.pages, q.id);
  assert.equal(q.type, 'MCQ'); assert.equal(q.options.length, 4);
  assert(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  assert(q.explanation.length > 90 && q.topics.every(t => lessons.has(t)), q.id);
  assert(['official-key', 'included-key', 'independently-solved'].includes(q.verification.method));
  if (q.verification.method === 'official-key') {
    assert.equal('ABCD'[q.answer], keys[p.id][q.source.number].answer, q.id);
    assert.equal(q.marks, keys[p.id][q.source.number].marks);
    assert(new URL(q.verification.url).hostname === 'gate2026.iitg.ac.in');
    assert.equal(q.source.adapted, false);
  } else if (q.verification.method === 'included-key') {
    assert.equal('ABCD'[q.answer], p.keys.find(k => k.label === `${q.source.section} ${q.source.number}`).answer, q.id);
  }
}
for (const p of papers) assert.equal(p.pyqCount, questions.filter(q => q.source.paper === p.id).length);
const reduced = protectedCatalog(catalog);
assert.deepEqual(reduced.pyqs.map(q => q.id), [FREE_PYQ_ID]);
assert.equal(reduced.questions.length + reduced.pyqs.length + reduced['lesson-questions'].length, 10);

// Independently recompute representative numerical and algorithmic answers.
const q = (paper, section, number) => questions.find(q => q.id === `pyq-${paper}-${section}-${number}`);
const chosen = (paper, section, number) => q(paper, section, number).options[q(paper, section, number).answer];
assert.equal(Number(chosen('2026_CS1', 'GA', 3)), 64 - 1);
let evenMatrices = 0;
for (let bits = 0; bits < 65536; bits++) {
  const even = mask => { let n = bits & mask, parity = 0; while (n) { parity ^= 1; n &= n - 1; } return parity === 0; };
  if ([0, 1, 2, 3].every(i => even(15 << (4 * i)) && even(0x1111 << i))) evenMatrices++;
}
assert.equal(Number(chosen('2026_CS1', 'CS', 12)), evenMatrices);
assert(Math.abs(Number(chosen('2025_CS1', 'GA', 3)) - (42 - 24) / (31.4 - 30.8)) < 1e-10);
assert.equal(Number(chosen('2024_CS1', 'GA', 3)), (() => { const a = [9,18,11,14,15,17,10,69,11,13].sort((a,b)=>a-b); return (a[4]+a[5])/2; })());
assert.equal(Number(chosen('2024_CS2', 'GA', 3)), (10000 - 1500 + 500) / 5);
assert.equal(Number(chosen('2024_CS2', 'CS', 11)), 4e6 * .01 * 8 * 8);
assert.equal(chosen('2025_CS2', 'CS', 11), `${5 ** 4}I`);
const x = Math.sqrt(Math.E); assert(Math.abs((x*x/2)*Math.log(x)-x*x/4+1/4-1/4) < 1e-12);
assert.equal(chosen('2025_CS2', 'CS', 12), '√e');
const heapQ = q('2023_CS','CS',12);
const validHeap = text => { const a=text.split(',').map(Number); return a.every((n,i)=>(2*i+1>=a.length || n>=a[2*i+1]) && (2*i+2>=a.length || n>=a[2*i+2])); };
assert.deepEqual(heapQ.options.map(validHeap), [false, true, false, false]);
assert.equal(chosen('2021_CS','CS',6), (2*3**2+3).toString(16).toUpperCase());
assert.equal(chosen('2017_CS2','CS',1), parseInt('BCA9',16).toString(8));
assert.equal(Number(chosen('2009_CS','CS',7)), 256 * 8 / 32);
const signed = s => parseInt(s,2) - (s[0]==='1' ? 2**s.length : 0);
const a = signed('01010'), b = signed('11010');
assert.deepEqual([a+b,a-b,b-a,2*b].map(n=>n < -16 || n > 15), [false,true,false,false]);
assert.equal(q('2024_CS1','CS',13).answer, 1);
const ints = signed(chosen('2019_CS','CS',4).replaceAll(' ','')); assert.equal(ints,-28);
const urn = .5*(1/3)+.5*(1/3); assert.equal(urn,1/3); assert.equal(chosen('2026_CS1','CS',11),'1/3');

// One fixed deadline, including the exact India-midnight boundary.
const rules = offer.fromEnv({}), end = Date.parse('2026-10-31T18:30:00.000Z');
assert.equal(offer.quote(rules, end-1).priceMinor, 29900);
assert.equal(offer.quote(rules, end).priceMinor, 49900);
assert.equal(offer.quote(rules, end+1e10).offerActive, false);
assert.equal(courseSettings({}, end-1).priceMinor, 29900);
assert.equal(courseSettings({}, end).priceMinor, 49900);
assert.throws(()=>offer.fromEnv({GATEWISE_COURSE_OFFER_PRICE_MINOR:'99900'}));
assert.throws(()=>offer.fromEnv({GATEWISE_COURSE_OFFER_ENDS_AT:'31 October'}));
assert.throws(()=>offer.fromEnv({GATEWISE_COURSE_OFFER_PRICE_MINOR:'0'}));
console.log('PYQ checks passed: 105 MCQs, all 24 papers, source/key references, independently computed answers, one free sample and the fixed ₹299 expiry.');
