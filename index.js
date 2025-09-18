// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database'); 

// Import models so Sequelize registers them
require('./models/User');
require('./models/Service');

// Route imports
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const messageRoutes = require('./routes/message'); // If you have messaging feature

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/messages', messageRoutes);

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Serve specific HTML pages
app.get(['/dashboard.html','/profile.html','/login.html','/register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// Catch-all for unknown API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/users') || req.path.startsWith('/services') || req.path.startsWith('/messages')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    next();
});

// Start server after syncing DB
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }) 
    .then(() => { 
        console.log('✅ DB synced successfully'); 
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)); 
    })
    .catch(err => { 
        console.error('❌ DB sync failed', err); 
        process.exit(1); 
    });
