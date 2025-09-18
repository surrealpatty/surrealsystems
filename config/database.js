const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL) {
    // For deployment (Postgres)
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false }
        }
    });
} else if (process.env.DB_NAME && process.env.DB_USER) {
    // Local MySQL
    sequelize = new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || 'localhost',
            dialect: 'mysql',
            logging: false
        }
    );
} else {
    // Fallback: SQLite
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });
}

module.exports = { sequelize };
