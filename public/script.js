const API_URL = 'https://codecrowds.onrender.com';

// Helper to show messages
function showMessage(elementId, message, isSuccess) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

// -------------------- Register --------------------
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value.trim();

    if (!username || !email || !password) {
        return showMessage('registerMessage', 'All fields required', false);
    }

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        const data = await res.json();

        if (res.ok) {
            // Store user info for profile page
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.id); // Make sure backend returns user ID
            localStorage.setItem('description', data.description || '');
            
            showMessage('registerMessage', 'Registration successful!', true);

            // Redirect after short delay so message shows
            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        } else {
            showMessage('registerMessage', data.error || 'Registration failed', false);
        }
    } catch (err) {
        showMessage('registerMessage', 'Error: ' + err.message, false);
    }
});

// -------------------- Login --------------------
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
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

        if (res.ok) {
            // Save user info for profile page
            localStorage.setItem('username', data.username);
            localStorage.setItem('userId', data.id);
            localStorage.setItem('description', data.description || '');
            
            showMessage('loginMessage', 'Login successful!', true);

            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 500);
        } else {
            showMessage('loginMessage', data.error || 'Login failed', false);
        }
    } catch (err) {
        showMessage('loginMessage', 'Error: ' + err.message, false);
    }
});

// -------------------- Load services --------------------
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
        if (list) list.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

// -------------------- Add service --------------------
document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('service-title').value.trim();
    const description = document.getElementById('service-description').value.trim();
    const price = parseFloat(document.getElementById('service-price').value);
    const userId = localStorage.getItem('userId'); // use logged-in user

    if (!title || !description || isNaN(price) || !userId) {
        return alert('All fields required');
    }

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, price, userId }),
        });
        const data = await res.json();
        alert(data.message || data.error);
        loadServices();
        e.target.reset();
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

// -------------------- Initial load on services page --------------------
loadServices();
