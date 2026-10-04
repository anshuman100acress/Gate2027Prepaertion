/* Timer arithmetic is independent of render frequency and uses absolute timestamps. */
(function (root) {
  'use strict';
  const DAY = 86400000, IST = 330 * 60000;
  const copy = value => JSON.parse(JSON.stringify(value));
  const sum = segments => (segments || []).reduce((n, s) => n + Math.max(0, s.end - s.start), 0);
  const day = timestamp => new Date(timestamp + IST).toISOString().slice(0, 10);
  function create(options, now) {
    return { sessionId: options.sessionId, phase: 'focus', status: 'running', mode: options.mode,
      targetMs: options.mode === 'stopwatch' ? null : options.focusMinutes * 60000,
      breakMinutes: options.breakMinutes || 5, goal: options.goal || '', context: options.context,
      startedAt: now, runningSince: now, segments: [], breakElapsedMs: 0 };
  }
  function elapsed(timer, now) {
    if (!timer) return 0;
    const previous = timer.phase === 'focus' ? sum(timer.segments) : timer.breakElapsedMs || 0;
    const current = timer.status === 'running' ? Math.max(0, now - timer.runningSince) : 0;
    return Math.max(0, Math.min(previous + current, timer.targetMs ?? Infinity));
  }
  function pause(timer, now) {
    const result = copy(timer);
    if (result.status !== 'running') return result;
    const duration = elapsed(result, now);
    if (result.phase === 'focus') {
      const extra = Math.max(0, duration - sum(result.segments));
      if (extra) result.segments.push({ start: result.runningSince, end: result.runningSince + extra });
    } else result.breakElapsedMs = duration;
    result.status = 'paused'; result.runningSince = null;
    return result;
  }
  function resume(timer, now) { return { ...copy(timer), status: 'running', runningSince: now }; }
  function record(timer, now) {
    if (!timer || timer.phase !== 'focus') return null;
    const stopped = pause(timer, now), durationMs = sum(stopped.segments);
    if (durationMs < 1000) return null;
    return { eventId: timer.sessionId, startedAt: timer.startedAt,
      finishedAt: stopped.segments.at(-1).end, durationMs, segments: stopped.segments,
      context: timer.context, goal: timer.goal, mode: timer.mode };
  }
  function advance(timer, now) {
    if (!timer || timer.status !== 'running' || !timer.targetMs || elapsed(timer, now) < timer.targetMs) return { timer, record: null };
    let result = copy(timer), finished = null;
    if (result.phase === 'focus') {
      finished = record(result, now);
      const end = result.runningSince + Math.max(0, result.targetMs - sum(result.segments));
      result = { ...result, phase: 'break', status: 'running', runningSince: end, segments: [],
        targetMs: result.breakMinutes * 60000, breakElapsedMs: 0 };
    }
    if (elapsed(result, now) >= result.targetMs) { result = pause(result, now); result.status = 'ready'; }
    return { timer: result, record: finished };
  }
  function splitDays(segments) {
    const totals = {};
    for (const segment of segments || []) {
      let cursor = segment.start;
      if (!Number.isFinite(cursor) || !Number.isFinite(segment.end) || segment.end <= cursor) continue;
      // Guard against corrupt cached dates while allowing normal long-running stopwatches.
      let guard = 0;
      while (cursor < segment.end && guard++ < 10000) {
        const boundary = (Math.floor((cursor + IST) / DAY) + 1) * DAY - IST;
        const end = Math.min(boundary, segment.end), key = day(cursor);
        totals[key] = (totals[key] || 0) + end - cursor;
        cursor = end;
      }
    }
    return totals;
  }
  function activeSegments(timer, now) { return timer?.phase === 'focus' ? pause(timer, now).segments : []; }
  function mergeSegments(segments) {
    const ordered = segments.filter(s => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start).map(s => ({ ...s })).sort((a, b) => a.start - b.start);
    const merged = [];
    for (const segment of ordered) {
      const previous = merged.at(-1);
      if (previous && segment.start <= previous.end) previous.end = Math.max(previous.end, segment.end);
      else merged.push(segment);
    }
    return merged;
  }
  function totals(records, timer, now) {
    const segments = [], seen = new Set();
    for (const item of records || []) {
      if (seen.has(item.eventId)) continue;
      seen.add(item.eventId);
      segments.push(...item.segments);
    }
    if (timer && !seen.has(timer.sessionId)) segments.push(...activeSegments(timer, now));
    return splitDays(mergeSegments(segments));
  }
  function clock(ms) {
    const secs = Math.floor(Math.max(0, ms) / 1000);
    return [Math.floor(secs / 3600), Math.floor(secs / 60) % 60, secs % 60].map(n => String(n).padStart(2, '0')).join(':');
  }
  function duration(ms) {
    const secs = Math.floor(Math.max(0, ms) / 1000), hours = Math.floor(secs / 3600), minutes = Math.floor(secs / 60) % 60;
    return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${secs % 60}s` : `${secs}s`;
  }
  root.GatewiseTime = { DAY, IST, create, elapsed, pause, resume, record, advance, splitDays, activeSegments, totals, day, clock, duration };
  if (typeof module !== 'undefined') module.exports = root.GatewiseTime;
})(globalThis);
