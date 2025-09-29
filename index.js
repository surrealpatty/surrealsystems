require('dotenv').config();
const express = require('express');
const app = express();

const { sequelize, testConnection } = require('./models/database');
const { User } = require('./models/User');       // Import User model
const { Service } = require('./models/Service'); // Import Service model
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Test route
app.get('/', (req, res) => res.send('CodeCrowds API is running!'));

// Start server after DB connection
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await testConnection(); // Make sure DB is reachable

    // ✅ Sync models to MySQL (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    console.log('✅ Models synced with MySQL');

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
