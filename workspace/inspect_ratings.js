const m = require('./src/models');
const { QueryTypes } = require('sequelize');
(async () => {
  try {
    await m.sequelize.authenticate();
    console.log('DB connected');

    const rows = await m.sequelize.query('SELECT * FROM ratings LIMIT 5', {
      type: QueryTypes.SELECT,
    });
    console.log('\nROWS:');
    console.log(JSON.stringify(rows, null, 2));

    const cols = await m.sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='ratings' ORDER BY ordinal_position",
      { type: QueryTypes.SELECT },
    );
    console.log('\nCOLS:');
    console.log(JSON.stringify(cols, null, 2));

    const cnt = await m.sequelize.query('SELECT COUNT(*)::int AS cnt FROM ratings', {
      type: QueryTypes.SELECT,
    });
    console.log('\nCOUNT:');
    console.log(JSON.stringify(cnt, null, 2));
  } catch (e) {
    console.error('\nERR:');
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }
  process.exit(0);
})();
