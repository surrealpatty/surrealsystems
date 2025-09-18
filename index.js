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
const messageRoutes = require('./routes/message'); // make sure the file name matches

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);
app.use('/messages', messageRoutes);

// Serve HTML pages dynamically
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'public', page);

    res.sendFile(filePath, err => {
        if (err) {
            next(); // pass to next middleware if file not found
        }
    });
});

// 404 for API routes
app.use((req, res, next) => {
    if (req.path.startsWith('/users') || req.path.startsWith('/services') || req.path.startsWith('/messages')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
sequelize.sync({ alter: true })
    .then(() => console.log(`✅ DB synced & server running on port ${PORT}`))
    .catch(err => console.error('❌ DB sync failed', err));
