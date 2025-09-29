require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const { sequelize, testConnection } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start server
(async () => {
  try {
    await testConnection();
    await sequelize.sync();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1);
  }
})();
