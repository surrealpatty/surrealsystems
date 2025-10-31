/* ============================================================================
  CodeCrowds – shared client helpers (improved)
============================================================================= */

/* =============================== Auth keys =============================== */
const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(t) {
  localStorage.setItem(TOKEN_KEY, t || "");
}
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function getUserId() {
  return localStorage.getItem(USER_ID_KEY) || "";
}
function setUserId(id) {
  localStorage.setItem(USER_ID_KEY, String(id || ""));
}
function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
}

function isLoggedIn() {
  return !!getToken() && !!getUserId();
}

/* ============================ API base + URLs ============================ */
/** Prefer explicit window.API_URL; otherwise default to current origin + /api */
const API_BASE = (() => {
  try {
    if (typeof window !== "undefined" && window.API_URL)
      return String(window.API_URL).replace(/\/+$/, "");
  } catch {}
  // If window.API_BASE or window.API_URL are set to '/api' by the page, we still want
  // to treat them as relative roots. So normalize '/api' -> '/api' (no trailing slash)
  try {
    if (typeof window !== "undefined" && window.API_BASE)
      return String(window.API_BASE).replace(/\/+$/, "");
  } catch {}
  // Default to origin + '/api'
  try {
    return window.location.origin.replace(/\/$/, "") + "/api";
  } catch {
    return "/api";
  }
})();

/** Build safe API URL from a path or absolute URL */
function apiUrl(path) {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  if (path.startsWith("/api")) return API_BASE + path.replace(/^\/api/, "");
  if (path.startsWith("/")) return API_BASE + path;
  return API_BASE + "/" + path.replace(/^\/+/, "");
}

/* ============================== JSON unwrap ============================== */
function unwrap(json) {
  return json &&
    typeof json === "object" &&
    Object.prototype.hasOwnProperty.call(json, "data")
    ? json.data
    : json;
}

/* ============================== fetch helpers ============================ */
async function apiFetch(path, options = {}) {
  const {
    method = "GET",
    headers = {},
    body,
    signal,
    timeoutMs,
    withCredentials = false,
  } = options;

  const url = apiUrl(path);

  const hdrs = { Accept: "application/json", ...headers };
  if (body !== undefined && !hdrs["Content-Type"])
    hdrs["Content-Type"] = "application/json";

  const token = getToken();
  if (token && !hdrs["Authorization"])
    hdrs["Authorization"] = `Bearer ${token}`;

  const init = {
    method,
    headers: hdrs,
    body:
      body === undefined || typeof body === "string"
        ? body
        : JSON.stringify(body),
    signal,
    credentials: withCredentials ? "include" : "same-origin",
  };

  // Timeout support
  let timeoutCtrl;
  let finalSignal = signal;
  if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
    timeoutCtrl = new AbortController();
    const timeoutId = setTimeout(() => timeoutCtrl.abort(), timeoutMs);

    if (signal) {
      const chained = new AbortController();
      const onExternalAbort = () => chained.abort();
      signal.addEventListener("abort", onExternalAbort, { once: true });
      timeoutCtrl.signal.addEventListener("abort", () => chained.abort(), {
        once: true,
      });
      finalSignal = chained.signal;

      init.signal = finalSignal;
      try {
        const res = await fetch(url, { ...init, signal: finalSignal });
        clearTimeout(timeoutId);
        return await handleResponse(res);
      } catch (e) {
        clearTimeout(timeoutId);
        throw normalizeFetchError(e);
      }
    } else {
      init.signal = timeoutCtrl.signal;
      try {
        const res = await fetch(url, init);
        clearTimeout(timeoutId);
        return await handleResponse(res);
      } catch (e) {
        clearTimeout(timeoutId);
        throw normalizeFetchError(e);
      }
    }
  } else {
    try {
      const res = await fetch(url, init);
      return await handleResponse(res);
    } catch (e) {
      throw normalizeFetchError(e);
    }
  }

  async function handleResponse(res) {
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const isJSON = ct.includes("application/json") || ct.includes("+json");

    let payload;
    if (isJSON) {
      try {
        payload = await res.json();
      } catch {
        payload = {};
      }
    } else {
      try {
        payload = await res.text();
      } catch {
        payload = "";
      }
    }

    if (!res.ok) {
      const msg = isJSON
        ? payload?.error?.message ||
          payload?.error ||
          payload?.message ||
          res.statusText
        : String(payload) || res.statusText || `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) {
        clearToken();
        clearUserId();
      }
      const err = new Error(msg || "Request failed");
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return isJSON ? unwrap(payload) : payload;
  }

  function normalizeFetchError(e) {
    if (e?.name === "AbortError") return new Error("Request aborted");
    return e instanceof Error ? e : new Error(String(e || "Network error"));
  }
}

/* ============================== DOM helpers ============================== */
function setText(el, txt) {
  if (el) el.textContent = txt;
}
function show(el) {
  if (el) el.style.display = "";
}
function hide(el) {
  if (el) el.style.display = "none";
}

/* ============================ Display helpers ============================== */
function getDisplayName(u = {}) {
  return (
    u.username ||
    u.name ||
    u.displayName ||
    (u.email ? u.email.split("@")[0] : "") ||
    ""
  );
}
function getDescription(u = {}) {
  return u.description || u.bio || u.about || "";
}

/* ============================== Login wiring ============================= */
function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const msg = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(msg);
    setText(msg, "");

    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("loginPassword")?.value;
    if (!email || !password) {
      show(msg);
      setText(msg, "Email and password required");
      return;
    }

    try {
      const out = await apiFetch("users/login", {
        method: "POST",
        body: { email, password },
        timeoutMs: 10000,
      });

      const token = out?.token;
      const user = out?.user || {};
      const userId = String(user?.id || "");

      if (!token || !userId) {
        show(msg);
        setText(msg, "Login succeeded but token/userId missing.");
        return;
      }

      setToken(token);
      setUserId(userId);

      try {
        localStorage.setItem("cc_me", JSON.stringify(user));
        const dn = getDisplayName(user);
        if (dn) localStorage.setItem("username", dn);
      } catch {}

      location.replace("profile.html");
    } catch (err) {
      show(msg);
      setText(msg, err.message || "Login failed");
    }
  });
}

/* ================================ Boot ================================== */
document.addEventListener("DOMContentLoaded", () => {
  initLoginPage();
});

/* ============================== Expose API ============================== */
try {
  window.getToken = getToken;
  window.setToken = setToken;
  window.clearToken = clearToken;
  window.getUserId = getUserId;
  window.setUserId = setUserId;
  window.clearUserId = clearUserId;
  window.isLoggedIn = isLoggedIn;

  window.API_BASE = API_BASE;
  window.apiUrl = apiUrl;
  window.apiFetch = apiFetch;

  window.setText = setText;
  window.show = show;
  window.hide = hide;

  window.getDisplayName = getDisplayName;
  window.getDescription = getDescription;
} catch {}
