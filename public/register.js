// public/register.js
// Registration form logic (deferred script)

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    // Config
    const API_URL = "/api"; // adjust if your server is mounted elsewhere
    const USERS = API_URL + "/users";

    // Elements (guarded)
    const form = document.getElementById("registerForm");
    const msg = document.getElementById("registerMessage");
    const submitBtn = document.getElementById("submitBtn");
    const usernameEl = document.getElementById("registerUsername");
    const emailEl = document.getElementById("registerEmail");
    const passwordEl = document.getElementById("registerPassword");
    const descEl = document.getElementById("registerDescription");
    const descCounter = document.getElementById("descCounter");
    const togglePasswordBtn = document.getElementById("togglePassword");
    const strengthEl = document.getElementById("passwordStrength");

    if (!form) {
      console.warn("register.js: registerForm not found, aborting script.");
      return;
    }

    // Helpers
    function setMsg(text, type = "info", allowHtml = false) {
      if (!msg) {
        console[type === "error" ? "error" : "log"]("[register] " + text);
        return;
      }
      if (allowHtml) msg.innerHTML = text || "";
      else msg.textContent = text || "";
      msg.className = "message " + (type || "info");
      msg.style.display = text ? "" : "none";
    }

    function escapeHtml(s) {
      return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function passwordScore(pw) {
      if (!pw) return 0;
      let s = 0;
      if (pw.length >= 8) s++;
      if (/[A-Z]/.test(pw)) s++;
      if (/[a-z]/.test(pw)) s++;
      if (/[0-9]/.test(pw)) s++;
      if (/[^A-Za-z0-9]/.test(pw)) s++;
      return Math.min(s, 5);
    }

    function renderStrength(pw) {
      if (!strengthEl) return;
      const score = passwordScore(pw);
      const labels = [
        "Too weak",
        "Very weak",
        "Weak",
        "Okay",
        "Strong",
        "Very strong",
      ];
      strengthEl.setAttribute("data-score", String(score));
      strengthEl.textContent = labels[score] || "";
    }

    function profileURL() {
      return new URL("profile.html", window.location.href).toString();
    }

    // POST JSON and include same-origin credentials so cookies are handled
    async function postJSON(url, body) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "same-origin", // <-- important for HttpOnly cookie
        });
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          data = {};
        }
        return { ok: res.ok, status: res.status, data: data };
      } catch (err) {
        return Promise.reject(err);
      }
    }

    function saveAuth(d) {
      if (d && d.token && d.user && d.user.id != null) {
        try {
          localStorage.setItem("token", d.token);
          localStorage.setItem("userId", d.user.id);
          if (d.user.username) localStorage.setItem("username", d.user.username);
        } catch (e) {
          console.warn("Could not save auth to localStorage", e);
        }
        return true;
      }
      return false;
    }

    function redirectToProfile() {
      const target = profileURL();
      window.location.replace(target);
      setTimeout(function () {
        if (!/profile\.html/i.test(location.href)) location.assign(target);
      }, 300);
    }

    // Robust error extractor
    function extractErrorText(resp) {
      if (!resp) return null;
      if (typeof resp === "string" && resp.trim()) return resp;
      if (typeof resp.message === "string" && resp.message.trim()) return resp.message;
      if (typeof resp.error === "string" && resp.error.trim()) return resp.error;
      if (typeof resp.error === "object" && resp.error !== null) {
        if (typeof resp.error.message === "string" && resp.error.message.trim())
          return resp.error.message;
        if (Array.isArray(resp.error.details) && resp.error.details.length) {
          try {
            return resp.error.details
              .map((d) => (typeof d === "string" ? d : d.message || JSON.stringify(d)))
              .join("; ");
          } catch (e) {}
        }
      }
      if (Array.isArray(resp.errors) && resp.errors.length) {
        try {
          return resp.errors
            .map((e) => (typeof e === "string" ? e : e.message || JSON.stringify(e)))
            .join("; ");
        } catch (e) {}
      }
      if (Array.isArray(resp.details) && resp.details.length) {
        try {
          return resp.details
            .map((e) => (typeof e === "string" ? e : e.message || JSON.stringify(e)))
            .join("; ");
        } catch (e) {}
      }
      try {
        const s = JSON.stringify(resp);
        if (s && s !== "{}" && s !== "[]") return s;
      } catch (e) {}
      return null;
    }

    // Render list of validation items (if present)
    function renderValidationDetails(resp) {
      if (!resp || !resp.error) return null;
      const details = resp.error.details || resp.errors || resp.details;
      if (!Array.isArray(details) || !details.length) return null;
      const items = details
        .map((d) => (typeof d === "string" ? escapeHtml(d) : escapeHtml(d.message || JSON.stringify(d))))
        .map((t) => `<li>${t}</li>`)
        .join("");
      return `<div class="validation-details"><strong>Problems:</strong><ul>${items}</ul></div>`;
    }

    // Event wiring (guard elements)
    if (descEl && descCounter) {
      descEl.addEventListener("input", function () {
        descCounter.textContent = descEl.value.length + " / 400";
      });
    }

    // SHOW / HIDE PASSWORD for register page
    if (togglePasswordBtn && passwordEl) {
      togglePasswordBtn.addEventListener("click", function () {
        const isPwd = passwordEl.type === "password";
        passwordEl.type = isPwd ? "text" : "password";
        togglePasswordBtn.setAttribute("aria-pressed", String(isPwd));
        togglePasswordBtn.title = isPwd ? "Hide password" : "Show password";
        togglePasswordBtn.textContent = isPwd ? "Hide" : "Show";
      });
    }

    if (passwordEl) {
      passwordEl.addEventListener("input", function (e) {
        renderStrength(e.target.value);
      });
    }

    // Client-side validation: require >=8 chars, but warn (don't block) on weak passwords
    function validate() {
      if (!usernameEl || !/^[A-Za-z0-9_]{3,32}$/.test(usernameEl.value.trim())) {
        setMsg("Username must be 3–32 characters and only letters, numbers, or underscores.", "error");
        usernameEl && usernameEl.focus();
        return false;
      }
      if (!emailEl || !emailEl.validity.valid) {
        setMsg("Please enter a valid email address.", "error");
        emailEl && emailEl.focus();
        return false;
      }
      if (!passwordEl || passwordEl.value.length < 8) {
        setMsg("Password must be at least 8 characters.", "error");
        passwordEl && passwordEl.focus();
        return false;
      }

      const score = passwordScore(passwordEl.value);
      if (score < 3) {
        setMsg(
          "Password meets the minimum length but is weak — consider adding numbers, uppercase letters, or symbols to make it stronger.",
          "info"
        );
      } else {
        setMsg("", "info");
      }

      return true;
    }

    // Submit handler
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setMsg("", "info");
      if (!validate()) return;

      const payload = {
        username: usernameEl ? usernameEl.value.trim() : "",
        email: emailEl ? emailEl.value.trim() : "",
        password: passwordEl ? passwordEl.value : "",
        description: descEl ? descEl.value.trim() : "",
      };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating...";
      }

      postJSON(USERS + "/register", payload)
        .then(async function (r) {
          console.log("[register] response:", r);

          if (r.ok && r.data && r.data.user) {
            try {
              if (r.data.user.id != null) localStorage.setItem("userId", String(r.data.user.id));
              if (r.data.user.username) localStorage.setItem("username", r.data.user.username);
            } catch (e) {
              console.warn("Could not save user info locally", e);
            }
            setMsg("Registration successful! Redirecting…", "success");
            redirectToProfile();
            return;
          }

          const gotToken = r.ok && saveAuth(r.data);
          if (gotToken) {
            setMsg("Registration successful! Redirecting…", "success");
            redirectToProfile();
            return;
          }

          if (r.ok) {
            try {
              const tryEmail = payload.email
                ? await postJSON(USERS + "/login", {
                    email: payload.email,
                    password: payload.password,
                  })
                : null;
              if (tryEmail && tryEmail.ok && saveAuth(tryEmail.data)) {
                setMsg("Registration successful! Redirecting…", "success");
                redirectToProfile();
                return;
              }
              const tryUsername = await postJSON(USERS + "/login", {
                username: payload.username,
                password: payload.password,
              });
              if (tryUsername && tryUsername.ok && saveAuth(tryUsername.data)) {
                setMsg("Registration successful! Redirecting…", "success");
                redirectToProfile();
                return;
              }
            } catch (e) {
              console.warn("Post-registration login attempt failed", e);
            }
          }

          const validationHtml = renderValidationDetails(r.data);
          const extracted = extractErrorText(r.data);
          if (validationHtml) {
            setMsg(
              `<div class="register-error"><p>${escapeHtml(extracted || "Validation failed")}</p>${validationHtml}</div>`,
              "error",
              true
            );
          } else {
            const errText = extracted || "Registration failed (HTTP " + r.status + ")";
            setMsg(errText, "error");
          }
        })
        .catch(function (err) {
          console.error("[register] network error:", err);
          setMsg("Network error, please try again.", "error");
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Create account";
          }
        });
    });

    // Initial UI
    if (usernameEl) usernameEl.focus();
    renderStrength(passwordEl ? passwordEl.value : "");
    if (descCounter && descEl)
      descCounter.textContent = (descEl.value.length || 0) + " / 400";
  });
})();
