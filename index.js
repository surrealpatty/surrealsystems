require('dotenv').config(); // load .env variables
const express = require('express');
const app = express();
const { sequelize } = require('./config/database'); // connect DB
const userRoutes = require('./routes/user');

// Middleware
app.use(express.json()); // parse JSON
app.use(express.urlencoded({ extended: true })); // parse URL-encoded
// Optional: enable CORS if frontend is on a different domain
const cors = require('cors');
app.use(cors());

// Routes
app.use('/api/users', userRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('🚀 CodeCrowds API is running!');
});

// Sync DB and start server
const PORT = process.env.PORT || 10000;
sequelize.sync({ alter: true }) // auto-create/alter tables
    .then(() => {
        console.log('✅ Database synced');
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('❌ DB sync failed:', err));
