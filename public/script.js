// Handle Signup
async function signup(event) {
    event.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    const res = await fetch('/users/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('description', data.user.description || '');
        window.location.href = 'profile.html';
    } else {
        alert(data.error || 'Signup failed');
    }
}

// Handle Login
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch('/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('description', data.user.description || '');
        window.location.href = 'profile.html';
    } else {
        alert(data.error || 'Login failed');
    }
}

// Load Profile
async function loadProfile() {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
        window.location.href = 'index.html';
        return;
    }

    const res = await fetch(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    if (res.ok) {
        document.getElementById('usernameDisplay').innerText = data.username;
        document.getElementById('username').value = data.username;
        document.getElementById('description').value = data.description || '';
    } else {
        alert(data.error || 'Failed to load profile');
    }
}

// Save Profile Changes
async function saveProfile(username, description) {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    const res = await fetch(`/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ username, description })
    });

    const data = await res.json();
    if (res.ok) {
        document.getElementById('usernameDisplay').innerText = data.user.username;
        alert('Profile updated successfully');
    } else {
        alert(data.error || 'Error saving profile');
    }
}

// Logout
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}
