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
            const user = data.user || data;
            localStorage.setItem('username', user.username);
            localStorage.setItem('userId', user.id);
            localStorage.setItem('description', user.description || '');
            showMessage('registerMessage', 'Registration successful!', true);

            setTimeout(() => {
                window.location.href = 'profile.html';
            }, 1000);
        } else {
            // Custom message if email is already used
            if (data.error && data.error.toLowerCase().includes('email')) {
                showMessage('registerMessage', 'Email already in use', false);
            } else {
                showMessage('registerMessage', data.error || 'Registration failed', false);
            }
        }
    } catch (err) {
        showMessage('registerMessage', 'Error: ' + err.message, false);
    }
});
