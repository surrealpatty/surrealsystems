const API_URL = 'https://codecrowds.onrender.com';

// Show message helper
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
        return showMessage('registerMessage', 'All fields are required', false);
    }

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // Save user info locally for profile page
            const user = data.user || data;
            localStorage.setItem('username', user.username);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('description', user.description || '');

            showMessage('registerMessage', 'Registration successful!', true);

            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);

        } else {
            // Check for common errors
            if (data.error?.toLowerCase().includes('email')) {
                showMessage('registerMessage', 'Email is already in use', false);
            } else if (data.error?.toLowerCase().includes('username')) {
                showMessage('registerMessage', 'Username is already taken', false);
            } else {
                showMessage('registerMessage', data.error || 'Registration failed', false);
            }
        }

    } catch (err) {
        showMessage('registerMessage', 'Network or server error: ' + err.message, false);
    }
});
