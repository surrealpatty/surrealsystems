const API_URL = 'http://localhost:3000';

// Helper for messages
function showMessage(id, msg, isSuccess) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = 'message ' + (isSuccess ? 'success' : 'error');
}

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    const res = await fetch(`${API_URL}/users/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    showMessage('registerMessage', data.message || data.error, res.ok);
    if(res.ok) document.getElementById('registerForm').reset();
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const res = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    showMessage('loginMessage', data.message || data.error, res.ok);
    if(res.ok) document.getElementById('loginForm').reset();
});

// Load services
async function loadServices() {
    const res = await fetch(`${API_URL}/services`);
    const services = await res.json();
    const list = document.getElementById('services-list');
    list.innerHTML = '';
    services.forEach(s => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>${s.description}<br>Price: $${s.price}<hr>`;
        list.appendChild(div);
    });
}
loadServices();
