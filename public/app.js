const API_URL = 'http://localhost:3000';

// --------- REGISTER ---------
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const messageEl = document.getElementById('registerMessage');

  try {
    const res = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.textContent = data.message;
      messageEl.className = 'message success';
      e.target.reset();
    } else {
      messageEl.textContent = data.error;
      messageEl.className = 'message error';
    }
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'message error';
  }
});

// --------- LOGIN ---------
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const messageEl = document.getElementById('loginMessage');

  try {
    const res = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.textContent = '✅ Login successful!';
      messageEl.className = 'message success';

      // Save token + user info in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    } else {
      messageEl.textContent = data.error;
      messageEl.className = 'message error';
    }
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'message error';
  }
});

// --------- LOAD SERVICES ---------
async function loadServices() {
  try {
    const res = await fetch(`${API_URL}/services`);
    const services = await res.json();

    const list = document.getElementById('services-list');
    if (!list) return;

    list.innerHTML = '';

    services.forEach(s => {
      const div = document.createElement('div');
      div.innerHTML = `
        <strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>
        ${s.description}<br>
        Price: $${s.price}<hr>`;
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

// Load services if the element exists
if (document.getElementById('services-list')) {
  loadServices();
}

// --------- POST SERVICE (Dashboard) ---------
document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('serviceTitle').value.trim();
  const description = document.getElementById('serviceDesc').value.trim();
  const price = document.getElementById('servicePrice').value.trim();
  const messageEl = document.getElementById('serviceMessage');

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      messageEl.textContent = 'You must be logged in to post a service.';
      messageEl.className = 'message error';
      return;
    }

    const res = await fetch(`${API_URL}/services`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, price })
    });

    const data = await res.json();

    if (res.ok) {
      messageEl.textContent = data.message || 'Service posted!';
      messageEl.className = 'message success';
      e.target.reset();
      loadServices(); // refresh service list
    } else {
      messageEl.textContent = data.error;
      messageEl.className = 'message error';
    }
  } catch (err) {
    messageEl.textContent = err.message;
    messageEl.className = 'message error';
  }
});
