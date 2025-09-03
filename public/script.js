const API_URL = 'https://codecrowds.onrender.com'; // Render URL

function showMessage(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = "message " + (isSuccess ? "success" : "error");
}

// Register
document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!username || !email || !password)
        return showMessage('registerMessage', 'All fields required', false);

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        showMessage('registerMessage', data.message || data.error, res.ok);
        if (res.ok) e.target.reset();
    } catch (err) {
        showMessage('registerMessage', 'Error: ' + err.message, false);
    }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password)
        return showMessage('loginMessage', 'Email & password required', false);

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        showMessage('loginMessage', data.message || data.error, res.ok);
        if (res.ok) e.target.reset();
    } catch (err) {
        showMessage('loginMessage', 'Error: ' + err.message, false);
    }
});

// Load services
async function loadServices() {
    const list = document.getElementById('services-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/services`);
        const services = await res.json();
        list.innerHTML = '';
        services.forEach(s => {
            const div = document.createElement('div');
            div.innerHTML = `
                <strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>
                ${s.description}<br>
                Price: $${s.price}<hr>
            `;
            list.appendChild(div);
        });
    } catch (err) {
        console.error('Failed to load services:', err);
    }
}

// Add service
document.getElementById('service-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const title = document.getElementById('service-title').value.trim();
    const description = document.getElementById('service-description').value.trim();
    const price = parseFloat(document.getElementById('service-price').value);
    const userId = document.getElementById('service-userId').value.trim();

    if (!title || !description || isNaN(price) || !userId) return alert('All fields required');

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, price, userId })
        });
        const data = await res.json();
        alert(data.message || data.error);
        loadServices();
        e.target.reset();
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// Initial load
loadServices();
