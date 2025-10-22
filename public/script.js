// public/script.js (fixed)

// ==== Auth keys (match the rest of your app) ====
const TOKEN_KEY = 'token';
const USER_ID_KEY = 'userId';

// ---- token helpers
const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t || '');
const clearToken = () => localStorage.removeItem(TOKEN_KEY);
const setUserId = (id) => localStorage.setItem(USER_ID_KEY, String(id || ''));
const getUserId = () => localStorage.getItem(USER_ID_KEY) || '';
const clearUserId = () => localStorage.removeItem(USER_ID_KEY);

// ---- simple login state
const isLoggedIn = () => !!getToken() && !!getUserId();

// ==== API base ====
// If your frontend and API are served by the same Render service, keep '/api'.
// If you have a separate API host, set window.API_URL = 'https://your-api.onrender.com/api' in a small inline script.
const API_BASE = (window.API_URL && String(window.API_URL)) || '/api';

// Build a URL safely. Accepts:
//   'users/login'  -> '/api/users/login'
//   '/users/login' -> '/api/users/login'
//   '/api/users'   -> '/api/users' (unchanged)
//   'https://…'    -> passthrough
function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api')) return path;               // already contains /api
  if (path.startsWith('/')) return API_BASE + path;       // '/users' -> '/api/users'
  return API_BASE + '/' + path.replace(/^\/+/, '');       // 'users' -> '/api/users'
}

// ==== Fetch helper that auto-attaches JWT and parses JSON/text ====
async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const url = apiUrl(path);
  const opts = { method, headers: { Accept: 'application/json', ...headers } };

  // Only send JSON content-type when we actually have a body
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const token = getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, opts);
  const ct = res.headers.get('content-type') || '';
  const isJSON = ct.includes('application/json');
  const data = isJSON ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    // If unauthorized, clear local state so guards behave correctly
    if (res.status === 401 || res.status === 403) {
      clearToken();
      clearUserId();
    }
    const msg =
      (isJSON && (data?.error || data?.message)) ||
      res.statusText ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ==== Small DOM helpers ====
function setText(el, txt) { if (el) el.textContent = txt; }
function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }

// Render a simple service card (unstyled structure; move styles to CSS if preferred)
function serviceCard(svc) {
  const div = document.createElement('div');
  div.className = 'service-card';
  div.innerHTML = `
    <h3>${svc.title ?? ''}</h3>
    <p>${svc.description ?? ''}</p>
    <div class="service-meta">
      <span class="price"><strong>$${Number(svc.price || 0).toFixed(2)}</strong></span>
      <span class="by">by ${svc.user?.username ?? ('User ' + (svc.userId ?? ''))}</span>
    </div>
  `;
  return div;
}

// ==== Login page wiring (index.html) ====
async function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return; // not on login page
  const msg = document.getElementById('loginMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, '');

    const email = document.getElementById('loginEmail')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;

    if (!email || !password) { show(msg); setText(msg, 'Email and password required'); return; }

    try {
      // Your backend route is /api/users/login; we pass 'users/login'
      const out = await apiFetch('users/login', { method: 'POST', body: { email, password } });

      // Adjust to your real response shape if needed:
      const token = out?.token || out?.data?.token;
      const userId = String(out?.user?.id ?? out?.data?.user?.id ?? '');

      if (!token || !userId) {
        show(msg); setText(msg, 'Login succeeded but token or userId is missing.');
        return;
      }

      setToken(token);
      setUserId(userId);
      localStorage.setItem('cc_me', JSON.stringify(out.user || out.data?.user || {}));

      const params = new URLSearchParams(location.search);
      const from = params.get('from');
      location.replace(from || 'profile.html');
    } catch (err) {
      show(msg); setText(msg, err.message || 'Login failed');
    }
  });
}

// ==== Registration page wiring (register.html) ====
async function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  const msg = document.getElementById('registerMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, '');

    const username = document.getElementById('regUsername')?.value?.trim();
    const email = document.getElementById('regEmail')?.value?.trim();
    const password = document.getElementById('regPassword')?.value;
    const description = document.getElementById('regDescription')?.value ?? '';

    if (!username || !email || !password) {
      show(msg); setText(msg, 'Username, email, and password are required');
      return;
    }

    try {
      const out = await apiFetch('users/register', {
        method: 'POST',
        body: { username, email, password, description }
      });

      const token = out?.token || out?.data?.token;
      const userId = String(out?.user?.id ?? out?.data?.user?.id ?? '');

      if (!token || !userId) {
        show(msg); setText(msg, 'Registration succeeded but token or userId is missing.');
        return;
      }

      setToken(token);
      setUserId(userId);
      localStorage.setItem('cc_me', JSON.stringify(out.user || out.data?.user || {}));

      const params = new URLSearchParams(location.search);
      const from = params.get('from');
      location.replace(from || 'profile.html');
    } catch (err) {
      show(msg); setText(msg, err.message || 'Registration failed');
    }
  });
}

// ==== Header bits (optional greeting & logout button) ====
async function initHeaderAuthBits() {
  const meName = document.getElementById('meName');
  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearToken();
      clearUserId();
      localStorage.removeItem('cc_me');
      location.replace('index.html');
    });
  }

  if (!getToken()) { if (meName) setText(meName, 'Guest'); return; }

  try {
    const me = await apiFetch('users/me');
    localStorage.setItem('cc_me', JSON.stringify(me.user || {}));
    if (meName) setText(meName, me.user?.username ?? 'You');
  } catch {
    clearToken(); clearUserId();
    localStorage.removeItem('cc_me');
    if (meName) setText(meName, 'Guest');
  }
}

// ==== Services list (public or protected depending on backend) ====
async function initServicesList() {
  const list = document.getElementById('servicesList');
  if (!list) return;

  try {
    const data = await apiFetch('services');
    const services = data?.services || (Array.isArray(data) ? data : []);
    list.innerHTML = '';
    services.forEach((s) => list.appendChild(serviceCard(s)));
  } catch (err) {
    list.innerHTML = `<p class="error">${err.message || 'Failed to load services'}</p>`;
  }
}

// ==== Create service (requires auth) ====
async function initCreateService() {
  const form = document.getElementById('serviceCreateForm');
  const msg = document.getElementById('serviceCreateMessage');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, '');

    if (!isLoggedIn()) {
      show(msg); setText(msg, 'Please log in first.');
      return;
    }

    const title = document.getElementById('svcTitle')?.value?.trim();
    const description = document.getElementById('svcDescription')?.value?.trim();
    const price = Number(document.getElementById('svcPrice')?.value || 0);

    if (!title || !description) {
      show(msg); setText(msg, 'Title and description are required.');
      return;
    }

    try {
      await apiFetch('services', {
        method: 'POST',
        body: { title, description, price }
      });
      await initServicesList(); // refresh if list visible
      form.reset();
      show(msg); setText(msg, 'Service created!');
    } catch (err) {
      show(msg); setText(msg, err.message || 'Failed to create service');
    }
  });
}

// ==== Boot per page ====
document.addEventListener('DOMContentLoaded', async () => {
  await initHeaderAuthBits();
  await initLoginPage();
  await initRegisterPage();
  await initServicesList();
  await initCreateService();
});
