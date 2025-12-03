// public/profile.js
// Profile page logic: load name/email/description + edit & save using localStorage.
// Also handles the "Create Service" dropdown form and shows THIS user's services.

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION =
    "Write a short bio so clients know what you do.";

  // ---- Load profile from localStorage or URL ----
  const storedUsername = localStorage.getItem("username") || "";
  const storedEmail = localStorage.getItem("email") || "";
  const storedDescription = localStorage.getItem("description") || "";

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

      // Persist to localStorage
      try {
        localStorage.setItem("email", newEmail);
        const usernameToStore = newName || newEmail.split("@")[0];
        localStorage.setItem("username", usernameToStore);
        localStorage.setItem("description", newDescription);
      } catch (err) {
        console.warn("Could not save updated profile to localStorage", err);
      }

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

      // Try to attach token if present
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken");
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
    if (
      typeof window.apiFetch !== "function" ||
      typeof window.getUserId !== "function"
    ) {
      console.warn("apiFetch or getUserId is not available on profile page.");
      return;
    }

    const myUserId = window.getUserId();
    if (!myUserId) {
      // Not logged in (or no stored user id) – keep empty state.
      return;
    }

    // Clear current list
    listEl.innerHTML = "";

    try {
      const allServices = await window.apiFetch("services");
      const servicesArray = Array.isArray(allServices) ? allServices : [];

      // Filter by userId
      const mine = servicesArray.filter(
        (svc) => String(svc.userId) === String(myUserId)
      );

      if (!mine.length) {
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
