const API_URL = 'https://codecrowds.onrender.com';

const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) return alert('All fields are required');

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Login failed');

        // Save token & userId for profile page
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);

        // Redirect to profile
        window.location.href = 'profile.html';
    } catch (err) {
        console.error('Login error:', err);
        alert('Login failed: ' + err.message);
    }
});
