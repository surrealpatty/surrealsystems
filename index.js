require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./models/database'); // Make sure this path is correct
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('./controllers/userController');

const app = express();
const PORT = process.env.PORT || 10000;

// ================= Middleware =================
app.use(cors());
app.use(express.json());

// ================= Routes =================
app.post('/register', register);
app.post('/login', login);
app.get('/profile/:id?', getProfile);
app.put('/profile', updateProfile);
app.post('/upgrade', upgradeToPaid);

// ================= Start Server =================
(async () => {
    try {
        // ✅ Test MySQL connection before starting
        await testConnection();

        // ✅ Sync Sequelize models
        await sequelize.sync();

        // ✅ Start Express server
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('❌ Server failed to start:', err);
        process.exit(1); // exit with failure
    }
})();
