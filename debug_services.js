// debug_query.js
const models = require('./src/models');
const { sequelize } = models;
const { QueryTypes } = require('sequelize');

(async () => {
  try {
    const sql = 'SELECT "Service"."id", "Service"."userId", "Service"."title", "Service"."description", "Service"."price", "Service"."created_at" AS "createdAt", "Service"."updated_at" AS "updatedAt", "owner"."id" AS "owner.id", "owner"."username" AS "owner.username" FROM "services" AS "Service" LEFT OUTER JOIN "users" AS "owner" ON "Service"."userId" = "owner"."id" ORDER BY "createdAt" DESC LIMIT 20;';
    console.log('=== RUNNING RAW SQL ===\n', sql, '\n=======================');
    const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });
    console.log('RAW QUERY RESULT:\n', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('---- FULL ERROR START ----');
    console.error('error.name:', e && e.name);
    console.error('error.message:', e && e.message);
    console.error('error.stack:', e && e.stack);
    console.error('error.sql:', e && e.sql);
    // Sequelize wraps native error in `original`
    console.error('error.original:', e && e.original && (e.original.code ? JSON.stringify(e.original) : e.original.message));
    console.error('---- FULL ERROR END ----');
  } finally {
    try { await sequelize.close(); } catch(e){}
    process.exit();
  }
})();
