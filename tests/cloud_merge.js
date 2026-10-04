const assert = require('node:assert/strict');
const { rebase, importGuest, equal } = require('../progress-merge.js');
const bundle = (progress = {}, mock = null, paperRun = null) => ({ progress, mock, paperRun });
assert(equal({ a: 1, b: { x: 2, y: 3 } }, { b: { y: 3, x: 2 }, a: 1 }), 'Postgres JSONB key ordering must not produce a change');
assert(!equal([1, 2], [2, 1]), 'array order must remain significant');

const base = bundle({ notes: { matrix: 'original', cpu: 'remove me' }, completed: ['rank'], bookmarks: ['rank'], attempts: [{ eventId: 'old', correct: true }] });
const local = bundle({ notes: { matrix: 'new explanation' }, completed: ['rank', 'gaussian'], bookmarks: [], attempts: [{ eventId: 'old', correct: true }, { eventId: 'local', correct: false }] });
const remote = bundle({ notes: { matrix: 'original', cpu: 'remove me', graph: 'other device' }, completed: ['rank', 'graph'], bookmarks: ['rank', 'graph'], attempts: [{ eventId: 'old', correct: true }, { eventId: 'remote', correct: true }] });
const result = rebase(base, local, remote);
assert.deepEqual(result.progress.notes, { matrix: 'new explanation', graph: 'other device' });
assert.deepEqual(new Set(result.progress.completed), new Set(['rank', 'graph', 'gaussian']));
assert.deepEqual(result.progress.bookmarks, ['graph']);
assert.deepEqual(new Set(result.progress.attempts.map(x => x.eventId)), new Set(['old', 'local', 'remote']));
assert.equal(remote.progress.notes.matrix, 'original', 'merge must not mutate the server snapshot');
assert.deepEqual(rebase(remote, remote, result), result, 'unchanged device must adopt the cloud snapshot');
assert.equal(rebase(base, local, bundle({ notes: { matrix: 'concurrent edit' } })).progress.notes.matrix, 'new explanation', 'local edit of the same note wins when saved last');

const run = { sessionId: 'test-1', end: 1000, questions: [1, 2], answers: { 0: 1 }, flags: [0], index: 0 };
const left = { ...run, answers: { 0: 1, 1: 2 }, flags: [], index: 1 };
const right = { ...run, answers: { 0: 3 }, flags: [0, 1] };
assert.deepEqual(rebase(bundle({}, run), bundle({}, left), bundle({}, right)).mock.answers, { 0: 3, 1: 2 });
assert.deepEqual(rebase(bundle({}, run), bundle({}, left), bundle({}, right)).mock.flags, [1]);
assert.equal(rebase(bundle({}, run), bundle({}, left), bundle()).mock, null, 'finished test must stay finished');
assert.equal(rebase(bundle({}, run), bundle({}, left), bundle({}, { ...right, sessionId: 'test-2' })).mock.sessionId, 'test-2', 'replaced test must not resurrect');
assert.equal(rebase(bundle({}, run), bundle({}, null), bundle({}, right)).mock, null, 'local submission removes active draft');
assert.equal(rebase(bundle({}, run), bundle({}, null), bundle({}, { ...right, sessionId: 'test-2' })).mock.sessionId, 'test-2', 'submitting an old test must not delete a replacement');
assert.equal(rebase(bundle(), bundle({}, run), bundle()).mock.sessionId, 'test-1', 'new draft must sync');
const duringWrite = bundle({ ...result.progress, notes: { ...result.progress.notes, matrix: 'typed during request' } });
assert.equal(rebase(result, duringWrite, result).progress.notes.matrix, 'typed during request', 'edits during a save must remain pending');

const imported = importGuest(bundle({ notes: { matrix: 'account note' }, completed: ['rank'], attempts: [{ eventId: 'same' }] }), bundle({ notes: { matrix: 'guest note', graph: 'guest graph' }, completed: ['rank', 'gaussian'], attempts: [{ eventId: 'same' }, { eventId: 'guest' }] }));
assert.equal(imported.progress.notes.matrix, 'account note');
assert.equal(imported.progress.notes.graph, 'guest graph');
assert.equal(imported.progress.attempts.length, 2);
assert.equal(importGuest(imported, bundle({ attempts: [{ eventId: 'guest' }] })).progress.attempts.length, 2, 'import must be idempotent');
const repeated = rebase(bundle(), bundle({ paperResults: [{ id: '2018', sessionId: 'one' }, { id: '2018', sessionId: 'two' }] }), bundle());
assert.equal(repeated.progress.paperResults.length, 2, 'separate attempts at the same paper are distinct');
console.log('Cloud merge checks passed: changes, removals, histories, active drafts, imports and in-flight edits.');
