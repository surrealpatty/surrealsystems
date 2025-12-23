"use strict";
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');
const projectRoutes = require('./routes/project');
const { User } = require('./models/User');
const { project } = require('./models/project');
require('dotenv').config();
const app = express();
app.use(cors());
app.use(express.json());
// Routes
app.use('/projects', projectRoutes);
// Test DB and sync
(async () => {
    try {
        await testConnection();
        await sequelize.sync({ alter: true });
        console.log('âœ… Database synced successfully.');
    }
    catch (err) {
        console.error(err);
    }
})();
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ðŸš€ Server running on port ${PORT}`));


