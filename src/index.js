const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const serviceRoutes = require('./routes/service');
const { User } = require('./models/User');
const { Service } = require('./models/Service');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/services', serviceRoutes);

// Test DB and sync
(async () => {
  try {
    await testConnection();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced successfully.');
  } catch (err) {
    console.error(err);
  }
})();

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
