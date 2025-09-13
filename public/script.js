document.getElementById('serviceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('serviceTitle').value.trim(); // match your HTML IDs
    const description = document.getElementById('serviceDesc').value.trim();
    const price = parseFloat(document.getElementById('servicePrice').value);

    if (!title || !description || !price) return alert('All fields required');

    try {
        const res = await fetch(`${API_URL}/services`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ title, description, price })
        });

        let data;
        try {
            data = await res.json();
            console.log('Response JSON:', data); // ✅ Logs valid JSON responses
        } catch (e) {
            const text = await res.text();
            console.error('Non-JSON response from server:', text); // ✅ Logs HTML or plain text
            data = { error: 'Invalid server response' };
        }

        if (res.ok) {
            document.getElementById('serviceForm').reset();
            loadServices(); // reload the services list
        } else {
            alert(data.error || 'Service creation failed');
        }

    } catch (err) {
        alert('Network error: ' + err.message);
        console.error(err);
    }
});
