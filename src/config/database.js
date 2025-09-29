const { Sequelize } = require('sequelize');

// ---------- Initialize Sequelize ----------
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false } // Required by Render
    },
    logging: false
  }
);

// ---------- Test DB Connection ----------
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ PostgreSQL connection failed:', err);
    throw err;
  }
};

// ---------- Export ----------
module.exports = { sequelize, testConnection };
