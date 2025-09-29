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
app.post('/api/register', register);
app.post('/api/login', login);
app.get('/api/profile/:id?', getProfile);
app.put('/api/profile', updateProfile);
app.post('/api/upgrade', upgradeToPaid);

// (You probably also want services + messages here)
const serviceController = require('./controllers/serviceController');
const messageController = require('./controllers/messageController');

app.get('/api/services', serviceController.getAllServices);
app.post('/api/services', serviceController.createService);
app.post('/api/messages', messageController.sendMessage);

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all (for SPA)
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
