const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');

const serviceRoutes = require('./routes/service');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/message');
const ratingRoutes = require('./routes/rating');

require('dotenv').config();

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- API Routes -----------------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/ratings', ratingRoutes);

// ----------------- Serve frontend -----------------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- Start server after DB is ready -----------------
const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    await testConnection();                // Wait for DB connection
    await sequelize.sync({ alter: true }); // Sync tables
    console.log('✅ Database synced successfully.');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1); // Stop the app if DB fails
  }
};

startServer();
