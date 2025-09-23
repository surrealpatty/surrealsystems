// ================= API & Auth =================
const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');

if (!token) window.location.href = 'index.html';

// ================= DOM Elements =================
const usernameDisplay = document.getElementById('usernameDisplay');
const descriptionInput = document.getElementById('description');
const editProfileBtn = document.getElementById('editProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const goToServicesBtn = document.getElementById('goToServicesBtn');
const servicesList = document.getElementById('services-list');

let userId = localStorage.getItem('userId'); // will be set after fetching profile

// ================= Load Profile =================
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const user = await res.json();

        // Save userId in localStorage
        userId = user.id;
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', user.username);

        // Update DOM
        usernameDisplay.textContent = user.username || 'Unknown User';
        descriptionInput.value = user.description || '';

    } catch (err) {
        console.error(err);
        usernameDisplay.textContent = 'Unknown User';
        descriptionInput.value = 'Failed to load description';
    }
}

// ================= Profile Editing =================
let editing = false;
editProfileBtn.addEventListener('click', async () => {
    editing = !editing;
    descriptionInput.readOnly = !editing;
    editProfileBtn.textContent = editing ? 'Save Profile' : 'Edit Profile';

    if (!editing) {
        const description = descriptionInput.value.trim();
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ description })
            });
            const data = await res.json();

            if (data.user) {
                descriptionInput.value = data.user.description || '';
                usernameDisplay.textContent = data.user.username || usernameDisplay.textContent;
                localStorage.setItem('description', data.user.description || '');
                alert('Profile updated successfully!');
            } else {
                alert(data.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            alert('Network error: ' + err.message);
        }
    }
});

// ================= Logout =================
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ================= Go to Services Page =================
goToServicesBtn.addEventListener('click', () => {
    window.location.href = 'services.html';
});

// ================= Load User Services =================
async function loadUserServices() {
    if (!servicesList) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch services');

        const services = await res.json();
        servicesList.innerHTML = '';

        services
            .filter(s => s.User?.id == userId)
            .forEach(s => {
                const div = document.createElement('div');
                div.className = 'service-card';
                div.innerHTML = `
                    <h3>${s.title}</h3>
                    <p>${s.description}</p>
                    <p><strong>Price:</strong> $${s.price}</p>
                `;
                servicesList.appendChild(div);
            });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

// ================= Load everything on page load =================
window.addEventListener('load', () => {
    loadProfile();
    loadUserServices();
});
