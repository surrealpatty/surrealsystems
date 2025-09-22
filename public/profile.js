// ================= API & Auth =================
const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

// Redirect to login if not authenticated
if (!token || !userId) window.location.href = 'index.html';

// ================= DOM Elements =================
const usernameDisplay = document.getElementById('usernameDisplay');
const descriptionInput = document.getElementById('description');
const profileForm = document.getElementById('profileForm');
const editProfileBtn = document.getElementById('editProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const goToServicesBtn = document.getElementById('goToServicesBtn');
const servicesList = document.getElementById('services-list');

// Load user info from localStorage
usernameDisplay.textContent = localStorage.getItem('username') || 'User';
descriptionInput.value = localStorage.getItem('description') || '';

// ================= Profile Editing =================
let editing = false;
editProfileBtn.addEventListener('click', () => {
    editing = !editing;
    descriptionInput.readOnly = !editing;
    editProfileBtn.textContent = editing ? 'Save Profile' : 'Edit Profile';

    if (!editing) {
        // Save profile when clicking "Save Profile"
        const description = descriptionInput.value.trim();

        fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ description })
        })
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                localStorage.setItem('description', data.user.description || '');
                usernameDisplay.textContent = data.user.username || usernameDisplay.textContent;
                alert('Profile updated successfully!');
            } else {
                alert(data.error || 'Failed to update profile');
            }
        })
        .catch(err => {
            console.error(err);
            alert('Network error: ' + err.message);
        });
    }
});

// ================= Logout Button =================
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('description');
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
            .filter(s => s.User?.id == userId) // Compare string to string
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

// Load services on page load
window.addEventListener('load', loadUserServices);
