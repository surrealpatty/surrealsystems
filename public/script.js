/* ============================================================================ 
  CodeCrowds – shared client helpers (improved)
============================================================================= */

/* =============================== Auth keys =============================== */
const TOKEN_KEY = "token";
const USER_ID_KEY = "userId";

/* =============================== Theme keys ============================== */
/* Single global theme key used on all pages (profile, services, messages, home) */
const THEME_KEY = "codecrowds-theme";

/* ---------- Theme helpers ---------- */
function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Apply theme to the document:
 * - set data-theme on <html> for CSS variables
 * - set body.profile-light / body.profile-dark for page backgrounds
 */
function applyTheme(theme) {
  const root = document.documentElement;
  const body = document.body;

  if (theme === "light" || theme === "dark") {
    root.setAttribute("data-theme", theme);
  } else {
    root.removeAttribute("data-theme");
  }

  if (body) {
    body.classList.toggle("profile-light", theme === "light");
    // if not light (dark or anything else), treat as dark
    body.classList.toggle("profile-dark", theme !== "light");
  }
}

function setTheme(theme) {
  try {
    if (theme === "light" || theme === "dark") {
      localStorage.setItem(THEME_KEY, theme);
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  } catch {
    // ignore
  }
  applyTheme(theme);
}

/* 👉 LIGHT IS THE DEFAULT NOW */
function initThemeFromPreference() {
  let theme = getTheme();

  // If no saved theme or an invalid value, default to light
  if (theme !== "light" && theme !== "dark") {
    theme = "light";
  }

  applyTheme(theme);
}

/**
 * Initialize the toggle on pages that have a #themeToggle switch (e.g. profile.html).
 * The toggle semantics:
 *  - checked  = light mode
 *  - unchecked = dark mode
 */
function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;

  let theme = getTheme();
  if (theme !== "light" && theme !== "dark") {
    theme = "light";
  }

  // checked == light
  toggle.checked = theme === "light";

  toggle.addEventListener("change", () => {
    const newTheme = toggle.checked ? "light" : "dark";
    setTheme(newTheme);
  });
}

/* ---------- Auth helpers ---------- */
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

// ✅ We’re cookie-based now, so just check for a userId
function isLoggedIn() {
  return !!getUserId();
}

/* ============================ API base + URLs ============================ */
/** Prefer explicit window.API_URL; otherwise default to current origin + /api */
const API_BASE = (() => {
  try {
    if (typeof window !== "undefined" && window.API_URL)
      return String(window.API_URL).replace(/\/+$/, "");
  } catch {}
  try {
    if (typeof window !== "undefined" && window.API_BASE)
      return String(window.API_BASE).replace(/\/+$/, "");
  } catch {}
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
  if (!form) return; // not on this page

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const msg = document.getElementById("loginMessage");

  // Show/hide password toggle
  if (passwordInput && togglePassword) {
    togglePassword.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePassword.textContent = isHidden ? "Hide" : "Show";
      togglePassword.setAttribute("aria-pressed", String(isHidden));
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (msg) {
      hide(msg);
      setText(msg, "");
    }

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value || "";

    if (!email || !password) {
      if (msg) {
        show(msg);
        setText(msg, "Email and password required");
      } else {
        alert("Email and password required");
      }
      return;
    }

    try {
      const out = await apiFetch("users/login", {
        method: "POST",
        body: { email, password },
        timeoutMs: 10000,
        withCredentials: true,
      });

      // Because apiFetch unwraps .data, `out` is usually { user: {...} }
      const user = out?.user || out || {};
      const token = out?.token; // probably undefined, cookie is main auth
      const userId = String(user?.id || "");

      if (userId) {
        if (token) setToken(token); // optional, if backend ever sends it
        setUserId(userId);
        try {
          localStorage.setItem("cc_me", JSON.stringify(user));
          const dn = getDisplayName(user);
          if (dn) localStorage.setItem("username", dn);
          if (user.email) localStorage.setItem("email", user.email);
        } catch {}
      }

      // Redirect to profile page (cookie session is active)
      location.replace("profile.html");
    } catch (err) {
      if (msg) {
        show(msg);
        const status = err && err.status ? err.status : null;
        if (status === 401 || status === 403) {
          setText(msg, "Login failed: invalid credentials or access denied.");
        } else if (status === 405) {
          setText(
            msg,
            "Login failed: server returned 'Method Not Allowed' (405). " +
              "Check the API URL, server routing, and allowed methods."
          );
        } else {
          setText(msg, err && err.message ? err.message : "Login failed");
        }
      } else {
        alert(err && err.message ? err.message : "Login failed");
      }
    }
  });
}

/* =======================================================================
   Top-right user chip: show DISPLAY NAME on all pages
======================================================================= */

// Read current user; always try /users/me for the freshest display name.
// Fall back to whatever we have in localStorage if the request fails.
async function ccGetCurrentUser() {
  // 1) Read what we already have (fallback)
  let me = null;
  try {
    const raw = localStorage.getItem("cc_me");
    if (raw) me = JSON.parse(raw);
  } catch {
    me = null;
  }

  let id =
    (me && (me.id ?? me.userId)) || localStorage.getItem("userId") || null;
  let username =
    (me && (me.username || me.name || me.displayName)) ||
    localStorage.getItem("username") ||
    "";
  let email = (me && me.email) || localStorage.getItem("email") || "";

  const fallback = { id, username, email };

  // 2) Try to hit /users/me for fresh data
  const baseUrl =
    (typeof window !== "undefined" && window.API_URL) || API_BASE || "";

  try {
    const res = await fetch(baseUrl.replace(/\/+$/, "") + "/users/me", {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return fallback;
    }

    const data = await res.json();
    const u =
      (data && data.user) || (data && data.data && data.data.user) || data;
    if (!u) return fallback;

    const uname =
      u.username ||
      u.name ||
      u.displayName ||
      (u.email ? u.email.split("@")[0] : "User");
    const uemail = u.email || "";

    // Persist for next time
    try {
      if (u.id != null) localStorage.setItem("userId", String(u.id));
      localStorage.setItem("username", uname);
      localStorage.setItem("email", uemail);
      localStorage.setItem("cc_me", JSON.stringify(u));
    } catch {
      // ignore storage errors
    }

    return { id: u.id, username: uname, email: uemail };
  } catch (e) {
    console.warn("[nav] failed to fetch /users/me", e);
    return fallback;
  }
}

// Update the pill in the header on all pages
async function ccInitTopUserChip() {
  const avatarEl =
    document.getElementById("topUserAvatar") ||
    document.querySelector(".top-user-avatar");

  const labelEl =
    document.getElementById("topUserEmail") ||
    document.getElementById("topUserLabel") ||
    document.getElementById("topUserName") || // ✅ support this ID too
    document.querySelector(".top-user-label");

  // If there is no top-right chip on this page, do nothing
  if (!avatarEl && !labelEl) return;

  // 1) Prefer the DISPLAY NAME that is already on the profile card (if filled)
  let domDisplayName = "";
  const profileNameEl = document.getElementById("profileName");
  if (profileNameEl && profileNameEl.textContent) {
    const txt = profileNameEl.textContent.trim();
    if (txt && txt !== "New developer") {
      domDisplayName = txt;
    }
  }

  // 2) Get the freshest user object (tries /users/me)
  const user = await ccGetCurrentUser();

  // 3) Decide what to show
  const displayName =
    domDisplayName ||
    (user && user.username) ||
    (user && user.email ? user.email.split("@")[0] : "") ||
    "User";

  if (labelEl) {
    labelEl.textContent = displayName;
    // keep full email as tooltip if we have it
    if (user && user.email) {
      labelEl.title = user.email;
    }
  }

  if (avatarEl && displayName) {
    avatarEl.textContent = displayName.trim()[0].toUpperCase();
  }

  // 4) Make the whole pill act as "Back to profile" button on all pages
  // First try a specific #topUser id, then fall back to the nearest .top-user-pill
  const chipEl =
    document.getElementById("topUser") ||
    (avatarEl && avatarEl.closest(".top-user-pill")) ||
    (labelEl && labelEl.closest(".top-user-pill"));

  if (chipEl && !chipEl.dataset.ccProfileNavBound) {
    chipEl.addEventListener("click", () => {
      window.location.href = "profile.html";
    });
    chipEl.dataset.ccProfileNavBound = "1";
  }

  // 5) EXTRA SAFETY:
  // Also bind click to *all* .top-user-pill elements on the page,
  // in case the markup is slightly different on some pages.
  document.querySelectorAll(".top-user-pill").forEach((pill) => {
    if (!pill.dataset.ccProfileNavBound) {
      pill.addEventListener("click", () => {
        window.location.href = "profile.html";
      });
      pill.dataset.ccProfileNavBound = "1";
    }
  });
}

/* ================================ Boot ================================== */

/* Apply theme ASAP (before DOMContentLoaded) to reduce flash */
initThemeFromPreference();

document.addEventListener("DOMContentLoaded", () => {
  // Wire up toggle if present on this page (profile page)
  initThemeToggle();

  // Hide action rail by default if user not logged in (extra safety for public pages)
  try {
    if (!isLoggedIn()) {
      document
        .querySelectorAll(".action-rail, .mobile-button-row")
        .forEach((el) => el && el.classList.add("hidden"));
    } else {
      document.body.classList.add("logged-in");
    }
  } catch (e) {
    /* ignore */
  }

  initLoginPage();

  // Top-right chip
  ccInitTopUserChip();
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

  window.getTheme = getTheme;
  window.setTheme = setTheme;
} catch {}
