const API_URL = 'http://localhost:3000';

// REGISTER
document.getElementById('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value.trim();
  const msg = document.getElementById('registerMessage');

  try {
    const res = await fetch(`${API_URL}/users/register`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,email,password})
    });
    const data = await res.json();
    if(res.ok){ msg.textContent=data.message; msg.className='message success'; e.target.reset(); }
    else{ msg.textContent=data.error; msg.className='message error'; }
  } catch(err){ msg.textContent=err.message; msg.className='message error'; }
});

// LOGIN
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value.trim();
  const msg=document.getElementById('loginMessage');

  try {
    const res = await fetch(`${API_URL}/users/login`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password})
    });
    const data=await res.json();
    if(res.ok){
      localStorage.setItem('token',data.token);
      localStorage.setItem('user',JSON.stringify(data.user));
      window.location.href='dashboard.html';
    } else { msg.textContent=data.error; msg.className='message error'; }
  } catch(err){ msg.textContent=err.message; msg.className='message error'; }
});

// LOAD SERVICES
async function loadServices(){
  try {
    const res=await fetch(`${API_URL}/services`);
    const services=await res.json();
    const list=document.getElementById('services-list');
    if(!list) return;
    list.innerHTML='';
    services.forEach(s=>{
      const div=document.createElement('div');
      div.innerHTML=`<strong>${s.title}</strong> by ${s.User?.username || 'Unknown'}<br>${s.description}<br>Price: $${s.price}<hr>`;
      list.appendChild(div);
    });
  } catch(err){ console.error(err); }
}
if(document.getElementById('services-list')) loadServices();

// POST SERVICE
document.getElementById('serviceForm')?.addEventListener('submit', async e=>{
  e.preventDefault();
  const title=document.getElementById('serviceTitle').value.trim();
  const description=document.getElementById('serviceDesc').value.trim();
  const price=document.getElementById('servicePrice').value.trim();
  const msg=document.getElementById('serviceMessage');

  try {
    const token=localStorage.getItem('token');
    if(!token){ msg.textContent='You must be logged in'; msg.className='message error'; return; }
    const res=await fetch(`${API_URL}/services`,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
      body:JSON.stringify({title,description,price})
    });
    const data=await res.json();
    if(res.ok){ msg.textContent=data.message; msg.className='message success'; e.target.reset(); loadServices(); }
    else{ msg.textContent=data.error; msg.className='message error'; }
  } catch(err){ msg.textContent=err.message; msg.className='message error'; }
});
