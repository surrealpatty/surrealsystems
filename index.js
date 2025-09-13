const express = require('express');
const cors = require('cors');
const path = require('path');

const sequelize = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Fallback route for unknown paths
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// PORT
const PORT = process.env.PORT || 3000;

// Connect to DB and start server
sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database sync failed:', err);
    process.exit(1);
  });
