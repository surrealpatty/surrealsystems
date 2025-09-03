// index.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const userRoutes = require('./routes/users');       // <--- this file must exist
const serviceRoutes = require('./routes/services');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));  // serve frontend files

// Routes
app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
