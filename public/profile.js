// public/profile.js
// Profile page logic: profile info + edit + create project dropdown + show & edit projects.

console.log("[profile] loaded profile.js v10 (project fields + /api fixes)");

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
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
  } catch (e) {
    console.warn("[profile] Failed to decode JWT", e);
    return null;
  }
}

function clampEquity(value) {
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value * 2) / 2; // 0.5 steps
  if (rounded < 0.5 || rounded > 99.5) return null;
  return rounded;
}

// ✅ helper: extract API error message consistently
async function readApiError(res) {
  let errJson = null;
  try {
    errJson = await res.json();
  } catch {
    errJson = null;
  }

  // supports: { error:{message} } OR { message } OR { success:false,error:{message} }
  const msg =
    (errJson && errJson.error && errJson.error.message) ||
    (errJson && errJson.message) ||
    (errJson && errJson.error && errJson.error.details && JSON.stringify(errJson.error.details)) ||
    null;

  return msg || `Request failed (status ${res.status}).`;
}

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION = "Write a short bio so clients know what you do.";

  let currentUserId = null;
  let currentUsername = "";

  const token =
    safeGet("token") ||
    safeGet("authToken") ||
    safeGet("jwt") ||
    safeGet("accessToken") ||
    "";

  const tokenPayload = decodeJwt(token) || null;

  let meUser = null;
  try {
    const raw = safeGet("cc_me");
    if (raw) meUser = JSON.parse(raw);
  } catch {
    meUser = null;
  }

  if (
    meUser &&
    tokenPayload &&
    meUser.id != null &&
    tokenPayload.id != null &&
    String(meUser.id) !== String(tokenPayload.id)
  ) {
    console.warn("[profile] cc_me user id does not match token id. Clearing stale cc_me.");
    meUser = null;
    safeSet("cc_me", "");
  }

  const storedUsername = safeGet("username") || "";
  const storedEmail = safeGet("email") || "";
  const storedDescription = safeGet("description") || "";

  const params = new URLSearchParams(window.location.search);
  const paramUsername = params.get("username") || "";
  const paramEmail = params.get("email") || "";

  const fromMeUsername =
    (meUser && (meUser.username || meUser.name || meUser.displayName || "")) || "";
  const fromMeEmail = (meUser && meUser.email) || "";
  const fromMeDescription = (meUser && meUser.description) || "";

  const fromTokenUsername =
    (tokenPayload &&
      (tokenPayload.username || tokenPayload.name || tokenPayload.displayName || "")) ||
    "";
  const fromTokenEmail = (tokenPayload && tokenPayload.email) || "";
  const fromTokenDescription = (tokenPayload && tokenPayload.description) || "";

  const username =
    fromMeUsername || fromTokenUsername || storedUsername || paramUsername || "";
  const email = fromMeEmail || fromTokenEmail || storedEmail || paramEmail || "";
  const description =
    fromMeDescription ||
    fromTokenDescription ||
    storedDescription ||
    "" ||
    DEFAULT_DESCRIPTION;

  if (username) safeSet("username", username);
  if (email) safeSet("email", email);
  if (description && description !== DEFAULT_DESCRIPTION) safeSet("description", description);

  if (!meUser) {
    const newMe = {};
    if (tokenPayload && tokenPayload.id != null) newMe.id = tokenPayload.id;
    if (username) newMe.username = username;
    if (email) newMe.email = email;
    if (description) newMe.description = description;
    if (Object.keys(newMe).length) {
      safeSet("cc_me", JSON.stringify(newMe));
      meUser = newMe;
    }
  }

  if (meUser && meUser.id != null) currentUserId = meUser.id;
  currentUsername = username || currentUsername;

  const avatarEl =
    document.getElementById("profileAvatar") || document.getElementById("topUserAvatar");
  const emailBadge =
    document.getElementById("profileEmail") || document.getElementById("topUserEmail");
  const emailMain = document.getElementById("profileEmailMain");
  const nameEl = document.getElementById("profileName");
  const descEl = document.getElementById("profileDescription");

  let displayName = username;
  if (!displayName && email) displayName = email.split("@")[0];

  if (emailMain) emailMain.textContent = email;
  if (emailBadge) emailBadge.textContent = displayName || email || "User";
  if (displayName && nameEl) nameEl.textContent = displayName;
  if (descEl) descEl.textContent = description || DEFAULT_DESCRIPTION;

  const initialSource = displayName || email || "U";
  if (avatarEl && initialSource) avatarEl.textContent = initialSource.trim()[0].toUpperCase();

  async function loadUserFromBackend() {
    const baseUrl = window.API_URL || "";
    try {
      // ✅ FIX: backend routes are /api/users/*
      const res = await fetch(baseUrl + "/api/users/me", {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        console.warn("[profile] /api/users/me returned status", res.status);
        return;
      }

      const payload = await res.json();
      const u = (payload && payload.user) || (payload && payload.data && payload.data.user);

      if (!u) {
        console.warn("[profile] /api/users/me payload has no user");
        return;
      }

      const uname =
        u.username || u.name || u.displayName || (u.email ? u.email.split("@")[0] : "User");
      const uemail = u.email || "";
      const udesc = u.description || "";

      currentUserId = u.id;
      currentUsername = uname;

      if (nameEl) nameEl.textContent = uname;
      if (emailBadge) emailBadge.textContent = uname;
      if (emailMain) emailMain.textContent = uemail;
      if (descEl) descEl.textContent = udesc || DEFAULT_DESCRIPTION;

      const source = uname || uemail || "U";
      if (avatarEl && source) avatarEl.textContent = source.trim()[0].toUpperCase();

      safeSet("userId", String(u.id));
      safeSet("username", uname);
      safeSet("email", uemail);
      safeSet("description", udesc);
      safeSet("cc_me", JSON.stringify(u));
    } catch (err) {
      console.error("[profile] Failed to load /api/users/me", err);
    }
  }

  // ---------------- Edit profile behaviour ----------------
  const profileView = document.getElementById("profileView");
  const profileEditForm = document.getElementById("profileEditForm");
  const editBtn = document.getElementById("editProfileBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editDisplayNameInput = document.getElementById("editDisplayName");
  const editEmailInput = document.getElementById("editEmail");
  const editDescriptionInput = document.getElementById("editDescription");
  const accountSettingsCard = document.getElementById("accountSettingsCard");

  function enterEditMode() {
    if (!profileView || !profileEditForm) return;

    if (editDisplayNameInput && nameEl) editDisplayNameInput.value = nameEl.textContent.trim();
    if (editEmailInput && emailMain) editEmailInput.value = emailMain.textContent.trim();
    if (editDescriptionInput && descEl) {
      const current = descEl.textContent.trim();
      editDescriptionInput.value = current === DEFAULT_DESCRIPTION ? "" : current;
    }

    profileView.classList.add("is-hidden");
    profileEditForm.classList.remove("is-hidden");

    if (accountSettingsCard) accountSettingsCard.classList.remove("is-hidden");
  }

  function exitEditMode() {
    if (!profileView || !profileEditForm) return;
    profileEditForm.classList.add("is-hidden");
    profileView.classList.remove("is-hidden");
    if (accountSettingsCard) accountSettingsCard.classList.add("is-hidden");
  }

  if (editBtn) editBtn.addEventListener("click", enterEditMode);
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", exitEditMode);

  if (profileEditForm) {
    profileEditForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!editEmailInput) return;

      const newName = editDisplayNameInput ? editDisplayNameInput.value.trim() : "";
      const newEmail = editEmailInput.value.trim();
      const newDescription = editDescriptionInput ? editDescriptionInput.value.trim() : "";

      if (!newEmail) {
        alert("Email is required.");
        editEmailInput.focus();
        return;
      }

      const usernameToStore = newName || newEmail.split("@")[0];

      if (nameEl) nameEl.textContent = newName || usernameToStore || "New developer";
      if (emailBadge) emailBadge.textContent = usernameToStore;
      if (emailMain) emailMain.textContent = newEmail;
      if (descEl) descEl.textContent = newDescription || DEFAULT_DESCRIPTION;

      if (avatarEl) {
        const source = (usernameToStore || newEmail || "U").trim();
        avatarEl.textContent = source[0].toUpperCase();
      }

      safeSet("email", newEmail);
      safeSet("username", usernameToStore);
      safeSet("description", newDescription);

      try {
        const raw = safeGet("cc_me");
        const me = raw ? JSON.parse(raw) : {};
        me.username = usernameToStore;
        me.email = newEmail;
        me.description = newDescription;
        safeSet("cc_me", JSON.stringify(me));
      } catch {
        // ignore
      }

      exitEditMode();
    });
  }

  // ---------------- Create project dropdown + submit ----------------
  const createprojectBtn = document.getElementById("createprojectBtn");
  const createprojectForm = document.getElementById("createprojectForm");
  const cancelCreateprojectBtn = document.getElementById("cancelCreateprojectBtn");

  if (createprojectBtn && createprojectForm) {
    console.log("[profile] Create project button & form found");

    const originalBtnText =
      (createprojectBtn.textContent && createprojectBtn.textContent.trim()) || "Create project";

    function showCreateForm() {
      createprojectForm.classList.remove("is-hidden");
      createprojectBtn.textContent = "Hide form";
    }

    function hideCreateForm() {
      createprojectForm.classList.add("is-hidden");
      createprojectBtn.textContent = originalBtnText;
    }

    createprojectBtn.addEventListener("click", () => {
      const isHidden = createprojectForm.classList.contains("is-hidden");
      if (isHidden) showCreateForm();
      else hideCreateForm();
    });

    if (cancelCreateprojectBtn) {
      cancelCreateprojectBtn.addEventListener("click", () => {
        hideCreateForm();
        createprojectForm.reset();
      });
    }

    createprojectForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const titleEl = document.getElementById("projectTitle");
      const descElproject = document.getElementById("projectDescription");
      const needsEl = document.getElementById("projectNeeds");
      const equityEl = document.getElementById("projectEquity");

      const title = titleEl ? titleEl.value.trim() : "";
      const descriptionproject = descElproject ? descElproject.value.trim() : "";
      const needs = needsEl ? needsEl.value.trim() : "";
      const equityRaw = equityEl ? equityEl.value.trim() : "";

      if (!title || !descriptionproject || !needs || !equityRaw) {
        alert("Please fill in all fields.");
        return;
      }

      const equityNum = clampEquity(Number(equityRaw));
      if (equityNum == null) {
        alert("Equity must be between 0.5 and 99.5 (steps of 0.5).");
        return;
      }

      try {
        if (typeof window.apiFetch === "function") {
          // ✅ if your apiFetch already prefixes /api, this is fine.
          await window.apiFetch("projects", {
            method: "POST",
            body: {
              title,
              description: descriptionproject,
              needs,
              equityPercentage: equityNum,
            },
          });
        } else {
          const baseUrl = window.API_URL || "";
          const headers = { "Content-Type": "application/json" };

          const tokenInner =
            safeGet("token") || safeGet("authToken") || safeGet("jwt") || safeGet("accessToken");
          if (tokenInner) headers.Authorization = "Bearer " + tokenInner;

          // ✅ FIX 1: must hit /api/projects
          // ✅ FIX 2: include credentials for cookie auth
          const res = await fetch(baseUrl + "/api/projects", {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({
              title,
              description: descriptionproject,
              needs,
              equityPercentage: equityNum,
            }),
          });

          if (!res.ok) {
            const msg = await readApiError(res);
            throw new Error(msg);
          }
        }

        alert("project created successfully!");
        createprojectForm.reset();
        hideCreateForm();
        loadprojectsForProfile();
      } catch (err) {
        console.error(err);
        alert(err.message || "Something went wrong creating the project.");
      }
    });
  } else {
    console.warn("[profile] Create project elements not found", {
      btn: !!createprojectBtn,
      form: !!createprojectForm,
      cancelBtn: !!cancelCreateprojectBtn,
    });
  }

  // ---------------- Helpers for editing & deleting a project ----------------
  async function updateprojectById(projectId, payload) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(`projects/${projectId}`, {
        method: "PUT",
        body: payload,
      });
    }

    const baseUrl = window.API_URL || "";
    const headers = { "Content-Type": "application/json" };

    const tokenInner =
      safeGet("token") || safeGet("authToken") || safeGet("jwt") || safeGet("accessToken");
    if (tokenInner) headers.Authorization = "Bearer " + tokenInner;

    // ✅ FIX: must hit /api/projects/:id + include credentials
    const res = await fetch(baseUrl + `/api/projects/${projectId}`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const msg = await readApiError(res);
      throw new Error(msg);
    }
  }

  async function deleteprojectById(projectId) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(`projects/${projectId}`, { method: "DELETE" });
    }

    const baseUrl = window.API_URL || "";
    const headers = {};

    const tokenInner =
      safeGet("token") || safeGet("authToken") || safeGet("jwt") || safeGet("accessToken");
    if (tokenInner) headers.Authorization = "Bearer " + tokenInner;

    // ✅ FIX: must hit /api/projects/:id + include credentials
    const res = await fetch(baseUrl + `/api/projects/${projectId}`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    if (!res.ok) {
      const msg = await readApiError(res);
      throw new Error(msg);
    }
  }

  // ✨ INLINE EDIT MODE inside the card (no browser prompt)
  function handleEditprojectFromCard(card, projectId) {
    if (card.querySelector(".project-inline-edit")) return;

    const titleEl = card.querySelector(".profile-project-title");
    const metaEls = card.querySelectorAll(".profile-project-meta");

    const descElMeta = metaEls[0];
    const needsElMeta = metaEls[1];
    const equityElMeta = metaEls[2];
    const actionsRow = card.querySelector(".profile-project-actions") || metaEls[3];

    const currentTitle = (titleEl && titleEl.textContent.trim()) || "";
    const currentDesc = (descElMeta && descElMeta.textContent.trim()) || "";
    const currentNeeds = (needsElMeta && needsElMeta.textContent.trim()) || "";
    const equityText = (equityElMeta && equityElMeta.textContent.trim()) || ""; // "Equity: 10.5%"

    const equityMatch = equityText.match(/([\d.]+)/);
    const currentEquity = equityMatch ? equityMatch[1] : "0.5";

    [titleEl, descElMeta, needsElMeta, equityElMeta, actionsRow]
      .filter(Boolean)
      .forEach((el) => el.classList.add("is-hidden"));

    const wrapper = document.createElement("div");
    wrapper.className = "project-inline-edit profile-edit";

    const rowTitle = document.createElement("div");
    rowTitle.className = "profile-edit-row";
    const labelTitle = document.createElement("label");
    labelTitle.className = "profile-edit-label";
    labelTitle.textContent = "Title";
    const inputTitle = document.createElement("input");
    inputTitle.type = "text";
    inputTitle.className = "profile-edit-input";
    inputTitle.maxLength = 100;
    inputTitle.value = currentTitle;
    rowTitle.appendChild(labelTitle);
    rowTitle.appendChild(inputTitle);

    const rowDesc = document.createElement("div");
    rowDesc.className = "profile-edit-row";
    const labelDesc = document.createElement("label");
    labelDesc.className = "profile-edit-label";
    labelDesc.textContent = "Description of the project";
    const textareaDesc = document.createElement("textarea");
    textareaDesc.className = "profile-edit-textarea";
    textareaDesc.rows = 3;
    textareaDesc.value = currentDesc;
    rowDesc.appendChild(labelDesc);
    rowDesc.appendChild(textareaDesc);

    const rowNeeds = document.createElement("div");
    rowNeeds.className = "profile-edit-row";
    const labelNeeds = document.createElement("label");
    labelNeeds.className = "profile-edit-label";
    labelNeeds.textContent = "What the project needs";
    const textareaNeeds = document.createElement("textarea");
    textareaNeeds.className = "profile-edit-textarea";
    textareaNeeds.rows = 3;
    textareaNeeds.value = currentNeeds;
    rowNeeds.appendChild(labelNeeds);
    rowNeeds.appendChild(textareaNeeds);

    const rowEquity = document.createElement("div");
    rowEquity.className = "profile-edit-row";
    const labelEquity = document.createElement("label");
    labelEquity.className = "profile-edit-label";
    labelEquity.textContent = "Equity % (0.5 to 99.5)";
    const inputEquity = document.createElement("input");
    inputEquity.type = "number";
    inputEquity.className = "profile-edit-input";
    inputEquity.min = "0.5";
    inputEquity.max = "99.5";
    inputEquity.step = "0.5";
    inputEquity.value = currentEquity;
    rowEquity.appendChild(labelEquity);
    rowEquity.appendChild(inputEquity);

    const actions = document.createElement("div");
    actions.className = "profile-edit-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "btn btn-primary btn-small";
    saveBtn.textContent = "Save";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-muted btn-small";
    cancelBtn.textContent = "Cancel";

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);

    wrapper.appendChild(rowTitle);
    wrapper.appendChild(rowDesc);
    wrapper.appendChild(rowNeeds);
    wrapper.appendChild(rowEquity);
    wrapper.appendChild(actions);

    card.appendChild(wrapper);

    async function handleSave() {
      const newTitle = inputTitle.value.trim();
      const newDesc = textareaDesc.value.trim();
      const newNeeds = textareaNeeds.value.trim();
      const equityRaw = inputEquity.value.trim();

      if (!newTitle || !newDesc || !newNeeds || !equityRaw) {
        alert("Please fill in all fields.");
        return;
      }

      const equityNum = clampEquity(Number(equityRaw));
      if (equityNum == null) {
        alert("Equity must be between 0.5 and 99.5 (steps of 0.5).");
        return;
      }

      try {
        await updateprojectById(projectId, {
          title: newTitle,
          description: newDesc,
          needs: newNeeds,
          equityPercentage: equityNum,
        });

        if (titleEl) titleEl.textContent = newTitle;
        if (descElMeta) descElMeta.textContent = newDesc;
        if (needsElMeta) needsElMeta.textContent = newNeeds;
        if (equityElMeta) equityElMeta.textContent = `Equity: ${equityNum}%`;

        wrapper.remove();
        [titleEl, descElMeta, needsElMeta, equityElMeta, actionsRow]
          .filter(Boolean)
          .forEach((el) => el.classList.remove("is-hidden"));
      } catch (err) {
        console.error("Failed to update project", err);
        alert(err.message || "Could not update project. Please try again.");
      }
    }

    function handleCancel() {
      wrapper.remove();
      [titleEl, descElMeta, needsElMeta, equityElMeta, actionsRow]
        .filter(Boolean)
        .forEach((el) => el.classList.remove("is-hidden"));
    }

    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleSave();
    });
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleCancel();
    });

    inputTitle.focus();
  }

  async function handleDeleteprojectFromCard(card, projectId) {
    if (!confirm("Delete this project? This cannot be undone.")) return;

    try {
      await deleteprojectById(projectId);
      card.remove();

      const listEl = document.getElementById("profileprojectsList");
      const emptyEl = document.getElementById("profileprojectsEmpty");
      if (listEl && emptyEl && listEl.children.length === 0) {
        emptyEl.classList.remove("is-hidden");
        emptyEl.textContent = "You don’t have any projects yet. Create one to start posting.";
      }
    } catch (err) {
      console.error("Failed to delete project", err);
      alert(err.message || "Could not delete project. Please try again.");
    }
  }

  // ---------------- Load projects for profile (current user) ----------------
  async function loadprojectsForProfile() {
    const listEl = document.getElementById("profileprojectsList");
    const emptyEl = document.getElementById("profileprojectsEmpty");
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";

    const hasGetUserId = typeof window.getUserId === "function";
    const fallbackUserId = hasGetUserId ? window.getUserId() : "";
    const storedUsernameInner = safeGet("username") || "";

    let meUserInner = null;
    try {
      const raw = safeGet("cc_me");
      if (raw) meUserInner = JSON.parse(raw);
    } catch {
      meUserInner = null;
    }

    const userId = currentUserId || (meUserInner && meUserInner.id) || fallbackUserId || "";
    const myUsername =
      currentUsername ||
      (meUserInner && (meUserInner.username || meUserInner.name || meUserInner.displayName || "")) ||
      storedUsernameInner;

    if (!userId && !myUsername) {
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent = "Could not determine your account. Please log in again.";
      return;
    }

    emptyEl.classList.remove("is-hidden");
    emptyEl.textContent = "Loading your projects…";

    let projects = [];
    try {
      let payload;

      const queryId = userId ? `userId=${encodeURIComponent(userId)}&` : "";
      if (typeof window.apiFetch === "function") {
        payload = await window.apiFetch(`projects?${queryId}limit=50&sort=newest`);
      } else {
        const baseUrl = window.API_URL || "";
        // ✅ FIX: /api/projects + credentials
        const res = await fetch(baseUrl + `/api/projects?${queryId}limit=50&sort=newest`, {
          credentials: "include",
        });
        payload = await res.json();
      }

      if (Array.isArray(payload)) projects = payload;
      else if (payload && Array.isArray(payload.data)) projects = payload.data;
      else if (payload && Array.isArray(payload.projects)) projects = payload.projects;
      else if (payload && payload.data && Array.isArray(payload.data.projects))
        projects = payload.data.projects;
      else if (payload && Array.isArray(payload.rows)) projects = payload.rows;
      else if (payload && payload.data && Array.isArray(payload.data.rows))
        projects = payload.data.rows;

      const uidStr = userId ? String(userId) : "";
      const myNameLower = myUsername ? myUsername.toLowerCase() : "";

      projects = projects.filter((svc) => {
        const svcUserId = svc.userId ?? svc.UserId ?? (svc.user && (svc.user.id ?? svc.user.userId));
        const svcUsername =
          (svc.user && (svc.user.username || svc.user.name || svc.user.displayName || "")) || "";

        let match = false;
        if (uidStr && svcUserId !== undefined && svcUserId !== null) match = String(svcUserId) === uidStr;
        if (!match && myNameLower && svcUsername) match = svcUsername.toLowerCase() === myNameLower;
        return match;
      });
    } catch (err) {
      console.error("Failed to load projects on profile page:", err);

      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent = "Could not load your projects right now. Please try again.";
      return;
    }

    if (!projects.length) {
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent = "You don’t have any projects yet. Create one to start posting.";
      listEl.innerHTML = "";
      return;
    }

    emptyEl.classList.add("is-hidden");
    listEl.innerHTML = "";

    projects.forEach((svc) => {
      const card = document.createElement("div");
      card.className = "profile-project-card";

      if (svc.id != null) card.dataset.projectId = String(svc.id);

      const titleDiv = document.createElement("div");
      titleDiv.className = "profile-project-title";
      titleDiv.textContent = svc.title || "Untitled project";
      card.appendChild(titleDiv);

      const metaDesc = document.createElement("div");
      metaDesc.className = "profile-project-meta";
      metaDesc.textContent = svc.description || "";
      card.appendChild(metaDesc);

      const metaNeeds = document.createElement("div");
      metaNeeds.className = "profile-project-meta";
      metaNeeds.textContent = svc.needs || "";
      card.appendChild(metaNeeds);

      const metaEquity = document.createElement("div");
      metaEquity.className = "profile-project-meta";
      const eq = svc.equityPercentage ?? svc.equity ?? "";
      metaEquity.textContent = eq !== "" ? `Equity: ${eq}%` : "Equity: —";
      card.appendChild(metaEquity);

      const actionsRow = document.createElement("div");
      actionsRow.className = "profile-project-meta profile-project-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-muted btn-small project-edit-btn";
      editBtn.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-muted btn-small project-delete-btn";
      deleteBtn.textContent = "Delete";

      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(deleteBtn);
      card.appendChild(actionsRow);

      listEl.appendChild(card);
    });

    if (!listEl.dataset.hasprojectHandlers) {
      listEl.addEventListener("click", (event) => {
        const editButton = event.target.closest(".project-edit-btn");
        const deleteButton = event.target.closest(".project-delete-btn");
        const card = event.target.closest(".profile-project-card");
        if (!card) return;

        const projectId = card.dataset.projectId;
        if (!projectId) return;

        if (editButton) handleEditprojectFromCard(card, projectId);
        else if (deleteButton) handleDeleteprojectFromCard(card, projectId);
      });

      listEl.dataset.hasprojectHandlers = "1";
    }
  }

  loadUserFromBackend().then(() => {
    loadprojectsForProfile();
  });
});
