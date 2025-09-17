const API_URL = 'https://codecrowds.onrender.com';

// ---------- AUTH ----------
function getToken() {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';
    return token;
}

function getUserId() {
    const userId = localStorage.getItem('userId');
    if (!userId) window.location.href = 'index.html';
    return userId;
}

// ---------- SERVICES ----------
const servicesList = document.getElementById('servicesList');

async function loadServices() {
    const token = getToken();
    const userId = getUserId();
    if (!servicesList) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`Failed to load services: ${res.status}`);

        const services = await res.json();
        servicesList.innerHTML = '';

        services.forEach(s => {
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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title: newTitle, description: newDesc, price: newPrice })
        });
        if (!res.ok) throw new Error('Failed to update service');
        loadServices();
    } catch (err) { alert(err.message); }
}

async function deleteService(id) {
    if (!confirm('Delete this service?')) return;
    const token = getToken();
    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete service');
        loadServices();
    } catch (err) { alert(err.message); }
}

// ---------- INIT ----------
window.onload = loadServices;
