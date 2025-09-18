const API_URL = 'https://codecrowds.onrender.com';
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) {
        loginMessage.textContent = 'Please fill in all fields.';
        loginMessage.style.color = 'red';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
            loginMessage.textContent = data.error || 'Login failed';
            loginMessage.style.color = 'red';
        } else {
            // Save token and userId
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);

            // Redirect to services or profile page
            window.location.href = 'services.html';
        }
    } catch (err) {
        loginMessage.textContent = 'Network error: ' + err.message;
        loginMessage.style.color = 'red';
    }
});
