(function () {
  'use strict';
  const fields = { 'gatewise-v1': 'progress', 'gatewise-mock': 'mock', 'gatewise-paper-run': 'paperRun' };
  let userId = null, locked = false, cache = null, observed = null;
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const guest = () => ({ progress: read('gatewise-v1') || {}, mock: read('gatewise-mock'), paperRun: read('gatewise-paper-run') });
  function persist() {
    const disk = read('gatewise-account:' + userId), before = cache.data;
    // Another tab may have saved since this tab last read the cache.
    if (disk?.data && observed) cache.data = GatewiseMerge.rebase(observed, cache.data, disk.data);
    localStorage.setItem('gatewise-account:' + userId, JSON.stringify(cache));
    observed = GatewiseMerge.clone(cache.data);
    if (!locked && !GatewiseMerge.equal(before, cache.data)) window.dispatchEvent(new Event('gatewise-cloud-update'));
  }
  window.GatewiseProgress = {
    get userId() { return userId; }, get locked() { return locked; },
    getItem(key) { return userId ? JSON.stringify(cache.data[fields[key]] ?? null) : localStorage.getItem(key); },
    setItem(key, value) {
      if (locked) return;
      if (!userId) { localStorage.setItem(key, value); return; }
      const next = JSON.parse(value), field = fields[key];
      if (GatewiseMerge.equal(cache.data[field], next)) return;
      cache.data[field] = next; persist(); window.dispatchEvent(new Event('gatewise-dirty'));
    },
    removeItem(key) { if (userId) this.setItem(key, 'null'); else localStorage.removeItem(key); },
    lock() { locked = true; }, unlock() { locked = false; },
    activate(id) {
      userId = id;
      cache = id ? read('gatewise-account:' + id) || { data: { progress: {}, mock: null, paperRun: null }, base: { progress: {}, mock: null, paperRun: null } } : null;
      observed = id ? GatewiseMerge.clone(cache.data) : null;
    },
    snapshot() { return GatewiseMerge.clone(userId ? cache : { data: guest(), base: {} }); },
    accept(data, base) { cache = { data: GatewiseMerge.clone(data), base: GatewiseMerge.clone(base) }; persist(); },
    pending() { return !!userId && !GatewiseMerge.equal(GatewiseMerge.rebase(cache.base, cache.data, cache.base), cache.base); },
    guest,
    importGuest() { if (!userId || locked) return; cache.data = GatewiseMerge.importGuest(cache.data, guest()); persist(); window.dispatchEvent(new Event('gatewise-dirty')); },
    clearAccount(id) { localStorage.removeItem('gatewise-account:' + id); }
  };
  window.addEventListener('storage', event => {
    if (!userId || locked || event.key !== 'gatewise-account:' + userId || !event.newValue) return;
    let incoming; try { incoming = JSON.parse(event.newValue); } catch { return; }
    if (!incoming?.data || !incoming?.base) return;
    const before = cache.data;
    cache = { data: GatewiseMerge.rebase(observed, cache.data, incoming.data), base: incoming.base };
    observed = GatewiseMerge.clone(incoming.data);
    if (!GatewiseMerge.equal(before, cache.data)) window.dispatchEvent(new Event('gatewise-cloud-update'));
    if (GatewiseProgress.pending()) window.dispatchEvent(new Event('gatewise-dirty'));
  });
})();
