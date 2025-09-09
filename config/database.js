const { Sequelize } = require('sequelize');

// Use DATABASE_URL (Render with Postgres) or fall back to local MySQL
let sequelize;

if (process.env.DATABASE_URL) {
  // Production (Render/Postgres)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Render requires this
      },
    },
  });
} else {
  // Local development (MySQL)
  sequelize = new Sequelize(
    process.env.DB_NAME || 'codecrowds_dev',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      dialect: 'mysql',
      logging: false,
    }
  );
}

// Test connection
sequelize.authenticate()
  .then(() => console.log('✅ Database connected!'))
  .catch(err => console.error('❌ Database connection failed:', err));

module.exports = sequelize;
