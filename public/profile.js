// public/projects.js
console.log("[projects] loaded projects.js v1 (auth + /api/projects + render)");

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeProjects(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.projects)) return payload.projects;
  if (payload && payload.data && Array.isArray(payload.data.projects)) return payload.data.projects;
  if (payload && Array.isArray(payload.rows)) return payload.rows;
  if (payload && payload.data && Array.isArray(payload.data.rows)) return payload.data.rows;
  return [];
}

function renderProjects(list) {
  const statusEl = document.getElementById("projectsStatus");
  const listEl = document.getElementById("projectsList");
  if (!statusEl || !listEl) return;

  listEl.innerHTML = "";

  if (!list.length) {
    statusEl.textContent = "No projects found.";
    statusEl.classList.remove("is-hidden");
    return;
  }

  statusEl.classList.add("is-hidden");

  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "project-card";

    const title = document.createElement("h3");
    title.className = "project-title";
    title.textContent = p.title || "Untitled project";

    const desc = document.createElement("p");
    desc.className = "project-meta";
    desc.textContent = p.description || "";

    const needs = document.createElement("p");
    needs.className = "project-meta";
    needs.textContent = p.needs ? `Needs: ${p.needs}` : "";

    const eq = p.equityPercentage ?? p.equity ?? "";
    const equity = document.createElement("p");
    equity.className = "project-meta";
    equity.textContent = eq !== "" ? `Equity: ${eq}%` : "Equity: —";

    card.appendChild(title);
    if (desc.textContent) card.appendChild(desc);
    if (needs.textContent) card.appendChild(needs);
    card.appendChild(equity);

    listEl.appendChild(card);
  });
}

async function loadProjects() {
  const statusEl = document.getElementById("projectsStatus");
  const listEl = document.getElementById("projectsList");

  if (!statusEl || !listEl) {
    console.error("[projects] Missing #projectsStatus or #projectsList in projects.html");
    return;
  }

  statusEl.textContent = "Loading projects…";
  statusEl.classList.remove("is-hidden");
  listEl.innerHTML = "";

  const baseUrl = window.API_URL || "";

  const token =
    safeGet("token") ||
    safeGet("authToken") ||
    safeGet("jwt") ||
    safeGet("accessToken") ||
    "";

  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = "Bearer " + token;

  try {
    // ✅ IMPORTANT: this matches your profile.js backend route usage (/api/projects)
    const res = await fetch(baseUrl + "/api/projects?limit=50&sort=newest", {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      statusEl.textContent = `Failed to load projects (status ${res.status}).`;
      console.warn("[projects] /api/projects failed", res.status);
      return;
    }

    const payload = await res.json();
    let projects = normalizeProjects(payload);

    // Apply UI filters/sort
    const searchInput = document.getElementById("projectSearch");
    const sortSelect = document.getElementById("projectSort");

    const q = (searchInput?.value || "").trim().toLowerCase();
    if (q) {
      projects = projects.filter((p) => {
        const t = String(p.title || "").toLowerCase();
        const d = String(p.description || "").toLowerCase();
        const n = String(p.needs || "").toLowerCase();
        return t.includes(q) || d.includes(q) || n.includes(q);
      });
    }

    const sort = sortSelect?.value || "newest";
    const getDate = (p) => new Date(p.createdAt || p.created_at || 0).getTime() || 0;
    const getEquity = (p) => Number(p.equityPercentage ?? p.equity ?? 0) || 0;

    if (sort === "oldest") projects.sort((a, b) => getDate(a) - getDate(b));
    else if (sort === "equityHigh") projects.sort((a, b) => getEquity(b) - getEquity(a));
    else if (sort === "equityLow") projects.sort((a, b) => getEquity(a) - getEquity(b));
    else projects.sort((a, b) => getDate(b) - getDate(a)); // newest

    renderProjects(projects);
  } catch (err) {
    console.error("[projects] loadProjects error", err);
    statusEl.textContent = "Could not load projects right now. Please try again.";
    statusEl.classList.remove("is-hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refreshProjectsBtn");
  const searchInput = document.getElementById("projectSearch");
  const sortSelect = document.getElementById("projectSort");

  // Top chip label (nice-to-have)
  const topUserEmail = document.getElementById("topUserEmail");
  const topUserAvatar = document.getElementById("topUserAvatar");
  const token =
    safeGet("token") ||
    safeGet("authToken") ||
    safeGet("jwt") ||
    safeGet("accessToken") ||
    "";
  const payload = decodeJwt(token);
  const name = (safeGet("username") || payload?.username || payload?.email || "User").toString();
  if (topUserEmail) topUserEmail.textContent = name;
  if (topUserAvatar) topUserAvatar.textContent = name.trim()[0]?.toUpperCase() || "U";

  if (refreshBtn) refreshBtn.addEventListener("click", loadProjects);
  if (searchInput) searchInput.addEventListener("input", loadProjects);
  if (sortSelect) sortSelect.addEventListener("change", loadProjects);

  loadProjects();
});
