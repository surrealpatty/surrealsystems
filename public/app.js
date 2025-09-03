const API_URL = 'http://localhost:3000';

// --------- REGISTER ---------
document.getElementById('registerForm').addEventListener('submit', async (e) => {
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
document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

// --------- LOAD SERVICES ---------
async function loadServices() {
  try {
    const res = await fetch(`${API_URL}/services`);
    const services = await res.json();

    const list = document.getElementById('services-list');
    list.innerHTML = '';

    services.forEach(s => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>${s.description}<br>Price: $${s.price}<hr>`;
      list.appendChild(div);
    });
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

// Load services on page load
loadServices();
