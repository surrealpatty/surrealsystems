const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const sequelize = require('./config/database');

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

app.get('/ping', (req, res) => res.send('pong'));

// Sync database and start server
sequelize.sync()
    .then(() => {
        console.log('Database synced');
        app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    })
    .catch(err => console.error('Error syncing database:', err));
