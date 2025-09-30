// ---------------- Constants ----------------
const API_URL = '/api/users'; // backend users API
const SERVICE_API = '/api/services';
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
        const res = await fetch(`${API_URL}/${localStorage.getItem('userId')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load profile');

        profileEl.textContent = `
Username: ${data.user.username}
Email: ${data.user.email}
Tier: ${data.user.tier || 'Free'}
Description: ${data.user.description || 'N/A'}
        `;
    } catch (err) {
        profileEl.textContent = 'Error loading profile: ' + err.message;
    }
}

if (document.getElementById('profileContent')) loadProfile();

// ---------------- Create Service ----------------
const serviceForm = document.getElementById('serviceForm');
if (serviceForm) {
    serviceForm.addEventListener('submit', async e => {
        e.preventDefault();

        const title = document.getElementById('serviceTitle').value.trim();
        const description = document.getElementById('serviceDescription').value.trim();
        const price = document.getElementById('servicePrice').value.trim();

        if (!title || !description || !price) {
            document.getElementById('serviceMessage').textContent = 'All fields are required';
            return;
        }

        try {
            const res = await fetch(SERVICE_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, price })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create service');

            document.getElementById('serviceMessage').textContent = 'Service created successfully!';
            serviceForm.reset();
            console.log('Created service:', data.service);
        } catch (err) {
            document.getElementById('serviceMessage').textContent = err.message;
            console.error('Service creation error:', err);
        }
    });
}

// ---------------- Logout ----------------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = 'index.html';
    });
}
