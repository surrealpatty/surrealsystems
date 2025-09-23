const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const profileUsername = document.getElementById('profile-username');
const profileDescription = document.getElementById('profile-description');
const editDescBtn = document.getElementById('editDescBtn');
const goToServicesBtn = document.getElementById('goToServicesBtn');
const goToMessagesBtn = document.getElementById('goToMessagesBtn');
const servicesList = document.getElementById('services-list');
const logoutBtn = document.getElementById('logoutBtn');

const toggleNewServiceBtn = document.getElementById('toggleNewServiceBtn');
const newServiceSection = document.getElementById('newServiceSection');
const createServiceBtn = document.getElementById('createServiceBtn');
const newServiceTitle = document.getElementById('newServiceTitle');
const newServiceDesc = document.getElementById('newServiceDesc');
const newServicePrice = document.getElementById('newServicePrice');

let userId = localStorage.getItem('userId');

// ---------------- Load Profile ----------------
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const userData = await res.json();
        const user = userData.user || userData;

        userId = user.id;
        localStorage.setItem('userId', userId);
        localStorage.setItem('username', user.username || '');
        localStorage.setItem('description', user.description || '');

        profileUsername.textContent = user.username || 'Unknown User';
        profileDescription.textContent = user.description || 'No description yet.';
    } catch (err) {
        console.error(err);
        profileUsername.textContent = 'Unknown User';
        profileDescription.textContent = 'Failed to load description';
    }
}

// ---------------- Edit / Save Description ----------------
let editing = false;
editDescBtn.addEventListener('click', async () => {
    editing = !editing;
    profileDescription.contentEditable = editing ? 'true' : 'false';
    editDescBtn.textContent = editing ? 'Save Description' : 'Edit Description';

    if (!editing && userId) {
        const newDesc = profileDescription.textContent.trim();
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ description: newDesc })
            });
            if (!res.ok) throw new Error('Failed to update description');
            const data = await res.json();
            const updatedUser = data.user || data;

            profileUsername.textContent = updatedUser.username || profileUsername.textContent;
            profileDescription.textContent = updatedUser.description || newDesc;
            localStorage.setItem('description', updatedUser.description || newDesc);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error(err);
            profileDescription.textContent = localStorage.getItem('description') || 'Failed to save';
            alert('Failed to save description.');
        }
    }
});

// ---------------- Load Services ----------------
async function loadServices() {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/services`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch services');
        const data = await res.json();
        const services = data.services || data;

        const userServices = services.filter(s => s.user?.id == userId);
        servicesList.innerHTML = '';

        if (!userServices.length) {
            servicesList.innerHTML = '<p>No services yet.</p>';
            return;
        }

        userServices.forEach(s => {
            const div = document.createElement('div');
            div.className = 'card';
            div.innerHTML = `<h3>${s.title}</h3><p>${s.description}</p><p><strong>Price:</strong> $${s.price}</p>`;
            servicesList.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

// ---------------- Toggle New Service Section ----------------
toggleNewServiceBtn.addEventListener('click', () => {
    newServiceSection.style.display = newServiceSection.style.display === 'flex' ? 'none' : 'flex';
});

// ---------------- Create New Service ----------------
createServiceBtn.addEventListener('click', async () => {
    const title = newServiceTitle.value.trim();
    const description = newServiceDesc.value.trim();
    const price = newServicePrice.value.trim();
    if (!title || !description || !price) return alert('All fields are required.');

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title, description, price })
        });
        if (!res.ok) throw new Error('Failed to create service');

        alert('Service created successfully!');
        newServiceTitle.value = '';
        newServiceDesc.value = '';
        newServicePrice.value = '';
        newServiceSection.style.display = 'none';
        await loadServices();
    } catch (err) {
        console.error(err);
        alert('Failed to create service.');
    }
});

// ---------------- Logout ----------------
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ---------------- Go to other pages ----------------
goToServicesBtn.addEventListener('click', () => { window.location.href = 'services.html'; });
goToMessagesBtn.addEventListener('click', () => { window.location.href = 'messages.html'; });

// ---------------- Initialize ----------------
window.addEventListener('load', async () => {
    await loadProfile();
    await loadServices();
});
