require('dotenv').config();
const express = require('express');
const app = express();

const { sequelize, waitForDb } = require('./models/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Test route
app.get('/', (req, res) => res.send('CodeCrowds API is running!'));

// Start server only after DB is stable
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    await waitForDb(); // wait until DB is reachable
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
};

startServer();
