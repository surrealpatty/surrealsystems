const m = require('./src/models');
const { QueryTypes } = require('sequelize');
(async () => {
  try {
    await m.sequelize.authenticate();
    console.log('DB connected for agg test');

    const rows = await m.sequelize.query(
      `SELECT project_id AS "projectId",
              AVG(COALESCE(stars,score))::numeric(10,2) AS "avgRating",
              COUNT(*)::int AS "ratingsCount"
       FROM ratings
       WHERE project_id IS NOT NULL
       GROUP BY project_id
       LIMIT 5`,
      { type: QueryTypes.SELECT },
    );

    console.log('\nAGG RAW:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('\nAGG ERR:');
    console.error(e && e.stack ? e.stack : e);
    process.exit(1);
  }
  process.exit(0);
})();
