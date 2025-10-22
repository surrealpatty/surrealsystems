// public/script.js

// === Tiny auth store ===
const TOKEN_KEY = "cc_jwt";
const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// === Fetch helper that auto-attaches JWT ===
async function apiFetch(path, { method = "GET", headers = {}, body } = {}) {
  const opts = { method, headers: { "Content-Type": "application/json", ...headers } };
  const token = getToken();
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) opts.body = typeof body === "string" ? body : JSON.stringify(body);

  const res = await fetch(path, opts);
  const isJSON = res.headers.get("content-type")?.includes("application/json");
  const data = isJSON ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const msg = (isJSON && data?.error) ? data.error : res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data;
}

// === UI helpers ===
function setText(el, txt) { if (el) el.textContent = txt; }
function show(el) { if (el) el.style.display = ""; }
function hide(el) { if (el) el.style.display = "none"; }

// Render a simple service card
function serviceCard(svc) {
  const div = document.createElement("div");
  div.className = "service-card";
  div.style.cssText = "border:1px solid #ddd;border-radius:10px;padding:16px;margin:10px 0;background:#fff;";
  div.innerHTML = `
    <h3 style="margin:0 0 8px 0">${svc.title}</h3>
    <p style="margin:0 0 8px 0;color:#555">${svc.description}</p>
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span><strong>$${Number(svc.price).toFixed(2)}</strong></span>
      <span style="font-size:.9rem;color:#666">by ${svc.user?.username ?? "User " + svc.userId}</span>
    </div>
  `;
  return div;
}

// === Page initializers ===
async function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  const msg = document.getElementById("loginMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, "");
    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("loginPassword")?.value;
    if (!email || !password) { show(msg); setText(msg, "Email and password required"); return; }

    try {
      const out = await apiFetch("/api/users/login", { method: "POST", body: { email, password } });
      setToken(out.token);
      // Optional: store user for quick header greeting
      localStorage.setItem("cc_me", JSON.stringify(out.user));
      // Redirect to your main app page (change if you want)
      location.href = "services.html";
    } catch (err) {
      show(msg); setText(msg, err.message || "Login failed");
    }
  });
}

async function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  const msg = document.getElementById("registerMessage");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, "");
    const username = document.getElementById("regUsername")?.value?.trim();
    const email = document.getElementById("regEmail")?.value?.trim();
    const password = document.getElementById("regPassword")?.value;
    const description = document.getElementById("regDescription")?.value ?? "";

    if (!username || !email || !password) {
      show(msg); setText(msg, "Username, email, and password are required");
      return;
    }

    try {
      const out = await apiFetch("/api/users/register", {
        method: "POST",
        body: { username, email, password, description }
      });
      setToken(out.token);
      localStorage.setItem("cc_me", JSON.stringify(out.user));
      location.href = "services.html";
    } catch (err) {
      show(msg); setText(msg, err.message || "Registration failed");
    }
  });
}

async function initHeaderAuthBits() {
  // Optional: show a greeting if you have a header slot
  const meName = document.getElementById("meName");
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearToken();
      localStorage.removeItem("cc_me");
      location.href = "index.html";
    });
  }

  // Try to load /me only if logged in
  if (!getToken()) { if (meName) setText(meName, "Guest"); return; }
  try {
    const me = await apiFetch("/api/users/me");
    if (meName) setText(meName, me.user?.username ?? "You");
    localStorage.setItem("cc_me", JSON.stringify(me.user));
  } catch {
    clearToken();
    localStorage.removeItem("cc_me");
    if (meName) setText(meName, "Guest");
  }
}

async function initServicesList() {
  const list = document.getElementById("servicesList");
  if (!list) return;

  try {
    const { services } = await apiFetch("/api/services");
    list.innerHTML = "";
    services.forEach(s => list.appendChild(serviceCard(s)));
  } catch (err) {
    list.innerHTML = `<p style="color:red">${err.message || "Failed to load services"}</p>`;
  }
}

async function initCreateService() {
  const form = document.getElementById("serviceCreateForm");
  const msg = document.getElementById("serviceCreateMessage");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hide(msg); setText(msg, "");

    if (!getToken()) {
      show(msg); setText(msg, "Please log in first.");
      return;
    }

    const title = document.getElementById("svcTitle")?.value?.trim();
    const description = document.getElementById("svcDescription")?.value?.trim();
    const price = document.getElementById("svcPrice")?.value;

    if (!title || !description) {
      show(msg); setText(msg, "Title and description are required.");
      return;
    }

    try {
      await apiFetch("/api/services", {
        method: "POST",
        body: { title, description, price: Number(price || 0) }
      });
      // refresh list if present
      await initServicesList();
      form.reset();
      show(msg); setText(msg, "Service created!");
    } catch (err) {
      show(msg); setText(msg, err.message || "Failed to create service");
    }
  });
}

// === Boot per page ===
document.addEventListener("DOMContentLoaded", async () => {
  await initHeaderAuthBits();
  await initLoginPage();
  await initRegisterPage();
  await initServicesList();
  await initCreateService();
});
