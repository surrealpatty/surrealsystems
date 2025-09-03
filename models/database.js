const { Sequelize } = require('sequelize');

// Use DATABASE_URL from Render
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // needed for Render Postgres
    },
  },
  logging: false,
});

module.exports = sequelize;
