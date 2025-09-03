const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const sequelize = require('./config/database');

// Import routes
const userRoutes = require('./routes/user'); // make sure filename matches
const serviceRoutes = require('./routes/service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // allow cross-origin requests
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); // serves your HTML/CSS/JS

// API routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Test route
app.get('/ping', (req, res) => res.send('pong'));

// Sync database and start server
sequelize.sync()
    .then(() => {
        console.log('Database synced');
        app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    })
    .catch(err => console.log('Error syncing database:', err));
