// models/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,       // code_crowds
    process.env.DB_USER,       // code_crowds_user
    process.env.DB_PASSWORD,   // viisyI1tDa6WgMUGMkJKyWGBb2p77zIt
    {
        host: process.env.DB_HOST,   // dpg-d2ru4nbe5dus73ciensg-a.oregon-postgres.render.com
        port: process.env.DB_PORT,   // 5432
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
    }
);

sequelize.authenticate()
    .then(() => console.log('✅ PostgreSQL connected'))
    .catch(err => console.error('❌ Database connection failed:', err));

module.exports = { sequelize };
