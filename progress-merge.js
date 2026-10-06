/* Three-way merge: apply this device's changes to the latest cloud snapshot. */
(function (root) {
  'use strict';
  const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  function equal(a, b) {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && equal(a[key], b[key]));
  }
  const sets = new Set(['completed', 'understood', 'bookmarks', 'tasks', 'sessions', 'legacyCompleted']);
  const histories = new Set(['attempts', 'mockResults', 'paperResults', 'focusSessions']);
  const maps = new Set(['notes', 'moduleNotes', 'noteFormats', 'stickyNotes', 'reading', 'reviewDates', 'lessonChecks', 'focusReflections']);
  function mergeSet(base = [], local = [], remote = []) {
    const removed = new Set(base.filter(x => !local.includes(x)));
    return [...new Set([...remote.filter(x => !removed.has(x)), ...local.filter(x => !base.includes(x))])];
  }
  function historyId(item) { return item.eventId || item.sessionId || JSON.stringify(item); }
  function mergeHistory(base = [], local = [], remote = []) {
    const old = new Set(base.map(historyId)), added = local.filter(x => !old.has(historyId(x)));
    const seen = new Set();
    return [...added, ...remote].filter(x => { const id = historyId(x); if (seen.has(id)) return false; seen.add(id); return true; });
  }
  function mergeMap(base = {}, local = {}, remote = {}) {
    const result = clone(remote);
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (equal(base[key], local[key])) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (Object.hasOwn(local, key)) result[key] = clone(local[key]); else delete result[key];
    }
    return result;
  }
  function mergeProgress(base = {}, local = {}, remote = {}) {
    const result = clone(remote);
    for (const key of new Set([...Object.keys(base), ...Object.keys(local)])) {
      if (equal(base[key], local[key])) continue;
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (sets.has(key)) result[key] = mergeSet(base[key], local[key], remote[key]);
      else if (histories.has(key)) result[key] = mergeHistory(base[key], local[key], remote[key]);
      else if (maps.has(key)) result[key] = mergeMap(base[key], local[key], remote[key]);
      else if (Object.hasOwn(local, key)) result[key] = clone(local[key]); else delete result[key];
    }
    // A rich note's text and formatting describe one edit, including formatting-only edits.
    // Keep that pair together when an older/plain-text device edits the same note.
    for (const field of ['notes', 'moduleNotes']) {
      const prefix = field + ':';
      const keys = new Set([...Object.keys(base[field] || {}), ...Object.keys(local[field] || {}),
        ...Object.keys(base.noteFormats || {}).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)),
        ...Object.keys(local.noteFormats || {}).filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length))]);
      for (const key of keys) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
        const format = prefix + key;
        if (equal(base[field]?.[key], local[field]?.[key]) && equal(base.noteFormats?.[format], local.noteFormats?.[format])) continue;
        result[field] ||= {}; result.noteFormats ||= {};
        if (Object.hasOwn(local[field] || {}, key)) result[field][key] = clone(local[field][key]); else delete result[field][key];
        if (Object.hasOwn(local.noteFormats || {}, format)) result.noteFormats[format] = clone(local.noteFormats[format]); else delete result.noteFormats[format];
      }
    }
    return result;
  }
  function sessionId(run) { return run?.sessionId || run?.end; }
  function mergeRun(base, local, remote) {
    if (equal(base, local)) return clone(remote ?? null);
    if (base && !local) return clone(remote && sessionId(remote) !== sessionId(base) ? remote : null);
    if (!base || !local || sessionId(base) !== sessionId(local)) return clone(local ?? null);
    // A completed/replaced attempt must not be resurrected by stale answers on another device.
    if (sessionId(base) !== sessionId(remote)) return clone(remote ?? null);
    const result = mergeMap(base, local, remote);
    result.answers = mergeMap(base.answers, local.answers, remote.answers);
    if (local.flags) result.flags = mergeSet(base.flags, local.flags, remote.flags);
    return result;
  }
  function rebase(base = {}, local = {}, remote = {}) {
    return {
      progress: mergeProgress(base.progress, local.progress, remote.progress),
      mock: mergeRun(base.mock, local.mock, remote.mock),
      paperRun: mergeRun(base.paperRun, local.paperRun, remote.paperRun)
    };
  }
  function importGuest(account = {}, guest = {}) {
    const progress = clone(account.progress || {}), incoming = guest.progress || {};
    for (const [key, value] of Object.entries(incoming)) {
      if (sets.has(key)) progress[key] = [...new Set([...(progress[key] || []), ...value])];
      else if (histories.has(key)) progress[key] = mergeHistory([], value, progress[key]);
      else if (maps.has(key)) progress[key] = { ...value, ...progress[key] };
      else if (!Object.hasOwn(progress, key) || progress[key] === '') progress[key] = clone(value);
    }
    for (const field of ['notes', 'moduleNotes']) {
      for (const key of Object.keys(incoming[field] || {})) {
        const format = field + ':' + key;
        const source = Object.hasOwn(account.progress?.[field] || {}, key) ? account.progress : incoming;
        if (Object.hasOwn(source.noteFormats || {}, format)) {
          progress.noteFormats ||= {}; progress.noteFormats[format] = clone(source.noteFormats[format]);
        } else if (progress.noteFormats) delete progress.noteFormats[format];
      }
    }
    return { progress, mock: account.mock || guest.mock || null, paperRun: account.paperRun || guest.paperRun || null };
  }
  root.GatewiseMerge = { clone, equal, rebase, importGuest };
  if (typeof module !== 'undefined') module.exports = root.GatewiseMerge;
})(globalThis);
