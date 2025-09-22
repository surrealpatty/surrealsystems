const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

// Redirect if not logged in
if (!token || !userId) window.location.href = 'index.html';

const usernameDisplay = document.getElementById('usernameDisplay');
const descriptionInput = document.getElementById('description');
const editProfileBtn = document.getElementById('editProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');
const goToServicesBtn = document.getElementById('goToServicesBtn');
const servicesList = document.getElementById('services-list');

// Load local user info
usernameDisplay.textContent = localStorage.getItem('username') || 'User';
descriptionInput.value = localStorage.getItem('description') || '';

// Toggle edit mode
let editing = false;
editProfileBtn.addEventListener('click', () => {
    editing = !editing;
    descriptionInput.readOnly = !editing;
    editProfileBtn.textContent = editing ? 'Save Profile' : 'Edit Profile';

    if (!editing) {
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

// Logout
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// Go to services
goToServicesBtn.addEventListener('click', () => {
    window.location.href = 'services.html';
});

// Load user services
async function loadUserServices() {
    if (!servicesList) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch services');

        const services = await res.json();
        servicesList.innerHTML = '';

        services.filter(s => s.User?.id == userId).forEach(s => {
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

window.addEventListener('load', loadUserServices);
