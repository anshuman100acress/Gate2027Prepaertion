(function () {
  'use strict';
  const store = GatewiseProgress, merge = GatewiseMerge;
  const config = window.GATEWISE_CLOUD || {};
  const configured = !!(config.url && config.publishableKey);
  let client = null, session = null, generation = 0, flight = null, debounce, refresh;
  let started = false, recovery = false, status = 'Saved on this device', problem = '';
  const emit = name => window.dispatchEvent(new Event(name));
  const bundle = data => ({ progress: data?.progress || {}, mock: data?.mock || null, paperRun: data?.paperRun || null });
  function setStatus(text, detail = '') { status = text; problem = detail; renderStatus(); }
  function renderStatus() {
    const button = document.getElementById('account');
    if (button) { button.textContent = session ? 'My account' : 'Sign in'; button.disabled = store.locked; }
    const preferences = document.getElementById('settings');
    if (preferences) preferences.disabled = store.locked;
    const label = document.getElementById('cloudstatus');
    if (label) { label.textContent = status; label.title = problem || status; label.dataset.error = problem ? 'true' : 'false'; }
    const footer = document.getElementById('storageinfo');
    if (footer) footer.textContent = session ? 'Your private account · Changes save locally and sync when connected' : 'Guest workspace · Progress stays on this device';
  }
  function schedule() { clearTimeout(debounce); if (session) debounce = setTimeout(() => syncNow(), 800); }
  async function syncNow() {
    if (!client || !session) return false;
    if (flight) return flight.promise;
    if (!navigator.onLine) { setStatus('Saved on this device · Offline', 'Reconnect to sync your latest changes.'); return false; }
    const token = generation, userId = session.user.id;
    const job = { promise: null };
    flight = job;
    job.promise = (async () => {
      setStatus('Syncing…');
      try {
        for (let retry = 0; retry < 5; retry++) {
          const { data: row, error: readError } = await client.from('study_progress').select('data, revision').eq('user_id', userId).maybeSingle();
          if (token !== generation) return false;
          if (readError) throw readError;
          const remote = bundle(row?.data), captured = store.snapshot();
          const merged = merge.rebase(captured.base, captured.data, remote);
          if (!merge.equal(merged, remote)) {
            const { data: revision, error: writeError } = await client.rpc('save_study_progress', { p_expected_revision: row?.revision || 0, p_data: merged });
            if (token !== generation) return false;
            if (writeError) throw writeError;
            if (revision === -1) continue;
          }
          const current = store.snapshot().data;
          const next = merge.rebase(captured.data, current, merged);
          store.accept(next, merged);
          if (!merge.equal(current, next)) emit('gatewise-cloud-update');
          if (store.pending()) { setStatus('Saved on this device · Waiting to sync'); schedule(); }
          else setStatus('Up to date across devices');
          return true;
        }
        throw new Error('Another device is updating. Retry shortly.');
      } catch (error) {
        if (token !== generation) return false;
        const setupError = ['42P01', 'PGRST202', '42501'].includes(error.code);
        setStatus('Saved on this device · Retry sync', setupError ? 'Cloud storage is not ready on this deployment. Your changes remain on this device.' : 'Cloud save failed. Check your connection and retry. Your changes remain on this device.');
        return false;
      } finally { if (flight === job) flight = null; }
    })();
    return job.promise;
  }
  async function activate(nextSession, force = false) {
    if (!force && nextSession?.user.id === session?.user.id) { session = nextSession; renderStatus(); return; }
    const token = ++generation;
    clearTimeout(debounce); clearInterval(refresh); flight = null;
    store.lock(); emit('gatewise-account-loading');
    session = nextSession;
    store.activate(session?.user.id || null);
    setStatus(session ? 'Loading your progress…' : 'Saved on this device');
    if (session) await syncNow();
    if (token !== generation) return;
    store.unlock(); emit('gatewise-account-change'); renderStatus();
    if (session) refresh = setInterval(() => { if (!document.hidden) syncNow(); }, 30000);
  }
  async function initialize() {
    if (!configured) { started = true; renderStatus(); return; }
    store.lock(); renderStatus();
    try {
      client = GatewiseSupabase.createClient(config.url, config.publishableKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        global: { fetch: (url, options = {}) => fetch(url, { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) }) }
      });
      client.auth.onAuthStateChange((event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        // Auth callbacks cannot await Supabase operations: defer work outside the SDK's lock.
        if (!started || event === 'INITIAL_SESSION') return;
        setTimeout(async () => {
          await activate(nextSession);
          if (recovery && nextSession) { recovery = false; showAccount('new-password'); }
        }, 0);
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      await activate(data.session, true);
      started = true;
      if (recovery && session) { recovery = false; showAccount('new-password'); }
    } catch {
      started = true; store.activate(null); store.unlock();
      setStatus('Saved on this device', 'Accounts could not load. Refresh to retry; guest progress is available.');
    }
  }
  function showAccount(mode = 'signin') {
    const dialog = document.getElementById('dialog');
    const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const close = '<button class="btn secondary" type="button" id="closeaccount">Close</button>';
    if (!configured || !client) {
      dialog.innerHTML = `<h2>Study on any device</h2><p>Accounts are not enabled for this deployment yet. You can continue learning and saving progress on this device.</p><div class="actions">${close}</div>`;
    } else if (session && mode !== 'new-password') {
      const guest = store.guest().progress;
      const count = (guest.completed || []).length, notes = Object.values(guest.notes || {}).filter(Boolean).length;
      dialog.innerHTML = `<h2>Your preparation account</h2><p class="accountemail">${escape(session.user.email || '')}</p><p id="accountmessage" role="status">${escape(problem || status)}</p><div class="actions"><button class="btn" type="button" id="syncaccount">Sync now</button><button class="btn secondary" type="button" id="exportprogress">Download my progress</button></div><section class="importguest"><h3>Bring your guest progress with you</h3><p>This browser’s guest workspace has ${count} read lessons and ${notes} notes. Importing combines histories and saved topics. Your existing account notes take priority. Guest progress stays available here.</p><button class="btn secondary" type="button" id="importguest">Import guest progress</button></section><div class="actions"><button class="btn secondary" type="button" id="signout">Sign out</button>${close}</div>`;
    } else {
      const reset = mode === 'reset', signup = mode === 'signup', update = mode === 'new-password';
      const heading = update ? 'Choose a new password' : reset ? 'Reset your password' : signup ? 'Create your study account' : 'Welcome back';
      dialog.innerHTML = `<h2>${heading}</h2><p>${update ? 'Save your new password to continue.' : 'Your lessons, notes and practice history, wherever you study.'}</p><form id="accountform">${update ? '' : '<label>Email<input id="accountemail" type="email" autocomplete="email" required maxlength="254"></label>'}${reset ? '' : `<label>Password<input id="accountpassword" type="password" autocomplete="${signup || update ? 'new-password' : 'current-password'}" minlength="${signup || update ? 8 : 1}" required></label>`}<p id="accountmessage" role="status" aria-live="polite"></p><div class="actions"><button class="btn" id="accountsubmit" type="submit">${update ? 'Save password' : reset ? 'Send reset link' : signup ? 'Create account' : 'Sign in'}</button>${close}</div></form>${update ? '' : `<div class="accountlinks"><button class="textlink" type="button" data-accountmode="${signup || reset ? 'signin' : 'signup'}">${signup || reset ? 'Back to sign in' : 'Create an account'}</button>${!reset ? '<button class="textlink" type="button" data-accountmode="reset">Forgot password?</button>' : ''}</div><p class="muted">Guest progress stays separate. You can import it after signing in.</p>`}`;
    }
    if (!dialog.open) dialog.showModal();
    document.getElementById('closeaccount').onclick = () => dialog.close();
    dialog.querySelectorAll('[data-accountmode]').forEach(button => button.onclick = () => showAccount(button.dataset.accountmode));
    const message = text => { const element = document.getElementById('accountmessage'); if (element) element.textContent = text; };
    const form = document.getElementById('accountform');
    if (form) form.onsubmit = async event => {
      event.preventDefault();
      const button = document.getElementById('accountsubmit'); button.disabled = true; message('Please wait…');
      const email = document.getElementById('accountemail')?.value.trim(), password = document.getElementById('accountpassword')?.value;
      const redirect = location.origin + location.pathname;
      try {
        let result;
        if (mode === 'reset') result = await client.auth.resetPasswordForEmail(email, { redirectTo: redirect });
        else if (mode === 'new-password') result = await client.auth.updateUser({ password });
        else if (mode === 'signup') result = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirect } });
        else result = await client.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (mode === 'reset') message('If this email has an account, a reset link will arrive shortly.');
        else if (mode === 'signup' && !result.data.session) message('Check your email to confirm your account, then sign in here.');
        else if (mode === 'new-password') { message('Password updated.'); document.getElementById('accountpassword').value = ''; }
        else message('Signed in. Loading your progress…');
      } catch (error) { message(error.message || 'Unable to connect. Please try again.'); }
      finally { if (button.isConnected) button.disabled = false; }
    };
    const sync = document.getElementById('syncaccount');
    if (sync) sync.onclick = async () => { sync.disabled = true; await syncNow(); message(problem || status); sync.disabled = false; };
    const importing = document.getElementById('importguest');
    if (importing) importing.onclick = async () => { store.importGuest(); emit('gatewise-cloud-update'); await syncNow(); message(problem || 'Guest progress imported into your account.'); };
    const exporting = document.getElementById('exportprogress');
    if (exporting) exporting.onclick = () => {
      const blob = new Blob([JSON.stringify(store.snapshot().data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'gatewise-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    const signout = document.getElementById('signout');
    if (signout) signout.onclick = async () => {
      signout.disabled = true;
      const id = session.user.id;
      await syncNow();
      const unsynced = store.pending();
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) { message(error.message); signout.disabled = false; return; }
      if (!unsynced) store.clearAccount(id);
      dialog.close();
      if (unsynced && typeof toast === 'function') toast('Pending changes remain on this device. Sign in here again to sync them.');
    };
  }
  window.GatewiseCloud = { configured, syncNow, showAccount, get user() { return session?.user || null; } };
  GatewiseCloud.ready = initialize();
  window.addEventListener('gatewise-dirty', () => { setStatus(navigator.onLine ? 'Saved on this device · Waiting to sync' : 'Saved on this device · Offline'); schedule(); });
  window.addEventListener('online', () => syncNow());
  window.addEventListener('offline', () => { if (session) setStatus('Saved on this device · Offline', 'Reconnect to sync your latest changes.'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && session) syncNow(); });
  document.getElementById('account').onclick = () => showAccount();
})();
