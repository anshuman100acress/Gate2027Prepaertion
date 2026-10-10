(function () {
  'use strict';
  const phone = matchMedia('(max-width: 760px), (max-width: 1000px) and (pointer: coarse)');
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const paths = {
    home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
    learn: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 3v18M12 8h4M12 12h4"/>',
    practice: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m15 9 6-6"/>',
    notes: '<path d="M14 3H5v18h14v-9M9 8h3M9 13h2M9 17h6m0-9 5-5 2 2-5 5-3 1z"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    back: '<path d="m14 5-7 7 7 7M7 12h14"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m3 0h3"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    premium: '<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>',
    papers: '<path d="M14 3H5v18h14V8zM14 3v5h5M9 12h6M9 16h6"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.learn}</svg>`;
  const labels = { dashboard: 'Today', learn: 'Learn', practice: 'Practice', revision: 'My notes', pyqs: 'PYQ practice', mocks: 'Mock tests', papers: 'Past papers', study: 'Study tools', premium: 'Premium studio', pricing: 'Course access', plan: 'Study plan' };
  let installPrompt = null, registration = null, updateWorker = null, cacheReady = false;
  let sheetHistory = false, returningFromSheet = false, destination = null;
  const header = document.createElement('div');
  header.id = 'mobile-header';
  header.innerHTML = `<div class="mobile-topbar"><button id="mobile-back" class="mobile-icon-button" type="button" aria-label="Back to learning library" hidden>${icon('back')}</button><a class="mobile-logo" href="#dashboard" aria-label="GateClimb home"><img src="icons/icon-192.png" width="41" height="41" alt=""></a><div class="mobile-title"><span>GateClimb</span><strong id="mobile-page-title">Today</strong></div><button class="mobile-icon-button" id="mobile-timer" type="button" aria-label="Open study timer" disabled>${icon('timer')}</button><button id="mobile-account" class="mobile-avatar" type="button" aria-label="Sign in to your account">Y</button></div><div id="mobile-connection" role="status" hidden>Offline · Free previews and saved notes</div>`;
  document.querySelector('.main').prepend(header);
  const nav = document.createElement('nav');
  nav.id = 'mobile-nav';
  nav.setAttribute('aria-label', 'Main mobile navigation');
  nav.innerHTML = [['dashboard','home','Home'],['learn','learn','Learn'],['practice','practice','Practice'],['revision','notes','Notes']].map(([page,image,label]) => `<a href="#${page}" data-mobile-nav="${page}">${icon(image)}<span>${label}</span></a>`).join('') + `<button id="mobile-more-open" type="button" aria-haspopup="dialog" aria-controls="mobile-more" aria-expanded="false">${icon('more')}<span>More</span></button>`;
  document.body.append(nav);
  const more = document.createElement('dialog');
  more.id = 'mobile-more';
  more.setAttribute('aria-labelledby', 'mobile-more-title');
  more.innerHTML = `<div class="mobile-sheet-handle" aria-hidden="true"></div><div class="mobile-sheet-heading"><div><span class="eyebrow">YOUR WORKSPACE</span><h2 id="mobile-more-title">Make every session count.</h2></div><button class="mobile-icon-button" id="mobile-more-close" type="button" aria-label="Close menu">${icon('close')}</button></div><div class="mobile-more-grid">${[['pyqs','practice','PYQ MCQs','Practice with past questions'],['premium/topics','premium','Premium studio','Formulas, tricks & topic guides'],['mocks','timer','Mock tests','Build exam confidence'],['papers','papers','Past papers','Original GATE PDFs'],['study','timer','Study tools','Focus time & your journal'],['plan','calendar','My study plan','Choose your next session']].map(([hash,image,label,sub]) => `<a href="#${hash}">${icon(image)}<span><strong>${label}</strong><small>${sub}</small></span>${icon('arrow')}</a>`).join('')}</div><a class="mobile-course-link" href="#pricing">${icon('premium')}<span>Course access & pricing</span>${icon('arrow')}</a><div class="mobile-sheet-account"><button class="btn secondary" id="mobile-signin" type="button">Sign in / Account</button><button class="btn secondary" id="mobile-preferences" type="button">Preferences</button></div><button class="mobile-install-button" type="button" data-mobile-install>${icon('download')}<span><strong>Install GateClimb</strong><small>A study app on your home screen</small></span>${icon('arrow')}</button><p class="mobile-offline-help" id="mobile-offline-help">Open online once to save the app and free previews. Your personal notes stay in your device workspace.</p>`;
  document.body.append(more);

  function closeSheet(target = null) {
    destination = target;
    if (sheetHistory && !returningFromSheet) { returningFromSheet = true; history.back(); }
    if (more.open) more.close();
    if (!sheetHistory && destination) { const hash = destination; destination = null; location.hash = hash; }
  }
  document.getElementById('mobile-more-open').onclick = () => {
    more.showModal();
    history.pushState({ ...history.state, gatewiseMobileSheet: true }, '', location.href);
    sheetHistory = true;
    document.getElementById('mobile-more-open').setAttribute('aria-expanded', 'true');
  };
  document.getElementById('mobile-more-close').onclick = () => closeSheet();
  more.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
  more.addEventListener('close', () => {
    document.getElementById('mobile-more-open').setAttribute('aria-expanded', 'false');
    if (sheetHistory && !returningFromSheet) { returningFromSheet = true; history.back(); }
  });
  more.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (link) { event.preventDefault(); closeSheet(link.hash); }
    else if (event.target === more) {
      const rect = more.getBoundingClientRect();
      if (event.clientY < rect.top || event.clientX < rect.left || event.clientX > rect.right) closeSheet();
    }
  });
  window.addEventListener('popstate', () => {
    if (!sheetHistory) return;
    sheetHistory = false; returningFromSheet = false;
    if (more.open) more.close();
    if (destination) { const hash = destination; destination = null; location.hash = hash; }
  });
  function accountAction(id) { closeSheet(); document.getElementById(id)?.click(); }
  document.getElementById('mobile-account').onclick = () => accountAction('account');
  document.getElementById('mobile-signin').onclick = () => accountAction('account');
  document.getElementById('mobile-preferences').onclick = () => accountAction('settings');
  document.getElementById('mobile-timer').onclick = () => document.getElementById('studytimer').click();

  function sync() {
    const [page = 'dashboard', sid, lid] = location.hash.slice(1).split('/');
    document.body.dataset.mobilePage = page;
    const back = document.getElementById('mobile-back');
    const parent = page === 'learn' && sid !== undefined ? (lid ? `#learn/${sid}` : '#learn') : page === 'premium' && lid ? '#premium/topics' : page === 'papers' && sid ? '#papers' : null;
    back.hidden = !parent;
    back.setAttribute('aria-label', `Back to ${page === 'papers' ? 'past papers' : page === 'premium' ? 'topic guides' : lid ? 'subject roadmap' : 'learning library'}`);
    back.onclick = () => { location.hash = parent; };
    document.querySelector('.mobile-logo').hidden = !!parent;
    document.getElementById('mobile-page-title').textContent = labels[page] || 'Today';
    nav.querySelectorAll('[data-mobile-nav]').forEach(link => {
      const selected = link.dataset.mobileNav === page || (link.dataset.mobileNav === 'dashboard' && !labels[page]);
      link.classList.toggle('selected', selected);
      if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.getElementById('mobile-more-open').classList.toggle('selected', ['pyqs','mocks','papers','study','premium','pricing','plan'].includes(page));
    const user = window.GatewiseCloud?.user;
    document.getElementById('mobile-account').textContent = user ? (user.email || 'You').slice(0,1).toUpperCase() : 'Y';
    document.getElementById('mobile-account').setAttribute('aria-label', user ? 'Open your account' : 'Sign in to your account');
    document.getElementById('mobile-account').disabled = document.getElementById('account').disabled;
    document.getElementById('mobile-signin').disabled = document.getElementById('account').disabled;
    document.getElementById('mobile-preferences').disabled = document.getElementById('settings').disabled;
    document.getElementById('mobile-signin').textContent = user ? 'My account' : 'Sign in / Account';
    document.getElementById('mobile-timer').disabled = document.getElementById('studytimer').disabled;
    document.getElementById('mobile-timer').classList.toggle('timerrunning', document.getElementById('studytimer').classList.contains('timerrunning'));
    if (!phone.matches) document.querySelectorAll('.readerpath,.lessoncontents,.practicefilters,.mocknavigator').forEach(detail => detail.open = true);
    installState();
  }
  function connection() {
    const offline = !navigator.onLine || window.GATEWISE_OFFLINE_BOOT === true;
    document.getElementById('mobile-connection').hidden = !offline;
    document.body.classList.toggle('is-offline', offline);
  }
  function installState() {
    const installed = standalone();
    document.querySelectorAll('[data-mobile-install]').forEach(button => { button.hidden = installed || !window.GatewiseCourse?.protected; });
    document.getElementById('mobile-offline-help').textContent = cacheReady ? 'Ready offline: the app, 3 free lessons and 10 sample questions. Your saved notes remain in your device workspace. Paid content and payments need a connection.' : 'Open online once to save the app and free previews. Your personal notes stay in your device workspace.';
  }
  function dashboardMarkup() {
    const [subject, lesson] = nextLesson();
    const percentage = Math.round(state.completed.length / totalLessons() * 100);
    const available = subjects.flatMap(s => s.lessons).filter(l => GatewiseCourse.canRead(l)).length;
    return `<div class="mobile-home"><div class="mobile-greeting"><span class="eyebrow">YOUR DAILY STARTING POINT</span><h1>${state.name ? `Hello, ${esc(state.name)}.` : 'A little closer, every day.'}</h1><p>Let’s build your GATE 2027 rhythm.</p></div><a class="mobile-continue" href="#learn/${subject.id}/${lesson.id}"><div class="mobile-card-top"><span class="mobile-light-pill">${state.reading[lesson.id] ? 'PICK UP WHERE YOU LEFT OFF' : 'YOUR NEXT STEP'}</span>${icon('arrow')}</div><h2>${esc(lesson.title)}</h2><p>${esc(subject.name)} · ${lesson.minutes} min</p><div class="mobile-continue-foot"><strong>Continue learning</strong><span>${available === totalLessons() ? 'Full course' : 'Free preview'}</span></div></a><div class="mobile-progress-summary"><div class="mobile-progress-ring" style="--progress:${percentage * 3.6}deg"><span>${percentage}%</span></div><div><strong>${state.completed.length} of ${totalLessons()} lessons read</strong><span>${state.understood.length} checked · Your pace, your progress</span></div></div><div class="mobile-metrics"><div><strong>${state.attempts.length}</strong><span>Questions tried</span></div><div><strong>${state.attempts.length ? `${accuracy()}%` : '—'}</strong><span>Accuracy</span></div><div><strong>${state.sessions.length}</strong><span>Study days</span></div></div><section><div class="sectionhead"><h2>Choose your next move</h2></div><div class="mobile-quick-grid"><a href="#practice">${icon('practice')}<strong>Practice</strong><span>Build your logic</span></a><a href="#pyqs">${icon('papers')}<strong>PYQs</strong><span>Learn the pattern</span></a><button type="button" data-openfocus>${icon('timer')}<strong>Focus</strong><span>Start a timer</span></button></div></section>${GatewiseStudy.overviewMarkup()}<section class="mobile-subjects"><div class="sectionhead"><h2>Your learning paths</h2><a class="textlink" href="#learn">See all ${subjects.length} →</a></div><div class="mobile-subject-track">${subjects.map(s => `<a href="#learn/${s.id}" class="mobile-subject-card"><span class="subjecticon">${s.icon}</span><h3>${esc(s.name)}</h3><p>${s.lessons.length} lessons · ${s.lessons.filter(l => state.completed.includes(l.id)).length} read</p>${icon('arrow')}</a>`).join('')}</div></section><section class="mobile-personal-links"><a href="#revision">${icon('notes')}<span><strong>Make ideas stick</strong><small>Your notes & revision queue</small></span>${icon('arrow')}</a><a href="#plan">${icon('calendar')}<span><strong>A plan for your next session</strong><small>Based on your progress</small></span>${icon('arrow')}</a></section><button class="mobile-install-button" type="button" data-mobile-install>${icon('download')}<span><strong>Keep GateClimb one tap away</strong><small>Install on your home screen</small></span>${icon('arrow')}</button></div>`;
  }
  function library() {
    app.innerHTML = `<div class="mobile-greeting"><span class="eyebrow">YOUR LEARNING PATHS</span><h1>Find your next idea.</h1><p>${totalLessons()} lessons · ${subjects.length} subjects · Your own pace</p></div><div class="mobile-library-search"><input id="curriculumsearch" type="search" placeholder="Search a topic or lesson" aria-label="Search syllabus topics"><select id="curriculumstatus" aria-label="Learning status"><option value="all">All learning paths</option><option value="free">Free preview lessons</option><option value="unread">Unread lessons</option><option value="read">Read lessons</option><option value="checked">Checks passed</option></select></div><button class="mobile-preview-chip" id="mobile-free-previews" type="button">Start with the 3 free previews ${icon('arrow')}</button><div id="curriculum" class="mobile-curriculum"></div>`;
    function filter() {
      const query = document.getElementById('curriculumsearch').value.trim().toLowerCase();
      const status = document.getElementById('curriculumstatus').value;
      document.getElementById('mobile-free-previews').setAttribute('aria-pressed', String(status === 'free'));
      const detailed = !!query || status !== 'all';
      document.getElementById('curriculum').innerHTML = subjects.map(subject => {
        const chosen = subject.lessons.filter(lesson => (subject.name + ' ' + lesson.title + ' ' + lesson.topics.join(' ')).toLowerCase().includes(query) && (status === 'all' || status === 'free' && lesson.isPreview || status === 'unread' && !state.completed.includes(lesson.id) || status === 'read' && state.completed.includes(lesson.id) || status === 'checked' && state.understood.includes(lesson.id)));
        if (!chosen.length) return '';
        const read = subject.lessons.filter(lesson => state.completed.includes(lesson.id)).length;
        const previews = subject.lessons.filter(lesson => lesson.isPreview).length;
        if (!detailed) return `<a class="mobile-library-subject" href="#learn/${subject.id}"><span class="subjecticon">${subject.icon}</span><div><h2>${esc(subject.name)}</h2><p>${subject.lessons.length} lessons · ${read} read${previews ? ` · ${previews} free preview` : ''}</p><div class="progress"><span style="width:${read / subject.lessons.length * 100}%"></span></div></div>${icon('arrow')}</a>`;
        return `<section class="mobile-search-group"><h2>${esc(subject.name)}</h2>${chosen.map(lesson => `<a class="mobile-search-lesson" href="#learn/${subject.id}/${lesson.id}"><span><strong>${esc(lesson.title)}</strong><small>${lesson.minutes} min · ${lessonStatus(lesson)} · ${lesson.isPreview ? 'Free preview' : 'Course pass'}</small></span>${icon('arrow')}</a>`).join('')}</section>`;
      }).join('') || '<div class="panel empty"><h2>No lessons here yet.</h2><p>Try another topic or change the filter.</p></div>';
    }
    document.getElementById('curriculumsearch').oninput = filter;
    document.getElementById('curriculumstatus').onchange = filter;
    document.getElementById('mobile-free-previews').onclick = () => { document.getElementById('curriculumstatus').value = 'free'; filter(); };
    filter();
  }
  async function install() {
    if (installPrompt) {
      const prompt = installPrompt; installPrompt = null;
      await prompt.prompt(); await prompt.userChoice; installState();
      return;
    }
    closeSheet();
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const dialog = document.getElementById('dialog');
    dialog.innerHTML = `<div class="mobile-sheet-heading"><h2>GateClimb, on your home screen.</h2><button class="mobile-icon-button" type="button" id="close-install" aria-label="Close installation help">${icon('close')}</button></div><p>${ios ? 'In Safari, open the Share menu, choose “Add to Home Screen”, then tap Add.' : 'Open your browser menu and choose “Install app” or “Add to Home screen”. If the option is unavailable, use GateClimb in your browser.'}</p><div class="mobile-install-benefits">${icon('check')}<span>Opens in its own app window</span>${icon('check')}<span>Free lessons & saved notes work offline after the first online visit</span></div><p class="muted">Paid content and payments need an internet connection.</p><button class="btn" type="button" id="install-done">Got it</button>`;
    dialog.showModal();
    document.getElementById('close-install').onclick = document.getElementById('install-done').onclick = () => dialog.close();
  }
  document.addEventListener('click', event => { if (event.target.closest('[data-mobile-install]')) install().catch(() => { if (window.toast) toast('Use your browser menu to install GateClimb.'); }); });
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; installState(); });
  window.addEventListener('appinstalled', () => { installPrompt = null; installState(); if (window.toast) toast('GateClimb is on your home screen.'); });

  const updateBanner = document.createElement('div');
  updateBanner.id = 'app-update'; updateBanner.hidden = true; updateBanner.setAttribute('role','status');
  updateBanner.innerHTML = '<span>A fresh version is ready.</span><button class="btn" id="apply-app-update" type="button">Update</button><button class="mobile-icon-button" id="dismiss-app-update" type="button" aria-label="Update later">' + icon('close') + '</button>';
  document.body.append(updateBanner);
  function updateAvailable(worker) { updateWorker = worker; updateBanner.hidden = false; }
  document.getElementById('dismiss-app-update').onclick = () => { updateBanner.hidden = true; };
  let applyingUpdate = false;
  document.getElementById('apply-app-update').onclick = () => {
    // Let a focused notes editor save before reloading the app.
    document.activeElement?.blur();
    if (window.GatewiseProgress?.locked) { if (window.toast) toast('Finish loading your workspace before updating.'); return; }
    if (typeof save === 'function' && !save()) return;
    applyingUpdate = true;
    updateWorker?.postMessage({ type: 'SKIP_WAITING' });
  };
  async function registerOffline() {
    // Raw authoring checkouts can contain paid payloads. Only protected builds install a worker.
    if (!window.GatewiseCourse?.protected || !('serviceWorker' in navigator) || !window.isSecureContext) return;
    try {
      registration = await navigator.serviceWorker.register('service-worker.js', { scope: './', updateViaCache: 'none' });
      if (registration.waiting && navigator.serviceWorker.controller) updateAvailable(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) updateAvailable(worker); });
      });
      await navigator.serviceWorker.ready;
      cacheReady = true; installState();
    } catch { /* Online study still works when a browser disallows service workers. */ }
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => { if (applyingUpdate) location.reload(); });
  let probingConnection = false;
  async function probeConnection() {
    if (probingConnection || !window.GATEWISE_OFFLINE_BOOT || !navigator.onLine || document.hidden) return;
    probingConnection = true;
    try {
      const response = await fetch('course-config.js', { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(4000) });
      if (response.ok && response.headers.get('X-Gatewise-Offline') !== '1') {
        window.GATEWISE_OFFLINE_BOOT = false; connection();
        window.GatewiseCourse?.refresh(); window.GatewiseCloud?.syncNow();
        registration?.update().catch(() => {});
      }
    } catch { /* Keep the offline workspace available until the connection returns. */ }
    finally { probingConnection = false; }
  }
  window.addEventListener('online', () => {
    connection();
    if (window.GATEWISE_OFFLINE_BOOT) probeConnection(); else registration?.update().catch(() => {});
  });
  window.addEventListener('offline', connection);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { probeConnection(); registration?.update().catch(() => {}); } });
  setInterval(probeConnection, 10000);
  window.addEventListener('hashchange', sync);
  window.addEventListener('gatewise-app-ready', () => { sync(); registerOffline(); });
  window.addEventListener('gatewise-account-change', sync);
  window.addEventListener('gatewise-course-change', sync);
  phone.addEventListener('change', event => {
    if (event.matches) document.querySelectorAll('.readerpath,.lessoncontents,.practicefilters,.mocknavigator').forEach(detail => detail.open = false);
    sync();
    if (!phone.matches && more.open) closeSheet();
    if (typeof appReady !== 'undefined' && appReady && ['', '#dashboard', '#learn'].includes(location.hash) && !window.GatewiseProgress?.locked) route();
  });
  // The keyboard should have the screen when writing an answer or a note.
  function keyboard() {
    const active = document.activeElement;
    const editing = active?.matches('input:not([type=radio]):not([type=checkbox]), textarea, [contenteditable=true]');
    const keyboardOpen = !!editing && !!window.visualViewport && innerHeight - visualViewport.height > 140;
    document.body.classList.toggle('mobile-keyboard', keyboardOpen);
  }
  window.visualViewport?.addEventListener('resize', keyboard);
  document.addEventListener('focusin', keyboard);
  document.addEventListener('focusout', () => requestAnimationFrame(keyboard));
  document.addEventListener('click', event => {
    if (!phone.matches) return;
    const id = event.target.closest('button')?.id;
    if (['next','saveNext','prev','drill-next','drill-prev'].includes(id)) requestAnimationFrame(() => {
      const question = document.querySelector('#app .question');
      if (question) question.closest('.panel')?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  });
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; sync(); });
  });
  observer.observe(document.getElementById('app'), { childList: true });
  new MutationObserver(sync).observe(document.getElementById('studytimer'), { attributes: true, attributeFilter: ['disabled', 'class'] });
  window.GatewiseMobile = { isPhone: () => phone.matches, icon, dashboardMarkup, library };
  connection(); sync();
})();
