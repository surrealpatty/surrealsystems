require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./config/database');

// Import models
require('./models/User');
require('./models/Service');
require('./models/Message');

// Import routes
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const messageRoutes = require('./routes/messages');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/messages', messageRoutes);

// Serve HTML pages
app.get(['/dashboard.html', '/profile.html', '/index.html', '/register.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// Catch-all API 404
app.use((req, res, next) => {
    if (req.path.startsWith('/users') || req.path.startsWith('/services') || req.path.startsWith('/messages')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    next();
});

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true })
    .then(() => console.log(`✅ DB synced & server running on port ${PORT}`))
    .catch(err => {
        console.error('❌ DB sync failed', err);
        process.exit(1);
    });
