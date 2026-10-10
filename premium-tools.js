/* Paid learning tools use authorized course payloads. Saved progress contains
   question/card IDs and the learner's work, never course explanations. */
(function () {
  'use strict';
  let clock = null, result = null;
  const allowed = () => GatewiseCourse.canMock() && !GatewiseProgress.locked;
  const lessons = () => subjects.flatMap(s => s.lessons.map(l => ({ s, l })));
  const allTopics = () => lessons().flatMap(({ s, l }) => (l.premiumTopics || []).map(g => ({ s, l, g })));
  const allCards = () => lessons().flatMap(({ s, l }) => (l.studyCards || []).map(c => ({ ...c, subject: s.id, lesson: l.id })));
  const tabs = [['topics', 'Topic guides'], ['drills', 'Timed drills'], ['recall', 'Spaced recall'], ['insights', 'Performance']];
  const text = value => String(value || '').split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('');
  const shuffle = values => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  function latestAttempts() {
    const latest = new Map();
    for (const a of state.attempts) {
      const old = latest.get(a.qid);
      if (!old || String(a.timestamp || a.date) >= String(old.timestamp || old.date)) latest.set(a.qid, a);
    }
    return latest;
  }
  const mistakes = () => { const latest = latestAttempts(); return bank.filter(q => latest.get(q.id)?.correct === false); };
  function shell(tab, copy) {
    app.innerHTML = title('PREMIUM STUDIO', 'Understand. Practise. Remember.', copy) +
      `<nav class="premium-tabs" aria-label="Premium tools">${tabs.map(([id, label]) => `<a class="btn ${tab === id ? '' : 'secondary'}" href="#premium/${id}" ${tab === id ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav><div id="premium-content"></div>`;
  }
  function page(tab = 'topics', id) {
    if (!allowed()) {
      reset();
      app.innerHTML = title('PREMIUM STUDIO', 'A deeper way to prepare.', 'Topic guides, timed drills, mistake review and spaced recall are included with a course pass.') + courseLockMarkup();
      return;
    }
    if (!tabs.some(([key]) => key === tab)) tab = 'topics';
    shell(tab, { topics: 'Every named topic: explanation, attempt-first examples and curated further reading.', drills: 'Build a focused test, practise under a time limit, then study every solution.', recall: 'Retrieve the idea before revealing it. Review difficult cards more often.', insights: 'Use your own practice results to choose your next study session.' }[tab]);
    if (tab === 'topics') topicPage(id);
    if (tab === 'recall') recallPage();
    if (tab === 'insights') insightsPage();
    if (tab === 'drills') {
      if (state.drillRun && state.drillRun.end <= Date.now()) finishDrill();
      else if (state.drillRun) renderDrill();
      else if (result) drillReview();
      else drillSetup();
    }
  }
  function topicPage(id) {
    const topics = allTopics(), chosen = topics.find(x => x.g.id === id);
    if (chosen) { topicDetail(chosen); return; }
    $('#premium-content').innerHTML = `<section class="panel"><div class="sectionhead"><div><h2>Find a topic to master</h2><p>${topics.length} lesson-specific guides across ${subjects.length} subjects. Each topic has five worked examples and a five-question reasoning ladder.</p></div></div><div class="filters"><label>Subject<select id="guide-subject"><option value="all">All subjects</option>${subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>Search topics<input id="guide-search" type="search" placeholder="e.g. Bayes, cache, normalization"></label></div><p class="muted">Start at Level 1 and progress to Level 5. Study worked cases, then attempt the guided tasks with hints and solutions hidden. The lesson challenge adds a new scored GATE-style question.</p><p id="guide-count" role="status"></p><div id="guide-list" class="guide-grid"></div></section>`;
    const render = () => {
      const sid = $('#guide-subject').value, query = $('#guide-search').value.trim().toLowerCase();
      const selected = topics.filter(({ s, l, g }) => (sid === 'all' || s.id === Number(sid)) && (g.topic + ' ' + l.title).toLowerCase().includes(query));
      $('#guide-count').textContent = `${selected.length} guides`;
      $('#guide-list').innerHTML = selected.map(({ s, l, g }) => `<a class="guide-card" href="#premium/topics/${g.id}"><span class="eyebrow">${esc(s.name)}</span><h3>${esc(g.topic)}</h3><p>${esc(l.title)}</p><span class="textlink">${g.exercises.filter(e => state.topicPractice[g.id + '/' + e.kind]?.outcome === 'confident').length} / ${g.exercises.length} confident · Open guide →</span></a>`).join('') || '<p>No topics match your search.</p>';
    };
    $('#guide-subject').onchange = render; $('#guide-search').oninput = render; render();
  }
  function topicDetail({ s, l, g }) {
    const examples = g.workedExamples || g.exercises;
    const solution = e => `<ol>${e.steps.map(step => `<li><b>${esc(step.title)}</b>${displayEquation(step.equation)}${text(step.explanation)}</li>`).join('')}</ol><div class="feedback"><b>Answer</b>${text(e.answer)}<b>Verify</b>${text(e.verification)}</div>`;
    $('#premium-content').innerHTML = `<a class="textlink" href="#premium/topics">← All topic guides</a><section class="panel topic-guide"><span class="eyebrow">${esc(s.name)} · ${esc(l.title)}</span><h2>${esc(g.topic)}</h2>${text(g.explanation)}${g.coverageNote ? `<p class="muted">${esc(g.coverageNote)}</p>` : ''}<div class="reasoning-ladder" aria-label="Reasoning progression">${GatewiseComplexity.levels.map((c, i) => `<span title="${esc(c.goal)}">${i + 1}. ${esc(c.label)}</span>`).join('')}</div><details class="premium-method"><summary>Solving shortcuts and common traps</summary><ol>${(g.tricks || g.approach).map(step => `<li>${text(step)}</li>`).join('')}</ol>${(g.commonMistakes || []).map(t => `<p><b>${esc(t.claim)}</b> ${esc(t.why)}</p>`).join('')}</details><details class="topic-formulas"><summary>Formulas and rules for this lesson</summary><p>${esc(g.formulaNote || 'Check the conditions before applying a relationship.')}</p>${(g.formulas || []).map(f => `<div class="formula-card">${displayEquation(f.latex)}${text(f.meaning)}</div>`).join('')}</details><a class="textlink" href="#learn/${s.id}/${g.targetLesson}/${g.studyAnchor}">Read the full concept →</a><div class="actions topic-study-modes" role="group" aria-label="Study mode"><button class="btn secondary" data-topic-view="examples" aria-pressed="false">Worked examples (${examples.length})</button><button class="btn" data-topic-view="practice" aria-pressed="true">Practice ladder (${g.exercises.length})</button></div><div id="topic-cases"></div><section class="topic-challenge"><h3>Combine the ideas in a new GATE-style question</h3><p>This scored transfer question uses a new lesson-specific instance. Check your answer, then follow the explanation.</p><a class="btn" href="#practice/${s.id}/${g.targetLesson}/mastery">Solve the lesson challenge →</a></section><section class="premium-sources"><h3>Further reading and practice</h3><p>These external resources are free at their source. The course explanations and solutions are original teaching material.</p><ul>${g.sources.map(source => `<li><a class="textlink" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a></li>`).join('')}</ul></section></section>`;
    function renderCases(view) {
      if (!allowed()) return;
      document.querySelectorAll('[data-topic-view]').forEach(b => {
        const selected = b.dataset.topicView === view;
        b.classList.toggle('secondary', !selected); b.setAttribute('aria-pressed', String(selected));
      });
      if (view === 'examples') {
        $('#topic-cases').innerHTML = `<h3>Five worked cases, from rules to reasoning</h3><p class="muted">Open a case to see every step and its result check.</p>${examples.map((e, i) => `<details class="topic-worked" data-topic-example="${e.kind}"><summary>${i + 1}. ${esc(e.prompt)}</summary>${complexityMarkup(e)}<p class="muted">${esc(e.learningGoal || '')}</p>${solution(e)}</details>`).join('')}`;
        return;
      }
      $('#topic-cases').innerHTML = `<h3>Build your reasoning, one level at a time</h3><p class="muted">Write your own derivation before revealing the solution. These guided tasks reinforce the worked cases and use self-assessment. The separate lesson challenge records scored accuracy.</p>${g.exercises.map((e, index) => {
        const key = g.id + '/' + e.kind, progress = state.topicPractice[key] || {};
        return `<section class="guided-exercise">${complexityMarkup(e)}<p class="muted">${esc(e.learningGoal || '')}</p><h3>${index + 1}. ${esc(e.prompt)}</h3><label>Your working<textarea data-topic-work="${key}" rows="4" placeholder="Name the rule, justify each step, and check the conclusion.">${esc(progress.work || '')}</textarea></label><details><summary>Need a hint?</summary>${text(e.strategy)}</details><details data-topic-solution="${key}"><summary>Compare with the worked solution</summary>${solution(e)}<div class="actions"><button class="btn secondary" data-topic-rate="review" data-topic-key="${key}">Review again</button><button class="btn" data-topic-rate="confident" data-topic-key="${key}">I can explain it</button></div></details><p data-topic-status="${key}" role="status" class="muted">${progress.outcome === 'confident' ? 'Self-assessment: confident' : progress.outcome === 'review' ? 'Self-assessment: review again' : 'Not reviewed yet'}</p></section>`;
      }).join('')}`;
      document.querySelectorAll('[data-topic-work]').forEach(input => input.oninput = () => {
        if (!allowed()) return;
        const key = input.dataset.topicWork;
        state.topicPractice[key] = { ...state.topicPractice[key], work: input.value.slice(0, 10000) }; save();
      });
      document.querySelectorAll('[data-topic-rate]').forEach(button => button.onclick = () => {
        if (!allowed()) return;
        const key = button.dataset.topicKey;
        state.topicPractice[key] = { ...state.topicPractice[key], outcome: button.dataset.topicRate, date: today() }; recordDay();
        document.querySelectorAll('[data-topic-status]').forEach(label => { if (label.dataset.topicStatus === key) label.textContent = `Self-assessment: ${button.dataset.topicRate === 'confident' ? 'confident' : 'review again'}`; });
      });
    }
    document.querySelectorAll('[data-topic-view]').forEach(b => b.onclick = () => renderCases(b.dataset.topicView));
    renderCases('practice');
  }
  function drillSetup() {
    $('#premium-content').innerHTML = `<section class="panel"><h2>Your next focused test</h2><div class="filters"><label>Subject<select id="drill-subject"><option value="all">All subjects</option>${subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>Lesson<select id="drill-lesson"><option value="all">All lessons / subject-wide</option></select></label><label>Question pool<select id="drill-pool"><option value="all">Complete bank</option><option value="clinic">Exam clinics</option><option value="mastery">GATE transfer challenges</option><option value="mistakes">Latest incorrect answers</option></select></label><label>Reasoning level<select id="drill-complexity"><option value="all">All levels</option>${GatewiseComplexity.levels.map((c,i)=>`<option value="${i+1}">Level ${i+1} · ${esc(c.label)}</option>`).join('')}</select></label><label>Questions<select id="drill-count"><option>5</option><option selected>10</option><option>20</option></select></label><label>Time limit<select id="drill-minutes"><option value="10">10 minutes</option><option value="20" selected>20 minutes</option><option value="40">40 minutes</option></select></label></div><p id="drill-available" role="status"></p><p class="muted">A focused accuracy drill with no negative marking. Solutions stay hidden until you submit or time runs out. If a selection has fewer questions, the drill uses all available questions. Use full mocks for GATE-style negative marking.</p><button class="btn" id="start-drill">Start timed drill →</button>${state.drillResults.length ? `<h3>Recent drills</h3><ul>${state.drillResults.slice(0, 8).map(r => `<li>${esc(r.date)} · ${r.correct} / ${r.total} correct · ${Math.round(r.seconds / 60)} min</li>`).join('')}</ul>` : ''}</section>`;
    function pool() {
      const sid = $('#drill-subject').value, lid = $('#drill-lesson').value, kind = $('#drill-pool').value;
      const available = kind === 'mistakes' ? mistakes() : bank;
      return available.filter(q => (sid === 'all' || q.subject === Number(sid)) && (lid === 'all' || q.lesson === lid || q.topics?.includes(lid)) && (kind !== 'clinic' || q.premium === true && q.pool !== 'mastery') && (kind !== 'mastery' || q.pool === 'mastery') && ($('#drill-complexity').value === 'all' || GatewiseComplexity.describe(q).level === Number($('#drill-complexity').value)));
    }
    const update = () => { const n = pool().length; $('#drill-available').textContent = `${n} questions available`; $('#start-drill').disabled = n === 0; };
    $('#drill-subject').onchange = () => {
      const sid = $('#drill-subject').value;
      $('#drill-lesson').innerHTML = '<option value="all">All lessons / subject-wide</option>' + lessons().filter(({ s }) => sid === 'all' || s.id === Number(sid)).map(({ l }) => `<option value="${l.id}">${esc(l.title)}</option>`).join(''); update();
    };
    $('#drill-subject').onchange(); $('#drill-lesson').onchange = update; $('#drill-pool').onchange = update; $('#drill-complexity').onchange = update;
    $('#start-drill').onclick = () => {
      if (!allowed()) return;
      const selected = shuffle(pool()).slice(0, Number($('#drill-count').value)); if (!selected.length) return;
      const started = Date.now();
      state.drillRun = { id: crypto.randomUUID(), ids: selected.map(q => q.id), index: 0, answers: {}, started, end: started + Number($('#drill-minutes').value) * 60000 };
      result = null; save(); renderDrill();
    };
  }
  function runQuestions(run) { return run?.ids?.map(id => bank.find(q => q.id === id)); }
  function storeDrillAnswer() {
    if (!allowed() || !state.drillRun || !$('#choices')) return;
    const run = state.drillRun, q = bank.find(q => q.id === run.ids[run.index]);
    if (q) { run.answers[q.id] = readAnswer(q); save(); }
  }
  function renderDrill() {
    if (!allowed()) return;
    clearInterval(clock);
    const run = state.drillRun, questions = runQuestions(run);
    if (!questions?.length || questions.some(q => !q)) { state.drillRun = null; save(); drillSetup(); return; }
    const q = questions[run.index];
    $('#premium-content').innerHTML = `<section class="panel"><div class="sectionhead"><span class="pill">${q.type} · Q${run.index + 1} / ${questions.length}</span><strong id="drill-clock" aria-label="Time remaining"></strong></div><p class="muted">${esc(subjects.find(s => s.id === q.subject).name)} · ${q.type === 'MSQ' ? 'Select all correct options.' : 'One answer required.'}</p>${complexityMarkup(q)}<div class="question">${q.prompt}</div><div id="choices">${choices(q, run.answers[q.id])}</div><div class="actions"><button class="btn secondary" id="drill-prev" ${run.index === 0 ? 'disabled' : ''}>← Previous</button><button class="btn" id="drill-next" ${run.index === questions.length - 1 ? 'disabled' : ''}>Save & next →</button><button class="btn secondary" id="drill-clear">Clear answer</button><button class="btn" id="finish-drill">Submit & review</button></div><div class="palette">${questions.map((item, i) => `<button data-drill-q="${i}" class="${run.answers[item.id] != null ? 'answered' : ''} ${i === run.index ? 'current' : ''}" aria-label="Question ${i + 1}">${i + 1}</button>`).join('')}</div><p class="muted">Answers save on this device and sync when signed in. Return to Timed drills to resume.</p></section>`;
    const move = index => { if (!allowed()) return; storeDrillAnswer(); run.index = index; save(); renderDrill(); };
    $('#drill-prev').onclick = () => move(Math.max(0, run.index - 1)); $('#drill-next').onclick = () => move(Math.min(questions.length - 1, run.index + 1));
    document.querySelectorAll('[data-drill-q]').forEach(b => b.onclick = () => move(Number(b.dataset.drillQ)));
    $('#choices').querySelectorAll('input').forEach(input => input.onchange = storeDrillAnswer);
    $('#drill-clear').onclick = () => { if (!allowed()) return; run.answers[q.id] = null; save(); renderDrill(); };
    $('#finish-drill').onclick = () => { storeDrillAnswer(); finishDrill(); };
    function tick() {
      if (!allowed() || state.drillRun?.id !== run.id) { clearInterval(clock); return; }
      const seconds = Math.max(0, Math.ceil((run.end - Date.now()) / 1000));
      if ($('#drill-clock')) $('#drill-clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      if (!seconds) { if (location.hash.startsWith('#premium/drills')) storeDrillAnswer(); finishDrill(); }
    }
    clock = setInterval(tick, 1000); tick();
  }
  function finishDrill() {
    if (!allowed() || !state.drillRun) return;
    clearInterval(clock);
    const run = state.drillRun, questions = runQuestions(run);
    if (!questions?.length || questions.some(q => !q)) { state.drillRun = null; save(); return; }
    const right = questions.filter(q => correct(q, run.answers[q.id])).length;
    const timestamp = new Date().toISOString();
    questions.filter(q => run.answers[q.id] != null).forEach(q => state.attempts.push({ eventId: crypto.randomUUID(), qid: q.id, subject: q.subject, correct: correct(q, run.answers[q.id]), date: today(), timestamp }));
    state.drillResults.unshift({ eventId: run.id, date: today(), correct: right, total: questions.length, seconds: Math.round((Math.min(Date.now(), run.end) - run.started) / 1000) });
    result = { ...run }; state.drillRun = null; recordDay();
    if (location.hash.startsWith('#premium/drills') && $('#premium-content')) drillReview();
    else toast('Your timed drill finished. Open Timed drills to review.');
  }
  function drillReview() {
    if (!allowed() || !result) return;
    const questions = runQuestions(result);
    $('#premium-content').innerHTML = `<section class="panel"><h2>Your drill, reviewed</h2><div class="resultscore">${questions.filter(q => correct(q, result.answers[q.id])).length} <small>/ ${questions.length}</small></div><p>Accuracy drill · unanswered questions count as zero · no negative marking</p><button class="btn" id="new-drill">Build another drill →</button></section>${questions.map((q, index) => {
      const a = result.answers[q.id];
      return `<details class="panel drill-solution"><summary>Q${index + 1} · ${correct(q, a) ? 'Correct' : a == null ? 'Unanswered' : 'Incorrect'} · ${q.prompt}</summary><p>Your answer: ${a == null ? '—' : esc(q.type === 'NAT' ? a : q.type === 'MSQ' ? a.map(i => String.fromCharCode(65 + i)).join(', ') : String.fromCharCode(65 + a))}</p>${complexityMarkup(q)}<p><b>Correct answer: ${answerText(q)}</b></p>${text(q.explanation)}${q.lesson ? `<a class="textlink" href="#learn/${q.subject}/${q.lesson}">Revisit the lesson →</a>` : ''}</details>`;
    }).join('')}`;
    $('#new-drill').onclick = () => { result = null; drillSetup(); };
  }
  function recallPage() {
    const cards = allCards(), due = cards.filter(c => !state.cardReviews[c.id]?.due || state.cardReviews[c.id].due <= Date.now()).sort((a, b) => (state.cardReviews[a.id]?.due || 0) - (state.cardReviews[b.id]?.due || 0));
    $('#premium-content').innerHTML = `<section class="panel recall-panel"><div class="sectionhead"><h2>Recall before you reread</h2><span class="pill">${due.length} due · ${cards.length} cards</span></div><p class="muted">Cards cover the new exam clinics in all 11 subjects. “Remembered” schedules 1, 3, 7, 14 then 30 days; “Again” schedules another review now.</p><div id="recall-card"></div></section>`;
    if (!due.length) { $('#recall-card').innerHTML = '<p>All cards are scheduled for later. Keep practising with the topic guides.</p>'; return; }
    const c = due[0];
    $('#recall-card').innerHTML = `<span class="eyebrow">${esc(subjects.find(s => s.id === c.subject).name)}</span><h3>${esc(c.front)}</h3><button class="btn" id="reveal-card">Reveal explanation →</button><div id="recall-answer" hidden>${text(c.back)}<div class="actions"><button class="btn secondary" data-recall-rate="again">Again</button><button class="btn" data-recall-rate="remembered">Remembered</button></div><a class="textlink" href="#learn/${c.subject}/${c.lesson}">Revisit the full lesson →</a></div>`;
    $('#reveal-card').onclick = () => { if (!allowed()) return; $('#recall-answer').hidden = false; $('#reveal-card').hidden = true; };
    document.querySelectorAll('[data-recall-rate]').forEach(b => b.onclick = () => {
      if (!allowed() || $('#recall-answer').hidden) return;
      const old = state.cardReviews[c.id], remembered = b.dataset.recallRate === 'remembered';
      const level = remembered ? Math.min((old?.level || 0) + 1, 5) : 0;
      state.cardReviews[c.id] = { level, due: Date.now() + (remembered ? [1, 3, 7, 14, 30][level - 1] * 86400000 : 0), reviewed: new Date().toISOString() };
      recordDay(); recallPage();
    });
  }
  function insightsPage() {
    const wrong = mistakes();
    const stats = subjects.map(s => {
      const attempts = state.attempts.filter(a => a.subject === s.id), right = attempts.filter(a => a.correct).length;
      return { s, count: attempts.length, pct: attempts.length ? Math.round(100 * right / attempts.length) : null };
    });
    const weakest = [...stats].filter(x => x.count >= 3).sort((a, b) => a.pct - b.pct)[0];
    $('#premium-content').innerHTML = `<section class="panel"><h2>Choose your next useful session</h2><p>${weakest ? `${esc(weakest.s.name)} has your lowest accuracy among subjects with at least three attempts (${weakest.pct}%). Revisit a concept, then try a short drill.` : 'Practise at least three questions in a subject to begin identifying a focus area.'}</p><p class="muted">These figures describe your recorded practice attempts, including repeats. They are not an exam score prediction.</p><div class="table-scroll"><table class="performance-table"><thead><tr><th>Subject</th><th>Attempts</th><th>Accuracy</th><th>Next step</th></tr></thead><tbody>${stats.map(({ s, count, pct }) => `<tr><th>${esc(s.name)}</th><td>${count}</td><td>${pct == null ? 'No attempts yet' : pct + '%'}</td><td><a class="textlink" href="#learn/${s.id}">Review lessons →</a></td></tr>`).join('')}</tbody></table></div></section><section class="panel mistake-panel"><h2>Mistakes to revisit</h2><p>${wrong.length} questions whose latest recorded answer was incorrect. A correct retry removes the question from this list.</p><a class="btn" href="#premium/drills">Build a mistake drill →</a>${wrong.slice(0, 20).map(q => `<div class="lessonrow"><div><span class="eyebrow">${esc(subjects.find(s => s.id === q.subject).name)} · ${q.type}</span><p>${q.prompt}</p></div>${q.lesson ? `<a class="textlink" href="#practice/${q.subject}/${q.lesson}">Retry topic →</a>` : `<a class="textlink" href="#practice/${q.subject}">Practise subject →</a>`}</div>`).join('')}</section>`;
  }
  function clinicMarkup(l) {
    if (!allowed()) return '';
    return `<section class="premium-lesson-block"><span class="eyebrow">PREMIUM · PRACTISE THE REASONING</span><h2>Topic mastery sets</h2><p>Each topic has five worked examples, five progressive reasoning tasks, formulas, solving tips and a new lesson challenge. Save your working and review the levels that need another attempt.</p><div class="topicchips">${(l.premiumTopics || []).map(g => `<a href="#premium/topics/${g.id}">${esc(g.topic)} →</a>`).join('')}</div>${l.examClinic ? `<h3>${esc(l.examClinic.title)}</h3><ol>${l.examClinic.method.map(step => `<li>${esc(step)}</li>`).join('')}</ol><p><b>Watch for:</b> ${esc(l.examClinic.trap)}</p><a class="textlink" href="#practice/${l.id.split('-')[0]}/${l.id}">Try this lesson’s exam-clinic questions →</a>` : ''}</section>`;
  }
  function reset() { clearInterval(clock); clock = null; result = null; }
  window.addEventListener('gatewise-account-loading', reset);
  window.addEventListener('gatewise-course-change', () => { if (!allowed()) reset(); });
  window.GatewisePremium = { page, clinicMarkup, reset };
})();
