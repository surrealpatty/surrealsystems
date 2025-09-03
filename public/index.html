// Helper function to show messages
function showMessage(elementId, message, isSuccess) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.className = "message " + (isSuccess ? "success" : "error");
}

// Handle registration
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;

  try {
    const res = await fetch("http://localhost:3000/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    showMessage("registerMessage", data.message || "Registration failed.", res.ok);
    if (res.ok) document.getElementById("registerForm").reset();
  } catch (err) {
    showMessage("registerMessage", "Error: " + err.message, false);
  }
});

// Handle login
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch("http://localhost:3000/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    showMessage("loginMessage", data.message || "Login failed.", res.ok);
    if (res.ok) document.getElementById("loginForm").reset();
  } catch (err) {
    showMessage("loginMessage", "Error: " + err.message, false);
  }
});
