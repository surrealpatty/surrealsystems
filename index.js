const express = require('express');
const cors = require('cors');
const app = express();
const sequelize = require('./models/database');

const userRoutes = require('./routes/user');
const serviceRoutes = require('./routes/service');

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public'));

app.use('/users', userRoutes);
app.use('/services', serviceRoutes);

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true })
  .then(() => {
    console.log('✅ Database synced');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('❌ Database sync failed:', err));
