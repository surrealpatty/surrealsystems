// public/init.js
(function () {
  "use strict";

  function normalize(url) {
    if (!url) return url;
    try {
      return String(url).replace(/\/+$/, "");
    } catch (e) {
      return url;
    }
  }

  let api = null;

  // 1) explicit build-time injection (optional)
  try {
    if (typeof window.__API_URL__ !== "undefined" && window.__API_URL__) {
      api = normalize(window.__API_URL__);
    }
  } catch (e) {}

  // 2) meta tag <meta name="api-url" content="..."> (optional)
  try {
    if (!api) {
      const meta = document.querySelector('meta[name="api-url"]');
      if (meta && meta.content) api = normalize(meta.content);
    }
  } catch (e) {}

  // 3) existing globals (page-level config)
  try {
    if (!api && typeof window.API_URL !== "undefined" && window.API_URL)
      api = normalize(window.API_URL);
    if (!api && typeof window.API_BASE !== "undefined" && window.API_BASE)
      api = normalize(window.API_BASE);
  } catch (e) {}

  // 4) fallback to same-origin + /api
  if (!api) {
    try {
      const origin =
        window.location && window.location.origin
          ? window.location.origin.replace(/\/$/, "")
          : "";
      api = origin ? origin + "/api" : "/api";
    } catch (e) {
      api = "/api";
    }
  }

  // Do not overwrite existing globals if they were explicitly set earlier by the page.
  if (!window.API_BASE) window.API_BASE = api;
  if (!window.API_URL) window.API_URL = api;

  try {
    console.info("Init: API_URL =", window.API_URL);
  } catch (e) {}

  // Also set the copyright year if there's an element with id="year"
  try {
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  } catch (e) {}
})();
