const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./models/database');

// Import routes
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

// Initialize app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // serve frontend files

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Default route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start server & sync DB
const PORT = process.env.PORT || 3000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
