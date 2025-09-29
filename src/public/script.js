// ================= API & Auth =================
const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

// ================= Signup Form =================
const signupForm = document.getElementById('registerForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();

        try {
            const res = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');

            // ✅ Save token & user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);

            window.location.href = 'profile.html';
        } catch (err) {
            const msg = document.getElementById('registerMessage');
            if (msg) msg.textContent = err.message;
        }
    });
}

// ================= Login Form =================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        try {
            const res = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            // ✅ Save token & user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);

            window.location.href = 'profile.html';
        } catch (err) {
            const msg = document.getElementById('loginMessage');
            if (msg) msg.textContent = err.message;
        }
    });
}
