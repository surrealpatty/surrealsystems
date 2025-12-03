// public/profile.js
// Profile page logic: load user info, edit profile, and create services.

document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_DESCRIPTION = "Write a short bio so clients know what you do.";
  const API_URL = window.API_URL || "";

  // ------------------ LOAD PROFILE DATA ------------------
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

  // ------------------ EDIT PROFILE ------------------
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

  // ------------------ CREATE SERVICE DROPDOWN ------------------
  const createServiceBtn = document.getElementById("createServiceBtn");
  const createServiceForm = document.getElementById("createServiceForm");
  const cancelCreateServiceBtn = document.getElementById(
    "cancelCreateServiceBtn"
  );
  const servicesEmpty = document.querySelector(".services-empty");
  const serviceList = document.getElementById("serviceList");

  if (createServiceBtn && createServiceForm) {
    createServiceBtn.addEventListener("click", () => {
      createServiceForm.classList.toggle("is-hidden");

      if (!createServiceForm.classList.contains("is-hidden")) {
        createServiceForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  if (cancelCreateServiceBtn && createServiceForm) {
    cancelCreateServiceBtn.addEventListener("click", () => {
      createServiceForm.classList.add("is-hidden");
    });
  }

  async function loadServices() {
    if (!serviceList) return;

    const token = localStorage.getItem("token");
    if (!token) {
      serviceList.innerHTML = "";
      return;
    }

    try {
      const res = await fetch(`${API_URL}/services/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("Failed to load services", res.status);
        return;
      }

      const services = await res.json();

      if (!Array.isArray(services) || services.length === 0) {
        serviceList.innerHTML = "";
        if (servicesEmpty) servicesEmpty.classList.remove("is-hidden");
        return;
      }

      if (servicesEmpty) servicesEmpty.classList.add("is-hidden");

      serviceList.innerHTML = services
        .map(
          (s) => `
          <div class="service-card">
            <div class="service-card-title">${s.title}</div>
            <div class="service-card-price">$${s.price}</div>
            <div class="service-card-description">${s.description}</div>
          </div>
        `
        )
        .join("");
    } catch (err) {
      console.error("Error loading services", err);
    }
  }

  if (createServiceForm) {
    createServiceForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        alert("You must be logged in to create a service.");
        return;
      }

      const titleEl = document.getElementById("serviceTitle");
      const priceEl = document.getElementById("servicePrice");
      const descriptionEl = document.getElementById("serviceDescription");

      const title = titleEl ? titleEl.value.trim() : "";
      const price = priceEl ? Number(priceEl.value) : 0;
      const serviceDescription = descriptionEl
        ? descriptionEl.value.trim()
        : "";

      if (!title || !serviceDescription || !price) {
        alert("Please fill in all the fields.");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/services`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            description: serviceDescription,
            price,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Failed to create service", res.status, text);
          alert(`Failed to create service (status ${res.status}).`);
          return;
        }

        alert("Service created successfully.");
        createServiceForm.reset();
        createServiceForm.classList.add("is-hidden");
        loadServices();
      } catch (err) {
        console.error("Error creating service", err);
        alert("Network error while creating service.");
      }
    });
  }

  // Initial load of services
  loadServices();
});
