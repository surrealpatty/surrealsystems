const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const userRoutes = require('./routes/user');
require('dotenv').config();

const app = express();

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json());

// ---------------- API routes ----------------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// ---------------- Serve frontend ----------------
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// ---------------- Database connection ----------------
(async () => {
  try {
    await testConnection();                   // test DB connection
    await sequelize.sync({ alter: true });    // sync models safely
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err.message); // show error message
  }
})();

// ---------------- Start server ----------------
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
