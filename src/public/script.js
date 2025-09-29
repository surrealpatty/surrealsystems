const API_URL = 'https://codecrowds.onrender.com/users'; // ⚡ matches backend
const token = localStorage.getItem('token');

// ---------------- Signup ----------------
const signupForm = document.getElementById('registerForm');
if (signupForm) {
  signupForm.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);

      window.location.href = 'profile.html';
    } catch (err) {
      document.getElementById('registerMessage').textContent = err.message;
    }
  });
}

// ---------------- Login ----------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('username', data.user.username);

      window.location.href = 'profile.html';
    } catch (err) {
      document.getElementById('loginMessage').textContent = err.message;
      console.error('Login error:', err);
    }
  });
}

// ---------------- Load Profile ----------------
async function loadProfile() {
  const profileEl = document.getElementById('profileContent');
  if (!profileEl) return;

  try {
    const res = await fetch('https://codecrowds.onrender.com/users/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load profile');

    profileEl.textContent = `Username: ${data.user.username}\nEmail: ${data.user.email}\nTier: ${data.user.tier}\nDescription: ${data.user.description || 'N/A'}`;
  } catch (err) {
    profileEl.textContent = 'Error loading profile: ' + err.message;
  }
}

// Run on profile page
if (document.getElementById('profileContent')) loadProfile();
