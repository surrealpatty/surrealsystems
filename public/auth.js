// --- auth.js ---
function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function isLoggedIn() {
  const t = getToken();
  // naive JWT check: 3 dot-separated parts
  return Boolean(t && t.split('.').length === 3);
}

/** Redirect to login if not authenticated */
function requireAuth(redirectTo = 'login.html') {
  if (!isLoggedIn()) {
    // remember where they tried to go
    const from = encodeURIComponent(location.pathname + location.search);
    location.replace(`${redirectTo}?from=${from}`);
  }
}

/** Clear token and go to login */
function logout(redirectTo = 'login.html') {
  try { localStorage.removeItem('token'); } catch {}
  location.replace(redirectTo);
}

// Expose globally
window.getToken = getToken;
window.isLoggedIn = isLoggedIn;
window.requireAuth = requireAuth;
window.logout = logout;
