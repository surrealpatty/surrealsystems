const API_URL = 'https://codecrowds.onrender.com'; // use your live URL

// ---------- Helpers ----------
function showMessage(elId, msg, isSuccess=true){
  const el = document.getElementById(elId);
  if(!el) return;
  el.textContent = msg;
  el.className = `message ${isSuccess ? 'success':'error'}`;
}

function getToken(){ return localStorage.getItem('token'); }
function getUser(){ return JSON.parse(localStorage.getItem('user')); }

// ---------- REGISTER ----------
document.getElementById('registerForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const username=document.getElementById('regUsername').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const password=document.getElementById('regPassword').value.trim();
  const msg=document.getElementById('registerMessage');

  try{
    const res=await fetch(`${API_URL}/users/register`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username,email,password})
    });
    const data = await res.json();
    if(res.ok){ 
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      showMessage('registerMessage', 'Registered! Redirecting...');
      setTimeout(()=>window.location.href='dashboard.html', 1000);
    } else showMessage('registerMessage', data.error||'Register failed', false);
  } catch(err){ showMessage('registerMessage', 'Network error: '+err.message, false); }
});

// ---------- LOGIN ----------
document.getElementById('loginForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value.trim();
  const msg=document.getElementById('loginMessage');

  try{
    const res=await fetch(`${API_URL}/users/login`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    const data = await res.json();
    if(res.ok){
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href='dashboard.html';
    } else showMessage('loginMessage', data.error||'Login failed', false);
  } catch(err){ showMessage('loginMessage', 'Network error: '+err.message, false); }
});

// ---------- LOAD SERVICES ----------
async function loadServices(){
  try{
    const res = await fetch(`${API_URL}/services`);
    const services = await res.json();
    const list = document.getElementById('services-list');
    if(!list) return;
    list.innerHTML='';
    services.forEach(s=>{
      const div = document.createElement('div');
      div.className='service-card';
      div.innerHTML=`<strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>${s.description}<br>Price: $${s.price}<hr>`;
      list.appendChild(div);
    });
  } catch(err){ console.error('Failed to load services', err); }
}
if(document.getElementById('services-list')) loadServices();

// ---------- POST SERVICE ----------
document.getElementById('serviceForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const title = document.getElementById('serviceTitle').value.trim();
  const description = document.getElementById('serviceDesc').value.trim();
  const price = parseFloat(document.getElementById('servicePrice').value.trim());
  const msg = document.getElementById('serviceMessage');

  const token = getToken();
  if(!token){ showMessage('serviceMessage','You must log in',false); return; }

  try{
    const res = await fetch(`${API_URL}/services`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({title,description,price,userId:getUser().id})
    });
    const data = await res.json();
    if(res.ok){ showMessage('serviceMessage', 'Service added!'); e.target.reset(); loadServices(); }
    else showMessage('serviceMessage', data.error||'Failed', false);
  } catch(err){ showMessage('serviceMessage','Network error: '+err.message,false); }
});

// ---------- LOGOUT ----------
document.getElementById('logoutBtn')?.addEventListener('click', ()=>{
  localStorage.clear();
  window.location.href='login.html';
});
