// public/profile.js
// Profile page logic: load name/email/description + edit & save using localStorage.
// Also handles the "Create Service" dropdown form and shows THIS user's services.

/** Small helper: safely read from localStorage */
function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Small helper: safely set localStorage */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

/**
 * Ensure we know who the current user is.
 * We read:
 *   - userId from window.getUserId() (set by script.js at login)
 *   - canonical username from localStorage.cc_me (the raw user from login)
 *
 * We return:
 *   { myUserId: "3", matchUsername: "qaz" }
 */
function ensureUserIdentity() {
  let myUserId = "";
  let matchUsername = "";

  try {
    if (typeof window.getUserId === "function") {
      myUserId = window.getUserId() || "";
    }
  } catch {
    /* ignore */
  }

  // This is the raw user JSON we saved at login in script.js
  const rawMe = safeGet("cc_me");
  if (rawMe) {
    try {
      const me = JSON.parse(rawMe);
      if (!myUserId && me && me.id != null) {
        myUserId = String(me.id);
        if (typeof window.setUserId === "function") {
          window.setUserId(myUserId);
        }
      }
      // canonical username for matching (does NOT overwrite the display name)
      if (me && me.username) {
        matchUsername = String(me.username);
      }
      // if email wasn't stored, store it for the profile view
      if (!safeGet("email") && me && me.email) {
        safeSet("email", me.email);
      }
    } catch (e) {
      console.warn("[profile] could not parse cc_me:", e);
    }
  }

  return { myUserId, matchUsername };
}

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION =
    "Write a short bio so clients know what you do.";

  // ---- Load profile from localStorage or URL for display ----
  const storedUsername = safeGet("username") || "";
  const storedEmail = safeGet("email") || "";
  const storedDescription = safeGet("description") || "";

  const params = new URLSearchParams(window.location.search);
  const paramUsername = params.get("username") || "";
  const paramEmail = params.get("email") || "";

  const username = storedUsername || paramUsername || "";
  const email = storedEmail || paramEmail || "";
  const description = storedDescription || "";

  const avatarEl = document.getElementById("profileAvatar");
  const emailBadge = document.getElementById("profileEmail");
  const emailMain = document.getElementById("profileEmailMain");
  const nameEl = document.getElementById("profileName");
  const descEl = document.getElementById("profileDescription");

  // --- Fill view mode ---
  if (email && emailBadge && emailMain) {
    emailBadge.textContent = email;
    emailMain.textContent = email;
  }

  let displayName = username;
  if (!displayName && email) {
    displayName = email.split("@")[0];
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

  // ---- Edit Profile behaviour ----
  const profileView = document.getElementById("profileView");
  const profileEditForm = document.getElementById("profileEditForm");
  const editBtn = document.getElementById("editProfileBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const editDisplayNameInput = document.getElementById("editDisplayName");
  const editEmailInput = document.getElementById("editEmail");
  const editDescriptionInput = document.getElementById("editDescription");

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
  }

  function exitEditMode() {
    if (!profileView || !profileEditForm) return;
    profileEditForm.classList.add("is-hidden");
    profileView.classList.remove("is-hidden");
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

      // Update UI
      if (nameEl) {
        nameEl.textContent = newName || "New developer";
      }
      if (emailBadge) {
        emailBadge.textContent = newEmail;
      }
      if (emailMain) {
        emailMain.textContent = newEmail;
      }
      if (descEl) {
        descEl.textContent = newDescription || DEFAULT_DESCRIPTION;
      }

      // Update avatar initial
      if (avatarEl) {
        const source = (newName || newEmail || "U").trim();
        avatarEl.textContent = source[0].toUpperCase();
      }

      // Persist to localStorage (for UI only)
      safeSet("email", newEmail);
      const usernameToStore = newName || newEmail.split("@")[0];
      safeSet("username", usernameToStore);
      safeSet("description", newDescription);

      exitEditMode();
    });
  }

  // ---- Create Service dropdown + submit ----
  const createServiceBtn = document.getElementById("createServiceBtn");
  const createServiceForm = document.getElementById("createServiceForm");
  const cancelCreateServiceBtn = document.getElementById(
    "cancelCreateServiceBtn"
  );

  // Toggle dropdown
  if (createServiceBtn && createServiceForm) {
    createServiceBtn.addEventListener("click", () => {
      createServiceForm.classList.toggle("is-hidden");
    });
  }

  // Cancel button hides dropdown
  if (cancelCreateServiceBtn && createServiceForm) {
    cancelCreateServiceBtn.addEventListener("click", () => {
      createServiceForm.classList.add("is-hidden");
    });
  }

  // Submit service
  if (createServiceForm) {
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

      const baseUrl = window.API_URL || "";
      const headers = { "Content-Type": "application/json" };

      // Try to attach token if present (cookie also works server-side)
      const token =
        safeGet("token") ||
        safeGet("authToken") ||
        safeGet("jwt") ||
        safeGet("accessToken");
      if (token) {
        headers.Authorization = "Bearer " + token;
      }

      try {
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

        alert("Service created successfully!");
        createServiceForm.reset();
        createServiceForm.classList.add("is-hidden");

        // After creating, reload the list of my services
        loadMyServices();
      } catch (err) {
        console.error(err);
        alert(err.message || "Something went wrong creating the service.");
      }
    });
  }

  // ---- Load THIS user's services and show them under "Your services" ----
  async function loadMyServices() {
    const listEl = document.getElementById("profileServicesList");
    const emptyEl = document.getElementById("profileServicesEmpty");

    if (!listEl || !emptyEl) return;

    if (typeof window.apiFetch !== "function") {
      console.warn("apiFetch is not available on profile page.");
      return;
    }

    const { myUserId, matchUsername } = ensureUserIdentity();
    const myUserIdStr = myUserId ? String(myUserId) : "";
    const myMatchUsername = matchUsername || "";

    console.log("[profile] identity for services:", {
      myUserIdStr,
      myMatchUsername,
    });

    // Clear current list
    listEl.innerHTML = "";

    try {
      const allServices = await window.apiFetch("services");
      const servicesArray = Array.isArray(allServices) ? allServices : [];

      console.log("[profile] services from API:", servicesArray);

      const mine = servicesArray.filter((svc) => {
        if (!svc || typeof svc !== "object") return false;

        // Possible id fields
        const idCandidatesRaw = [
          svc.userId,
          svc.UserId,
          svc.user_id,
          svc.ownerId,
          svc.owner_id,
          svc.user && (svc.user.id || svc.user.userId || svc.user.user_id),
          svc.User && (svc.User.id || svc.User.userId || svc.User.user_id),
        ];

        const idCandidates = idCandidatesRaw
          .filter((v) => v !== undefined && v !== null)
          .map((v) => String(v));

        // Possible username fields
        const usernameCandidates = [
          svc.username,
          svc.user && svc.user.username,
          svc.User && svc.User.username,
          svc.owner && svc.owner.username,
        ].filter(Boolean);

        const matchId =
          myUserIdStr &&
          idCandidates.length > 0 &&
          idCandidates.includes(myUserIdStr);

        const matchName =
          myMatchUsername &&
          usernameCandidates.length > 0 &&
          usernameCandidates.some((u) => u === myMatchUsername);

        return matchId || matchName;
      });

      console.log("[profile] mine after filtering:", mine);

      if (!mine.length) {
        // No services for this user – show empty message
        emptyEl.classList.remove("is-hidden");
        return;
      }

      // Hide empty message and render each service
      emptyEl.classList.add("is-hidden");

      mine.forEach((svc) => {
        const card = document.createElement("div");
        card.className = "profile-service-card";

        const titleDiv = document.createElement("div");
        titleDiv.className = "profile-service-title";
        titleDiv.textContent = svc.title || "Untitled service";
        card.appendChild(titleDiv);

        const metaDiv = document.createElement("div");
        metaDiv.className = "profile-service-meta";

        const price = Number(svc.price || 0);
        const priceSpan = document.createElement("span");
        priceSpan.textContent = `Price: $${price.toLocaleString()}`;
        metaDiv.appendChild(priceSpan);

        if (svc.description) {
          const descSpan = document.createElement("span");
          descSpan.textContent = `  •  ${svc.description}`;
          metaDiv.appendChild(descSpan);
        }

        card.appendChild(metaDiv);
        listEl.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to load services for profile page:", err);
      emptyEl.classList.remove("is-hidden");
    }
  }

  // Initial load of my services when the page opens
  loadMyServices();
});
