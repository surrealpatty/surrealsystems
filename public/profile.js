/* profile.js - canonical profile client
   Uses script.js helpers when available and falls back safely.
*/

(function () {
  'use strict';

  // ---- helpers ----
  function safe(fn, fallback) { try { return typeof fn === 'function' ? fn : fallback; } catch { return fallback; } }
  const getToken = safe(window.getToken, () => localStorage.getItem('token'));
  const getUserId = safe(window.getUserId, () => localStorage.getItem('userId'));
  const setUserId = safe(window.setUserId, (v) => localStorage.setItem('userId', v));
  const getDisplayName = safe(window.getDisplayName, (u) => u?.username || u?.name || 'User');
  const getDescription = safe(window.getDescription, (u) => u?.description || '');
  const apiFetch = typeof window.apiFetch === 'function' ? window.apiFetch : null;
  const API_URL = (window.API_URL || (window.location.origin + '/api')).replace(/\/+$/, '');

  // Diagnostic banner
  const Diag = {
    show(msg) {
      const el = document.getElementById('diagBanner');
      if (!el) return;
      el.innerHTML = msg;
      el.classList.remove('hidden');
      console.error('[Diag]', el.textContent.replace(/\s+/g, ' ').trim());
    },
    hide() {
      const el = document.getElementById('diagBanner');
      if (!el) return;
      el.classList.add('hidden');
    }
  };

  // doFetch - uses apiFetch if available, otherwise falls back to fetch
  async function doFetch(pathOrUrl, opts = {}, timeoutMs = 8000) {
    const isAbsolute = typeof pathOrUrl === 'string' && /^https?:\/\//i.test(pathOrUrl);
    const url = isAbsolute ? pathOrUrl : (pathOrUrl.startsWith('/') ? API_URL + pathOrUrl : API_URL + '/' + pathOrUrl.replace(/^\/+/, ''));

    if (apiFetch) {
      return apiFetch(pathOrUrl, { timeoutMs, ...opts });
    }

    const headers = Object.assign({}, opts.headers || {});
    const token = getToken();
    if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
    if (opts.body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

    const init = {
      method: opts.method || 'GET',
      headers,
      body: (opts.body === undefined || typeof opts.body === 'string') ? opts.body : JSON.stringify(opts.body),
      signal: opts.signal
    };

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      const timeoutController = new AbortController();
      const tid = setTimeout(() => timeoutController.abort(), timeoutMs);
      if (init.signal) {
        const chained = new AbortController();
        init.signal.addEventListener('abort', () => chained.abort(), { once: true });
        timeoutController.signal.addEventListener('abort', () => chained.abort(), { once: true });
        init.signal = chained.signal;
      } else {
        init.signal = timeoutController.signal;
      }
      try {
        const res = await fetch(url, init);
        clearTimeout(tid);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `${res.status} ${res.statusText}`);
        }
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json') || ct.includes('+json')) return res.json();
        return res.text();
      } catch (e) {
        clearTimeout(tid);
        if (e?.name === 'AbortError') throw new Error('Request aborted');
        throw e;
      }
    } else {
      const res = await fetch(url, init);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `${res.status} ${res.statusText}`);
      }
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('application/json') || ct.includes('+json')) return res.json();
      return res.text();
    }
  }

  // ---- DOM refs ----
  const profileUsername = document.getElementById('profile-username');
  const profileDescription = document.getElementById('profile-description');
  const descControls = document.getElementById('descControls');
  const editDescBtn = document.getElementById('editDescBtn');

  const servicesList = document.getElementById('services-list');
  const newServiceSection = document.getElementById('newServiceSection');
  const newServiceTitle = document.getElementById('newServiceTitle');
  const newServiceDesc = document.getElementById('newServiceDesc');
  const newServicePrice = document.getElementById('newServicePrice');
  const createServiceBtn = document.getElementById('createServiceBtn');

  const goToServicesBtn = document.getElementById('goToServicesBtn');
  const goToMessagesBtn = document.getElementById('goToMessagesBtn');
  const addNewServiceBtn = document.getElementById('addNewServiceBtn');
  const editDescBtnFloat = document.getElementById('editDescBtnFloat');
  const mobileServicesBtn = document.getElementById('mobileServicesBtn');
  const mobileMessagesBtn = document.getElementById('mobileMessagesBtn');
  const mobileAddServiceBtn = document.getElementById('mobileAddServiceBtn');
  const mobileRow = document.getElementById('mobileRow');
  const mobileBackBtn = document.getElementById('mobileBackBtn');

  const ratingsList = document.getElementById('ratings-list');
  const avgStarsEl = document.getElementById('avg-stars');
  const ratingsCountEl = document.getElementById('ratings-count');
  const rateForm = document.getElementById('rate-form');

  const rateStars = document.getElementById('rateStars');
  const rateComment = document.getElementById('rateComment');
  const submitRatingBtn = document.getElementById('submitRatingBtn');
  const rateMsg = document.getElementById('rateMsg');
  const rateUpgradeHint = document.getElementById('rateUpgradeHint');
  const upgradeInlineBtn = document.getElementById('upgradeInlineBtn');

  const logoutBtn = document.getElementById('logoutBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const backToMyProfileBtn = document.getElementById('backToMyProfileBtn');
  const loadMoreBtn = document.getElementById('loadMoreServicesBtn');

  // ---- state ----
  let currentUserTier = 'free';
  let currentProfileUserId = null;
  let svcPage = 1, svcLoading = false;
  let svcAborter = null, ratingsAborter = null;
  let paymentsEnabled = true; // optimistic default until we check

  // ---- utils ----
  function esc(s) { return String(s ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function showOwnerUI(isOwner) {
    [goToServicesBtn, goToMessagesBtn, addNewServiceBtn, editDescBtnFloat, mobileRow, descControls].forEach(el => {
      if (el) el.classList.toggle('hidden', !isOwner);
    });
    if (backToMyProfileBtn) backToMyProfileBtn.classList.toggle('hidden', isOwner);
    if (mobileBackBtn) mobileBackBtn.classList.toggle('hidden', isOwner);
    if (!isOwner && newServiceSection) { newServiceSection.classList.add('hidden'); newServiceSection.classList.remove('show-flex'); }
  }

  // ---- health check ----
  (async function healthCheck() {
    try {
      await doFetch('health', {}, 4000);
      Diag.hide();
    } catch (err) {
      Diag.show('API health check failed. <span class="muted">Verify that <code>/api/health</code> is reachable, check CORS, and confirm the server is running.</span>');
    }
  })();

  // ---- payments availability (frontend) ----
  async function initPaymentsAvailability() {
    try {
      const out = await doFetch('payments/available', {}, 4000);
      paymentsEnabled = !!(out && out.enabled);
    } catch (e) {
      // network error — be conservative and treat as disabled
      paymentsEnabled = false;
    }

    // Apply the availability to the UI if upgrade button present
    try {
      const upgradeBtns = [upgradeBtn, upgradeInlineBtn];
      upgradeBtns.forEach(btn => {
        if (!btn) return;
        if (!paymentsEnabled) {
          btn.classList.add('hidden');
        } else {
          // leave visibility to existing logic (loadProfile decides owner/tier)
          btn.classList.remove('hidden');
        }
      });

      // hide inline upgrade hint if payments disabled
      if (!paymentsEnabled && rateUpgradeHint) rateUpgradeHint.classList.add('hidden');
    } catch (e) {
      // ignore UI errors
    }
  }

  // ---- data loaders ----
  async function fetchMe() {
    const me = await doFetch('users/me', {}, 8000);
    const u = me?.user || me || {};
    if (!getUserId() && u.id) setUserId && setUserId(String(u.id));
    try {
      localStorage.setItem('cc_me', JSON.stringify(u));
      const dn = getDisplayName(u);
      if (dn) localStorage.setItem('username', dn);
    } catch {}
    currentUserTier = u.tier || 'free';
    return u;
  }

  async function loadProfile() {
    try {
      const me = await fetchMe();
      const loggedInUserId = getUserId();

      const params = new URLSearchParams(location.search);
      const qsUserId = params.get('userId');
      const profileUserId = (qsUserId || loggedInUserId)?.toString();
      currentProfileUserId = profileUserId;

      const data = qsUserId ? await doFetch(`users/${profileUserId}`, {}, 8000) : { user: me };
      const u = data.user || data || {};

      if (profileUsername) profileUsername.textContent = getDisplayName(u) || 'User';
      if (profileDescription) profileDescription.textContent = getDescription(u) || 'No description yet.';

      const viewingSelf = profileUserId === String(loggedInUserId);
      showOwnerUI(viewingSelf);

      const canRate = (!viewingSelf && currentUserTier === 'paid');
      if (rateForm) rateForm.classList.toggle('hidden', !canRate);
      if (rateUpgradeHint) rateUpgradeHint.classList.add('hidden');

      // only show upgrade if payments are enabled
      if (viewingSelf && currentUserTier === 'free' && paymentsEnabled) upgradeBtn && upgradeBtn.classList.remove('hidden');
      else upgradeBtn && upgradeBtn.classList.add('hidden');

      await loadServices({ reset: true, userId: profileUserId });
      (window.requestIdleCallback ? requestIdleCallback : (cb) => setTimeout(cb, 0))(() => loadRatings(profileUserId));
    } catch (err) {
      console.error('Profile load error:', err);
      Diag.show('Failed to load profile. Check console and server logs.');
    }
  }

  // ---- services ----
  function serviceCardHTML(s, isOwner) {
    return `<div class="card">
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.description)}</p>
      <p><strong>Price:</strong> $${Number(s.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
      <div class="service-buttons ${isOwner ? '' : 'hidden'}">
        <button class="edit-service-btn" data-id="${s.id}">Edit</button>
        <button class="delete-service-btn" data-id="${s.id}">Delete</button>
      </div>
    </div>`;
  }
  function renderServicesHTML(list, loggedInUserId) {
    if (!list?.length) return '';
    let out = '';
    for (const s of list) {
      const isOwner = String(loggedInUserId) === String(s.user?.id || s.userId || '');
      out += serviceCardHTML(s, isOwner);
    }
    return out;
  }

  async function loadServices({ reset = false, userId } = {}) {
    if (svcLoading) return; svcLoading = true;
    try {
      const loggedInUserId = getUserId();
      const cacheKey = `cc_services_${userId || 'me'}_p${svcPage}`;

      if (reset) {
        svcPage = 1;
        const cached = (function () { try { return JSON.parse(localStorage.getItem(cacheKey)); } catch { return null; } })();
        if (cached && (Date.now() - (cached.ts || 0)) < 60000 && Array.isArray(cached.items) && cached.items.length) {
          servicesList.innerHTML = renderServicesHTML(cached.items, loggedInUserId);
          loadMoreBtn.classList.toggle('hidden', !cached.hasMore);
        } else {
          servicesList.innerHTML = Array.from({ length: 3 }).map(() => `
            <div class="card fade-in">
              <h3 style="background:#eee;height:18px;width:60%;border-radius:6px;"></h3>
              <p style="background:#f2f2f2;height:14px;width:100%;border-radius:6px;"></p>
              <p style="background:#f2f2f2;height:14px;width:80%;border-radius:6px;"></p>
            </div>
          `).join('');
          loadMoreBtn.classList.add('hidden');
        }
      }

      const url = new URL(`${API_URL}/services`, location.origin);
      if (userId) url.searchParams.set('userId', userId);
      url.searchParams.set('limit', svcPage === 1 ? '6' : '12');
      url.searchParams.set('page', String(svcPage));

      if (svcAborter) { try { svcAborter.abort(); } catch { } }
      svcAborter = new AbortController();

      // === FIXED: pass absolute URL (url.href) into doFetch so we don't double-prefix /api when API_URL === '/api'
      const data = await doFetch(url.href, { signal: svcAborter.signal }, 8000);
      const list = data.services || [];
      const hasMore = !!data.hasMore;

      try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), items: list, hasMore })); } catch {}

      const html = renderServicesHTML(list, loggedInUserId);
      if (reset) servicesList.innerHTML = html; else servicesList.insertAdjacentHTML('beforeend', html);

      loadMoreBtn.classList.toggle('hidden', !hasMore);
      if (hasMore) svcPage += 1;

      if (!list.length && svcPage === 2 && reset) {
        servicesList.innerHTML = '<div class="card"><h3>No Services Yet</h3><p class="muted">Nothing posted yet.</p></div>';
        loadMoreBtn.classList.add('hidden');
      }

      // wire up edit/delete buttons
      servicesList.querySelectorAll('.edit-service-btn').forEach(btn => {
        btn.removeEventListener('click', onEditServiceClick);
        btn.addEventListener('click', onEditServiceClick);
      });
      servicesList.querySelectorAll('.delete-service-btn').forEach(btn => {
        btn.removeEventListener('click', onDeleteServiceClick);
        btn.addEventListener('click', onDeleteServiceClick);
      });

    } catch (err) {
      if (err?.name !== 'AbortError') {
        Diag.show('Failed to load services. <span class="muted">Check <code>/api/services</code> and server logs.</span>');
        console.error(err);
        if (svcPage === 1) servicesList.innerHTML = '<p>Failed to load services.</p>';
      }
    } finally { svcLoading = false; }
  }

  // Edit/Delete helpers
  function onEditServiceClick(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute('data-id');
    const div = btn.closest('.card');
    if (!div) return;
    editService(div, { id });
  }
  function onDeleteServiceClick(e) {
    const btn = e.currentTarget;
    const id = btn.getAttribute('data-id');
    deleteService(id);
  }

  async function editService(div, service) {
    const titleEl = div.querySelector('h3') || div.querySelector('.service-title');
    const descEl = div.querySelector('p') || div.querySelector('.service-desc');

    const origTitle = (titleEl?.textContent || '').trim();
    const origDesc = (descEl?.textContent || '').trim();
    const origPrice =  (div.querySelector('.service-price')?.textContent || '').trim();

    titleEl.innerHTML = `<input type="text" value="${esc(origTitle)}" class="edit-title">`;
    descEl.innerHTML = `<textarea class="edit-desc">${esc(origDesc)}</textarea>`;

    if (div.querySelector('.service-price')) {
      div.querySelector('.service-price').innerHTML = `<input type="number" value="${Number(origPrice || 0)}" class="edit-price">`;
    }

    const buttonsDiv = div.querySelector('.service-buttons');
    if (!buttonsDiv) {
      div.insertAdjacentHTML('beforeend', `<div class="service-buttons"><button class="save-btn">Save</button><button class="cancel-btn">Cancel</button></div>`);
    } else {
      buttonsDiv.innerHTML = `<button class="save-btn">Save</button><button class="cancel-btn">Cancel</button>`;
    }

    const saveBtn = div.querySelector('.save-btn');
    const cancelBtn = div.querySelector('.cancel-btn');

    const onSave = async () => {
      const updatedTitle = div.querySelector('.edit-title')?.value.trim();
      const updatedDesc = div.querySelector('.edit-desc')?.value.trim();
      const updatedPrice = div.querySelector('.edit-price')?.value.trim();
      if (!updatedTitle || !updatedDesc || !updatedPrice) return alert('All fields are required.');
      try {
        await doFetch(`services/${service.id}`, {
          method: 'PUT',
          body: { title: updatedTitle, description: updatedDesc, price: updatedPrice }
        }, 8000);
        await loadServices({ reset: true, userId: getUserId() });
      } catch (err) {
        console.error(err);
        alert('Failed to update service.');
      }
    };

    saveBtn.addEventListener('click', onSave, { once: true });
    cancelBtn.addEventListener('click', () => loadServices({ reset: true, userId: getUserId() }), { once: true });
  }

  async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
      await doFetch(`services/${serviceId}`, { method: 'DELETE' }, 8000);
      await loadServices({ reset: true, userId: getUserId() });
    } catch (err) {
      console.error(err);
      alert('Failed to delete service.');
    }
  }

  // ---- NEW toggleNewService (fixed to toggle classes) ----
  function toggleNewService() {
    if (!newServiceSection) return;
    // Use classes (do not rely on inline style alone because .hidden uses !important)
    if (newServiceSection.classList.contains('hidden')) {
      newServiceSection.classList.remove('hidden');
      newServiceSection.classList.add('show-flex');
      newServiceSection.style.display = 'flex';
      // focus the title
      try { newServiceTitle && newServiceTitle.focus(); } catch {}
    } else {
      newServiceSection.classList.add('hidden');
      newServiceSection.classList.remove('show-flex');
      newServiceSection.style.display = 'none';
    }
  }

  // ---- NEW createService (robust + logs) ----
  async function createService() {
    if (!createServiceBtn) {
      console.warn('createServiceBtn not found');
      return;
    }

    const title = newServiceTitle?.value?.trim();
    const description = newServiceDesc?.value?.trim();
    const rawPrice = newServicePrice?.value;
    const price = Number(rawPrice);

    if (!title) { alert('Title is required'); return; }
    if (Number.isNaN(price) || price < 0) { alert('Enter a valid price'); return; }

    const token = (typeof getToken === 'function' ? getToken() : localStorage.getItem('token'));
    if (!token) {
      alert('You appear to be logged out. Please sign in and try again.');
      return;
    }

    createServiceBtn.disabled = true;
    const prevText = createServiceBtn.textContent;
    createServiceBtn.textContent = 'Creating…';

    const payload = { title, description, price };
    console.log('createService: payload=', payload);

    try {
      const out = await doFetch('services', { method: 'POST', body: payload }, 12000);
      console.log('createService: server response:', out);

      if (out == null) {
        throw new Error('Empty server response');
      }
      if (out.error || out.errors) {
        const msg = out.error || (Array.isArray(out.errors) ? out.errors.join(', ') : JSON.stringify(out.errors));
        throw new Error(msg);
      }

      await loadServices({ reset: true, userId: getUserId() });

      if (newServiceTitle) newServiceTitle.value = '';
      if (newServiceDesc) newServiceDesc.value = '';
      if (newServicePrice) newServicePrice.value = '';
      if (newServiceSection) {
        newServiceSection.classList.add('hidden');
        newServiceSection.classList.remove('show-flex');
        newServiceSection.style.display = 'none';
      }
      Diag.show('Service created successfully.');
      setTimeout(() => Diag.hide(), 2000);
    } catch (err) {
      console.error('Create service failed:', err);
      const msg = err?.message || (err?.payload && JSON.stringify(err.payload)) || 'Failed to create service';
      alert(msg);
      Diag.show(`Create service failed. <span class="muted">${msg}</span>`);
    } finally {
      createServiceBtn.disabled = false;
      createServiceBtn.textContent = prevText || 'Create Service';
    }
  }

  // ---- ratings ----
  function renderStars(n) { const r = Math.round(n); return '★'.repeat(r) + '☆'.repeat(5 - r); }

  async function loadRatings(userId) {
    const cacheKey = `cc_ratings_${userId}`;
    const cachedRaw = (function () { try { return JSON.parse(localStorage.getItem(cacheKey)); } catch { return null; } })();
    if (cachedRaw && (Date.now() - (cachedRaw.ts || 0)) < 60000 && Array.isArray(cachedRaw.ratings)) {
      paintRatings(cachedRaw.summary || { average: 0, count: 0 }, cachedRaw.ratings);
    } else {
      if (ratingsList) ratingsList.innerHTML = '<p><span class="spinner"></span> Loading ratings...</p>';
    }

    if (ratingsAborter) { try { ratingsAborter.abort(); } catch { } }
    ratingsAborter = new AbortController();
    try {
      const data = await doFetch(`ratings/user/${userId}`, { signal: ratingsAborter.signal }, 8000);
      const summary = { average: data.summary?.average ?? 0, count: data.summary?.count ?? 0 };
      const ratings = data.ratings || [];
      try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), summary, ratings })); } catch {}
      paintRatings(summary, ratings);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        console.error(err);
        if (!cachedRaw) ratingsList && (ratingsList.innerHTML = '<p class="muted">Failed to load ratings.</p>');
      }
    }
  }

  function paintRatings(summary, ratings) {
    if (avgStarsEl) avgStarsEl.textContent = Number(summary.average || 0).toFixed(1);
    if (ratingsCountEl) ratingsCountEl.textContent = summary.count || 0;
    if (!ratings?.length) {
      if (ratingsList) ratingsList.innerHTML = '<p class="muted">No ratings yet.</p>';
      return;
    }
    let html = '';
    for (const r of ratings) {
      html += `<div class="review">
        <div class="meta-row">
          <strong>${esc(r.rater?.username || ('User ' + r.raterId))}</strong>
          <span class="stars">${renderStars(r.stars)}</span>
          <span class="badge">${Number(r.stars).toFixed(1)}</span>
          <span class="muted">${new Date(r.createdAt).toLocaleString()}</span>
        </div>
        ${r.comment ? `<p>${esc(r.comment)}</p>` : '<p class="muted">No comment</p>'}
      </div>`;
    }
    if (ratingsList) ratingsList.innerHTML = html;
  }

  // ---- edit/save description ----
  let editingDesc = false;
  function toggleDescEdit(force) {
    editingDesc = typeof force === 'boolean' ? force : !editingDesc;
    if (profileDescription) profileDescription.contentEditable = editingDesc;
    if (editDescBtn) editDescBtn.textContent = editingDesc ? 'Save Description' : 'Edit Description';
    if (editingDesc && profileDescription) profileDescription.focus(); else profileDescription && profileDescription.blur();
  }
  async function saveDescription() {
    const newDesc = profileDescription?.textContent?.trim();
    try {
      const out = await doFetch('users/me/description', { method: 'PUT', body: { description: newDesc } }, 8000);
      const saved = out?.user || {};
      if (profileDescription) profileDescription.textContent = getDescription(saved) || newDesc || '';
    } catch {
      alert('Failed to save description');
    } finally {
      toggleDescEdit(false);
    }
  }

  // ---- handlers wiring ----
  function wireHandlers() {
    if (editDescBtn) editDescBtn.addEventListener('click', () => !editingDesc ? toggleDescEdit(true) : saveDescription());
    if (editDescBtnFloat) editDescBtnFloat.addEventListener('click', () => !editingDesc ? toggleDescEdit(true) : saveDescription());

    if (goToServicesBtn) goToServicesBtn.addEventListener('click', () => location.href = 'services.html');
    if (goToMessagesBtn) goToMessagesBtn.addEventListener('click', () => location.href = 'messages.html');
    if (mobileServicesBtn) mobileServicesBtn.addEventListener('click', () => location.href = 'services.html');
    if (mobileMessagesBtn) mobileMessagesBtn.addEventListener('click', () => location.href = 'messages.html');

    if (backToMyProfileBtn) backToMyProfileBtn.addEventListener('click', () => location.href = 'profile.html');
    if (mobileBackBtn) mobileBackBtn.addEventListener('click', () => location.href = 'profile.html');

    if (logoutBtn) logoutBtn.addEventListener('click', () => { localStorage.clear(); location.replace('/'); });

    if (upgradeBtn) upgradeBtn.addEventListener('click', async () => {
      try {
        if (!paymentsEnabled) { alert('Payments are currently disabled.'); return; }
        if (!confirm('Upgrade to a paid account?')) return;
        // changed to POST to match backend
        await doFetch('users/me/upgrade', { method: 'POST' }, 8000);
        alert('Upgraded successfully!');
        currentUserTier = 'paid';
        await loadProfile();
      } catch (err) {
        alert(err.message || 'Upgrade failed');
      }
    });

    if (addNewServiceBtn) addNewServiceBtn.addEventListener('click', toggleNewService);
    if (mobileAddServiceBtn) mobileAddServiceBtn.addEventListener('click', toggleNewService);
    if (createServiceBtn) createServiceBtn.addEventListener('click', createService);
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => loadServices({ reset: false }));

    if (submitRatingBtn) {
      submitRatingBtn.addEventListener('click', async () => {
        const stars = parseInt((rateStars?.value || '0'), 10) || 0;
        const comment = (rateComment?.value || '').trim();
        const rateeId = currentProfileUserId || (new URLSearchParams(location.search)).get('userId') || getUserId();

        if (!rateeId) { showRateMsg('No target user to rate', true); return; }
        if (!stars || stars < 1 || stars > 5) { showRateMsg('Please pick 1–5 stars', true); return; }

        submitRatingBtn.disabled = true;
        showRateMsg('Submitting…');

        try {
          const payload = { rateeId, stars, comment: comment || null };
          const out = await doFetch('ratings', { method: 'POST', body: payload }, 8000);
          showRateMsg(out?.message || 'Rating saved');
          await loadRatings(rateeId);
          if (rateComment) rateComment.value = '';
          if (rateUpgradeHint) rateUpgradeHint.classList.add('hidden');
        } catch (err) {
          console.error('Rating submit error', err);
          const m = String(err?.message || '');
          if (m.includes('403') || m.toLowerCase().includes('upgrade')) {
            if (rateUpgradeHint) rateUpgradeHint.classList.remove('hidden');
            showRateMsg('Upgrade required to rate users.', true);
          } else {
            showRateMsg(err?.message || 'Failed to submit rating', true);
          }
        } finally {
          submitRatingBtn.disabled = false;
        }
      });
    }

    if (upgradeInlineBtn) {
      upgradeInlineBtn.addEventListener('click', async () => {
        try {
          if (!paymentsEnabled) { alert('Payments are currently disabled.'); return; }
          if (!confirm('Upgrade to a paid account?')) return;
          // changed to POST to match backend
          await doFetch('users/me/upgrade', { method: 'POST' }, 8000);
          alert('Upgraded successfully!');
          currentUserTier = 'paid';
          await loadProfile();
        } catch (err) {
          alert(err?.message || 'Upgrade failed');
        }
      });
    }
  }

  function showRateMsg(txt, isError = false) {
    if (!rateMsg) return;
    rateMsg.textContent = txt || '';
    rateMsg.style.color = isError ? '#b91c1c' : '#2b7a2b';
    if (!txt) return;
    setTimeout(() => { if (rateMsg) rateMsg.textContent = ''; }, 4500);
  }

  // ---- init ----
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const cached = JSON.parse(localStorage.getItem('cc_me') || 'null');
      if (cached) {
        const cachedName = getDisplayName(cached);
        if (cachedName && profileUsername) profileUsername.textContent = cachedName;
        const cachedDesc = getDescription(cached);
        if (cachedDesc && profileDescription) profileDescription.textContent = cachedDesc;

        const params = new URLSearchParams(location.search);
        if (cached.id && !params.get('userId')) showOwnerUI(true);
      }
    } catch { /* ignore */ }

    wireHandlers();

    try {
      if (typeof window.isLoggedIn === 'function') {
        if (!isLoggedIn()) {
          Diag.show('You appear to be logged out. <span class="muted">No token found. UI will load, but protected API calls will fail.</span>');
        }
      } else {
        const token = getToken();
        if (!token) {
          Diag.show('You appear to be logged out. <span class="muted">No token found. UI will load, but protected API calls will fail.</span>');
        }
      }
    } catch (e) {
      Diag.show('Login guard error. <span class="muted">Check <code>isLoggedIn()</code> or <code>script.js</code>.</span>');
    }

    // Wait for payments availability before loading profile so upgrade UI is correct
    await initPaymentsAvailability();

    // Now load the main profile UI
    loadProfile();
  });
})();
