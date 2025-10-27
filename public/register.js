// public/register.js

// Config
var API_URL = '/api'; // adjust if your server is mounted elsewhere
var USERS = API_URL + '/users';

// Elements
var form = document.getElementById('registerForm');
var msg = document.getElementById('registerMessage');
var submitBtn = document.getElementById('submitBtn');
var usernameEl = document.getElementById('registerUsername');
var emailEl = document.getElementById('registerEmail');
var passwordEl = document.getElementById('registerPassword');
var descEl = document.getElementById('registerDescription');
var descCounter = document.getElementById('descCounter');
var togglePasswordBtn = document.getElementById('togglePassword');
var strengthEl = document.getElementById('passwordStrength');

// Helpers
function setMsg(text, type) {
  msg.textContent = text || '';
  msg.className = 'message ' + (type || 'info');
}

function passwordScore(pw) {
  if (!pw) return 0;
  var s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 5);
}
function renderStrength(pw) {
  var score = passwordScore(pw);
  var labels = ['Too weak', 'Very weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
  strengthEl.setAttribute('data-score', String(score));
  strengthEl.textContent = labels[score] || '';
}
function profileURL() { return new URL('profile.html', window.location.href).toString(); }

// Make a JSON POST and parse safely
function postJSON(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (res) {
    return res.text().then(function (text) {
      var data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (e) { data = {}; }
      return { ok: res.ok, status: res.status, data: data };
    });
  });
}

function saveAuth(d) {
  if (d && d.token && d.user && d.user.id != null) {
    localStorage.setItem('token', d.token);
    localStorage.setItem('userId', d.user.id);
    if (d.user.username) localStorage.setItem('username', d.user.username);
    return true;
  }
  return false;
}

function redirectToProfile() {
  var target = profileURL();
  window.location.replace(target);
  setTimeout(function () {
    if (!/profile\.html/i.test(location.href)) location.assign(target);
  }, 300);
}

// Events
descEl.addEventListener('input', function () {
  descCounter.textContent = descEl.value.length + ' / 400';
});
togglePasswordBtn.addEventListener('click', function () {
  var isPwd = passwordEl.type === 'password';
  passwordEl.type = isPwd ? 'text' : 'password';
  togglePasswordBtn.setAttribute('aria-pressed', String(isPwd));
  togglePasswordBtn.title = isPwd ? 'Hide password' : 'Show password';
  togglePasswordBtn.textContent = isPwd ? 'Hide' : 'Show';
});
passwordEl.addEventListener('input', function (e) { renderStrength(e.target.value); });

// Client-side validation
function validate() {
  if (usernameEl.value.trim().length < 3) {
    setMsg('Username must be at least 3 characters.', 'error');
    usernameEl.focus(); return false;
  }
  if (!emailEl.validity.valid) {
    setMsg('Please enter a valid email address.', 'error');
    emailEl.focus(); return false;
  }
  if (passwordEl.value.length < 8) {
    setMsg('Password must be at least 8 characters.', 'error');
    passwordEl.focus(); return false;
  }
  return true;
}

// Submit
form.addEventListener('submit', function (e) {
  e.preventDefault();
  setMsg('');
  if (!validate()) return;

  var payload = {
    username: usernameEl.value.trim(),
    email: emailEl.value.trim(),
    password: passwordEl.value,
    description: descEl.value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating...';

  // 1) Register
  postJSON(USERS + '/register', payload)
    .then(async function (r) {
      console.log('[register] response:', r);

      // If server returned token+user, save and go
      var gotToken = r.ok && saveAuth(r.data);
      if (gotToken) {
        setMsg('Registration successful! Redirecting…', 'success');
        redirectToProfile();
        return;
      }

      // If no token was returned but registration is OK (some servers return 201 with empty body)
      if (r.ok) {
        // attempt login with the same credentials (email first, then username)
        const tryEmail = payload.email ? await postJSON(USERS + '/login', { email: payload.email, password: payload.password }) : null;
        if (tryEmail && tryEmail.ok && saveAuth(tryEmail.data)) {
          setMsg('Registration successful! Redirecting…', 'success');
          redirectToProfile();
          return;
        }
        const tryUsername = await postJSON(USERS + '/login', { username: payload.username, password: payload.password });
        if (tryUsername.ok && saveAuth(tryUsername.data)) {
          setMsg('Registration successful! Redirecting…', 'success');
          redirectToProfile();
          return;
        }
      }

      // Not success — show message from backend if present
      var errText = (r.data && (r.data.error || r.data.message)) || ('Registration failed (HTTP ' + r.status + ')');
      setMsg(errText, 'error');
    })
    .catch(function (err) {
      console.error('[register] network error:', err);
      setMsg('Network error, please try again.', 'error');
    })
    .finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    });
});

// Initial UI
usernameEl.focus();
renderStrength(passwordEl.value);
descCounter.textContent = (descEl.value.length || 0) + ' / 400';
