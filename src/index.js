const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const { User, Service, Message } = require('./models'); // register models

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');
const messageRoutes = require('./routes/message');
// const ratingRoutes = require('./routes/rating'); // Optional if you add rating later

const app = express();

// ----------------- Middleware -----------------
app.use(cors());
app.use(express.json());

// ----------------- API Routes -----------------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/messages', messageRoutes);

// ----------------- Serve frontend -----------------
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- Start server after DB is ready -----------------
const PORT = process.env.PORT || 10000;

const startServer = async () => {
  try {
    await testConnection(); // Wait for DB connection
    await sequelize.sync({ alter: true }); // Sync all models
    console.log('✅ Database synced successfully.');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ Server failed to start:', err);
    process.exit(1); // Stop if DB fails
  }
};

startServer();
