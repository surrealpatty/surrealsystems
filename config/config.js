require('dotenv').config();

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: './database.sqlite', // SQLite file for development
    logging: false,               // Disable SQL logging
  },
  test: {
    dialect: 'sqlite',
    storage: './database_test.sqlite', // SQLite file for testing
    logging: false,
  },
  production: {
    use_env_variable: 'DATABASE_URL',  // Render Postgres URL
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false,
  },
};
