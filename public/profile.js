// public/profile.js
// Profile page logic: profile info + edit + create service dropdown + show & edit services.

console.log("[profile] loaded profile.js v7");

// Safe localStorage helpers
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

// Simple JWT decoder (kept for backward-compatibility; backend is cookie-based now)
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

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION =
    "Write a short bio so clients know what you do.";

  // These will be filled from /api/users/me
  let currentUserId = null;
  let currentUsername = "";

  // ---------------- Read token & cc_me, reconcile current user (fallback only) ----------------
  const token =
    safeGet("token") ||
    safeGet("authToken") ||
    safeGet("jwt") ||
    safeGet("accessToken") ||
    "";

  const tokenPayload = decodeJwt(token) || null; // may contain id, email, username, etc.

  let meUser = null;
  try {
    const raw = safeGet("cc_me");
    if (raw) meUser = JSON.parse(raw);
  } catch {
    meUser = null;
  }

  // If cc_me.id and tokenPayload.id disagree, cc_me is for a different user → discard it
  if (
    meUser &&
    tokenPayload &&
    meUser.id != null &&
    tokenPayload.id != null &&
    String(meUser.id) !== String(tokenPayload.id)
  ) {
    console.warn(
      "[profile] cc_me user id does not match token id. Clearing stale cc_me."
    );
    meUser = null;
    safeSet("cc_me", ""); // wipe old one
  }

  // ---------------- Profile display (initial, from storage) ----------------
  const storedUsername = safeGet("username") || "";
  const storedEmail = safeGet("email") || "";
  const storedDescription = safeGet("description") || "";

  const params = new URLSearchParams(window.location.search);
  const paramUsername = params.get("username") || "";
  const paramEmail = params.get("email") || "";

  const fromMeUsername =
    (meUser &&
      (meUser.username || meUser.name || meUser.displayName || "")) ||
    "";
  const fromMeEmail = (meUser && meUser.email) || "";
  const fromMeDescription = (meUser && meUser.description) || "";

  const fromTokenUsername =
    (tokenPayload &&
      (tokenPayload.username ||
        tokenPayload.name ||
        tokenPayload.displayName ||
        "")) ||
    "";
  const fromTokenEmail = (tokenPayload && tokenPayload.email) || "";
  const fromTokenDescription =
    (tokenPayload && tokenPayload.description) || "";

  // Prefer: cc_me → token → old storage → URL
  const username =
    fromMeUsername ||
    fromTokenUsername ||
    storedUsername ||
    paramUsername ||
    "";
  const email =
    fromMeEmail || fromTokenEmail || storedEmail || paramEmail || "";
  const description =
    fromMeDescription ||
    fromTokenDescription ||
    storedDescription ||
    "" ||
    DEFAULT_DESCRIPTION;

  // Keep simple keys in sync with whichever user we decided is "current"
  if (username) safeSet("username", username);
  if (email) safeSet("email", email);
  if (description && description !== DEFAULT_DESCRIPTION) {
    safeSet("description", description);
  }

  // Also rebuild cc_me from token + existing data if we don't have it
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

  if (meUser && meUser.id != null) {
    currentUserId = meUser.id;
  }
  currentUsername = username || currentUsername;

  // Grab DOM elements
  const avatarEl =
    document.getElementById("profileAvatar") ||
    document.getElementById("topUserAvatar");
  const emailBadge =
    document.getElementById("profileEmail") ||
    document.getElementById("topUserEmail");
  const emailMain = document.getElementById("profileEmailMain");
  const nameEl = document.getElementById("profileName");
  const descEl = document.getElementById("profileDescription");

  // Compute display name (username or email local-part)
  let displayName = username;
  if (!displayName && email) {
    displayName = email.split("@")[0];
  }

  // Initial fill from storage (will be overwritten by /users/me)
  // - Big card EMAIL field still shows full email
  // - Top-right chip (emailBadge) now shows DISPLAY NAME
  if (emailMain) {
    emailMain.textContent = email;
  }
  if (emailBadge) {
    emailBadge.textContent = displayName || email || "User";
  }

  if (displayName && nameEl) {
    nameEl.textContent = displayName;
  }

  if (descEl) {
    descEl.textContent = description || DEFAULT_DESCRIPTION;
  }

  const initialSource = displayName || email || "U";
  if (avatarEl && initialSource) {
    avatarEl.textContent = initialSource.trim()[0].toUpperCase();
  }

  // ---------------- Fetch real user from backend: /api/users/me ----------------
  async function loadUserFromBackend() {
    const baseUrl = window.API_URL || "";
    try {
      const res = await fetch(baseUrl + "/users/me", {
        method: "GET",
        credentials: "include", // send cookie with token
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        console.warn("[profile] /users/me returned status", res.status);
        return;
      }

      const payload = await res.json();
      const u =
        (payload && payload.user) ||
        (payload && payload.data && payload.data.user);

      if (!u) {
        console.warn("[profile] /users/me payload has no user");
        return;
      }

      const uname =
        u.username ||
        u.name ||
        u.displayName ||
        (u.email ? u.email.split("@")[0] : "User");
      const uemail = u.email || "";
      const udesc = u.description || "";

      currentUserId = u.id;
      currentUsername = uname;

      // Update UI with real user
      if (nameEl) nameEl.textContent = uname;
      // 🔥 chip shows display name, not email
      if (emailBadge) emailBadge.textContent = uname;
      // big card EMAIL stays actual email
      if (emailMain) emailMain.textContent = uemail;
      if (descEl) descEl.textContent = udesc || DEFAULT_DESCRIPTION;

      const source = uname || uemail || "U";
      if (avatarEl && source) {
        avatarEl.textContent = source.trim()[0].toUpperCase();
      }

      // Persist for next visit
      safeSet("userId", String(u.id));
      safeSet("username", uname);
      safeSet("email", uemail);
      safeSet("description", udesc);
      safeSet("cc_me", JSON.stringify(u));
    } catch (err) {
      console.error("[profile] Failed to load /users/me", err);
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

    if (editDisplayNameInput && nameEl) {
      editDisplayNameInput.value = nameEl.textContent.trim();
    }
    if (editEmailInput && emailMain) {
      editEmailInput.value = emailMain.textContent.trim();
    }
    if (editDescriptionInput && descEl) {
      const current = descEl.textContent.trim();
      editDescriptionInput.value =
        current === DEFAULT_DESCRIPTION ? "" : current;
    }

    profileView.classList.add("is-hidden");
    profileEditForm.classList.remove("is-hidden");

    if (accountSettingsCard) {
      accountSettingsCard.classList.remove("is-hidden");
    }
  }

  function exitEditMode() {
    if (!profileView || !profileEditForm) return;
    profileEditForm.classList.add("is-hidden");
    profileView.classList.remove("is-hidden");

    if (accountSettingsCard) {
      accountSettingsCard.classList.add("is-hidden");
    }
  }

  if (editBtn) {
    editBtn.addEventListener("click", enterEditMode);
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", exitEditMode);
  }

  if (profileEditForm) {
    profileEditForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!editEmailInput) return;

      const newName = editDisplayNameInput
        ? editDisplayNameInput.value.trim()
        : "";
      const newEmail = editEmailInput.value.trim();
      const newDescription = editDescriptionInput
        ? editDescriptionInput.value.trim()
        : "";

      if (!newEmail) {
        alert("Email is required.");
        editEmailInput.focus();
        return;
      }

      // Decide what the display name should be
      const usernameToStore = newName || newEmail.split("@")[0];

      // Update UI
      if (nameEl) {
        nameEl.textContent = newName || usernameToStore || "New developer";
      }
      // 🔥 chip shows display name (usernameToStore)
      if (emailBadge) {
        emailBadge.textContent = usernameToStore;
      }
      // big card EMAIL shows full email
      if (emailMain) {
        emailMain.textContent = newEmail;
      }
      if (descEl) {
        descEl.textContent = newDescription || DEFAULT_DESCRIPTION;
      }

      // Avatar
      if (avatarEl) {
        const source = (usernameToStore || newEmail || "U").trim();
        avatarEl.textContent = source[0].toUpperCase();
      }

      // Persist (UI only)
      safeSet("email", newEmail);
      safeSet("username", usernameToStore);
      safeSet("description", newDescription);

      // Keep cc_me in sync so current user stays correct
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

  // ---------------- Create Service dropdown + submit ----------------
  const createServiceBtn = document.getElementById("createServiceBtn");
  const createServiceForm = document.getElementById("createServiceForm");
  const cancelCreateServiceBtn = document.getElementById(
    "cancelCreateServiceBtn"
  );

  if (createServiceBtn && createServiceForm) {
    console.log("[profile] Create Service button & form found");

    const originalBtnText =
      (createServiceBtn.textContent && createServiceBtn.textContent.trim()) ||
      "Create Service";

    function showCreateForm() {
      createServiceForm.classList.remove("is-hidden");
      createServiceBtn.textContent = "Hide form";
    }

    function hideCreateForm() {
      createServiceForm.classList.add("is-hidden");
      createServiceBtn.textContent = originalBtnText;
    }

    // Toggle dropdown on main button
    createServiceBtn.addEventListener("click", () => {
      const isHidden = createServiceForm.classList.contains("is-hidden");
      console.log("[profile] Create Service clicked, isHidden =", isHidden);
      if (isHidden) {
        // backend enforces auth; no client-side guard
        showCreateForm();
      } else {
        hideCreateForm();
      }
    });

    // Cancel hides + resets the form
    if (cancelCreateServiceBtn) {
      cancelCreateServiceBtn.addEventListener("click", () => {
        console.log("[profile] Cancel Create Service clicked");
        hideCreateForm();
        createServiceForm.reset();
      });
    }

    // Handle create service submit
    createServiceForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const titleEl = document.getElementById("serviceTitle");
      const priceEl = document.getElementById("servicePrice");
      const descElService = document.getElementById("serviceDescription");

      const title = titleEl ? titleEl.value.trim() : "";
      const priceValue = priceEl ? priceEl.value.trim() : "";
      const descriptionService = descElService
        ? descElService.value.trim()
        : "";

      if (!title || !priceValue || !descriptionService) {
        alert("Please fill in all service fields.");
        return;
      }

      const price = Number(priceValue);
      if (Number.isNaN(price) || price <= 0) {
        alert("Please enter a valid price.");
        return;
      }

      try {
        if (typeof window.apiFetch === "function") {
          await window.apiFetch("services", {
            method: "POST",
            body: {
              title,
              price,
              description: descriptionService,
            },
          });
        } else {
          const baseUrl = window.API_URL || "";
          const headers = { "Content-Type": "application/json" };

          const tokenInner =
            safeGet("token") ||
            safeGet("authToken") ||
            safeGet("jwt") ||
            safeGet("accessToken");
          if (tokenInner) {
            headers.Authorization = "Bearer " + tokenInner;
          }

          const res = await fetch(baseUrl + "/services", {
            method: "POST",
            headers,
            body: JSON.stringify({
              title,
              price,
              description: descriptionService,
            }),
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            const msg =
              errJson.message ||
              `Failed to create service (status ${res.status}).`;
            throw new Error(msg);
          }
        }

        alert("Service created successfully!");
        createServiceForm.reset();
        hideCreateForm();

        // Reload list so the new service shows under "Your services"
        loadServicesForProfile();
      } catch (err) {
        console.error(err);
        alert(err.message || "Something went wrong creating the service.");
      }
    });
  } else {
    console.warn("[profile] Create Service elements not found", {
      btn: !!createServiceBtn,
      form: !!createServiceForm,
      cancelBtn: !!cancelCreateServiceBtn,
    });
  }

  // ---------------- Helpers for editing & deleting a service ----------------

  async function updateServiceById(serviceId, payload) {
    // payload: { title, description, price }
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(`services/${serviceId}`, {
        method: "PUT",
        body: payload,
      });
    }

    const baseUrl = window.API_URL || "";
    const headers = { "Content-Type": "application/json" };

    const tokenInner =
      safeGet("token") ||
      safeGet("authToken") ||
      safeGet("jwt") ||
      safeGet("accessToken");
    if (tokenInner) {
      headers.Authorization = "Bearer " + tokenInner;
    }

    const res = await fetch(baseUrl + `/services/${serviceId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg =
        errJson.message || `Failed to update service (status ${res.status}).`;
      throw new Error(msg);
    }
  }

  async function deleteServiceById(serviceId) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(`services/${serviceId}`, {
        method: "DELETE",
      });
    }

    const baseUrl = window.API_URL || "";
    const headers = {};

    const tokenInner =
      safeGet("token") ||
      safeGet("authToken") ||
      safeGet("jwt") ||
      safeGet("accessToken");
    if (tokenInner) {
      headers.Authorization = "Bearer " + tokenInner;
    }

    const res = await fetch(baseUrl + `/services/${serviceId}`, {
      method: "DELETE",
      headers,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg =
        errJson.message || `Failed to delete service (status ${res.status}).`;
      throw new Error(msg);
    }
  }

  async function handleEditServiceFromCard(card, serviceId) {
    const titleEl = card.querySelector(".profile-service-title");
    const metaEls = card.querySelectorAll(".profile-service-meta");

    const descElMeta = metaEls[0]; // description
    const priceElMeta = metaEls[1]; // "Price: $123"

    const currentTitle = (titleEl && titleEl.textContent.trim()) || "";
    const currentDesc = (descElMeta && descElMeta.textContent.trim()) || "";
    const priceText = (priceElMeta && priceElMeta.textContent.trim()) || "";

    const match = priceText.match(/([\d,.]+)/);
    const currentPrice = match ? match[1].replace(/,/g, "") : "0";

    const newTitle = prompt("Service title", currentTitle);
    if (newTitle === null) return;

    const newDesc = prompt("Service description", currentDesc);
    if (newDesc === null) return;

    const newPriceRaw = prompt("Service price (number only)", currentPrice);
    if (newPriceRaw === null) return;

    const newPrice = parseFloat(newPriceRaw);
    if (Number.isNaN(newPrice)) {
      alert("Price must be a number.");
      return;
    }

    try {
      await updateServiceById(serviceId, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        price: newPrice,
      });

      // Update the card UI
      if (titleEl) {
        titleEl.textContent = newTitle.trim() || "Untitled service";
      }
      if (descElMeta) {
        descElMeta.textContent = newDesc.trim() || "";
      }
      if (priceElMeta) {
        priceElMeta.textContent = `Price: $${newPrice}`;
      }

      alert("Service updated.");
    } catch (err) {
      console.error("Failed to update service", err);
      alert(err.message || "Could not update service. Please try again.");
    }
  }

  async function handleDeleteServiceFromCard(card, serviceId) {
    if (!confirm("Delete this service? This cannot be undone.")) return;

    try {
      await deleteServiceById(serviceId);
      card.remove();

      const listEl = document.getElementById("profileServicesList");
      const emptyEl = document.getElementById("profileServicesEmpty");
      if (listEl && emptyEl && listEl.children.length === 0) {
        emptyEl.classList.remove("is-hidden");
        emptyEl.textContent =
          "You don’t have any services yet. Create one to start attracting clients.";
      }
    } catch (err) {
      console.error("Failed to delete service", err);
      alert(err.message || "Could not delete service. Please try again.");
    }
  }

  // ---------------- Load services for profile (current user) ----------------
  async function loadServicesForProfile() {
    const listEl = document.getElementById("profileServicesList");
    const emptyEl = document.getElementById("profileServicesEmpty");
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = "";

    // Determine the current user ID and username
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

    const userId =
      currentUserId ||
      (meUserInner && meUserInner.id) ||
      fallbackUserId ||
      "";

    const myUsername =
      currentUsername ||
      (meUserInner &&
        (meUserInner.username ||
          meUserInner.name ||
          meUserInner.displayName ||
          "")) ||
      storedUsernameInner;

    if (!userId && !myUsername) {
      // We don’t know who this is – don’t hit the API
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent =
        "Could not determine your account. Please log in again.";
      return;
    }

    // Show a small “loading” message while we fetch
    emptyEl.classList.remove("is-hidden");
    emptyEl.textContent = "Loading your services…";

    let services = [];
    try {
      let payload;

      const queryId = userId ? `userId=${encodeURIComponent(userId)}&` : "";
      if (typeof window.apiFetch === "function") {
        payload = await window.apiFetch(
          `services?${queryId}limit=50&sort=newest`
        );
      } else {
        const baseUrl = window.API_URL || "";
        const res = await fetch(
          baseUrl + `/services?${queryId}limit=50&sort=newest`
        );
        payload = await res.json();
      }

      // Normalise API shapes
      if (Array.isArray(payload)) {
        services = payload;
      } else if (payload && Array.isArray(payload.data)) {
        services = payload.data;
      } else if (payload && Array.isArray(payload.services)) {
        services = payload.services;
      } else if (
        payload &&
        payload.data &&
        Array.isArray(payload.data.services)
      ) {
        services = payload.data.services;
      } else if (payload && Array.isArray(payload.rows)) {
        // ✅ important for /services list route
        services = payload.rows;
      } else if (
        payload &&
        payload.data &&
        Array.isArray(payload.data.rows)
      ) {
        // ✅ important for ok(res, { rows, count }) pattern
        services = payload.data.rows;
      }

      // --- STRICT client-side filter so ONLY my stuff is kept ---
      const uidStr = userId ? String(userId) : "";
      const myNameLower = myUsername ? myUsername.toLowerCase() : "";

      services = services.filter((svc) => {
        const svcUserId =
          svc.userId ??
          svc.UserId ??
          (svc.user && (svc.user.id ?? svc.user.userId));
        const svcUsername =
          (svc.user &&
            (svc.user.username ||
              svc.user.name ||
              svc.user.displayName ||
              "")) ||
          "";

        let match = false;

        // First try by numeric/string ID
        if (uidStr && svcUserId !== undefined && svcUserId !== null) {
          match = String(svcUserId) === uidStr;
        }

        // If ID didn’t match, fall back to username comparison
        if (!match && myNameLower && svcUsername) {
          match = svcUsername.toLowerCase() === myNameLower;
        }

        return match;
      });
    } catch (err) {
      console.error("Failed to load services on profile page:", err);

      const status = err && err.status ? err.status : null;
      if (status === 401 || status === 403) {
        try {
          if (typeof window.clearToken === "function") window.clearToken();
          if (typeof window.clearUserId === "function") window.clearUserId();
        } catch {}

        emptyEl.classList.remove("is-hidden");
        emptyEl.textContent =
          "Your session has expired. Please log in again to see your services.";
      } else {
        emptyEl.classList.remove("is-hidden");
        emptyEl.textContent =
          "Could not load your services right now. Please try again.";
      }
      return;
    }

    if (!services.length) {
      // No services for this account yet
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent =
        "You don’t have any services yet. Create one to start attracting clients.";
      listEl.innerHTML = "";
      return;
    }

    // We have services – hide the empty text
    emptyEl.classList.add("is-hidden");
    listEl.innerHTML = "";

    services.forEach((svc) => {
      const card = document.createElement("div");
      card.className = "profile-service-card";

      // store the id so edit/delete can use it
      if (svc.id != null) {
        card.dataset.serviceId = String(svc.id);
      }

      const titleDiv = document.createElement("div");
      titleDiv.className = "profile-service-title";
      titleDiv.textContent = svc.title || "Untitled service";
      card.appendChild(titleDiv);

      const metaDesc = document.createElement("div");
      metaDesc.className = "profile-service-meta";
      metaDesc.textContent = svc.description || "";
      card.appendChild(metaDesc);

      const metaPrice = document.createElement("div");
      metaPrice.className = "profile-service-meta";
      const rawPrice = svc.price ?? 0;
      const priceNum = Number(rawPrice);
      const priceText = Number.isFinite(priceNum)
        ? priceNum.toLocaleString()
        : String(rawPrice);
      metaPrice.textContent = `Price: $${priceText}`;
      card.appendChild(metaPrice);

      // --- actions row: Edit + Delete buttons ---
      const actionsRow = document.createElement("div");
      actionsRow.className = "profile-service-meta profile-service-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "btn btn-muted btn-small service-edit-btn";
      editBtn.textContent = "Edit";

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-muted btn-small service-delete-btn";
      deleteBtn.textContent = "Delete";

      actionsRow.appendChild(editBtn);
      actionsRow.appendChild(deleteBtn);

      card.appendChild(actionsRow);

      listEl.appendChild(card);
    });

    // Attach click handler ONCE for edit/delete (event delegation)
    if (!listEl.dataset.hasServiceHandlers) {
      listEl.addEventListener("click", (event) => {
        const editButton = event.target.closest(".service-edit-btn");
        const deleteButton = event.target.closest(".service-delete-btn");
        const card = event.target.closest(".profile-service-card");
        if (!card) return;

        const serviceId = card.dataset.serviceId;
        if (!serviceId) {
          console.warn("[profile] service card missing data-service-id");
          return;
        }

        if (editButton) {
          handleEditServiceFromCard(card, serviceId);
        } else if (deleteButton) {
          handleDeleteServiceFromCard(card, serviceId);
        }
      });

      listEl.dataset.hasServiceHandlers = "1";
    }
  }

  // --- Final initialisation: load real user THEN services ---
  loadUserFromBackend().then(() => {
    loadServicesForProfile();
  });
});
