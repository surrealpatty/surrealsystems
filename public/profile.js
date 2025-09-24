const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
if (!token) window.location.href = 'index.html';

const profileUsername = document.getElementById('profile-username');
const profileDescription = document.getElementById('profile-description');
const editDescBtn = document.getElementById('editDescBtn');
const servicesList = document.getElementById('services-list');
const logoutBtn = document.getElementById('logoutBtn');
const newServiceSection = document.getElementById('newServiceSection');
const createServiceBtn = document.getElementById('createServiceBtn');
const newServiceTitle = document.getElementById('newServiceTitle');
const newServiceDesc = document.getElementById('newServiceDesc');
const newServicePrice = document.getElementById('newServicePrice');

const goToServicesBtn = document.getElementById('goToServicesBtn');
const goToMessagesBtn = document.getElementById('goToMessagesBtn');
const addNewServiceBtn = document.getElementById('addNewServiceBtn');
const mobileServicesBtn = document.getElementById('mobileServicesBtn');
const mobileMessagesBtn = document.getElementById('mobileMessagesBtn');
const mobileAddServiceBtn = document.getElementById('mobileAddServiceBtn');

let userId = localStorage.getItem('profileUserId') || localStorage.getItem('userId');

// ---------------- Load Profile ----------------
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const user = await res.json();
        profileUsername.textContent = user.username || 'Unknown User';
        profileDescription.textContent = user.description || 'No description yet.';
        profileUsername.classList.add('fade-in');
        profileDescription.classList.add('fade-in');

        if (user.id == localStorage.getItem('userId')) editDescBtn.classList.remove('hidden');
    } catch (err) {
        console.error(err);
        profileUsername.textContent = 'Unknown User';
        profileDescription.textContent = 'Failed to load description';
    }
}

// ---------------- Edit / Save Description ----------------
let editingDesc = false;
editDescBtn.addEventListener('click', async () => {
    editingDesc = !editingDesc;
    profileDescription.contentEditable = editingDesc;
    editDescBtn.textContent = editingDesc ? 'Save Description' : 'Edit Description';

    if (!editingDesc) {
        const newDesc = profileDescription.textContent.trim();
        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ description: newDesc })
            });
            const updatedUser = await res.json();
            profileDescription.textContent = updatedUser.user?.description || newDesc;
        } catch (err) {
            console.error(err);
            alert('Failed to save description.');
        }
    }
});

// ---------------- Load Services ----------------
async function loadServices() {
    servicesList.innerHTML = '';

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const services = await res.json();
        const userServices = services.filter(s => s.user?.id == userId);

        if (!userServices.length) {
            const placeholder = document.createElement('div');
            placeholder.className = 'card fade-in';
            placeholder.innerHTML = `
                <h3>No Services Yet</h3>
                <p>Add your first service using the + Service button</p>
            `;
            servicesList.appendChild(placeholder);
            return;
        }

        userServices.forEach((s, i) => {
            const card = document.createElement('div');
            card.className = 'card fade-in';
            card.style.animationDelay = `${i * 0.1}s`;
            card.innerHTML = `<div class="spinner"></div>`;
            servicesList.appendChild(card);
        });

        await new Promise(r => setTimeout(r, 300));

        const cards = document.querySelectorAll('#services-list .card');
        userServices.forEach((s, i) => {
            cards[i].innerHTML = `
                <h3>${s.title}</h3>
                <p>${s.description}</p>
                <p><strong>Price:</strong> $${s.price}</p>
            `;
        });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = '<p>Failed to load services</p>';
    }
}

// ---------------- Toggle New Service Section ----------------
function toggleNewService() {
    newServiceSection.style.display = newServiceSection.style.display === 'flex' ? 'none' : 'flex';
}
addNewServiceBtn.addEventListener('click', toggleNewService);
mobileAddServiceBtn.addEventListener('click', toggleNewService);

// ---------------- Create New Service ----------------
createServiceBtn.addEventListener('click', async () => {
    const title = newServiceTitle.value.trim();
    const description = newServiceDesc.value.trim();
    const price = newServicePrice.value.trim();
    if (!title || !description || !price) return alert('All fields are required.');

    try {
        await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title, description, price })
        });
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

// ---------------- Navigation ----------------
goToServicesBtn.addEventListener('click', () => window.location.href = 'services.html');
goToMessagesBtn.addEventListener('click', () => window.location.href = 'messages.html');
mobileServicesBtn.addEventListener('click', () => window.location.href = 'services.html');
mobileMessagesBtn.addEventListener('click', () => window.location.href = 'messages.html');

// ---------------- Logout ----------------
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});

// ---------------- Initialize ----------------
window.addEventListener('load', async () => {
    await loadProfile();
    await loadServices();
});
