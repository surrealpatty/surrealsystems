// public/profile.js
// Profile page logic: load name/email/description + edit & save using localStorage.
// Also handles the "Create Service" dropdown form.

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

      // Try to grab a token if one exists (but don't block if it doesn't)
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken");

      const baseUrl = window.API_URL || ""; // if you use init.js it sets API_URL
      const headers = {
        "Content-Type": "application/json",
      };
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

        // Success: reset form + go to services page
        createServiceForm.reset();
        createServiceForm.classList.add("is-hidden");
        window.location.href = "services.html";
      } catch (err) {
        console.error(err);
        alert(err.message || "Something went wrong creating the service.");
      }
    });
  }
});
