// index.js
const express = require('express');
const cors = require('cors');
const app = express();
const sequelize = require('./models/database');
const User = require('./models/User');
const Service = require('./models/Service');

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

// Middleware
app.use(cors({ origin: '*' })); // allow all origins
app.use(express.json());
app.use(express.static('public')); // frontend files

// Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Use Render port
const PORT = process.env.PORT || 3000;

// Sync database & start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database sync failed:', err));
