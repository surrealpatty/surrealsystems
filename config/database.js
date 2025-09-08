const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.MYSQL_DB || 'codecrowds',       // Database name
  process.env.MYSQL_USER || 'root',           // MySQL username
  process.env.MYSQL_PASS || '',               // MySQL password (use env var in Render)
  {
    host: process.env.MYSQL_HOST || 'localhost', // MySQL host
    port: process.env.MYSQL_PORT || 3306,        // MySQL port
    dialect: 'mysql',
    logging: false
  }
);

// Test connection
sequelize.authenticate()
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Database connection failed:', err));

module.exports = sequelize;
