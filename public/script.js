const API_URL = 'https://codecrowds.onrender.com';

// ---------- Auth ---------- 
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return null;
    }
    return token;
}

function getUserId() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'index.html';
        return null;
    }
    return userId;
}

// ---------- Profile Elements ----------
const usernameInput = document.getElementById('username');
const descInput = document.getElementById('description');
const usernameDisplay = document.getElementById('usernameDisplay');
const editBtn = document.getElementById('editProfileBtn');

usernameInput.value = localStorage.getItem('username') || '';
descInput.value = localStorage.getItem('description') || '';
usernameDisplay.textContent = localStorage.getItem('username') || 'User';

let editing = false;

editBtn.addEventListener('click', async () => {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) return;

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

            // Save updated info
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            usernameDisplay.textContent = data.user.username;

            usernameInput.readOnly = true;
            descInput.readOnly = true;
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
        if (!res.ok) throw new Error(services.error || 'Failed to load services');

        servicesList.innerHTML = '';
        services
            .filter(s => s.userId == userId) // convert types if needed
            .forEach(s => {
                const div = document.createElement('div');
                div.className = 'service-card';
                div.innerHTML = `
                    <h3>${s.title}</h3>
                    <p>${s.description}</p>
                    <p><strong>Price:</strong> $${s.price}</p>
                    <button class="edit-btn">Edit</button>
                    <button class="delete-btn">Delete</button>
                `;
                div.querySelector('.edit-btn').addEventListener('click', () => editService(s));
                div.querySelector('.delete-btn').addEventListener('click', () => deleteService(s.id));
                servicesList.appendChild(div);
            });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = `<p class="error">Failed to load services: ${err.message}</p>`;
    }
}
loadServices();

// ---------- Add Service ----------
serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('service-title').value.trim();
    const description = document.getElementById('service-description').value.trim();
    const price = parseFloat(document.getElementById('service-price').value);
    const token = getToken();

    if (!title || !description || isNaN(price)) return alert('All fields are required');

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title, description, price })
        });
        if (!res.ok) throw new Error('Failed to add service');
        serviceForm.reset();
        loadServices();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

// ---------- Edit Service ----------
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
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice })
        });
        if (!res.ok) throw new Error('Failed to update service');
        loadServices();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// ---------- Delete Service ----------
async function deleteService(id) {
    if (!confirm('Delete this service?')) return;
    const token = getToken();
    if (!token) return;

    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete service');
        loadServices();
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}

// ---------- Logout ----------
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});
