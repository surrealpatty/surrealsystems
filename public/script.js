// scrpt.js

// Automatically use the current origin (works locally and on Render)
const API_URL = window.location.origin;

// Helper function to show messages
function showMessage(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.className = "message " + (isSuccess ? "success" : "error");
    }
}

// ----------------------
// Register
// ----------------------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value.trim();

        if (!username || !email || !password) {
            return showMessage('registerMessage', 'All fields are required', false);
        }

        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();
            showMessage('registerMessage', data.message || data.error, res.ok);

            if (res.ok) registerForm.reset();
        } catch (err) {
            showMessage('registerMessage', 'Error: ' + err.message, false);
        }
    });
}

// ----------------------
// Login
// ----------------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!email || !password) {
            return showMessage('loginMessage', 'Email and password are required', false);
        }

        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            showMessage('loginMessage', data.message || data.error, res.ok);

            if (res.ok) loginForm.reset();
        } catch (err) {
            showMessage('loginMessage', 'Error: ' + err.message, false);
        }
    });
}

// ----------------------
// Services
// ----------------------
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
const serviceForm = document.getElementById('service-form');
if (serviceForm) {
    serviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('service-title').value.trim();
        const description = document.getElementById('service-description').value.trim();
        const price = parseFloat(document.getElementById('service-price').value);
        const userId = document.getElementById('service-userId').value.trim();

        if (!title || !description || isNaN(price) || !userId) {
            return alert('All fields are required for service');
        }

        try {
            const res = await fetch(`${API_URL}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, price, userId })
            });

            const data = await res.json();
            alert(data.message || data.error);
            loadServices();
            serviceForm.reset();
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });
}

// Load services on page load
loadServices();
