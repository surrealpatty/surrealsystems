const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./config/database');
const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- API Routes ----------
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);

// ---------- Serve Frontend ----------
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- Start Server ----------
const PORT = process.env.PORT || 10000;
sequelize.authenticate()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ DB Connection Error:', err));

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
