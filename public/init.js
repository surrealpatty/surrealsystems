// public/init.js
// Small initialization moved out of index.html to avoid CSP issues.
// Sets the API URL used by script.js and updates the page year.

(function () {
  try {
    // Priority order:
    // 1) <meta name="api-url" content="https://api.example.com/api"> (recommended)
    // 2) window.__API_URL__ (injected by host or build)
    // 3) fallback to same-origin: window.location.origin + '/api'
    // Normalize to remove trailing slash.

    function normalize(url) {
      if (!url) return url;
      return String(url).replace(/\/+$/, '');
    }

    let api = null;

    try {
      const meta = document.querySelector('meta[name="api-url"]');
      if (meta && meta.content && meta.content.trim()) {
        api = normalize(meta.content.trim());
      }
    } catch (e) { /* ignore */ }

    if (!api) {
      try {
        if (typeof window.__API_URL__ !== 'undefined' && window.__API_URL__) {
          api = normalize(window.__API_URL__);
        }
      } catch (e) { /* ignore */ }
    }

    if (!api) {
      try {
        // Default to same origin; this works when the frontend and API are served
        // from the same host (e.g., static pages served by Express).
        api = (window.location.origin || '').replace(/\/$/, '') + '/api';
      } catch (e) {
        // final fallback to relative '/api'
        api = '/api';
      }
    }

    // Expose to other scripts
    window.API_URL = api;
    // Optional: quick debug print (remove in production if you prefer)
    try { console.info('Init: API_URL =', window.API_URL); } catch (e) { /* ignore */ }
  } catch (e) {
    // ignore initialization errors
  }

  try {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  } catch (e) {
    // ignore
  }
})();
