// --- auth.js ---
// tiny shared auth helper for all pages

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}
function getUserId() {
  try { return localStorage.getItem('userId') || ''; } catch { return ''; }
}

// permissive check; server will truly verify JWT
function isLoggedIn() {
  const t = getToken();
  return !!t && t.length > 10;
}

/** Redirect to login (YOUR login is index.html) if not authenticated */
function requireAuth(redirectTo = 'index.html') {
  if (!isLoggedIn() || !getUserId()) {
    const from = encodeURIComponent(location.pathname + location.search);
    location.replace(`${redirectTo}?from=${from}`);
  }
}

/** Clear token & userId and go to login */
function logout(redirectTo = 'index.html') {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  } catch {}
  location.replace(redirectTo);
}

/** Compute API base: local uses /api; Render uses your API service URL */
function getApiBase() {
  // TODO: replace the host below with your actual Render API service
  const renderApi = 'https://<your-api-service>.onrender.com/api';
  return location.hostname.endsWith('onrender.com') ? renderApi : '/api';
}

window.getToken = getToken;
window.getUserId = getUserId;
window.isLoggedIn = isLoggedIn;
window.requireAuth = requireAuth;
window.logout = logout;
window.getApiBase = getApiBase;
