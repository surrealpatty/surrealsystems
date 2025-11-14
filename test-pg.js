// test-pg.js
const { Client } = require('pg');
const conn = process.env.DATABASE_URL || process.argv[2];
if (!conn) { console.error('No connection string provided'); process.exit(1); }
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
