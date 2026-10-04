(function () {
  'use strict';
  const T = GatewiseTime, q = selector => document.querySelector(selector);
  const activities = { learning: 'Learning', practice: 'Practice', revision: 'Revision', mock: 'Mock test', paper: 'Past paper', other: 'General study' };
  let key = null, draft = { timer: null, lastRecordId: null, mode: 'stopwatch' }, historyDate = null, ready = false;
  const currentKey = () => 'gatewise-focus-draft:' + (GatewiseProgress.userId || 'guest');
  const currentTimer = () => ready && key === currentKey() && !GatewiseProgress.locked ? draft.timer : null;
  const records = () => state.focusSessions || [];
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(draft)); }
    catch { toast('The timer is available in this tab, but browser storage is full.'); }
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(currentKey())) || {}; } catch { return {}; }
  }
  function activate() {
    if (typeof appReady === 'undefined' || !appReady || GatewiseProgress.locked) return;
    key = currentKey(); draft = { timer: null, lastRecordId: null, mode: 'stopwatch', ...read() }; ready = true;
    if (draft.timer && (!draft.timer.sessionId || !Array.isArray(draft.timer.segments))) draft.timer = null;
    historyDate = null; q('#studytimer').disabled = false;
    tick(); refresh();
  }
  function context() {
    const [page, sid, lid] = location.hash.slice(1).split('/');
    if (page === 'learn' && lid) { const s = subjects.find(s => s.id === Number(sid)), l = s?.lessons.find(l => l.id === lid); if (l) return { kind: 'learning', subject: s.id, lesson: l.id, label: l.title }; }
    if (page === 'practice') { const l = subjects.flatMap(s => s.lessons).find(l => l.id === practice?.lesson); return { kind: 'practice', subject: practice?.sid !== 'all' ? Number(practice?.sid) : null, lesson: l?.id || null, label: l?.title || 'Question practice' }; }
    return { kind: activities[page] ? page : page === 'mocks' ? 'mock' : page === 'papers' ? 'paper' : 'other', subject: null, lesson: null, label: page === 'revision' ? 'Revision & notes' : page === 'mocks' ? 'Mock practice' : page === 'papers' ? 'Past-paper practice' : 'General study' };
  }
  function snapshot() { return T.totals(records(), currentTimer(), Date.now()); }
  function week() { const now = Date.now(); return Array.from({ length: 7 }, (_, i) => T.day(now - (6 - i) * T.DAY)); }
  function overviewMarkup() {
    const journal = location.hash.split('/')[0] === '#study' ? '<button class="textlink" type="button" data-study-journal>Jump to the session journal ↓</button>' : '<a class="textlink" href="#study">Time history & session journal →</a>';
    return `<section class="studyoverview panel"><div><span class="eyebrow">TIME THAT ADDS UP</span><h2>Today’s focused study</h2><p><strong data-study-today>0s</strong> of your ${state.hours}-hour daily target <span class="muted">· India time</span></p><div class="progress studygoalbar" role="progressbar" aria-label="Daily study target" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-study-progress></span></div><small class="muted">Completed sessions sync to your account. This device’s current session is included here.</small></div><div class="studyoverviewactions"><button class="btn" type="button" data-openfocus>◷ &nbsp; Start a study timer</button>${journal}</div></section>`;
  }
  function addRecord(item) {
    if (!item || records().some(row => row.eventId === item.eventId)) return;
    state.focusSessions.unshift(item);
    for (const day of Object.keys(T.splitDays(item.segments))) if (!state.sessions.includes(day)) state.sessions.push(day);
    save();
  }
  function tick() {
    const timer = currentTimer();
    if (timer) {
      // Another tab may already have saved this block. Do not record or count it twice.
      if (timer.phase === 'focus' && records().some(item => item.eventId === timer.sessionId)) { draft.timer = null; persist(); }
      else {
        const next = T.advance(timer, Date.now());
        if (next.timer !== timer) {
          draft.timer = next.timer;
          if (next.record) { draft.lastRecordId = next.record.eventId; addRecord(next.record); toast(next.timer.status === 'ready' ? 'Focus block saved. Break complete—start again when you’re ready.' : 'Focus block saved. Time for a break.'); }
          else toast('Break complete. Start the next block when you’re ready.');
          persist(); renderOpenDialog(); refresh();
        }
      }
    }
    updateClocks(); refreshTotals();
  }
  function timerLabel(timer) { return timer.phase === 'break' ? timer.status === 'ready' ? 'Break complete' : 'Break · not counted as study' : timer.status === 'paused' ? 'Focus paused' : timer.mode === 'stopwatch' ? 'Stopwatch · focus running' : 'Focus block running'; }
  function shownTime(timer) { const elapsed = T.elapsed(timer, Date.now()); return timer.targetMs ? Math.max(0, timer.targetMs - elapsed) : elapsed; }
  function updateClocks() {
    const timer = currentTimer(), dock = q('#focusdock');
    dock.hidden = !timer; q('#studytimer').classList.toggle('timerrunning', !!timer && timer.status === 'running');
    if (!timer) return;
    document.querySelectorAll('[data-focus-clock]').forEach(node => node.textContent = T.clock(shownTime(timer)));
    document.querySelectorAll('[data-focus-status]').forEach(node => { const text = timerLabel(timer); if (node.textContent !== text) node.textContent = text; });
    q('#focusquickpause').hidden = timer.status === 'ready';
    q('#focusquickpause').textContent = timer.status === 'running' ? 'Pause' : 'Resume';
    q('#focusquickpause').setAttribute('aria-label', timer.status === 'running' ? 'Pause study timer' : 'Resume study timer');
  }
  function refreshTotals() {
    if (!ready || key !== currentKey() || GatewiseProgress.locked) return;
    const days = snapshot(), todayMs = days[today()] || 0, percentage = Math.min(100, Math.floor(todayMs / (state.hours * 3600000) * 100));
    document.querySelectorAll('[data-study-today]').forEach(node => node.textContent = T.duration(todayMs));
    document.querySelectorAll('[data-study-week]').forEach(node => node.textContent = T.duration(week().reduce((n, key) => n + (days[key] || 0), 0)));
    document.querySelectorAll('[data-study-total]').forEach(node => node.textContent = T.duration(Object.values(days).reduce((n, ms) => n + ms, 0)));
    document.querySelectorAll('[data-study-count]').forEach(node => node.textContent = records().length);
    document.querySelectorAll('[data-study-progress]').forEach(node => { node.style.width = percentage + '%'; node.parentElement.setAttribute('aria-valuenow', percentage); });
    document.querySelectorAll('[data-weekday]').forEach(node => {
      const amount = days[node.dataset.weekday] || 0, maximum = Math.max(state.hours * 3600000, ...week().map(day => days[day] || 0));
      node.querySelector('.weekbarfill').style.height = amount ? Math.max(3, amount / maximum * 100) + '%' : '0';
      node.querySelector('.weekamount').textContent = T.duration(amount);
      node.setAttribute('aria-label', `${node.dataset.weekday}: ${T.duration(amount)}. Show sessions.`);
    });
  }
  function refresh() {
    if (!ready || key !== currentKey() || GatewiseProgress.locked) return;
    refreshTotals(); updateClocks(); bindOpenButtons();
    if (q('#studyhistory')) renderHistory();
  }
  function bindOpenButtons() {
    document.querySelectorAll('[data-openfocus]').forEach(button => button.onclick = open);
    document.querySelectorAll('[data-study-journal]').forEach(button => button.onclick = () => q('#studyhistorytitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  function start(event) {
    event?.preventDefault();
    if (GatewiseProgress.locked || currentTimer()) return;
    const mode = q('#focusmode').value;
    const minutes = mode === '50' ? 50 : mode === 'custom' ? Number(q('#focusminutes').value) : 25;
    const breaks = mode === '50' ? 10 : mode === 'custom' ? Number(q('#breakminutes').value) : 5;
    if (mode !== 'stopwatch' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180 || !Number.isInteger(breaks) || breaks < 1 || breaks > 30)) { q('#focusformmessage').textContent = 'Choose 1–180 focus minutes and 1–30 break minutes.'; return; }
    const lesson = subjects.flatMap(s => s.lessons).find(l => l.id === q('#focustopic').value), activity = q('#focusactivity').value;
    const selected = context();
    draft.mode = mode; draft.focusMinutes = minutes; draft.breakMinutes = breaks;
    draft.timer = T.create({ sessionId: crypto.randomUUID(), mode: mode === 'stopwatch' ? mode : 'pomodoro', focusMinutes: minutes, breakMinutes: breaks,
      goal: q('#focusgoal').value.trim(), context: { kind: activity, lesson: lesson?.id || null, subject: lesson ? Number(lesson.id.split('-')[0]) : selected.subject, label: lesson?.title || activities[activity] } }, Date.now());
    persist(); renderDialog(); refresh();
  }
  function toggle() {
    tick(); const timer = currentTimer(); if (!timer || timer.status === 'ready') return;
    draft.timer = timer.status === 'running' ? T.pause(timer, Date.now()) : T.resume(timer, Date.now());
    persist(); renderOpenDialog(); refresh();
  }
  function finish() {
    tick(); const timer = currentTimer(); if (!timer) return;
    const item = T.record(timer, Date.now());
    draft.timer = null;
    if (item) { draft.lastRecordId = item.eventId; addRecord(item); }
    persist(); refresh();
    if (item) renderReflection(item.eventId);
    else { renderDialog(); toast(timer.phase === 'break' ? 'Break ended. Your focus block is already saved.' : 'A session needs at least one second to be recorded.'); }
  }
  function nextBlock() {
    const previous = currentTimer();
    if (!previous || previous.phase !== 'break') return;
    const last = records().find(row => row.eventId === draft.lastRecordId);
    draft.timer = T.create({ sessionId: crypto.randomUUID(), mode: 'pomodoro', focusMinutes: last?.durationMs ? Math.round(last.durationMs / 60000) : 25,
      breakMinutes: previous.breakMinutes, context: previous.context, goal: previous.goal }, Date.now());
    persist(); renderDialog(); refresh();
  }
  function open() { if (typeof appReady === 'undefined' || !appReady || GatewiseProgress.locked) return; tick(); renderDialog(); q('#focusdialog').showModal(); }
  function renderOpenDialog() { if (q('#focusdialog').open && !q('#focusreflection')) renderDialog(); }
  function renderDialog() {
    const dialog = q('#focusdialog'), timer = currentTimer(), selected = context();
    if (timer) {
      dialog.innerHTML = `<div class="sectionhead"><span class="eyebrow">YOUR STUDY SESSION</span><button class="textlink" data-closefocus aria-label="Close timer">Close ×</button></div><h2>${esc(timer.context.label)}</h2><p data-focus-status>${timerLabel(timer)}</p><div class="focusclock" data-focus-clock aria-live="off">${T.clock(shownTime(timer))}</div>${timer.goal ? `<div class="focusgoal"><b>My goal</b><p>${esc(timer.goal)}</p></div>` : ''}<div class="actions">${timer.status !== 'ready' ? `<button class="btn" id="focuspause">${timer.status === 'running' ? 'Pause' : 'Resume'}</button>` : ''}${timer.phase === 'focus' ? '<button class="btn secondary" id="focusfinish">Finish & save session</button>' : '<button class="btn" id="focusnext">Start next focus block</button><button class="btn secondary" id="focusfinish">End break</button>'}</div>${timer.context.lesson ? `<p><a class="textlink" href="#learn/${timer.context.subject}/${timer.context.lesson}" data-closefocus>Back to this lesson →</a></p>` : ''}${timer.phase === 'break' && draft.lastRecordId ? '<button class="textlink" id="focusreflect">Reflect on the saved block →</button>' : ''}<p class="muted focushelp">The running timer continues across navigation and refreshes on this browser. Pause before stepping away. Breaks and paused time are excluded.</p>`;
      if (q('#focuspause')) q('#focuspause').onclick = toggle;
      q('#focusfinish').onclick = finish;
      if (q('#focusnext')) q('#focusnext').onclick = nextBlock;
      if (q('#focusreflect')) q('#focusreflect').onclick = () => renderReflection(draft.lastRecordId);
    } else {
      dialog.innerHTML = `<div class="sectionhead"><span class="eyebrow">MAKE THIS SESSION COUNT</span><button class="textlink" data-closefocus aria-label="Close timer">Close ×</button></div><h2>Your study timer</h2><p>Choose one small goal. Track the time you put into it.</p><form id="focusform"><label>Timer mode<select id="focusmode"><option value="stopwatch">Stopwatch · count up</option><option value="25">Pomodoro · 25 min focus / 5 min break</option><option value="50">Deep work · 50 min focus / 10 min break</option><option value="custom">Custom focus block</option></select></label><div id="focuscustom" class="focuscustom" hidden><label>Focus minutes<input id="focusminutes" type="number" min="1" max="180" step="1" value="${draft.focusMinutes || 25}"></label><label>Break minutes<input id="breakminutes" type="number" min="1" max="30" step="1" value="${draft.breakMinutes || 5}"></label></div><label>What are you working on?<select id="focusactivity">${Object.entries(activities).map(([id, label]) => `<option value="${id}" ${selected.kind === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Topic<select id="focustopic"><option value="">General session / multiple topics</option>${subjects.map(s => `<optgroup label="${esc(s.name)}">${s.lessons.map(l => `<option value="${l.id}" ${selected.lesson === l.id ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>One goal for this session<input id="focusgoal" maxlength="240" placeholder="For example: solve three matrix-rank problems"></label><p id="focusformmessage" role="status"></p><button class="btn" type="submit">Start studying →</button></form><p class="muted focushelp">Pomodoro blocks save automatically at the end of focus time. Completed sessions sync to your account; the active timer stays on this browser.</p>`;
      q('#focusmode').value = draft.mode;
      const setMode = () => { q('#focuscustom').hidden = q('#focusmode').value !== 'custom'; };
      q('#focusmode').onchange = setMode; setMode(); q('#focusform').onsubmit = start;
    }
    dialog.querySelectorAll('[data-closefocus]').forEach(button => button.onclick = () => dialog.close());
  }
  function renderReflection(id) {
    const item = records().find(row => row.eventId === id); if (!item) return;
    const value = state.focusReflections[id] || {}, dialog = q('#focusdialog');
    dialog.innerHTML = `<div class="sectionhead"><span class="eyebrow">TURN TIME INTO UNDERSTANDING</span><button class="textlink" data-closefocus aria-label="Close session journal">Close ×</button></div><h2>${esc(item.context.label)}</h2><p>${T.duration(item.durationMs)} of focused study${item.goal ? ' · Goal: ' + esc(item.goal) : ''}</p><form id="focusreflection"><label>Explain one idea from memory<textarea id="focusrecall" maxlength="2000" rows="3" placeholder="Without looking at the lesson, explain the idea in your own words.">${esc(value.recall || '')}</textarea></label><label>What confused you or caused a mistake?<textarea id="focusmistake" maxlength="2000" rows="3" placeholder="For example: I confused rank with the number of nonzero rows before elimination.">${esc(value.mistake || '')}</textarea></label><label>Your next step<input id="focusnextaction" maxlength="500" value="${esc(value.nextAction || '')}" placeholder="For example: redo one question using pivot positions"></label><div class="actions"><button class="btn" type="submit">Save reflection</button>${item.context.lesson ? '<button class="btn secondary" type="button" id="focusreview">Review this topic tomorrow</button>' : ''}</div><p id="reflectionstatus" role="status"></p></form><p class="muted">This journal is optional. A finished session does not mark a lesson read or a check passed.</p>${currentTimer() ? '<button class="textlink" id="backtotimer">Back to the timer →</button>' : ''}`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('[data-closefocus]').onclick = () => dialog.close();
    q('#focusreflection').onsubmit = event => { event.preventDefault(); state.focusReflections[id] = { recall: q('#focusrecall').value.trim(), mistake: q('#focusmistake').value.trim(), nextAction: q('#focusnextaction').value.trim(), updatedAt: Date.now() }; save(); q('#reflectionstatus').textContent = GatewiseCloud.user ? 'Reflection saved on this device. Check the account status for sync.' : 'Reflection saved on this device.'; refresh(); };
    if (q('#focusreview')) q('#focusreview').onclick = () => {
      const date = T.day(Date.now() + T.DAY), existing = state.reviewDates[item.context.lesson];
      state.reviewDates[item.context.lesson] = existing && existing < date ? existing : date; save();
      q('#reflectionstatus').textContent = 'Topic scheduled for ' + state.reviewDates[item.context.lesson] + '. Find it in Revision & notes.';
    };
    if (q('#backtotimer')) q('#backtotimer').onclick = renderDialog;
  }
  function renderHistory() {
    const target = q('#studyhistory'); if (!target) return;
    const selected = records().filter(row => !historyDate || (T.splitDays(row.segments)[historyDate] || 0) > 0).sort((a, b) => b.finishedAt - a.finishedAt);
    q('#studyhistorytitle').textContent = historyDate ? 'Sessions on ' + historyDate : 'Your session journal';
    target.innerHTML = selected.slice(0, 50).map(item => {
      const reflection = state.focusReflections[item.eventId];
      return `<article class="studyhistoryrow"><div><span class="eyebrow">${esc(activities[item.context.kind] || 'Study')} · ${T.day(item.finishedAt)}</span><h3>${esc(item.context.label)}</h3><p>${item.goal ? esc(item.goal) : 'A focused study session'}</p>${reflection?.nextAction ? `<p class="usernote"><b>Next step:</b> ${esc(reflection.nextAction)}</p>` : ''}</div><div class="studyhistoryactions"><strong>${T.duration(item.durationMs)}</strong><button class="textlink" data-reflection="${esc(item.eventId)}">${reflection ? 'View reflection' : 'Add reflection'} →</button>${item.context.lesson ? `<a class="textlink" href="#learn/${item.context.subject}/${item.context.lesson}">Revisit topic →</a>` : ''}</div></article>`;
    }).join('') || '<div class="empty"><h3>Your first session starts here</h3><p>Start the timer while studying, then finish to save the time and an optional reflection.</p><button class="btn secondary" data-openfocus>Start a timer →</button></div>';
    document.querySelectorAll('[data-reflection]').forEach(button => button.onclick = () => renderReflection(button.dataset.reflection)); bindOpenButtons();
    const dates = new Set(week()), totals = {};
    for (const item of records()) { const amount = Object.entries(T.splitDays(item.segments)).reduce((n, [day, ms]) => n + (dates.has(day) ? ms : 0), 0); totals[item.context.kind] = (totals[item.context.kind] || 0) + amount; }
    q('#studyactivities').innerHTML = Object.entries(totals).filter(([, ms]) => ms > 0).sort((a, b) => b[1] - a[1]).map(([kind, ms]) => `<div class="studyactivity"><span>${esc(activities[kind] || 'Study')}</span><strong>${T.duration(ms)}</strong></div>`).join('') || '<p class="muted">Finish a session to see how you spend your study time.</p>';
  }
  function page() {
    historyDate = null;
    app.innerHTML = title('STUDY TOOLS', 'Give your study time a purpose.', 'Track focused time, take deliberate breaks and leave a useful next step for tomorrow.') + overviewMarkup() + `<div class="studystats"><div class="panel"><span class="eyebrow">LAST 7 DAYS</span><strong data-study-week>0s</strong></div><div class="panel"><span class="eyebrow">ALL TRACKED TIME</span><strong data-study-total>0s</strong></div><div class="panel"><span class="eyebrow">SAVED SESSIONS</span><strong data-study-count>${records().length}</strong></div></div><div class="studytoolsgrid"><section class="panel"><div class="sectionhead"><h2>Your last seven days</h2><button class="textlink" id="studyshowall">All sessions</button></div><p class="muted">Select a day to see its sessions. Pauses and breaks are excluded.</p><div class="weekchart">${week().map(day => `<button class="weekday" type="button" data-weekday="${day}"><span class="weekamount">0s</span><span class="weekbar"><span class="weekbarfill"></span></span><span>${new Date(day + 'T12:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' })}</span><small>${day.slice(8)}</small></button>`).join('')}</div></section><section class="panel"><h2>Where your time went</h2><p class="muted">Completed sessions in the last seven days. Overlapping activity sessions may appear in more than one category.</p><div id="studyactivities"></div><div class="recalltip"><b>Try a short recall check</b><p>After a session, close the lesson and explain one concept from memory. Write the gap you noticed in your session journal, then revisit its example.</p></div></section></div><section class="panel studyjournal"><h2 id="studyhistorytitle">Your session journal</h2><p class="muted">Goals, reflections and follow-up actions for your latest 50 sessions.</p><div id="studyhistory"></div></section>`;
    document.querySelectorAll('[data-weekday]').forEach(button => button.onclick = () => { historyDate = button.dataset.weekday; document.querySelectorAll('[data-weekday]').forEach(b => b.classList.toggle('selected', b === button)); renderHistory(); });
    q('#studyshowall').onclick = () => { historyDate = null; document.querySelectorAll('[data-weekday]').forEach(b => b.classList.remove('selected')); renderHistory(); };
    refresh();
  }
  window.GatewiseStudy = { open, page, overviewMarkup, refresh, get timer() { return currentTimer(); } };
  q('#studytimer').onclick = open;
  q('#focusdockopen').onclick = open; q('#focusquickpause').onclick = toggle;
  window.addEventListener('gatewise-app-ready', activate);
  window.addEventListener('gatewise-account-loading', () => {
    if (draft.timer && draft.timer.status === 'running') { draft.timer = T.pause(draft.timer, Date.now()); persist(); }
    ready = false; q('#studytimer').disabled = true; q('#focusdialog').close(); q('#focusdock').hidden = true;
  });
  window.addEventListener('gatewise-account-change', () => queueMicrotask(activate));
  window.addEventListener('gatewise-cloud-update', () => queueMicrotask(refresh));
  window.addEventListener('hashchange', () => queueMicrotask(refresh));
  window.addEventListener('storage', event => { if (event.key === key && !GatewiseProgress.locked) { draft = { timer: null, lastRecordId: null, mode: 'stopwatch', ...read() }; tick(); renderOpenDialog(); refresh(); } });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  setInterval(() => { if (typeof appReady !== 'undefined' && appReady) tick(); }, 1000);
})();
