(function () {
  'use strict';
  const supplied = window.GATEWISE_COURSE || {};
  const config = Object.freeze({
    mode: supplied.mode === 'protected' ? 'protected' : 'open',
    courseId: typeof supplied.courseId === 'string' && supplied.courseId ? supplied.courseId : 'gate-cs-2027',
    priceMinor: Number.isSafeInteger(supplied.priceMinor) && supplied.priceMinor > 0 ? supplied.priceMinor : 49900,
    currency: 'INR', durationMonths: 12, checkoutEnabled: supplied.checkoutEnabled === true
  });
  const protectedMode = config.mode === 'protected';
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const identity = () => window.GatewiseCloud?.user?.id || null;
  let base = null, data = { subjects: [], papers: [], bank: [] }, generation = 0, controller = null;
  let bootPromise = null, resourcesReady = false, checkoutFlight = false, checkoutScript = null, expiration;
  let access = { status: protectedMode ? 'loading' : 'open', hasAccess: !protectedMode, role: 'learner', validUntil: null, error: '', generation, accountId: identity() };
  const status = () => ({ ...access, generation });
  function emit(phase) { window.dispatchEvent(new CustomEvent('gatewise-course-change', { detail: { phase, access: status() } })); }
  function publicData() {
    if (!base) return { subjects: [], papers: [], bank: [] };
    return { subjects: clone(base.subjects), papers: base.papers, bank: [...base.questions, ...base.pyqs, ...base.checks] };
  }
  function drop(phase = 'reset', error = '') {
    ++generation; controller?.abort(); controller = null; clearTimeout(expiration);
    resourcesReady = false; data = publicData();
    access = { status: protectedMode ? (error ? 'error' : 'preview') : 'open', hasAccess: !protectedMode, role: 'learner', validUntil: null, error, accountId: identity() };
    emit(phase);
  }
  function current(token, accountId) { return token === generation && accountId === identity() && !window.GatewiseProgress?.locked; }
  async function json(url, options = {}) {
    const response = await fetch(url, { ...options, cache: 'no-store', signal: options.signal ? AbortSignal.any([options.signal,AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('The course could not be loaded. Check your connection and try again.');
    return response.json();
  }
  async function boot() {
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      await GatewiseCloud.ready;
      const [subjects, questions, papers, pyqs, checks] = await Promise.all(['syllabus', 'questions', 'papers', 'pyqs', 'lesson-questions'].map(name => json(`data/${name}.json`)));
      if (![subjects, questions, papers, pyqs, checks].every(Array.isArray)) throw new Error('The course could not be loaded. Please try again.');
      base = { subjects, questions, papers, pyqs, checks }; data = publicData();
      if (protectedMode) await refresh();
      else { resourcesReady = true; access = { status: 'open', hasAccess: true, role: 'learner', validUntil: null, error: '', accountId: identity() }; emit('ready'); }
      return data;
    })().catch(error => { bootPromise = null; throw error; });
    return bootPromise;
  }
  function scheduleExpiration(token) {
    clearTimeout(expiration);
    if (access.role === 'owner' || !access.validUntil) return;
    const remaining = Date.parse(access.validUntil) - Date.now();
    if (remaining <= 0) { drop('ready'); return; }
    expiration = setTimeout(() => {
      if (token !== generation) return;
      if (Date.parse(access.validUntil) <= Date.now()) { drop('ready'); refresh(); }
      else scheduleExpiration(token);
    }, Math.min(remaining + 20, 2147483647));
  }
  async function refresh() {
    if (!protectedMode || !base || window.GatewiseProgress?.locked) return !protectedMode;
    const token = ++generation, accountId = identity();
    controller?.abort(); controller = new AbortController(); const signal = controller.signal;
    access = { ...access, status: 'loading', error: '', accountId }; emit('loading');
    try {
      const cloud = window.GATEWISE_CLOUD || {};
      if (!cloud.url || !cloud.publishableKey) throw new Error('Course access is temporarily unavailable. Free lessons and your notes are still here.');
      const bearer = await GatewiseCloud.getAccessToken();
      if (!current(token, accountId)) return false;
      if (accountId && !bearer) throw new Error('Please sign in again to check your course access.');
      const headers = { apikey: cloud.publishableKey, Authorization: `Bearer ${bearer || cloud.publishableKey}`, 'Content-Type': 'application/json' };
      const rest = cloud.url.replace(/\/$/, '') + '/rest/v1/';
      const result = await json(rest + 'rpc/course_access', { method: 'POST', headers, signal, body: JSON.stringify({ p_course_id: config.courseId }) });
      if (!current(token, accountId)) return false;
      if (!result || result.courseId !== config.courseId || !['owner', 'learner'].includes(result.role) || typeof result.hasAccess !== 'boolean') throw new Error('Course access could not be verified. Please try again.');
      const until = result.validUntil || null;
      const granted = result.hasAccess === true && !!accountId && (result.role === 'owner' || (until && Number.isFinite(Date.parse(until)) && Date.parse(until) > Date.now()));
      if (!granted) {
        data = publicData(); resourcesReady = false; clearTimeout(expiration);
        access = { status: 'preview', hasAccess: false, role: result.role, validUntil: until, error: '', accountId }; emit('ready'); return false;
      }
      const filter = 'course_id=eq.' + encodeURIComponent(config.courseId);
      const [lessons, resources] = await Promise.all([
        json(rest + 'course_lessons?' + filter + '&select=lesson_id,payload,is_preview', { headers, signal }),
        json(rest + 'course_resources?' + filter + '&select=resource_id,payload', { headers, signal })
      ]);
      if (!current(token, accountId)) return false;
      if (!Array.isArray(lessons) || !Array.isArray(resources)) throw new Error('The full course is not ready to load. Please try again.');
      const byId = new Map(lessons.filter(row => row && typeof row.lesson_id === 'string' && row.payload && !Array.isArray(row.payload)).map(row => [row.lesson_id, row.payload]));
      const full = new Map(resources.filter(row => row && Array.isArray(row.payload)).map(row => [row.resource_id, row.payload]));
      if (!['questions', 'pyqs', 'lesson-questions'].every(id => full.has(id))) throw new Error('Your course access is active, but some material could not load. Please retry.');
      const merged = publicData();
      merged.subjects = merged.subjects.map(subject => ({ ...subject, lessons: subject.lessons.map(lesson => {
        const payload = byId.get(lesson.id);
        return payload ? { ...lesson, ...payload, id: lesson.id, locked: false } : lesson;
      }) }));
      if (merged.subjects.some(subject => subject.lessons.some(lesson => lesson.locked))) throw new Error('Your course access is active, but some lessons could not load. Please retry.');
      merged.bank = [...full.get('questions'), ...full.get('pyqs'), ...full.get('lesson-questions')];
      data = merged; resourcesReady = true;
      access = { status: result.role === 'owner' ? 'owner' : 'paid', hasAccess: true, role: result.role, validUntil: until, error: '', accountId };
      scheduleExpiration(token); emit('ready'); return true;
    } catch (error) {
      if (!current(token, accountId)) return false;
      data = publicData(); resourcesReady = false; clearTimeout(expiration);
      access = { status: 'error', hasAccess: false, role: 'learner', validUntil: null, error: error.message || 'Course access could not load. Please retry.', accountId };
      emit('error'); return false;
    }
  }
  function canRead(lesson) { return !protectedMode || lesson?.locked !== true; }
  function canMock() { return !protectedMode || (access.hasAccess && resourcesReady); }
  function price() { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: config.currency, maximumFractionDigits: config.priceMinor % 100 ? 2 : 0 }).format(config.priceMinor / 100); }
  function accessMarkup() {
    if (!protectedMode) return '<b>Open course access</b><p>All lessons and practice are available on this deployment. Keep learning at your own pace.</p>';
    if (access.status === 'owner') return '<b>Owner access</b><p>Your account can open the complete course.</p>';
    if (access.status === 'paid') return `<b>Your course pass is active</b><p>Full access until ${escape(new Date(access.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }))}.</p>`;
    if (access.status === 'loading') return '<b>Checking your course access…</b><p>Your free previews and personal notes remain available.</p>';
    if (access.error) return `<b>Let’s try that again</b><p>${escape(access.error)}</p>`;
    return '<b>Start with the free previews</b><p>One complete lesson in each subject, preview practice, past-year papers and your own notes are available.</p>';
  }
  function pricing() {
    const target = document.getElementById('app');
    target.innerHTML = `<div class="headingrow"><div><div class="eyebrow">YOUR COURSE, YOUR PACE</div><h1>Make room for your next chapter.</h1><p>Try a lesson from every subject, then choose full access when you are ready.</p></div></div><section class="panel course-status" id="course-status" role="status">${accessMarkup()}${protectedMode ? '<button class="textlink" type="button" data-course-refresh>Check access again →</button>' : ''}</section><div class="course-plans"><section class="panel course-plan"><span class="pill">FREE PREVIEW</span><h2>A good place to begin</h2><div class="course-price">₹0</div><p>Explore the teaching style and build your study rhythm.</p><ul><li>A complete preview lesson in every subject</li><li>Preview practice and verified past-year questions</li><li>Past-year paper PDFs and study tools</li><li>Your rich notes, sticky notes and revision workspace</li></ul><a class="btn secondary" href="#learn">Explore free lessons →</a></section><section class="panel course-plan course-paid"><span class="pill">GATE CS & IT · 2027</span><h2>The complete preparation course</h2><div class="course-price">${escape(price())}<small>for ${config.durationMonths} months</small></div><p>One payment. A full year to learn, practice and revisit.</p><ul><li>Every lesson across the complete syllabus</li><li>Detailed explanations and worked examples</li><li>The full original practice bank and timed mocks</li><li>Your progress and notes across devices when signed in</li></ul>${!protectedMode ? '<a class="btn" href="#learn">Open the complete course →</a><p class="muted">Access is open here; no purchase is needed.</p>' : access.hasAccess ? '<a class="btn" href="#learn">Continue learning →</a>' : `<button class="btn" type="button" data-course-checkout ${!config.checkoutEnabled || access.status === 'loading' || access.status === 'error' ? 'disabled' : ''}>${config.checkoutEnabled ? identity() ? 'Get full course access →' : 'Sign in to get full access →' : 'Purchases coming soon'}</button><p class="muted">${config.checkoutEnabled ? 'Access starts after your payment is verified. This is a one-time course pass.' : 'Checkout is not available yet. Your free previews and notes are ready to use.'}</p>`}</section></div><section class="panel course-faq"><h2>Keep your preparation moving</h2><p>Your notes, study tools and public papers stay available whether you use previews or a full course pass. Sign in to keep your personal workspace synced across devices.</p>${!identity() ? '<button class="textlink" type="button" data-course-signin>Sign in or create an account →</button>' : ''}<p id="course-payment-message" role="status" aria-live="polite"></p></section>`;
    target.querySelectorAll('[data-course-refresh]').forEach(button => button.onclick = () => refresh());
    target.querySelectorAll('[data-course-signin]').forEach(button => button.onclick = () => GatewiseCloud.showAccount());
    const buy = target.querySelector('[data-course-checkout]'); if (buy) buy.onclick = checkout;
  }
  function paymentMessage(text) { const target = document.getElementById('course-payment-message'); if (target) target.textContent = text; }
  async function razorpay() {
    if (window.Razorpay) return;
    if (!checkoutScript) checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://checkout.razorpay.com/v1/checkout.js'; script.async = true;
      const timeout = setTimeout(() => { script.remove(); checkoutScript = null; reject(new Error('Checkout could not load. Please try again.')); }, 15000);
      script.onload = () => { clearTimeout(timeout); if (window.Razorpay) resolve(); else { checkoutScript = null; reject(new Error('Checkout could not load. Please try again.')); } };
      script.onerror = () => { clearTimeout(timeout); script.remove(); checkoutScript = null; reject(new Error('Checkout could not load. Please try again.')); };
      document.head.appendChild(script);
    });
    await checkoutScript;
  }
  async function waitForPayment(accountId) {
    for (let attempt = 0; attempt < 8; attempt++) {
      if (identity() !== accountId || GatewiseProgress.locked) return;
      if (await refresh()) { if (typeof toast === 'function') toast('Your course access is ready.'); return; }
      paymentMessage('Payment received. Waiting for verified course access…');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    paymentMessage('Your payment is being verified. Use “Check access again” shortly; your access is granted only after verification.');
  }
  async function checkout() {
    if (checkoutFlight || !protectedMode || !config.checkoutEnabled) return;
    if (!identity()) { GatewiseCloud.showAccount(); return; }
    if (access.hasAccess) { location.hash = 'learn'; return; }
    checkoutFlight = true; const accountId = identity(); const button = document.querySelector('[data-course-checkout]'); if (button) button.disabled = true;
    paymentMessage('Preparing your checkout…');
    try {
      const token = await GatewiseCloud.getAccessToken();
      if (!token || identity() !== accountId || GatewiseProgress.locked) throw new Error('Please sign in again before starting checkout.');
      const response = await fetch('/api/checkout', { method: 'POST', cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(15000) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.message || order.error || 'Checkout is not available right now. Please try again.');
      if (!/^order_[A-Za-z0-9]+$/.test(order.orderId || '') || !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(order.keyId || '') || order.amount !== config.priceMinor || order.currency !== 'INR' || order.durationMonths !== config.durationMonths) throw new Error('The course offer has changed or could not be verified. Refresh this page before purchasing.');
      await razorpay();
      if (identity() !== accountId || GatewiseProgress.locked) return;
      const payment = new window.Razorpay({ key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency, name: 'Gatewise', description: order.courseName || 'GATE CS preparation', prefill: { email: GatewiseCloud.user?.email || '' },
        handler: () => { if (identity() === accountId) waitForPayment(accountId); },
        modal: { ondismiss: () => paymentMessage('Checkout closed. You can continue with your free lessons or try again.') } });
      payment.on?.('payment.failed', () => paymentMessage('Payment did not complete. Your course access has not changed; you can try again.'));
      payment.open(); paymentMessage('Complete your payment in the secure checkout window.');
    } catch (error) { if (identity() === accountId) paymentMessage(error.message || 'Checkout could not start. Please retry.'); }
    finally { checkoutFlight = false; if (button?.isConnected) button.disabled = false; }
  }
  window.GatewiseCourse = { config, boot, refresh, pricing, checkout, canRead, canMock, get data() { return data; }, get access() { return status(); }, get protected() { return protectedMode; } };
  window.addEventListener('gatewise-account-loading', () => { if (protectedMode) drop('reset'); });
  window.addEventListener('gatewise-account-change', () => { if (protectedMode && base) refresh(); });
  window.addEventListener('online', () => { if (protectedMode && base) refresh(); });
  setInterval(() => { if (protectedMode && base && !document.hidden && !checkoutFlight && !GatewiseProgress.locked) refresh(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && protectedMode && base && !checkoutFlight) refresh(); });
})();
