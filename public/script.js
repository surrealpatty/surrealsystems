// ---------------- API URL ----------------
const API_URL = 'https://codecrowds.onrender.com/api'; // your backend URL

// ---------------- Helpers ----------------
function showMessage(elementId, message, isSuccess = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('userId'); }

// ---------------- SIGNUP ----------------
const signupForm = document.getElementById('signupForm');
signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();

    if (!username || !email || !password) return showMessage('signupMessage', 'All fields required', false);

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        let data;
        try { data = await res.json(); } 
        catch(e) { data = { error: 'Invalid server response' }; }

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            showMessage('signupMessage', 'Sign up successful! Redirecting...', true);
            setTimeout(() => window.location.href='profile.html', 1000);
        } else showMessage('signupMessage', data.error || 'Sign up failed', false);

    } catch (err) {
        showMessage('signupMessage', 'Network error: ' + err.message, false);
    }
});

// ---------------- LOGIN ----------------
const loginForm = document.getElementById('loginForm');
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) return showMessage('loginMessage', 'Email & password required', false);

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        let data;
        try { data = await res.json(); } 
        catch(e) { data = { error: 'Invalid server response' }; }

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            showMessage('loginMessage', 'Login successful! Redirecting...', true);
            setTimeout(() => window.location.href='profile.html', 1000);
        } else showMessage('loginMessage', data.error || 'Login failed', false);

    } catch (err) {
        showMessage('loginMessage', 'Network error: ' + err.message, false);
    }
});

// ---------------- PROFILE ----------------
const profileForm = document.getElementById('profileForm');
if (profileForm) {
    const usernameInput = document.getElementById('username');
    const descInput = document.getElementById('description');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const servicesList = document.getElementById('services-list');
    const token = getToken();
    const userId = getUserId();

    if(!token || !userId) window.location.href='login.html';

    usernameDisplay.textContent = localStorage.getItem('username') || 'User';
    usernameInput.value = localStorage.getItem('username') || '';
    descInput.value = localStorage.getItem('description') || '';

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const description = descInput.value.trim();
        if(!username) return alert('Username required');

        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method:'PUT',
                headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ username, description })
            });

            let data;
            try { data = await res.json(); } 
            catch(e) { data = { error: 'Invalid server response' }; }

            if(res.ok){
                alert('Profile updated!');
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('description', data.user.description || '');
                usernameDisplay.textContent = data.user.username;
            } else alert(data.error || 'Update failed');

        } catch(err){ alert('Network error: '+err.message); }
    });

    // ---------------- SERVICES ----------------
    async function loadServices() {
        try {
            const res = await fetch(`${API_URL}/services`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let services;
            try { services = await res.json(); } 
            catch(e) { services = []; }

            servicesList.innerHTML = '';
            services.filter(s => s.userId == userId).forEach(s => {
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

        } catch(err) {
            servicesList.innerHTML = '<p class="error">Failed to load services</p>';
            console.error(err);
        }
    }
    loadServices();

    const serviceForm = document.getElementById('serviceForm');
    serviceForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('serviceTitle').value.trim();
        const description = document.getElementById('serviceDesc').value.trim();
        const price = parseFloat(document.getElementById('servicePrice').value);

        if(!title || !description || isNaN(price)) return alert('All fields required');

        try {
            const res = await fetch(`${API_URL}/services`, {
                method:'POST',
                headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ title, description, price })
            });

            if(res.ok){
                serviceForm.reset();
                loadServices();
            } else {
                let data;
                try { data = await res.json(); } catch(e){ data = { error: 'Invalid server response' }; }
                alert(data.error || 'Service creation failed');
            }

        } catch(err){ alert('Network error: '+err.message); }
    });

    function editService(service){
        const newTitle = prompt('Edit title', service.title);
        const newDesc = prompt('Edit description', service.description);
        const newPrice = parseFloat(prompt('Edit price', service.price));
        if(!newTitle || !newDesc || isNaN(newPrice)) return;

        fetch(`${API_URL}/services/${service.id}`, {
            method:'PUT',
            headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title:newTitle, description:newDesc, price:newPrice })
        }).then(async res => {
            if(res.ok) loadServices();
            else {
                let data;
                try { data = await res.json(); } catch(e){ data = { error: 'Invalid server response' }; }
                alert(data.error || 'Failed to update service');
            }
        }).catch(err => alert('Network error: '+err.message));
    }

    function deleteService(id){
        if(!confirm('Delete this service?')) return;
        fetch(`${API_URL}/services/${id}`, { method:'DELETE', headers:{ 'Authorization': `Bearer ${token}` } })
        .then(async res => {
            if(res.ok) loadServices();
            else {
                let data;
                try { data = await res.json(); } catch(e){ data = { error: 'Invalid server response' }; }
                alert(data.error || 'Failed to delete service');
            }
        }).catch(err => alert('Network error: '+err.message));
    }

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href='login.html';
    });
}
