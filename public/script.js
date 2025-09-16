// --------------------- Helper: Get token ---------------------
function getToken() {
    return localStorage.getItem("token");
}

// --------------------- Register (Sign Up) ---------------------
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("registerUsername").value;
        const email = document.getElementById("registerEmail").value;
        const password = document.getElementById("registerPassword").value;

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                window.location.href = "profile.html";
            } else {
                document.getElementById("registerMessage").innerText = data.message || "Error signing up.";
            }
        } catch (err) {
            console.error("Signup error:", err);
        }
    });
}

// --------------------- Login ---------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("token", data.token);
                window.location.href = "profile.html";
            } else {
                document.getElementById("loginMessage").innerText = data.message || "Login failed.";
            }
        } catch (err) {
            console.error("Login error:", err);
        }
    });
}

// --------------------- Profile Page ---------------------
const profileForm = document.getElementById("profileForm");
const editProfileBtn = document.getElementById("editProfileBtn");
if (profileForm && editProfileBtn) {
    const usernameInput = document.getElementById("username");
    const descriptionInput = document.getElementById("description");
    const usernameDisplay = document.getElementById("usernameDisplay");

    // Load profile on page load
    async function loadProfile() {
        try {
            const res = await fetch("/api/profile", {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (res.ok) {
                usernameInput.value = data.username || "";
                descriptionInput.value = data.description || "";
                usernameDisplay.innerText = data.username || "User";
            } else {
                console.warn("Profile load failed:", data.message);
            }
        } catch (err) {
            console.error("Error loading profile:", err);
        }
    }
    loadProfile();

    // Toggle edit/save
    editProfileBtn.addEventListener("click", async () => {
        if (editProfileBtn.innerText === "Edit Profile") {
            usernameInput.removeAttribute("readonly");
            descriptionInput.removeAttribute("readonly");
            editProfileBtn.innerText = "Save Profile";
        } else {
            try {
                const res = await fetch("/api/profile", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        username: usernameInput.value,
                        description: descriptionInput.value
                    })
                });

                const data = await res.json();
                if (res.ok) {
                    usernameDisplay.innerText = data.username;
                    usernameInput.setAttribute("readonly", true);
                    descriptionInput.setAttribute("readonly", true);
                    editProfileBtn.innerText = "Edit Profile";
                } else {
                    alert("Error saving profile: " + (data.message || "Invalid token"));
                }
            } catch (err) {
                console.error("Save profile error:", err);
            }
        }
    });
}

// --------------------- Services ---------------------
const serviceForm = document.getElementById("serviceForm");
const servicesList = document.getElementById("services-list");
if (serviceForm && servicesList) {
    async function loadServices() {
        try {
            const res = await fetch("/api/services", {
                headers: { "Authorization": `Bearer ${getToken()}` }
            });
            const data = await res.json();
            if (res.ok) {
                servicesList.innerHTML = "";
                data.forEach(service => {
                    const div = document.createElement("div");
                    div.className = "service-card";
                    div.innerHTML = `
                        <h3>${service.title}</h3>
                        <p>${service.description}</p>
                        <p><strong>$${service.price}</strong></p>
                        <button class="edit-btn" data-id="${service.id}">Edit</button>
                        <button class="delete-btn" data-id="${service.id}">Delete</button>
                    `;
                    servicesList.appendChild(div);
                });
            }
        } catch (err) {
            console.error("Error loading services:", err);
        }
    }
    loadServices();

    // Add new service
    serviceForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("service-title").value;
        const description = document.getElementById("service-description").value;
        const price = document.getElementById("service-price").value;

        try {
            const res = await fetch("/api/services", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getToken()}`
                },
                body: JSON.stringify({ title, description, price })
            });
            if (res.ok) {
                serviceForm.reset();
                loadServices();
            } else {
                const data = await res.json();
                alert("Error adding service: " + (data.message || "Invalid token"));
            }
        } catch (err) {
            console.error("Error adding service:", err);
        }
    });

    // Handle edit/delete buttons
    servicesList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const id = e.target.dataset.id;
            try {
                const res = await fetch(`/api/services/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${getToken()}` }
                });
                if (res.ok) loadServices();
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
        // Editing logic can be added later
    });
}

// --------------------- Logout ---------------------
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("token");
        window.location.href = "login.html";
    });
}
