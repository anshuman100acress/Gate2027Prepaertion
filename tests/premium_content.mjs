import assert from 'node:assert/strict';
import { readCourseCatalog, courseRows } from '../scripts/course-catalog.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { rebase } = require('../progress-merge.js');
const catalog = await readCourseCatalog(process.cwd());
if (catalog.publicOnly) {
  await import('./course_release.mjs');
  console.log('Full premium-content fixtures stay in the private authoring workspace.');
  process.exit(0);
}
const lessons = catalog.syllabus.flatMap(s => s.lessons);
const guides = lessons.flatMap(l => l.premiumTopics);
assert.equal(guides.length, 323);
assert.equal(new Set(guides.map(g => g.id)).size, guides.length);
assert.equal(lessons.flatMap(l => l.studyCards || []).length, 44);
assert.equal(lessons.filter(l => l.examClinic).length, 11);
assert.equal(catalog.questions.length + catalog.pyqs.length + catalog['lesson-questions'].length, 414);
for (const lesson of lessons) {
  assert.deepEqual(lesson.premiumTopics.map(g => g.topic), lesson.topics, lesson.id);
  for (const g of lesson.premiumTopics) {
    const target = lessons.find(l => l.id === g.targetLesson);
    assert(target.tutorials.some(t => (t.depth || []).some(p => p.id === g.studyAnchor)), g.id);
    assert(g.explanation.length > 100 && g.approach.length >= 3, g.id);
    assert.deepEqual(g.exercises.map(e => e.kind), ['fundamental', 'application', 'trap']);
    assert(g.sources.length && g.sources.every(s => new URL(s.url).protocol === 'https:'));
    for (const e of g.exercises) assert(e.prompt && e.answer && e.verification && e.steps.length >= 3, g.id);
  }
}
const clinics = catalog.questions.filter(q => q.premium);
assert.equal(clinics.length, 33);
assert.equal(new Set(clinics.map(q => q.subject)).size, 11);
for (const q of clinics) {
  assert(lessons.some(l => l.id === q.lesson));
  assert(q.explanation.length > 100 && q.marks === 2);
  if (q.type === 'NAT') assert(Number.isFinite(q.answer));
  else {
    assert.equal(q.options.length, 4);
    const answers = q.type === 'MSQ' ? q.answer : [q.answer];
    assert(answers.every(a => Number.isInteger(a) && a >= 0 && a < 4));
  }
}
const q = (lesson, index) => clinics.find(q => q.id === `clinic-${lesson}-${index}`);
// Independent numerical checks for each subject's newly authored NAT problem.
const expected = [
  ['0-conditional-bayes', .9 * 20 + .05 * 980],
  ['1-sequential', Math.ceil(Math.log2(20))],
  ['2-cache', 32 - Math.log2(64) - Math.log2(32768 / 64 / 4)],
  ['3-trees-bst', 12 + 1],
  ['4-dynamic', Math.max(0, 3, 4, 5, 3 + 4)],
  ['5-decidability', Array.from({ length: 16 }, (_, n) => n.toString(2).split('1').length - 1).filter(n => n % 2 === 0).length],
  ['6-ir-dataflow', new Set(['a', 'c', ...['b', 'd'].filter(x => !['b', 'c'].includes(x))]).size],
  ['7-synchronization', 1],
  ['8-transactions', new Set(['T1>T2', 'T2>T1']).size],
  ['9-fragmentation', 2 * Math.floor((1500 - 20) / 8)],
  ['10-quantitative', 1 / (1 / 12 + 1 / 18)],
];
for (const [lesson, answer] of expected) assert(Math.abs(q(lesson, 0).answer - answer) < 1e-9, lesson);
// Restoring previews from authorized rows must recover exactly the full guides.
const rows = courseRows(catalog, 'gate-cs-2027').lessons;
for (const supplement of rows.flatMap(r => r.payload.premiumPreviewLessons || [])) {
  assert.deepEqual(supplement.premiumTopics, lessons.find(l => l.id === supplement.id).premiumTopics);
}
const bundle = progress => ({ progress, mock: null, paperRun: null });
const merged = rebase(bundle({}), bundle({ cardReviews: { a: { level: 1 } }, topicPractice: { a: { work: 'My solution' } }, drillResults: [{ eventId: 'left' }] }), bundle({ cardReviews: { b: { level: 2 } }, topicPractice: { b: { outcome: 'review' } }, drillResults: [{ eventId: 'right' }] })).progress;
assert.equal(Object.keys(merged.cardReviews).length, 2);
assert.equal(merged.topicPractice.a.work, 'My solution'); assert.equal(merged.topicPractice.b.outcome, 'review');
assert.equal(merged.drillResults.length, 2);
const draft = { id: 'drill-one', end: 1000, ids: ['one', 'two'], answers: {} };
const mergedDraft = rebase(bundle({ drillRun: draft }), bundle({ drillRun: { ...draft, answers: { one: 19 } } }), bundle({ drillRun: { ...draft, answers: { two: 0 } } })).progress.drillRun;
assert.deepEqual(mergedDraft.answers, { one: 19, two: 0 });
assert.equal(rebase(bundle({ drillRun: draft }), bundle({ drillRun: { ...draft, answers: { one: 19 } } }), bundle({ drillRun: null })).progress.drillRun, null, 'A completed drill must not be revived by stale answers');
console.log('Premium content checks passed: every topic, 969 guided exercises, 33 scored questions with numerical checks, 44 cards, preview hydration and cross-device progress merge.');
