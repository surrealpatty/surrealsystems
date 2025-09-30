const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const userRoutes = require('./routes/user');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

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
