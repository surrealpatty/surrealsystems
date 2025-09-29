require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // ✅ Add this
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

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, 'public'))); // serve static files

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); // serve homepage
});

// ---------- API Routes ----------
app.post('/register', register);
app.post('/login', login);
app.get('/profile/:id?', getProfile);
app.put('/profile', updateProfile);
app.post('/upgrade', upgradeToPaid);

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
