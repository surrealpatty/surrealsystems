const API_URL = 'https://codecrowds.onrender.com';
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');
const servicesList = document.getElementById('servicesList');

// Redirect if not logged in
if (!token && servicesList) window.location.href = 'index.html';

// Load services
async function loadServices() {
    try {
        const res = await fetch(`${API_URL}/services`, {
            headers: { Authorization: `Bearer ${token}` }
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

            // Toggle form
            card.addEventListener('click', e => {
                if (!e.target.closest('button') && !e.target.closest('textarea')) {
                    form.style.display = form.style.display === 'flex' ? 'none' : 'flex';
                }
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
