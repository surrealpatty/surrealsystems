const API_URL = 'https://codecrowds.onrender.com';

// Load user info from localStorage
const userId = localStorage.getItem('userId');
const usernameInput = document.getElementById('username');
const descriptionInput = document.getElementById('description');
const usernameDisplay = document.getElementById('usernameDisplay');

usernameInput.value = localStorage.getItem('username') || '';
descriptionInput.value = localStorage.getItem('description') || '';
usernameDisplay.textContent = localStorage.getItem('username') || 'User';

// Load user's services
async function loadUserServices() {
    const list = document.getElementById('services-list');
    if (!userId) {
        list.innerHTML = '<p class="error">No user logged in</p>';
        return;
    }

    try {
        const res = await fetch(`${API_URL}/services`);
        const services = await res.json();

        list.innerHTML = '';
        services
            .filter(s => s.User?.id == userId) // == because localStorage stores strings
            .forEach(s => {
                const div = document.createElement('div');
                div.className = 'service-card';
                div.innerHTML = `
                    <h3>${s.title}</h3>
                    <p>${s.description}</p>
                    <p><strong>Price:</strong> $${s.price}</p>
                `;
                list.appendChild(div);
            });
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="error">Failed to load services</p>';
    }
}

loadUserServices();

// Handle profile update
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!userId) return alert("No user logged in!");

    const username = usernameInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!username) return alert('Username required');

    try {
        const res = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, description }),
        });
        const data = await res.json();

        if (res.ok) {
            alert('Profile updated successfully!');
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
            usernameDisplay.textContent = data.user.username;
        } else {
            alert(data.error || 'Failed to update profile');
        }
    } catch (err) {
        console.error(err);
        alert('Network error: ' + err.message);
    }
});
