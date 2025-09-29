require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./models/database');
const {
  register,
  login,
  getProfile,
  updateProfile,
  upgradeToPaid
} = require('./controllers/userController');

const app = express();
const PORT = process.env.PORT || 10000;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// ---------- API Routes ----------
// Always define API routes BEFORE static middleware
app.post('/api/register', register);
app.post('/api/login', login);
app.get('/api/profile/:id?', getProfile);
app.put('/api/profile', updateProfile);
app.post('/api/upgrade', upgradeToPaid);

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all route to serve index.html for frontend routing (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start Server ----------
(async () => {
  try {
    await testConnection();
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();
