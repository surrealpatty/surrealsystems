const API_URL = 'https://codecrowds.onrender.com';

// Utility
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

// Profile Elements
const usernameDisplay = document.getElementById('usernameDisplay');
const descriptionDisplay = document.getElementById('descriptionDisplay');
const descriptionInput = document.getElementById('descriptionInput');
const editBtn = document.getElementById('editProfileBtn');

let editing = false;

// Load profile from API
async function loadProfile() {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    try {
        const res = await fetch(`${API_URL}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        usernameDisplay.textContent = data.username || 'User';
        descriptionDisplay.textContent = data.description || 'No description yet';
        descriptionInput.value = data.description || '';
    } catch (err) {
        console.error(err);
    }
}

// Toggle edit/save
editBtn.addEventListener('click', async () => {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    if (!editing) {
        // Enter edit mode
        descriptionDisplay.style.display = 'none';
        descriptionInput.style.display = 'block';
        editBtn.textContent = 'Save Profile';
        editing = true;
    } else {
        // Save changes
        const newDesc = descriptionInput.value.trim();
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ description: newDesc })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Profile update failed');

            descriptionDisplay.textContent = data.user.description || 'No description yet';
            descriptionDisplay.style.display = 'block';
            descriptionInput.style.display = 'none';
            editBtn.textContent = 'Edit Profile';
            editing = false;
            alert('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            alert('Error saving profile: ' + err.message);
        }
    }
});

// ---------- Services ----------
const servicesList = document.getElementById('services-list');
const serviceForm = document.getElementById('serviceForm');

async function loadServices() {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const services = await res.json();
        servicesList.innerHTML = '';
        services.filter(s => s.userId == userId).forEach(s => {
            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `<h3>${s.title}</h3><p>${s.description}</p><p><strong>Price:</strong> $${s.price}</p>
                <button class="edit-btn">Edit</button> <button class="delete-btn">Delete</button>`;
            div.querySelector('.edit-btn').addEventListener('click', () => editService(s));
            div.querySelector('.delete-btn').addEventListener('click', () => deleteService(s.id));
            servicesList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = `<p class="error">Failed to load services: ${err.message}</p>`;
    }
}

serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    const title = document.getElementById('service-title').value.trim();
    const description = document.getElementById('service-description').value.trim();
    const price = parseFloat(document.getElementById('service-price').value);

    if (!title || !description || !price) return alert('All fields are required');

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, description, price, userId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add service');

        serviceForm.reset();
        loadServices();
    } catch (err) {
        console.error(err);
        alert('Error adding service: ' + err.message);
    }
});

async function deleteService(id) {
    const token = getToken();
    if (!token) return;
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete service');
        loadServices();
    } catch (err) {
        console.error(err);
        alert('Error deleting service: ' + err.message);
    }
}

function editService(service) {
    const newTitle = prompt('Edit Title', service.title);
    const newDesc = prompt('Edit Description', service.description);
    const newPrice = prompt('Edit Price', service.price);

    if (newTitle && newDesc && newPrice) updateService(service.id, newTitle, newDesc, newPrice);
}

async function updateService(id, title, description, price) {
    const token = getToken();
    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title, description, price })
        });
        if (!res.ok) throw new Error('Failed to update service');
        loadServices();
    } catch (err) {
        console.error(err);
        alert('Error updating service: ' + err.message);
    }
}

// ---------- Messages ----------
const messagesList = document.getElementById('messages-list');

async function loadMessages() {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

    try {
        const res = await fetch(`${API_URL}/messages?receiverId=${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const text = await res.text();
        let messages;
        try { messages = JSON.parse(text); } 
        catch { messages = []; }

        messagesList.innerHTML = '';
        if (messages.length === 0) {
            messagesList.innerHTML = '<p>No messages</p>';
            return;
        }

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = 'message-card';
            div.innerHTML = `<h4>From: ${msg.senderName || 'User'}</h4>
                             <p>${msg.content}</p>
                             <p><small>${new Date(msg.createdAt).toLocaleString()}</small></p>`;
            messagesList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        messagesList.innerHTML = `<p class="error">Failed to load messages: ${err.message}</p>`;
    }
}

// ---------- Logout ----------
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ---------- Go to Services Page ----------
document.getElementById('goToServicesBtn').addEventListener('click', () => {
    window.location.href = 'services.html';
});

// Load on page load
window.onload = () => {
    loadProfile();
    loadMessages();
    loadServices();
};
