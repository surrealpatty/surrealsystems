const { Sequelize } = require('sequelize');

// Use Render's DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Needed for Render
    }
  },
  logging: false
});

module.exports = sequelize;
