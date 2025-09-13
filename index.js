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
app.use(express.static(path.join(__dirname,'public')));

// API routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Fallback to serve front-end pages (profile.html, dashboard.html etc.)
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','index.html')); 
});

// PORT
const PORT = process.env.PORT || 3000;

sequelize.sync({alter:true})
.then(()=>{ console.log('✅ DB synced'); app.listen(PORT,()=>console.log(`🚀 Server on port ${PORT}`)); })
.catch(err=>{ console.error('❌ DB sync failed',err); process.exit(1); });
