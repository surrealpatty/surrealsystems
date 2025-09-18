require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database');

// Models
require('./models/User');
require('./models/Service');
require('./models/Message');

// Routes
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const messageRoutes = require('./routes/message'); // Ensure file name is message.js

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/messages', messageRoutes);

// Serve HTML pages (include register.html)
app.get([
    '/index.html',
    '/signup.html',
    '/register.html',   // ✅ Add this
    '/profile.html',
    '/services.html'
], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// Catch-all route for main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 for API routes
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
        console.log('✅ DB synced');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ DB sync failed', err);
        process.exit(1);
    });
