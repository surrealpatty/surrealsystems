require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./database'); // ✅ points to root
const {
    register,
    login,
    getProfile,
    updateProfile,
    upgradeToPaid
} = require('./controllers/userController');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/register', register);
app.post('/login', login);
app.get('/profile/:id?', getProfile);
app.put('/profile', updateProfile);
app.post('/upgrade', upgradeToPaid);

// Start server after DB connection
(async () => {
    try {
        await testConnection();   // ✅ Test Postgres connection
        await sequelize.sync();   // ✅ Sync models
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Server failed to start:', err);
        process.exit(1);
    }
})();
