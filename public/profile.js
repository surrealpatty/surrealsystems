// profile.js
document.addEventListener("DOMContentLoaded", () => {
  // 1. Get current user
  const currentUser = getCurrentUser();
  if (!currentUser) {
    // if no user logged in, send them to login page
    window.location.href = "login.html";
    return;
  }

  // 2. Populate the profile header
  setupProfileHeader(currentUser);

  // 3. Setup Edit Profile behaviour
  setupEditProfile(currentUser);

  // 4. Render this user's services
  renderMyServices(currentUser);

  // 5. Wire up "Create Service" button
  const createServiceBtn = document.getElementById("profileCreateServiceBtn");
  if (createServiceBtn) {
    createServiceBtn.addEventListener("click", () => {
      window.location.href = "services.html";
    });
  }
});

// ------------ helpers ------------

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("cc_currentUser");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse current user", err);
    return null;
  }
}

function setupProfileHeader(user) {
  const avatarEl = document.getElementById("profileAvatar");
  const emailTopEl = document.getElementById("profileEmail");

  const nameEl = document.getElementById("profileName");
  const emailMainEl = document.getElementById("profileEmailMain");
  const descEl = document.getElementById("profileDescription");

  if (avatarEl && user.displayName) {
    avatarEl.textContent = user.displayName.charAt(0).toUpperCase();
  }

  if (emailTopEl) {
    emailTopEl.textContent = user.email || "you@example.com";
  }

  if (nameEl) nameEl.textContent = user.displayName || "New developer";
  if (emailMainEl) emailMainEl.textContent = user.email || "you@example.com";
  if (descEl) {
    descEl.textContent =
      user.description ||
      "Write a short bio so clients know what you do.";
  }
}

function setupEditProfile(user) {
  const viewBlock = document.getElementById("profileView");
  const form = document.getElementById("profileEditForm");
  const editBtn = document.getElementById("editProfileBtn");
  const cancelBtn = document.getElementById("cancelEditBtn");

  if (!viewBlock || !form || !editBtn || !cancelBtn) return;

  const nameInput = document.getElementById("editDisplayName");
  const emailInput = document.getElementById("editEmail");
  const descInput = document.getElementById("editDescription");

  // prefill
  if (nameInput) nameInput.value = user.displayName || "";
  if (emailInput) emailInput.value = user.email || "";
  if (descInput) descInput.value = user.description || "";

  // show edit form
  editBtn.addEventListener("click", () => {
    viewBlock.classList.add("is-hidden");
    form.classList.remove("is-hidden");
  });

  // cancel edit
  cancelBtn.addEventListener("click", () => {
    form.classList.add("is-hidden");
    viewBlock.classList.remove("is-hidden");
  });

  // save changes
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const updatedUser = {
      ...user,
      displayName: nameInput.value.trim() || "New developer",
      email: emailInput.value.trim(),
      description: descInput.value.trim(),
    };

    // save in localStorage
    localStorage.setItem("cc_currentUser", JSON.stringify(updatedUser));

    // update UI
    setupProfileHeader(updatedUser);

    form.classList.add("is-hidden");
    viewBlock.classList.remove("is-hidden");
  });
}

function renderMyServices(user) {
  const servicesEmpty = document.getElementById("servicesEmpty");
  const listEl = document.getElementById("servicesList");
  if (!servicesEmpty || !listEl) return;

  listEl.innerHTML = "";

  const allServices = getAllServices();
  const myServices = allServices.filter(
    (svc) => svc.ownerEmail === user.email
  );

  if (myServices.length === 0) {
    servicesEmpty.classList.remove("is-hidden");
    return;
  }

  servicesEmpty.classList.add("is-hidden");

  myServices.forEach((svc) => {
    const card = document.createElement("div");
    card.className = "services-item";
    card.style.marginTop = "10px";
    card.style.padding = "10px 12px";
    card.style.borderRadius = "0.9rem";
    card.style.border = "1px solid rgba(55,65,81,0.9)";
    card.style.background = "#020617";
    card.style.fontSize = "0.9rem";

    card.innerHTML = `
      <div style="font-weight:600; margin-bottom:4px;">${svc.title}</div>
      <div style="color:#9ca3af; margin-bottom:4px;">
        ${svc.category || "General"} • $${svc.price}
      </div>
      <div style="color:#d1d5db;">${svc.description}</div>
    `;

    listEl.appendChild(card);
  });
}

function getAllServices() {
  try {
    const raw = localStorage.getItem("cc_services");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (err) {
    console.error("Failed to load services", err);
    return [];
  }
}
