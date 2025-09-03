// index.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const sequelize = require('./models/database');

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

// Middleware
app.use(cors({ origin: '*' })); // allow all origins
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // serve frontend files

// Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Use Render's port or fallback to 3000
const PORT = process.env.PORT || 3000;

// Sync database & start server
sequelize.sync({ alter: true })
    .then(() => {
        console.log('✅ Database synced');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
        console.error('❌ Database sync failed:', err);
    });
