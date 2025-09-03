// Helper function to show messages
function showMessage(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = "message " + (isSuccess ? "success" : "error");
}

// ----------------------
// Registration
// ----------------------
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("regUsername").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value.trim();

        if (!username || !email || !password) {
            return showMessage("registerMessage", "All fields are required.", false);
        }

        try {
            const res = await fetch("http://localhost:3000/users/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();
            showMessage("registerMessage", data.message || "Registration failed.", res.ok);

            if (res.ok) registerForm.reset();
        } catch (err) {
            showMessage("registerMessage", "Error: " + err.message, false);
        }
    });
}

// ----------------------
// Login
// ----------------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();

        if (!email || !password) {
            return showMessage("loginMessage", "Email and password are required.", false);
        }

        try {
            const res = await fetch("http://localhost:3000/users/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            showMessage("loginMessage", data.message || "Login failed.", res.ok);

            if (res.ok) {
                loginForm.reset();
                // Optional: redirect to dashboard
                // window.location.href = "/dashboard.html";
            }
        } catch (err) {
            showMessage("loginMessage", "Error: " + err.message, false);
        }
    });
}
