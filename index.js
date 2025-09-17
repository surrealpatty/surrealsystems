const express = require('express');
const cors = require('cors');
const path = require('path');

const sequelize = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// --- API routes first ---
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// --- Serve static files from public after API ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Front-end routes (optional) ---
app.get(['/dashboard.html','/profile.html','/login.html','/register.html'], (req,res)=>{
  res.sendFile(path.join(__dirname,'public',req.path));
});

// --- Catch-all for unknown API routes ---
app.use((req,res,next)=>{
  if (req.path.startsWith('/users') || req.path.startsWith('/services')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  next();
});

// PORT
const PORT = process.env.PORT || 3000;

sequelize.sync({alter:true})
  .then(()=>{ 
    console.log('✅ DB synced'); 
    app.listen(PORT,()=>console.log(`🚀 Server on port ${PORT}`)); 
  })
  .catch(err=>{ 
    console.error('❌ DB sync failed',err); 
    process.exit(1); 
  });
