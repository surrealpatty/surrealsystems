const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/messages'); // ✅ add messages route
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// ----------------- API Routes -----------------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/messages', messageRoutes); // ✅ mount messages route

// ----------------- Serve frontend -----------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// Optional: redirect frontend routes to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ----------------- Database connection -----------------
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error('❌ Database sync failed:', err);
  }
})();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
