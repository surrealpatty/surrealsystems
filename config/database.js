const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DB || 'codecrowds',       // Database name
  process.env.MYSQL_USER || 'root',           // MySQL username
  process.env.MYSQL_PASS || 'viisyI1tDa6WgMUGMkJKyWGBb2p77zIt',  // MySQL password
  {
    host: process.env.MYSQL_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

// Test connection
sequelize.authenticate()
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Database connection failed:', err));

module.exports = sequelize;
