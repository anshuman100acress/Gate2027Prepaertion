const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const bundle = (progress = {}) => ({ progress, mock: null, paperRun: null });
const copy = value => JSON.parse(JSON.stringify(value));
function workspace() {
  const disk = new Map(), writes = [], events = [], listeners = new Map();
  let failing = false;
  const context = {
    Event: class { constructor(type) { this.type = type; } },
    localStorage: {
      getItem(key) { return disk.get(key) ?? null; },
      setItem(key, value) {
        writes.push({ key, value });
        if (failing) throw new Error('QuotaExceededError');
        disk.set(key, value);
      },
      removeItem(key) { disk.delete(key); }
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    dispatchEvent(event) {
      events.push(event.type);
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  vm.createContext(context);
  for (const file of ['progress-merge.js', 'progress-store.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  return {
    store: context.GatewiseProgress, disk, writes, events,
    fail(value) { failing = value; },
    snapshot() { return copy(context.GatewiseProgress.snapshot()); },
    account(id) { return JSON.parse(disk.get('gatewise-account:' + id)); },
    storage(id, incoming) {
      const key = 'gatewise-account:' + id, value = JSON.stringify(incoming);
      disk.set(key, value);
      context.dispatchEvent({ type: 'storage', key, newValue: value });
    }
  };
}

const account = workspace(), original = { notes: { topic: 'original' } };
account.store.activate('student');
account.store.accept(bundle(original), bundle(original));
const edited = {
  notes: { topic: 'edited' },
  noteFormats: { 'notes:topic': { text: 'edited', html: '<b>edited</b>' } }
};
account.fail(true);
assert.throws(() => account.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
assert.deepEqual(account.snapshot().data.progress, edited, 'failed disk saves retain rich notes in memory for recovery/export');
assert.deepEqual(JSON.parse(account.store.getItem('gatewise-v1')), edited, 'the active session can still read its unsaved edits');
assert.deepEqual(account.account('student').data.progress, original, 'a failed save must not claim the disk contains new notes');
assert.equal(account.store.pending(), true, 'recoverable edits must remain eligible for cloud sync');
let before = account.writes.length;
assert.throws(() => account.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/,
  'the same-value save after a failure must retry and report another failure');
assert.equal(account.writes.length, before + 1, 'unchanged in-memory data is not proof of a successful disk save');
account.fail(false);
before = account.writes.length;
account.store.setItem('gatewise-v1', JSON.stringify(edited));
assert.equal(account.writes.length, before + 1, 'an identical retry writes the recovered edits once storage works again');
assert.deepEqual(account.account('student').data.progress, edited);
assert(account.events.includes('gatewise-dirty'), 'successful recovery schedules pending cloud work');
before = account.writes.length;
const dirtyEvents = account.events.filter(type => type === 'gatewise-dirty').length;
account.store.setItem('gatewise-v1', JSON.stringify(edited));
assert.equal(account.writes.length, before, 'normal identical saves retain write deduplication');
assert.equal(account.events.filter(type => type === 'gatewise-dirty').length, dirtyEvents);

// A cloud acknowledgement changes the cached base even if its progress is unchanged.
account.fail(true);
assert.throws(() => account.store.accept(bundle(edited), bundle(edited)), /QuotaExceededError/);
account.fail(false);
before = account.writes.length;
account.store.setItem('gatewise-v1', JSON.stringify(edited));
assert.equal(account.writes.length, before + 1, 'same-value retries also persist a cloud base whose previous disk write failed');
assert.deepEqual(account.account('student').base.progress, edited);

const tabs = workspace();
tabs.store.activate('student');
tabs.store.accept(bundle(original), bundle(original));
tabs.fail(true);
assert.throws(() => tabs.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
const otherDevice = { ...original, notes: { ...original.notes, remote: 'another tab' } };
tabs.disk.set('gatewise-account:student', JSON.stringify({ data: bundle(otherDevice), base: bundle(original) }));
tabs.fail(false);
tabs.store.setItem('gatewise-v1', JSON.stringify(edited));
assert.deepEqual(tabs.account('student').data.progress.notes, { topic: 'edited', remote: 'another tab' },
  'a retry rebases retained edits onto the latest disk snapshot rather than overwriting another tab');
assert.deepEqual(tabs.account('student').data.progress.noteFormats, edited.noteFormats);
assert(tabs.events.includes('gatewise-cloud-update'), 'the app is told to load newly merged notes from another tab');

// Storage events must also retain unpersisted local edits and their pending retry.
const notified = workspace();
notified.store.activate('student');
notified.store.accept(bundle(original), bundle(original));
notified.fail(true);
assert.throws(() => notified.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
notified.storage('student', { data: bundle(otherDevice), base: bundle(original) });
const combined = notified.snapshot().data.progress;
assert.deepEqual(combined.notes, { topic: 'edited', remote: 'another tab' });
notified.fail(false);
before = notified.writes.length;
notified.store.setItem('gatewise-v1', JSON.stringify(combined));
assert.equal(notified.writes.length, before + 1, 'a storage event cannot clear the retry for edits still absent from disk');
assert.deepEqual(notified.account('student').data.progress, combined);

const guest = workspace();
guest.store.activate(null);
guest.store.setItem('gatewise-v1', JSON.stringify(original));
guest.fail(true);
assert.throws(() => guest.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
assert.deepEqual(JSON.parse(guest.store.getItem('gatewise-v1')), original);
before = guest.writes.length;
assert.throws(() => guest.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
assert.equal(guest.writes.length, before + 1, 'guest retries preserve direct browser-storage failure reporting');
guest.fail(false);
guest.store.setItem('gatewise-v1', JSON.stringify(edited));
assert.deepEqual(JSON.parse(guest.store.getItem('gatewise-v1')), edited);
guest.store.activate('failed-student');
guest.fail(true);
assert.throws(() => guest.store.setItem('gatewise-v1', JSON.stringify(edited)), /QuotaExceededError/);
guest.store.activate('other-student');
guest.fail(false);
before = guest.writes.length;
guest.store.setItem('gatewise-v1', '{}');
assert.equal(guest.writes.length, before, 'switching accounts resets prior failed-write tracking');

console.log('Progress storage checks passed: quota failures, recoverable rich notes, identical retries, deduplication, cloud acknowledgements, tab merges and guest saves.');
