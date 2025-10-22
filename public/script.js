// ======== CONFIG ========
// If your backend routes are /api/users/* set API_BASE = '/api'.
// If your backend routes are /users/* leave API_BASE = ''.
const API_BASE = ''; // change to '/api' if needed

// ======== HELPERS ========
function qs(id) { return document.getElementById(id); }

function showMessage(id, text, isSuccess = false) {
  const el = qs(id);
  if (!el) return;
  el.textContent = text || '';
  el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

async function safeFetch(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      // Try to parse JSON; if not, wrap the text
      try { data = JSON.parse(text); } catch { data = { message: text }; }
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || 'Server error');
    }
    return data;
  } catch (err) {
    throw new Error(err.message || 'Network error');
  }
}

// Turn "from" query param into a safe path (defaults to profile.html)
function getPostLoginRedirect() {
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('from') || 'profile.html';
  // normalize: ensure leading slash for site pages
  if (raw.startsWith('http')) return '/profile.html'; // prevent open redirects
  return raw.startsWith('/') ? raw : `/${raw}`;
}

// ======== LOGIN ========
const loginForm = qs('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = qs('loginEmail').value.trim();
    const password = qs('loginPassword').value.trim();

    if (!email || !password) {
      showMessage('loginMessage', 'Email and password are required');
      return;
    }

    showMessage('loginMessage', 'Logging in…', true);

    try {
      const data = await safeFetch(`${API_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      // Persist auth
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username || '');
      localStorage.setItem('description', data.user.description || '');

      showMessage('loginMessage', 'Login successful! Redirecting…', true);

      // Respect ?from=/services.html (your original flow), else go to profile
      const dest = getPostLoginRedirect();
      setTimeout(() => { window.location.href = dest; }, 400);
    } catch (err) {
      showMessage('loginMessage', err.message || 'Login failed');
    }
  });
}

// ======== GLOBAL GUARD EXAMPLES (optional usage on other pages) ========
// If you use this script on other pages, you can call these helpers:
//
// function requireAuthOrRedirect() {
//   if (!localStorage.getItem('token') || !localStorage.getItem('userId')) {
//     // ALWAYS redirect to root (index.html) now that login.html is gone
//     const here = window.location.pathname;
//     // send the user back here after login
//     window.location.href = `/?from=${encodeURIComponent(here)}`;
//   }
// }
//
// function authHeaders() {
//   const token = localStorage.getItem('token');
//   return token ? { 'Authorization': `Bearer ${token}` } : {};
// }
