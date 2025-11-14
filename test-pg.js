// test-pg.js
// Builds a connection string from DB_* env vars (or uses DATABASE_URL / CLI arg)
// and does a quick SELECT version() to verify the connection.

const { Client } = require('pg');
require('dotenv').config();

function buildConn() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = process.env.DB_USER;
  if (!user) return null;
  const password = process.env.DB_PASSWORD || '';
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_NAME || 'postgres';
  const encPass = encodeURIComponent(password);
  return `postgresql://${user}:${encPass}@${host}:${port}/${db}?sslmode=require`;
}

const conn = buildConn() || process.argv[2];
if (!conn) {
  console.error('No connection string provided');
  process.exit(1);
}

(async () => {
  const client = new Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected OK');
    const r = await client.query('SELECT version()');
    console.log(r.rows[0]);
    await client.end();
  } catch (e) {
    console.error('Full connection error:');
    console.error(e);
    process.exit(1);
  }
})();
