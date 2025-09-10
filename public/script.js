const API_URL = "https://codecrowds.onrender.com"; // change if needed

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem('userId');
    const username = document.getElementById('profileUsername').value.trim();
    const description = document.getElementById('profileDescription').value.trim();

    if (!userId) {
        return alert("No user logged in!");
    }

    try {
        const res = await fetch(`${API_URL}/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, description }),
        });

        const data = await res.json();
        console.log("Update response:", data);

        if (res.ok) {
            alert("Profile updated successfully!");
            localStorage.setItem('username', data.user.username);
            localStorage.setItem('description', data.user.description || '');
        } else {
            alert(data.error || "Update failed");
        }
    } catch (err) {
        console.error(err);
        alert("Network error: " + err.message);
    }
});
