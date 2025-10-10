const API_URL = 'https://codecrowds.onrender.com/api';
const token = localStorage.getItem('token');
const currentUserId = localStorage.getItem('userId');

if (!token || !currentUserId) window.location.href = 'index.html';

const profileUsername = document.getElementById('profile-username');
const profileDescription = document.getElementById('profile-description');
const editDescBtn = document.getElementById('editDescBtn');
const servicesList = document.getElementById('services-list');
const newServiceSection = document.getElementById('newServiceSection');
const newServiceTitle = document.getElementById('newServiceTitle');
const newServiceDesc = document.getElementById('newServiceDesc');
const newServicePrice = document.getElementById('newServicePrice');
const createServiceBtn = document.getElementById('createServiceBtn');
const addNewServiceBtn = document.getElementById('addNewServiceBtn');
const mobileAddServiceBtn = document.getElementById('mobileAddServiceBtn');
const logoutBtn = document.getElementById('logoutBtn');
const goToServicesBtn = document.getElementById('goToServicesBtn');
const goToMessagesBtn = document.getElementById('goToMessagesBtn');
const mobileServicesBtn = document.getElementById('mobileServicesBtn');
const mobileMessagesBtn = document.getElementById('mobileMessagesBtn');

// ---------------- Load Profile ----------------
async function loadProfile() {
    try {
        const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Failed to fetch profile');
        const data = await res.json();
        const user = data.user;

        profileUsername.textContent = user.username || 'Unknown User';
        profileDescription.textContent = user.description || 'No description yet.';
        profileUsername.classList.add('fade-in');
        profileDescription.classList.add('fade-in');

        editDescBtn.classList.remove('hidden');
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
            const res = await fetch(`${API_URL}/users/me/description`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ description: newDesc })
            });
            const data = await res.json();
            profileDescription.textContent = data.user?.description || newDesc;
        } catch (err) {
            console.error(err);
            alert('Failed to save description.');
        }
    }
});

// ---------------- Load Services ----------------
async function loadServices() {
    servicesList.innerHTML = `<p><span class="spinner"></span> Loading services...</p>`;
    try {
        const res = await fetch(`${API_URL}/services`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        const services = data.services || [];
        const userServices = services.filter(s => s.user?.id == currentUserId);

        servicesList.innerHTML = '';
        if (!userServices.length) {
            const placeholder = document.createElement('div');
            placeholder.className = 'card fade-in';
            placeholder.innerHTML = `<h3>No Services Yet</h3><p>Add your first service using the + Service button</p>`;
            servicesList.appendChild(placeholder);
            return;
        }

        userServices.forEach((s) => {
            const div = document.createElement('div');
            div.className = 'card fade-in';
            div.innerHTML = `
                <h3 class="service-title">${s.title}</h3>
                <p class="service-desc">${s.description}</p>
                <p><strong>Price:</strong> $<span class="service-price">${s.price}</span></p>
                <div class="service-buttons">
                    <button class="edit-service-btn">Edit</button>
                    <button class="delete-service-btn">Delete</button>
                </div>
            `;
            servicesList.appendChild(div);

            div.querySelector('.edit-service-btn').addEventListener('click', () => editService(div, s));
            div.querySelector('.delete-service-btn').addEventListener('click', () => deleteService(s.id));
        });
    } catch (err) {
        console.error(err);
        servicesList.innerHTML = '<p>Failed to load services</p>';
    }
}

// ---------------- Edit / Delete Service ----------------
async function editService(div, service) {
    const titleEl = div.querySelector('.service-title');
    const descEl = div.querySelector('.service-desc');
    const priceEl = div.querySelector('.service-price');

    const origTitle = titleEl.textContent;
    const origDesc = descEl.textContent;
    const origPrice = priceEl.textContent;

    titleEl.innerHTML = `<input type="text" value="${origTitle}" class="edit-title">`;
    descEl.innerHTML = `<textarea class="edit-desc">${origDesc}</textarea>`;
    priceEl.innerHTML = `<input type="number" value="${origPrice}" class="edit-price">`;

    const buttonsDiv = div.querySelector('.service-buttons');
    buttonsDiv.innerHTML = `<button class="save-btn">Save</button><button class="cancel-btn">Cancel</button>`;

    buttonsDiv.querySelector('.save-btn').addEventListener('click', async () => {
        const updatedTitle = div.querySelector('.edit-title').value.trim();
        const updatedDesc = div.querySelector('.edit-desc').value.trim();
        const updatedPrice = div.querySelector('.edit-price').value.trim();
        if (!updatedTitle || !updatedDesc || !updatedPrice) return alert('All fields are required.');

        try {
            await fetch(`${API_URL}/services/${service.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: updatedTitle, description: updatedDesc, price: updatedPrice })
            });
            await loadServices();
        } catch (err) {
            console.error(err);
            alert('Failed to update service.');
        }
    });

    buttonsDiv.querySelector('.cancel-btn').addEventListener('click', loadServices);
}

async function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
        await fetch(`${API_URL}/services/${serviceId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        await loadServices();
    } catch (err) {
        console.error(err);
        alert('Failed to delete service.');
    }
}

// ---------------- Toggle / Create New Service ----------------
function toggleNewService() {
    newServiceSection.style.display = newServiceSection.style.display === 'flex' ? 'none' : 'flex';
}
addNewServiceBtn.addEventListener('click', toggleNewService);
mobileAddServiceBtn.addEventListener('click', toggleNewService);

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

// ---------------- Initial Load ----------------
window.addEventListener('load', async () => {
    await loadProfile();
    await loadServices();
});
