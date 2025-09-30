<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Profile - CodeCrowds</title>
<link rel="stylesheet" href="style.css">
<style>
/* Minimal local styling; move to style.css if you like */
body, html { margin:0; padding:0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg,#4e54c8,#00aaff); color:#fff; min-height:100%; }
.container { max-width:900px; width:90%; padding:2.5rem 2rem; margin:50px auto; background:rgba(255,255,255,0.95); border-radius:16px; box-shadow:0 12px 30px rgba(0,0,0,0.15); color:#333; text-align:center; display:flex; flex-direction:column; gap:1rem; }
h1 { color:#4e54c8; margin:0; font-size:2rem; }
#profile-description { min-height:60px; margin: 0 auto 6px auto; max-width: 700px; text-align:left; }
#profile-description[contenteditable="true"] { border:1px solid #4e54c8; background:#fff; padding:10px; border-radius:8px; color:#222; }
.controls { display:flex; gap:10px; justify-content:center; align-items:center; margin-bottom:8px; }
button { padding:10px 18px; font-size:1rem; color:#fff; background:#4e54c8; border:none; border-radius:8px; cursor:pointer; }
button:hover { background:#3b40a1; }
.card-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:16px; width:100%; }
.card { background:#fff; color:#333; padding:16px; border-radius:10px; box-shadow:0 6px 16px rgba(0,0,0,0.08); text-align:left; }
.small { font-size:0.9rem; color:#666; }
@media (max-width:480px) { .container{ padding:1.5rem } h1{font-size:1.6rem} }
</style>
</head>
<body>
  <div class="container">
    <!-- username heading (will be replaced by the user's username) -->
    <h1 id="profile-username">Loading username...</h1>

    <!-- description -->
    <div id="profile-description" aria-label="Profile description">Loading description...</div>

    <!-- edit/save button -->
    <div class="controls">
      <button type="button" id="editDescBtn">Edit Description</button>
      <button type="button" id="logoutBtn">Logout</button>
    </div>

    <h2 style="margin-top:10px">Your Services</h2>
    <div id="services-list" class="card-grid"><div class="card small">Loading...</div></div>

    <h2>Your Messages</h2>
    <div id="messages-list" class="card-grid"><div class="card small">Loading...</div></div>
  </div>

<script>
/* ---------- Configuration ---------- */
const API_URL = 'https://codecrowds.onrender.com'; // update if needed
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');

/* ---------- Basic auth check ---------- */
if (!token || !userId) {
  // Not logged in -> go home (or show login)
  console.warn('No token/userId in localStorage — redirecting to index.');
  window.location.href = 'index.html';
}

/* ---------- DOM refs ---------- */
const profileUsername = document.getElementById('profile-username');
const profileDescription = document.getElementById('profile-description');
const editDescBtn = document.getElementById('editDescBtn');
const logoutBtn = document.getElementById('logoutBtn');
const servicesList = document.getElementById('services-list');
const messagesList = document.getElementById('messages-list');

/* Show immediately whatever is in localStorage to avoid blank heading */
const lsName = localStorage.getItem('username');
const lsDesc = localStorage.getItem('description');
if (lsName) profileUsername.textContent = lsName;
if (lsDesc) profileDescription.textContent = lsDesc;

/* ---------- Utilities ---------- */
function authHeaders() {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function safeJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

/* ---------- Load profile: robust approach ---------- */
async function loadProfile() {
  console.log('loadProfile: trying GET /users (list) and matching id...');
  try {
    // 1) Try to fetch all users and find our user (works if API has only GET /users)
    const resAll = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${token}` }});
    console.log('GET /users status', resAll.status);
    if (resAll.ok) {
      const all = await resAll.json();
      console.log('GET /users response', all);
      if (Array.isArray(all)) {
        const found = all.find(u => String(u.id) === String(userId) || String(u.id) === String(parseInt(userId)));
        if (found) {
          applyUserToUI(found);
          return;
        }
      } else {
        // Some backends return object { users: [...] } or {data: [...]}
        const arr = (all.users || all.data || []).filter(Boolean);
        if (Array.isArray(arr) && arr.length) {
          const found = arr.find(u => String(u.id) === String(userId));
          if (found) {
            applyUserToUI(found);
            return;
          }
        }
      }
      // if we reach here, GET /users didn't yield our user
    } else {
      console.warn('GET /users returned non-OK', resAll.status);
    }

    // 2) Fallback: try GET /users/:id (some backends implement this)
    console.log('loadProfile: trying fallback GET /users/:id ...');
    const resSingle = await fetch(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${token}` }});
    console.log('GET /users/:id status', resSingle.status);
    if (resSingle.ok) {
      const maybeUser = await safeJson(resSingle);
      console.log('GET /users/:id response', maybeUser);
      // API might return { user: {...} } or {...}
      const userObj = maybeUser.user || maybeUser.data || maybeUser;
      applyUserToUI(userObj);
      return;
    } else {
      // likely 404 -> server doesn't have that route
      const errText = await resSingle.text();
      console.warn('GET /users/:id failed:', resSingle.status, errText);
    }

    // 3) If nothing worked, fallback to localStorage username/description or show unknown
    console.warn('Could not fetch user from API — falling back to localStorage or Unknown.');
    profileUsername.textContent = lsName || 'Unknown User';
    profileDescription.textContent = lsDesc || 'No description available.';

  } catch (err) {
    console.error('loadProfile error', err);
    profileUsername.textContent = lsName || 'Unknown User';
    profileDescription.textContent = lsDesc || 'No description available.';
  }
}

/* Apply user object to UI and persist to localStorage */
function applyUserToUI(user) {
  if (!user) return;
  const id = user.id ?? user.ID ?? user.userId;
  const username = user.username ?? user.userName ?? user.name;
  const description = user.description ?? user.bio ?? user.about ?? '';

  if (username) {
    profileUsername.textContent = username;
    localStorage.setItem('username', username);
  }
  profileDescription.textContent = description || 'No description yet.';
  localStorage.setItem('description', description || '');
  console.log('applyUserToUI: set username/description from API', { id, username });
}

/* ---------- Edit / Save description ---------- */
let editing = false;
editDescBtn.addEventListener('click', async () => {
  if (!editing) {
    // Enter editing mode
    editing = true;
    profileDescription.setAttribute('contenteditable', 'true');
    profileDescription.focus();
    editDescBtn.textContent = 'Save Description';
  } else {
    // Save
    editing = false;
    profileDescription.setAttribute('contenteditable', 'false');
    editDescBtn.textContent = 'Edit Description';

    const newDesc = profileDescription.textContent.trim();
    try {
      const res = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ description: newDesc })
      });

      const data = await safeJson(res);
      console.log('PUT /users/:id response', res.status, data);

      if (res.ok) {
        // server may return { user } or user object directly
        const updated = data.user || data.userUpdated || data || {};
        const username = updated.username ?? updated.user?.username;
        const description = updated.description ?? updated.user?.description ?? newDesc;

        if (username) {
          profileUsername.textContent = username;
          localStorage.setItem('username', username);
        }
        profileDescription.textContent = description;
        localStorage.setItem('description', description || '');
        alert('Description saved.');
      } else {
        const errMsg = (data && data.error) ? data.error : `HTTP ${res.status}`;
        alert('Failed to save description: ' + errMsg);
      }
    } catch (err) {
      console.error('Error saving description', err);
      alert('Network error saving description: ' + err.message);
    }
  }
});

/* ---------- Logout ---------- */
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userId');
  // keep username/description or clear as you prefer:
  // localStorage.removeItem('username'); localStorage.removeItem('description');
  window.location.href = 'index.html';
});

/* ---------- Services & Messages loading (small robust implementations) ---------- */
async function loadServices() {
  servicesList.innerHTML = '<div class="card small">Loading services...</div>';
  try {
    const res = await fetch(`${API_URL}/services`, { headers: { Authorization: `Bearer ${token}` }});
    if (!res.ok) {
      servicesList.innerHTML = '<div class="card small">Failed to load services</div>';
      console.warn('GET /services failed', res.status);
      return;
    }
    const services = await res.json();
    servicesList.innerHTML = '';
    // Filter services owned by this user (if you want that) or show all; here we show only user's services:
    const mine = Array.isArray(services) ? services.filter(s => {
      const sid = s.user?.id ?? s.User?.id ?? s.userId ?? s.user_id ?? s.userId;
      return String(sid) === String(userId);
    }) : [];
    // If none, show message
    if (!mine.length) {
      servicesList.innerHTML = '<div class="card small">You have no services yet.</div>';
      return;
    }
    mine.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${s.title}</h3><p class="small">${s.description}</p><p><strong>Price:</strong> $${s.price}</p>`;
      servicesList.appendChild(card);
    });
  } catch (err) {
    console.error('loadServices error', err);
    servicesList.innerHTML = '<div class="card small">Error loading services</div>';
  }
}

async function loadMessages() {
  messagesList.innerHTML = '<div class="card small">Loading messages...</div>';
  try {
    // Many backends support /messages?receiverId=USERID; try that first, else GET /messages and filter
    let messages = [];
    const resQ = await fetch(`${API_URL}/messages?receiverId=${encodeURIComponent(userId)}`, { headers: { Authorization: `Bearer ${token}` }});
    if (resQ.ok) {
      messages = await resQ.json();
    } else {
      // fallback: fetch all messages and filter by receiver
      const resAll = await fetch(`${API_URL}/messages`, { headers: { Authorization: `Bearer ${token}` }});
      if (resAll.ok) {
        const all = await resAll.json();
        messages = Array.isArray(all) ? all.filter(m => String(m.receiverId) === String(userId) || String(m.receiver_id) === String(userId)) : [];
      } else {
        console.warn('GET /messages fallback failed', resAll.status);
      }
    }

    messagesList.innerHTML = '';
    if (!Array.isArray(messages) || messages.length === 0) {
      messagesList.innerHTML = '<div class="card small">No messages</div>';
      return;
    }

    messages.forEach(m => {
      const senderName = m.sender?.username ?? m.senderName ?? m.senderName ?? m.senderUsername ?? 'Unknown';
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<p><strong>From:</strong> ${senderName}</p><p>${m.content}</p>`;
      messagesList.appendChild(card);
    });

  } catch (err) {
    console.error('loadMessages error', err);
    messagesList.innerHTML = '<div class="card small">Error loading messages</div>';
  }
}

/* ---------- Boot: load everything ---------- */
window.addEventListener('load', () => {
  loadProfile();    // robustly sets heading and description
  loadServices();   // loads services for this user
  loadMessages();   // loads messages for this user
});
</script>
</body>
</html>
