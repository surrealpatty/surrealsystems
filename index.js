require('dotenv').config();
const express = require('express');
const { sequelize } = require('./models/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Test route
app.get('/', (req, res) => res.send('CodeCrowds API is running!'));

// Start server after DB connection
const PORT = process.env.PORT || 5000;
(async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ PostgreSQL connected');
        await sequelize.sync(); // Ensures tables are created
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    } catch (err) {
        console.error('❌ Database connection failed:', err);
        process.exit(1); // Exit if DB fails
    }
})();
