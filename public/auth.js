// --- auth.js ---
// tiny shared auth helper for all pages

function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}
function getUserId() {
  try {
    return localStorage.getItem("userId") || "";
  } catch {
    return "";
  }
}

// permissive check; server will truly verify JWT
function isLoggedIn() {
  const t = getToken();
  return !!t && t.length > 10;
}

/** Redirect to login (YOUR login is index.html) if not authenticated */
function requireAuth(redirectTo = "index.html") {
  if (!isLoggedIn() || !getUserId()) {
    const from = encodeURIComponent(location.pathname + location.search);
    location.replace(`${redirectTo}?from=${from}`);
  }
}

/** Clear token & userId and go to login */
function logout(redirectTo = "index.html") {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
  } catch {}
  location.replace(redirectTo);
}

/** Compute API base: prefer explicit window.API_URL / window.API_BASE,
 *  otherwise: if served from Render use https://<host>/api,
 *  otherwise use the relative /api */
function getApiBase() {
  // 1) explicit global override (most reliable)
  try {
    if (window && window.API_URL)
      return String(window.API_URL).replace(/\/+$/, "");
    if (window && window.API_BASE)
      return String(window.API_BASE).replace(/\/+$/, "");
  } catch {}

  // 2) If we're on Render / onrender.com (or render.com), assume API mounted at same host
  try {
    const hostname =
      location && location.hostname ? String(location.hostname) : "";
    if (
      hostname.endsWith(".onrender.com") ||
      hostname.endsWith(".render.com")
    ) {
      // Use https and point to same host + /api. If your API is on a different render service,
      // set window.API_URL explicitly in your page (recommended).
      return `https://${hostname}/api`;
    }
  } catch {}

  // 3) Default to relative path for local dev or when nothing else is specified
  return "/api";
}

// Expose helpers globally
window.getToken = getToken;
window.getUserId = getUserId;
window.isLoggedIn = isLoggedIn;
window.requireAuth = requireAuth;
window.logout = logout;
window.getApiBase = getApiBase;
