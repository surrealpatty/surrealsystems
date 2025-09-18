// ================= API & Auth =================
const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

// ================= Signup Form =================
const signupForm = document.getElementById('registerForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();

        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Signup failed');

            // Save token & user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);

            // Redirect to profile
            window.location.href = 'profile.html';
        } catch (err) {
            const msg = document.getElementById('registerMessage');
            if (msg) msg.textContent = err.message;
        }
    });
}

// ================= Login Form =================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Login failed');

            // Save token & user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('userId', data.user.id);
            localStorage.setItem('username', data.user.username);

            // Redirect to profile
            window.location.href = 'profile.html';
        } catch (err) {
            const msg = document.getElementById('loginMessage');
            if (msg) msg.textContent = err.message;
        }
    });
}

// ================= Service Listing =================
const servicesList = document.getElementById('servicesList');

// Redirect if not logged in and servicesList exists
if (!token && servicesList) window.location.href = 'index.html';

async function loadServices() {
    if (!servicesList) return;

    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to fetch services');

        const services = await res.json();
        servicesList.innerHTML = '';

        services.forEach(service => {
            const postedBy = service.User?.username || 'Unknown';
            const serviceOwnerId = service.User?.id ?? service.userId;

            const card = document.createElement('div');
            card.className = 'service-card';
            card.innerHTML = `
                <div class="service-title">${service.title}</div>
                <div class="service-description">${service.description}</div>
                <div class="service-user">Posted by: ${postedBy}</div>
                <div class="hire-form" style="display:none; flex-direction:column; gap:5px;">
                    <textarea placeholder="Hi ${postedBy}, I'm interested in your service."></textarea>
                    <button>Send Message</button>
                    <p class="response"></p>
                </div>
            `;

            const form = card.querySelector('.hire-form');
            const textarea = form.querySelector('textarea');
            const button = form.querySelector('button');
            const responseMsg = form.querySelector('.response');

            // Toggle form visibility
            card.addEventListener('click', e => {
                if (!e.target.closest('button') && !e.target.closest('textarea')) {
                    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
                }
            });

            // Clear response when typing
            textarea.addEventListener('input', () => {
                responseMsg.textContent = '';
                responseMsg.className = 'response';
            });

            // Send message
            button.addEventListener('click', async e => {
                e.stopPropagation();
                const message = textarea.value.trim();
                if (!message) return;

                try {
                    const res = await fetch(`${API_URL}/messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({ receiverId: serviceOwnerId, content: message })
                    });

                    const data = await res.json();

                    if (res.ok) {
                        responseMsg.textContent = 'Message sent!';
                        responseMsg.className = 'response success';
                        textarea.value = '';
                        form.style.display = 'none';
                    } else {
                        responseMsg.textContent = data.error || 'Failed to send message';
                        responseMsg.className = 'response error';
                    }
                } catch (err) {
                    responseMsg.textContent = 'Network error: ' + err.message;
                    responseMsg.className = 'response error';
                }
            });

            servicesList.appendChild(card);
        });
    } catch (err) {
        servicesList.innerHTML = `<p style="color:red">Failed to load services: ${err.message}</p>`;
        console.error(err);
    }
}

// Load services when page loads
window.addEventListener('load', loadServices);
