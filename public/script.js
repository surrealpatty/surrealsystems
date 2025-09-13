const API_URL = 'https://codecrowds.onrender.com/api'; // backend base URL

// ---------- Helpers ----------
function showMessage(elementId, message, isSuccess = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('userId'); }

// ---------- Safe Fetch Helper ----------
async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';

        let data;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            const text = await res.text();
            console.error('Non-JSON response:', text);
            throw new Error('Server returned non-JSON response');
        }

        if (!res.ok) throw new Error(data.error || 'Server error');
        return data;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}

// ---------- SIGNUP ----------
const signupForm = document.getElementById('signupForm');
signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    if (!username || !email || !password) return showMessage('signupMessage', 'All fields required', false);

    try {
        const data = await safeFetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('description', data.user.description || '');
        showMessage('signupMessage', 'Sign up successful! Redirecting...', true);
        setTimeout(() => window.location.href = 'profile.html', 1000);

    } catch (err) {
        showMessage('signupMessage', 'Sign up failed: ' + err.message, false);
    }
});

// ---------- LOGIN ----------
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) return showMessage('loginMessage', 'Email & password required', false);

    try {
        const data = await safeFetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('description', data.user.description || '');
        showMessage('loginMessage', 'Login successful! Redirecting...', true);
        setTimeout(() => window.location.href = 'profile.html', 1000);

    } catch (err) {
        showMessage('loginMessage', 'Login failed: ' + err.message, false);
    }
});

// ---------- PROFILE & SERVICES ----------
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    const usernameInput = document.getElementById('username');
    const descInput = document.getElementById('description');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const servicesList = document.getElementById('services-list');
    const serviceForm = document.getElementById('serviceForm');

    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) window.location.href = 'login.html';

    usernameDisplay.textContent = localStorage.getItem('username') || 'User';
    usernameInput.value = localStorage.getItem('username') || '';
    descInput.value = localStorage.getItem('description') || '';

    // Update Profile
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const description = descInput.value.trim();
        if (!username) return alert('Username required');

        try {
            const data = await safeFetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, description })
            });

            alert('Profile updated!');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            usernameDisplay.textContent = data.user.username;

        } catch (err) {
            alert('Profile update failed: ' + err.message);
        }
    });

    // Load Services
    async function loadServices() {
        try {
            const services = await safeFetch(`${API_URL}/services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            servicesList.innerHTML = '';
            services.filter(s => s.userId == userId).forEach(s => {
                const div = document.createElement('div');
                div.className = 'service-card';
                div.innerHTML = `
                    <h3>${s.title}</h3>
                    <p>${s.description}</p>
                    <p><strong>Price:</strong> $${s.price}</p>
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                `;

                div.querySelector('.edit-btn').addEventListener('click', () => editService(s));
                div.querySelector('.delete-btn').addEventListener('click', () => deleteService(s.id));
                servicesList.appendChild(div);
            });

        } catch (err) {
            servicesList.innerHTML = '<p class="error">Failed to load services</p>';
        }
    }
    loadServices();

    // Add Service
    serviceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('serviceTitle').value.trim();
        const description = document.getElementById('serviceDesc').value.trim();
        const price = parseFloat(document.getElementById('servicePrice').value);

        if (!title || !description || !price) return alert('All fields required');

        try {
            await safeFetch(`${API_URL}/services`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, price })
            });

            serviceForm.reset();
            loadServices();

        } catch (err) {
            alert('Failed to add service: ' + err.message);
        }
    });

    // Edit Service
    async function editService(service) {
        const newTitle = prompt('Edit title', service.title);
        const newDesc = prompt('Edit description', service.description);
        const newPrice = parseFloat(prompt('Edit price', service.price));
        if (!newTitle || !newDesc || !newPrice) return;

        try {
            await safeFetch(`${API_URL}/services/${service.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice })
            });
            loadServices();
        } catch (err) {
            alert('Failed to update service: ' + err.message);
        }
    }

    // Delete Service
    async function deleteService(id) {
        if (!confirm('Delete this service?')) return;
        try {
            await safeFetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadServices();
        } catch (err) {
            alert('Failed to delete service: ' + err.message);
        }
    }

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}
