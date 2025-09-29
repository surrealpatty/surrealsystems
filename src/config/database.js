// src/config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false } // Render requires SSL
    },
    logging: false
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ PostgreSQL connection established successfully.'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

module.exports = sequelize;
