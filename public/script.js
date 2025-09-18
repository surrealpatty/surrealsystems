const API_URL = 'https://codecrowds.onrender.com';

// -------------------- LOGIN --------------------
const loginForm = document.getElementById('loginForm');
const loginMessage = document.getElementById('loginMessage');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value.trim();

        if (!email || !password) {
            loginMessage.textContent = 'Please fill in all fields.';
            loginMessage.style.color = 'red';
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                loginMessage.textContent = data.error || 'Login failed';
                loginMessage.style.color = 'red';
            } else {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userId', data.user.id);
                window.location.href = 'services.html';
            }
        } catch (err) {
            loginMessage.textContent = 'Network error: ' + err.message;
            loginMessage.style.color = 'red';
        }
    });
}

// -------------------- REGISTER --------------------
const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage');

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value.trim();

        if (!username || !email || !password) {
            registerMessage.textContent = 'Please fill in all fields.';
            registerMessage.style.color = 'red';
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                registerMessage.textContent = data.error || 'Registration failed';
                registerMessage.style.color = 'red';
            } else {
                registerMessage.textContent = 'Registration successful! Redirecting to login...';
                registerMessage.style.color = 'green';
                setTimeout(() => window.location.href = 'index.html', 1500);
            }
        } catch (err) {
            registerMessage.textContent = 'Network error: ' + err.message;
            registerMessage.style.color = 'red';
        }
    });
}

// -------------------- SERVICES PAGE --------------------
const servicesList = document.getElementById('servicesList');
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

if (servicesList) {
    if (!token) {
        window.location.href = 'index.html';
    }

    async function loadServices() {
        try {
            const res = await fetch(`${API_URL}/services`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Failed to fetch services');

            const services = await res.json();
            servicesList.innerHTML = '';

            services.forEach(service => {
                const postedBy = service.User?.username || 'Unknown';
                const serviceOwnerId = service.User?.id || service.userId;

                const card = document.createElement('div');
                card.className = 'service-card';
                card.innerHTML = `
                    <div class="service-title">${service.title}</div>
                    <div class="service-description">${service.description}</div>
                    <div class="service-user">Posted by: ${postedBy}</div>
                    <div class="hire-form" style="display:none;">
                        <textarea>Hi ${postedBy}, I'm interested in your service.</textarea>
                        <button>Send Message</button>
                        <p class="response"></p>
                    </div>
                `;

                const form = card.querySelector('.hire-form');
                const textarea = form.querySelector('textarea');
                const button = form.querySelector('button');
                const responseMsg = form.querySelector('.response');

                card.addEventListener('click', (e) => {
                    if (!e.target.closest('button') && !e.target.closest('textarea')) {
                        form.style.display = form.style.display === 'flex' ? 'none' : 'flex';
                    }
                });

                button.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const message = textarea.value.trim();
                    if (!message) return;

                    try {
                        const res = await fetch(`${API_URL}/messages`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                senderId: userId,
                                receiverId: serviceOwnerId,
                                content: message,
                            }),
                        });

                        const data = await res.json();
                        if (res.ok) {
                            responseMsg.textContent = 'Message sent!';
                            responseMsg.className = 'response success';
                            textarea.value = '';
                            form.style.display = 'none';
                        } else {
                            responseMsg.textContent = data.error || 'Failed to send.';
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

    window.onload = loadServices;
}
