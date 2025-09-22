const API_URL = 'https://codecrowds.onrender.com';

// Elements
const usernameDisplay = document.getElementById('usernameDisplay');
const descriptionDisplay = document.getElementById('descriptionDisplay');
const usernameInput = document.getElementById('username');
const descriptionInput = document.getElementById('description');
const editBtn = document.getElementById('editProfileBtn');
const logoutBtn = document.getElementById('logoutBtn');

let editing = false;

// ---------- Helpers ----------
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = 'index.html'; return null; }
    return token;
}

function getUserId() {
    const userId = localStorage.getItem('userId');
    if (!userId) { window.location.href = 'index.html'; return null; }
    return userId;
}

// ---------- Load profile ----------
function loadProfile() {
    const username = localStorage.getItem('username') || 'User';
    const description = localStorage.getItem('description') || 'No description yet';

    usernameDisplay.textContent = username;
    descriptionDisplay.textContent = description;

    usernameInput.value = username;
    descriptionInput.value = description;
}

// ---------- Edit / Save ----------
editBtn.addEventListener('click', async () => {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    if (!editing) {
        usernameInput.readOnly = false;
        descriptionInput.readOnly = false;
        editBtn.textContent = 'Save Profile';
        editing = true;
    } else {
        const newUsername = usernameInput.value.trim();
        const newDesc = descriptionInput.value.trim();

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

            // Update localStorage
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');

            // Update page
            usernameDisplay.textContent = data.user.username;
            descriptionDisplay.textContent = data.user.description || '';

            usernameInput.readOnly = true;
            descriptionInput.readOnly = true;
            editBtn.textContent = 'Edit Profile';
            editing = false;

            alert('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            alert('Error saving profile: ' + err.message);
        }
    }
});

// ---------- Logout ----------
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ---------- Initialize ----------
window.onload = () => {
    loadProfile();
};
