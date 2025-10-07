const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,         // code_crowds_u7ul
  process.env.DB_USER,         // code_crowds_u7ul_user
  process.env.DB_PASSWORD,     // 0EEVjHJ74PDqPa68AhTbT0zI0c33TKw5
  {
    host: process.env.DB_HOST, // dpg-d3in8togjchc73efsma0-a.oregon-postgres.render.com
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: true // ✅ important: true for Render's managed DB
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    keepAlive: true
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to PostgreSQL:', err.message);
    throw err;
  }
};

module.exports = { sequelize, testConnection };
