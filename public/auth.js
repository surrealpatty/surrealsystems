// --- auth.js ---
// Tiny shared auth helper for all pages

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

function getUserId() {
  try { return localStorage.getItem('userId') || ''; } catch { return ''; }
}

// Be permissive: treat any non-empty string as “logged in”
// (the server does real verification via JWT)
function isLoggedIn() {
  const t = getToken();
  return !!t && t.length > 10;
}

/** Redirect to login if not authenticated */
function requireAuth(redirectTo = 'login.html') {
  if (!isLoggedIn() || !getUserId()) {
    const from = encodeURIComponent(location.pathname + location.search);
    location.replace(`${redirectTo}?from=${from}`);
  }
}

/** Clear token & userId and go to login */
function logout(redirectTo = 'login.html') {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  } catch {}
  location.replace(redirectTo);
}

/** Compute API base: local uses /api; Render uses full https URL */
function getApiBase() {
  // Replace with your actual Render backend host:
  const renderApi = 'https://<your-api-service>.onrender.com/api';
  return location.hostname.endsWith('onrender.com') ? renderApi : '/api';
}

window.getToken = getToken;
window.getUserId = getUserId;
window.isLoggedIn = isLoggedIn;
window.requireAuth = requireAuth;
window.logout = logout;
window.getApiBase = getApiBase;
