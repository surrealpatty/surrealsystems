const API_URL = 'https://codecrowds.onrender.com';

// -----------------
// HELPER FUNCTIONS
// -----------------
function showMessage(elementId, message, isSuccess = true) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `message ${isSuccess ? 'success' : 'error'}`;
}

function getToken() { return localStorage.getItem('token'); }
function getUserId() { return localStorage.getItem('userId'); }

// -----------------
// SIGNUP
// -----------------
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value.trim();
    if (!username || !email || !password) return alert('All fields required!');

    try {
        const res = await fetch(`${API_URL}/users/register`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            window.location.href = 'profile.html';
        } else {
            showMessage('signupMessage', data.error || 'Registration failed', false);
        }
    } catch(err) { showMessage('signupMessage', err.message, false); }
});

// -----------------
// LOGIN
// -----------------
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) return alert('Email & password required!');

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            window.location.href = 'profile.html';
        } else {
            showMessage('loginMessage', data.error || 'Login failed', false);
        }
    } catch(err) { showMessage('loginMessage', err.message, false); }
});

// -----------------
// PROFILE PAGE
// -----------------
if (document.getElementById('profileForm')) {
    const token = getToken();
    const userId = getUserId();
    if (!token || !userId) { window.location.href='login.html'; }

    const usernameInput = document.getElementById('profileUsername');
    const descInput = document.getElementById('profileDescription');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const servicesList = document.getElementById('services-list');

    usernameInput.value = localStorage.getItem('username') || '';
    descInput.value = localStorage.getItem('description') || '';
    usernameDisplay.textContent = localStorage.getItem('username') || 'User';

    // Update profile
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        const description = descInput.value.trim();
        if (!username) return alert('Username required');

        try {
            const res = await fetch(`${API_URL}/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json','Authorization': `Bearer ${token}` },
                body: JSON.stringify({ username, description })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Profile updated!');
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('description', data.user.description || '');
                usernameDisplay.textContent = data.user.username;
            } else alert(data.error || 'Update failed');
        } catch(err) { alert('Network error: '+err.message); }
    });

    // Load user services
    async function loadUserServices() {
        try {
            const res = await fetch(`${API_URL}/services`, { headers: {'Authorization':`Bearer ${token}`} });
            const services = await res.json();
            servicesList.innerHTML = '';
            services.filter(s=>s.userId==userId).forEach(s=>{
                const div = document.createElement('div');
                div.className='service-card';
                div.innerHTML=`<h3>${s.title}</h3><p>${s.description}</p><p><strong>Price:</strong> $${s.price}</p>`;
                servicesList.appendChild(div);
            });
        } catch(err) { console.error(err); servicesList.innerHTML='<p class="error">Failed to load services</p>'; }
    }
    loadUserServices();

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href='login.html';
    });
}

// -----------------
// SERVICES PAGE
// -----------------
if (document.getElementById('serviceForm')) {
    const token = getToken();
    const userId = getUserId();
    const servicesList = document.getElementById('services-list');
    const messageEl = document.getElementById('service-message');

    if (!token || !userId) { window.location.href='login.html'; }

    async function loadServices() {
        try {
            const res = await fetch(`${API_URL}/services`, { headers: {'Authorization': `Bearer ${token}`} });
            const services = await res.json();
            servicesList.innerHTML = '';
            services.forEach(s=>{
                const div = document.createElement('div');
                div.className='service-card';
                div.innerHTML=`<h3>${s.title}</h3><p>${s.description}</p><p><strong>Price:</strong> $${s.price}</p><p><strong>By User ID:</strong> ${s.userId}</p>`;
                servicesList.appendChild(div);
            });
        } catch(err) { servicesList.innerHTML='<p class="error">Failed to load services</p>'; console.error(err); }
    }
    loadServices();

    document.getElementById('serviceForm').addEventListener('submit', async (e)=>{
        e.preventDefault();
        const title = document.getElementById('service-title').value.trim();
        const description = document.getElementById('service-description').value.trim();
        const price = parseFloat(document.getElementById('service-price').value);
        if (!title || !description || !price) return;

        try {
            const res = await fetch(`${API_URL}/services`, {
                method: 'POST',
                headers: {'Content-Type':'application/json','Authorization': `Bearer ${token}`},
                body: JSON.stringify({ title, description, price, userId })
            });
            const data = await res.json();
            if (res.ok) {
                messageEl.textContent='Service added successfully!';
                messageEl.className='message success';
                document.getElementById('serviceForm').reset();
                loadServices();
            } else {
                messageEl.textContent=data.error || 'Failed to add service';
                messageEl.className='message error';
            }
        } catch(err){
            messageEl.textContent='Network error: '+err.message;
            messageEl.className='message error';
            console.error(err);
        }
    });

    document.getElementById('backProfileBtn')?.addEventListener('click', ()=>window.location.href='profile.html');
}
