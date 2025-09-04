const API_URL = 'https://codecrowds.onrender.com';

// Utility to show messages
function showMessage(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

// ===== REGISTER =====
const registerForm = document.getElementById('registerForm');
registerForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();
    if (!username || !email || !password) return showMessage('registerMessage', 'All fields required', false);

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();
        showMessage('registerMessage', data.message || data.error, res.ok);
        if (res.ok) e.target.reset();
    } catch (err) {
        showMessage('registerMessage', 'Error: ' + err.message, false);
    }
});

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) return showMessage('loginMessage', 'Email & password required', false);

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        showMessage('loginMessage', data.message || data.error, res.ok);
        if (res.ok) e.target.reset();
    } catch (err) {
        showMessage('loginMessage', 'Error: ' + err.message, false);
    }
});

// ===== LOAD SERVICES =====
async function loadServices() {
    const list = document.getElementById('services-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/services`);
        const services = await res.json();
        list.innerHTML = '';
        services.forEach((s) => {
            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <h3>${s.title}</h3>
                <p><strong>By:</strong> ${s.User?.username || 'Unknown'}</p>
                <p>${s.description}</p>
                <p><strong>Price:</strong> $${s.price}</p>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to load services:', err);
        list.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

// ===== ADD SERVICE =====
const serviceForm = document.getElementById('serviceForm');
serviceForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const price = parseFloat(document.getElementById('price').value);
    // TODO: Replace with logged-in user ID
    const userId = 1; // placeholder for now
    if (!title || !description || isNaN(price)) return showMessage('service-message', 'All fields required', false);

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, price, userId }),
        });
        const data = await res.json();
        showMessage('service-message', data.message || data.error, res.ok);
        if (res.ok) e.target.reset();
        loadServices();
    } catch (err) {
        showMessage('service-message', 'Error: ' + err.message, false);
    }
});

// ===== INITIALIZE =====
loadServices();
