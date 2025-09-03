// index.js
const express = require('express');
const app = express();
const sequelize = require('./models/database'); // Sequelize instance
const User = require('./models/User');
const Service = require('./models/Service');

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

app.use(express.json());
app.use(express.static('public')); // Serve frontend files

app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Use Render's port or fallback to 3000 locally
const PORT = process.env.PORT || 3000;

// Sync database & start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('❌ Database sync failed:', err);
  });
