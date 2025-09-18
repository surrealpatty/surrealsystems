const API_URL = 'https://codecrowds.onrender.com';

// ---------- AUTH ----------
function getToken() {
    const token = localStorage.getItem('token');
    return token; // don't redirect here, let the calling function handle it
}

function getUserId() {
    const userId = localStorage.getItem('userId');
    return userId;
}

// ---------- LOGIN ----------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            window.location.href = 'profile.html';
        } catch (err) {
            document.getElementById('loginMessage').textContent = err.message;
        }
    });
}

// ---------- REGISTER ----------
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Registration failed');

            alert('Registration successful! Please login.');
            window.location.href = 'index.html';
        } catch (err) {
            document.getElementById('registerMessage').textContent = err.message;
        }
    });
}

// ---------- PROFILE ----------
const usernameInput = document.getElementById('username');
const descInput = document.getElementById('description');
const usernameDisplay = document.getElementById('usernameDisplay');
const editBtn = document.getElementById('editProfileBtn');

if (usernameInput) {
    usernameInput.value = localStorage.getItem('username') || '';
    descInput.value = localStorage.getItem('description') || '';
    usernameDisplay.textContent = localStorage.getItem('username') || 'User';
}

let editing = false;
if (editBtn) {
    editBtn.addEventListener('click', async () => {
        const token = getToken();
        const userId = getUserId();
        if (!token || !userId) return window.location.href = 'index.html';

        if (!editing) {
            usernameInput.readOnly = false;
            descInput.readOnly = false;
            editBtn.textContent = 'Save Profile';
            editing = true;
        } else {
            const newUsername = usernameInput.value.trim();
            const newDesc = descInput.value.trim();
            if (!newUsername) return alert('Username cannot be empty');

            try {
                const res = await fetch(`${API_URL}/users/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ username: newUsername, description: newDesc })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Profile update failed');

                localStorage.setItem('username', data.user.username);
                localStorage.setItem('description', data.user.description || '');
                usernameDisplay.textContent = data.user.username;

                usernameInput.readOnly = true;
                descInput.readOnly = true;
                editBtn.textContent = 'Edit Profile';
                editing = false;
                alert('Profile updated!');
            } catch (err) {
                alert(err.message);
            }
        }
    });
}

// ---------- SERVICES ----------
const servicesList = document.getElementById('services-list');
const serviceForm = document.getElementById('serviceForm');

async function loadServices() {
    const token = getToken();
    const userId = getUserId();
    if (!servicesList) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const services = await res.json();
        if (!res.ok) throw new Error(services.error || 'Failed to load services');

        servicesList.innerHTML = '';
        services.forEach(s => {
            // Use s.User.id if backend includes user association
            if (userId && s.User?.id != userId) return; // show only user's services

            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <h3>${s.title}</h3>
                <p>${s.description}</p>
                <p><strong>Price:</strong> $${s.price}</p>
            `;

            if (userId && s.User?.id == userId) {
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.className = 'edit-btn';
                editBtn.addEventListener('click', () => editService(s));
                div.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'delete-btn';
                deleteBtn.addEventListener('click', () => deleteService(s.id));
                div.appendChild(deleteBtn);
            }

            servicesList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = `<p class="error">Failed to load services: ${err.message}</p>`;
    }
}

if (serviceForm) {
    serviceForm.addEventListener('submit', async e => {
        e.preventDefault();
        const title = document.getElementById('service-title').value.trim();
        const description = document.getElementById('service-description').value.trim();
        const price = parseFloat(document.getElementById('service-price').value);
        const token = getToken();
        if (!token) return window.location.href = 'index.html';
        if (!title || !description || isNaN(price)) return alert('All fields required');

        try {
            const res = await fetch(`${API_URL}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, description, price }) // backend assigns userId
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to add service');
            }
            serviceForm.reset();
            loadServices();
        } catch (err) {
            alert(err.message);
        }
    });
}

async function editService(service) {
    const newTitle = prompt('Edit title', service.title);
    const newDesc = prompt('Edit description', service.description);
    const newPrice = parseFloat(prompt('Edit price', service.price));
    const token = getToken();
    if (!token) return;

    if (!newTitle || !newDesc || isNaN(newPrice)) return;

    try {
        const res = await fetch(`${API_URL}/services/${service.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to update service');
        }
        loadServices();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteService(id) {
    if (!confirm('Delete this service?')) return;
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete service');
        }
        loadServices();
    } catch (err) {
        alert(err.message);
    }
}

// ---------- LOGOUT ----------
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

// ---------- INIT ----------
if (servicesList) loadServices();
