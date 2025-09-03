const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sequelize = require('./config/database');
const userRoutes = require('./routes/users');
const serviceRoutes = require('./routes/services');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Sync database
sequelize.sync().then(() => {
    console.log('Database synced');
}).catch(err => console.error(err));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
