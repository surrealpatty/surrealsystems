const API_URL = "https://codecrowds.onrender.com";

// ==========================
// REGISTER
// ==========================
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (!username || !email || !password) return alert("All fields required");

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
            window.location.href = "profile.html";
        } else {
            alert(data.error || "Registration failed");
        }
    } catch (err) {
        alert("Network error: "+err.message);
    }
});

// ==========================
// LOGIN
// ==========================
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!email || !password) return alert("Email & password required");

    try {
        const res = await fetch(`${API_URL}/users/login`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({email,password})
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            window.location.href = "profile.html";
        } else {
            alert(data.error || "Login failed");
        }
    } catch(err) {
        alert("Network error: "+err.message);
    }
});

// ==========================
// PROFILE UPDATE
// ==========================
document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const username = document.getElementById('profileUsername')?.value.trim() || document.getElementById('username')?.value.trim();
    const description = document.getElementById('profileDescription')?.value.trim() || document.getElementById('description')?.value.trim();

    if (!userId || !token) return alert("Not logged in");
    if (!username) return alert("Username required");

    try {
        const res = await fetch(`${API_URL}/users/${userId}`, {
            method:'PUT',
            headers:{
                'Content-Type':'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, description })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            alert("Profile updated!");
        } else {
            alert(data.error || "Update failed");
        }
    } catch(err) {
        alert("Network error: "+err.message);
    }
});

// ==========================
// LOGOUT
// ==========================
document.querySelectorAll('.logout-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
});

// ==========================
// LOAD SERVICES
// ==========================
async function loadServices(targetElementId) {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token) return;

    const el = document.getElementById(targetElementId);
    if (!el) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers:{'Authorization': `Bearer ${token}`}
        });
        const services = await res.json();
        el.innerHTML = '';
        services.forEach(s => {
            const div = document.createElement('div');
            div.className = 'service-card';
            div.innerHTML = `
                <h3>${s.title}</h3>
                <p>${s.description}</p>
                <p><strong>Price:</strong> $${s.price}</p>
                <p><strong>By User ID:</strong> ${s.userId}</p>
            `;
            el.appendChild(div);
        });
    } catch(err) {
        el.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

// ==========================
// ADD SERVICE
// ==========================
document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    const title = document.getElementById('service-title').value.trim();
    const description = document.getElementById('service-description').value.trim();
    const price = parseFloat(document.getElementById('service-price').value);
    const messageEl = document.getElementById('service-message');

    if (!title || !description || !price) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            method:'POST',
            headers:{
                'Content-Type':'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description, price, userId })
        });
        const data = await res.json();
        if (res.ok) {
            messageEl.textContent = "Service added!";
            messageEl.className = 'message success';
            document.getElementById('serviceForm').reset();
            loadServices('services-list');
        } else {
            messageEl.textContent = data.error || "Failed";
            messageEl.className = 'message error';
        }
    } catch(err) {
        messageEl.textContent = "Network error: "+err.message;
        messageEl.className = 'message error';
    }
});
