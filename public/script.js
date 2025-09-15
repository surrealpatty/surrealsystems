// ---------- Constants ----------
const API_URL = 'https://codecrowds.onrender.com';

// ---------- Helpers ----------
function showMessage(elementId, message, isSuccess = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('userId'); }

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        const contentType = res.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) data = await res.json();
        else throw new Error(await res.text());
        if (!res.ok) throw new Error(data.error || 'Server error');
        return data;
    } catch (err) {
        console.error('Fetch error:', err);
        throw err;
    }
}

// ---------- Profile ----------
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    const usernameInput = document.getElementById('username');
    const descInput = document.getElementById('description');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const servicesList = document.getElementById('services-list');
    const serviceForm = document.getElementById('serviceForm');

    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) window.location.href = 'login.html';

    usernameDisplay.textContent = localStorage.getItem('username') || 'User';
    usernameInput.value = localStorage.getItem('username') || '';
    descInput.value = localStorage.getItem('description') || '';

    // ---------- About Me Lock/Unlock ----------
    let locked = true;
    descInput.readOnly = locked;

    const toggleLockBtn = document.createElement('button');
    toggleLockBtn.type = 'button';
    toggleLockBtn.textContent = 'Unlock About Me';
    profileForm.appendChild(toggleLockBtn);

    const saveDescBtn = document.createElement('button');
    saveDescBtn.type = 'button';
    saveDescBtn.textContent = 'Save About Me';
    saveDescBtn.disabled = true;
    profileForm.appendChild(saveDescBtn);

    toggleLockBtn.addEventListener('click', () => {
        locked = !locked;
        descInput.readOnly = locked;
        toggleLockBtn.textContent = locked ? 'Unlock About Me' : 'Lock About Me';
        saveDescBtn.disabled = locked;
    });

    saveDescBtn.addEventListener('click', async () => {
        const description = descInput.value.trim();
        if (!description) return alert('Description cannot be empty');
        try {
            const data = await safeFetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ description })
            });
            localStorage.setItem('description', data.user.description || '');
            alert('About Me updated successfully!');
            locked = true;
            descInput.readOnly = true;
            toggleLockBtn.textContent = 'Unlock About Me';
            saveDescBtn.disabled = true;
        } catch (err) {
            alert('Failed to update About Me: ' + err.message);
        }
    });

    // ---------- Services ----------
    async function loadServices() {
        try {
            const services = await safeFetch(`${API_URL}/services`, { headers: { 'Authorization': `Bearer ${token}` } });
            servicesList.innerHTML = '';
            services.filter(s => s.userId == parseInt(userId)).forEach(s => {
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
            servicesList.innerHTML = '<p class="error">Failed to load services</p>';
        }
    }
    loadServices();

    serviceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('service-title').value.trim();
        const description = document.getElementById('service-description').value.trim();
        const priceRaw = document.getElementById('service-price').value;
        const price = parseFloat(priceRaw);
        if (!title || !description || isNaN(price)) return alert('All fields required');

        try {
            await safeFetch(`${API_URL}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, description, price })
            });
            serviceForm.reset();
            loadServices();
        } catch (err) {
            alert('Failed to add service: ' + err.message);
        }
    });

    async function editService(service) {
        const newTitle = prompt('Edit title', service.title);
        const newDesc = prompt('Edit description', service.description);
        const newPriceRaw = prompt('Edit price', service.price);
        const newPrice = parseFloat(newPriceRaw);
        if (!newTitle || !newDesc || isNaN(newPrice)) return;

        try {
            await safeFetch(`${API_URL}/services/${service.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice })
            });
            loadServices();
        } catch (err) {
            alert('Failed to update service: ' + err.message);
        }
    }

    async function deleteService(id) {
        if (!confirm('Delete this service?')) return;
        try {
            await safeFetch(`${API_URL}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            loadServices();
        } catch (err) {
            alert('Failed to delete service: ' + err.message);
        }
    }

    // ---------- Logout ----------
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}
