// config/config.js
require('dotenv').config();

const common = {
  dialect: 'postgres',
  logging: false,
};

function dialectOptions() {
  const dbRequireSsl = String(process.env.DB_REQUIRE_SSL || '').toLowerCase();
  const needsSsl = process.env.NODE_ENV === 'production'
    || dbRequireSsl === 'true' || dbRequireSsl === '1' || dbRequireSsl === 'yes'
    || (process.env.DATABASE_URL && /sslmode=require/i.test(process.env.DATABASE_URL));

  if (needsSsl) {
    return { ssl: { require: true, rejectUnauthorized: false } };
  }
  return {};
}

function baseConfig(envDbName) {
  return {
    url: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || null,
    database: process.env.DB_NAME || envDbName,
    dialectOptions: dialectOptions(),
    ...common
  };
}

module.exports = {
  development: baseConfig('codecrowds'),
  test: baseConfig('codecrowds_test'),
  production: {
    url: process.env.DATABASE_URL,
    dialectOptions: dialectOptions(),
    ...common
  }
};
