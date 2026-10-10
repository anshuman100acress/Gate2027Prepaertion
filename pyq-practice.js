/* Question payloads come from GatewiseCourse; locked questions are never fetched. */
document.querySelector('[data-nav="pyqs"]').addEventListener('click', event => {
  if (location.hash === '#pyqs' && appReady && !GatewiseProgress.locked) { event.preventDefault(); pyqLibrary(); }
});
function pyqSource(q) {
  const s = q.source, paper = papers.find(p => p.id === s.paper);
  const method = q.verification?.method;
  const label = method === 'official-key' ? 'Matched to official final key' : method === 'included-key' ? 'Matched to included key' : 'Solved independently';
  const keyLink = method === 'official-key' && /^https:\/\/gate2026\.iitg\.ac\.in\//.test(q.verification?.url || '')
    ? ` · <a class="textlink" href="${esc(q.verification.url)}" target="_blank" rel="noopener">Answer key ↗</a>` : '';
  return `<p class="muted pyq-source">GATE ${s.year} · ${esc(s.session || s.section)} · ${esc(s.section)} Q${s.number}${s.page ? ` · PDF page ${s.page}` : ''}<br>${label}${s.adapted ? ' · Adapted MCQ' : ''}${keyLink}${paper ? ` · <a class="textlink" href="${esc(paper.file)}#page=${s.page || 1}" target="_blank" rel="noopener">Source PDF ↗</a>` : ''}</p>`;
}

function pyqLibrary(paperId = 'all') {
  const total = papers.reduce((n, p) => n + (p.pyqCount || 0), 0);
  const available = bank.filter(q => q.source);
  app.innerHTML = title('PYQ PRACTICE', 'Learn the method behind the answer.', `${total} selected MCQs from all 24 uploaded papers, spanning 2007–2026. Every question has a worked solution and a source reference.`)
    + `<section class="panel pyq-intro"><b>${GatewiseCourse.canMock() ? 'Your complete PYQ set is ready' : 'Try one PYQ MCQ free'}</b><p>${GatewiseCourse.canMock() ? 'Choose a paper or topic, answer the questions, then study each explanation.' : 'One sample is included in your 10 free questions. A verified course purchase unlocks the remaining ' + (total - 1) + ' PYQ MCQs and their worked solutions.'}</p><p class="muted">This is a curated selection from each upload. Some numerical questions have been adapted to MCQs. Answers are labelled as matched to an official or included key, or solved independently.</p>${!GatewiseCourse.canMock() ? '<a class="btn" href="#pricing">Unlock the complete PYQ set →</a>' : ''}<button class="btn secondary" id="pyq-all" type="button">${GatewiseCourse.canMock() ? 'Practice all PYQ MCQs' : 'Try the free sample'} →</button></section><div class="filters"><select id="pyq-year" aria-label="PYQ year"><option value="all">All years</option>${[...new Set(papers.map(p => p.year))].map(y => `<option value="${y}">${y}</option>`).join('')}</select><select id="pyq-topic" aria-label="PYQ topic"><option value="all">All topics</option>${subjects.flatMap(s => s.lessons.map(l => `<option value="${l.id}">${esc(l.title)}</option>`)).join('')}</select></div><div class="subjectgrid" id="pyq-papers"></div>`;
  function filtered(paper = 'all') {
    return available.filter(q => (paper === 'all' || q.source.paper === paper)
      && ($('#pyq-year').value === 'all' || q.source.year === Number($('#pyq-year').value))
      && ($('#pyq-topic').value === 'all' || q.topics?.includes($('#pyq-topic').value)));
  }
  function draw() {
    const year = $('#pyq-year').value;
    $('#pyq-papers').innerHTML = papers.filter(p => (paperId === 'all' || p.id === paperId) && (year === 'all' || p.year === Number(year))).map(p => {
      const pool = filtered(p.id), locked = !GatewiseCourse.canMock() && p.pyqCount > pool.length;
      return `<section class="subjectcard"><div class="cardtop"><span class="subjecticon">◎</span><span class="tag">${locked ? 'PREMIUM' : 'PYQ MCQS'}</span></div><h3>${esc(p.title)}</h3><p>${p.pyqCount} selected MCQs with worked solutions${p.bundle ? ' · Source session shown per question' : ''}</p>${pool.length ? `<button class="btn secondary" data-pyq-paper="${p.id}" type="button">${locked ? 'Try free question' : 'Practice ' + pool.length + ' questions'} →</button>` : GatewiseCourse.canMock() ? '<p class="muted">No questions for this topic in this paper.</p>' : '<a class="btn secondary" href="#pricing">Unlock MCQs →</a>'}<a class="textlink" href="#papers/${p.id}">Original paper →</a></section>`;
    }).join('');
    document.querySelectorAll('[data-pyq-paper]').forEach(b => b.onclick = () => begin(filtered(b.dataset.pyqPaper)));
  }
  function begin(pool) {
    if (!pool.length) { toast('No available PYQs match this topic.'); return; }
    practice = { pool, index: 0, pyq: true };
    renderPyqQuestion();
  }
  $('#pyq-year').onchange = draw; $('#pyq-topic').onchange = draw;
  $('#pyq-all').onclick = () => begin(GatewiseCourse.canMock() ? filtered(paperId) : available); draw();
}

function renderPyqQuestion() {
  const q = practice?.pool[practice.index];
  if (!q || !bank.some(row => row.id === q.id && row.source)) { practice = null; pyqLibrary(); return; }
  app.innerHTML = title('PYQ PRACTICE', 'Think it through. Then check your method.', 'Choose an answer before opening the worked solution.')
    + `<a class="textlink" href="#pyqs">← Choose another paper or topic</a><section class="panel pyq-question"><div class="sectionhead"><span class="pill">MCQ · ${q.marks} MARK${q.marks === 1 ? '' : 'S'}</span><span class="muted">${practice.index + 1} / ${practice.pool.length} · ${esc(subjects.find(s => s.id === q.subject).name)}</span></div>${pyqSource(q)}<div class="question">${q.prompt}</div><div id="choices">${choices(q)}</div><div id="feedback" role="status"></div><div class="actions"><button class="btn" id="check">Check answer →</button><button class="btn secondary" id="next">Next question</button></div></section>${!GatewiseCourse.canMock() ? `<section class="course-lock"><h2>Continue with all ${papers.reduce((n, p) => n + (p.pyqCount || 0), 0)} PYQ MCQs</h2><p>Your free sample includes its full explanation. Purchase a course pass to unlock the remaining questions.</p><a class="btn" href="#pricing">View course offer →</a></section>` : ''}`;
  $('#check').onclick = () => {
    const a = readAnswer(q); if (a === null) { toast('Choose an answer first.'); return; }
    const ok = correct(q, a);
    state.attempts.push({ eventId: crypto.randomUUID(), qid: q.id, subject: q.subject, correct: ok, date: today(), timestamp: new Date().toISOString() });
    recordDay();
    $('#feedback').innerHTML = `<div class="feedback ${ok ? '' : 'wrong'}"><b>${ok ? '✓ Correct' : 'Review the method'}</b><p>Answer: ${answerText(q)}. ${q.options[q.answer]}</p><p>${q.explanation}</p>${q.topics?.[0] ? `<a class="textlink" href="#learn/${q.subject}/${q.topics[0]}">Revisit this concept →</a>` : ''}</div>`;
    $('#check').disabled = true; $('#choices').querySelectorAll('input').forEach(i => i.disabled = true);
  };
  app.querySelector('a[href="#pyqs"]').onclick = event => {
    event.preventDefault();
    if (location.hash === '#pyqs') pyqLibrary(); else location.hash = '#pyqs';
  };
  $('#next').onclick = () => { practice.index = (practice.index + 1) % practice.pool.length; renderPyqQuestion(); };
}
