const { Sequelize } = require('sequelize');

// Use environment variables
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',          // ← Change this to postgres
    logging: console.log,         // Optional: logs SQL queries
    dialectOptions: {
      ssl: { rejectUnauthorized: false } // Required for Render Postgres
    }
  }
);

sequelize.authenticate()
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch(err => console.error('❌ PostgreSQL connection failed:', err));

module.exports = { sequelize };
