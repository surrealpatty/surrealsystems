// public/profile.js
// Profile page logic: profile info + edit + create service dropdown + show services.

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

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION =
    "Write a short bio so clients know what you do.";

  // ---------------- Profile display (top card) ----------------
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

  // Fill view mode
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

  // ---------------- Edit profile behaviour ----------------
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

      // Avatar
      if (avatarEl) {
        const source = (newName || newEmail || "U").trim();
        avatarEl.textContent = source[0].toUpperCase();
      }

      // Persist (UI only)
      safeSet("email", newEmail);
      const usernameToStore = newName || newEmail.split("@")[0];
      safeSet("username", usernameToStore);
      safeSet("description", newDescription);

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
        // Use shared apiFetch from script.js if available
        if (typeof window.apiFetch === "function") {
          await window.apiFetch("/services", {
            method: "POST",
            auth: true,
            body: {
              title,
              price,
              description: descriptionService,
            },
          });
        } else {
          // Fallback: plain fetch with token
          const baseUrl = window.API_URL || "";
          const headers = { "Content-Type": "application/json" };

          const token =
            safeGet("token") ||
            safeGet("authToken") ||
            safeGet("jwt") ||
            safeGet("accessToken");
          if (token) {
            headers.Authorization = "Bearer " + token;
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

  // ---------------- Load services for profile (current user) ----------------
  async function loadServicesForProfile() {
    const listEl = document.getElementById("profileServicesList");
    const emptyEl = document.getElementById("profileServicesEmpty");
    if (!listEl || !emptyEl) return;

    listEl.innerHTML = ""; // clear any previous content

    let services = [];
    try {
      const hasApiFetch = typeof window.apiFetch === "function";
      const hasGetUserId = typeof window.getUserId === "function";

      let path = "services";

      if (hasGetUserId) {
        const uid = window.getUserId();
        if (uid) {
          path = `services?userId=${encodeURIComponent(uid)}&limit=50`;
        }
      }

      if (hasApiFetch) {
        const response = await window.apiFetch(path);
        if (Array.isArray(response)) {
          services = response;
        } else if (response && Array.isArray(response.data)) {
          services = response.data;
        } else if (response && Array.isArray(response.services)) {
          services = response.services;
        }
      } else {
        const baseUrl = window.API_URL || "";
        const res = await fetch(
          baseUrl + (path.startsWith("/") ? path : "/" + path)
        );
        const json = await res.json();
        if (Array.isArray(json)) {
          services = json;
        } else if (json && Array.isArray(json.data)) {
          services = json.data;
        } else if (json && Array.isArray(json.services)) {
          services = json.services;
        }
      }
    } catch (err) {
      console.error("Failed to load services on profile page:", err);
      emptyEl.classList.remove("is-hidden");
      emptyEl.textContent =
        "Could not load your services right now. Please try again.";
      return;
    }

    if (!services.length) {
      // No services at all
      emptyEl.classList.remove("is-hidden");
      listEl.innerHTML = "";
      return;
    }

    // We have services – hide the empty text
    emptyEl.classList.add("is-hidden");
    listEl.innerHTML = "";

    services.forEach((svc) => {
      const card = document.createElement("div");
      card.className = "profile-service-card";

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
      const priceNum = Number(svc.price || 0);
      metaPrice.textContent = `Price: $${priceNum.toLocaleString()}`;
      card.appendChild(metaPrice);

      listEl.appendChild(card);
    });
  }

  // Initial load
  loadServicesForProfile();
});
