// public/profile.js
// Profile page logic: load name/email/description + edit & save using localStorage.
// Also handles the "Create Service" dropdown form and listing your services.

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

  // -----------------------------------------------------------------------
  //   "Your services" section on profile
  // -----------------------------------------------------------------------
  const servicesEmptyEl = document.getElementById("profileServicesEmpty");
  const servicesListEl = document.getElementById("profileServicesList");

  function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "N/A";
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  async function loadMyServices() {
    if (!servicesListEl || typeof apiFetch !== "function") return;

    servicesListEl.innerHTML = "";

    const userId =
      typeof getUserId === "function" ? getUserId() : localStorage.getItem("userId");

    if (!userId) {
      // not logged in – keep the empty message
      return;
    }

    try {
      const all = await apiFetch("services");
      const list = Array.isArray(all) ? all : [];

      const myServices = list.filter((svc) => {
        const ownerId =
          svc.userId ??
          svc.UserId ??
          (svc.user && (svc.user.id ?? svc.user.userId));
        return String(ownerId) === String(userId);
      });

      if (!myServices.length) {
        if (servicesEmptyEl) servicesEmptyEl.classList.remove("is-hidden");
        return;
      }

      if (servicesEmptyEl) servicesEmptyEl.classList.add("is-hidden");

      myServices.forEach((svc) => {
        const pill = document.createElement("div");
        pill.className = "profile-service-pill";

        const header = document.createElement("div");
        header.className = "profile-service-pill-header";

        const titleEl = document.createElement("div");
        titleEl.className = "profile-service-pill-title";
        titleEl.textContent = svc.title || "Untitled service";

        const priceEl = document.createElement("div");
        priceEl.className = "profile-service-pill-price";
        priceEl.textContent = `Price: $${formatPrice(svc.price)}`;

        header.appendChild(titleEl);
        header.appendChild(priceEl);

        const meta = document.createElement("div");
        meta.className = "profile-service-pill-meta";
        meta.textContent =
          (svc.description || "").trim() || "No description provided.";

        pill.appendChild(header);
        pill.appendChild(meta);

        servicesListEl.appendChild(pill);
      });
    } catch (err) {
      console.error("Failed to load services for profile:", err);
      // if something goes wrong, keep the empty message visible
    }
  }

  // -----------------------------------------------------------------------
  //   Create Service dropdown + submit
  // -----------------------------------------------------------------------
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

      // Make sure shared helpers exist
      if (typeof apiFetch !== "function") {
        alert("Service creation is not available right now (apiFetch missing).");
        return;
      }

      try {
        await apiFetch("services", {
          method: "POST",
          body: {
            title,
            price,
            description: descriptionService,
          },
          timeoutMs: 10000,
        });

        alert("Service created successfully!");

        // Reset form + hide
        createServiceForm.reset();
        createServiceForm.classList.add("is-hidden");

        // Refresh the "Your services" list
        loadMyServices();
      } catch (err) {
        console.error(err);
        alert(
          err && err.message
            ? err.message
            : "Something went wrong creating the service."
        );
      }
    });
  }

  // Initial load of user's services when the page opens
  loadMyServices();
});
