require('dotenv').config();
const express = require('express');
const app = express();
const { sequelize } = require('./models/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// Test route
app.get('/', (req, res) => res.send('CodeCrowds API is running!'));

// Connect DB and start server
const PORT = process.env.PORT || 5000;
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connected');
        app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    })
    .catch(err => console.error('❌ Database connection failed:', err));
