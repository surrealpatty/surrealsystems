'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const qi = queryInterface;
    const t = await qi.sequelize.transaction();

    try {
      // Columns (IF NOT EXISTS semantics via try/catch on addColumn)
      const add = async (name, def) => {
        try { await qi.addColumn('ratings', name, def, { transaction: t }); } catch (_) {}
      };

      await add('service_id', { type: Sequelize.INTEGER, allowNull: true });
      await add('rater_id',   { type: Sequelize.INTEGER, allowNull: true });
      await add('ratee_id',   { type: Sequelize.INTEGER, allowNull: true });
      await add('stars',      { type: Sequelize.INTEGER, allowNull: true });
      await add('score',      { type: Sequelize.INTEGER, allowNull: true });
      await add('comment',    { type: Sequelize.TEXT,    allowNull: true });

      // Backfill from user_id -> rater_id if present
      await qi.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='ratings' AND column_name='user_id') THEN
            UPDATE ratings SET rater_id = COALESCE(rater_id, user_id) WHERE rater_id IS NULL;
          END IF;
        END$$;
      `, { transaction: t });

      // Backfill stars from rating or score
      await qi.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name='ratings' AND column_name='rating') THEN
            UPDATE ratings SET stars = COALESCE(stars, rating, score) WHERE stars IS NULL;
          ELSE
            UPDATE ratings SET stars = COALESCE(stars, score) WHERE stars IS NULL;
          END IF;
        END$$;
      `, { transaction: t });

      await qi.sequelize.query(`
        UPDATE ratings SET stars = LEAST(5, GREATEST(1, stars)) WHERE stars IS NOT NULL;
      `, { transaction: t });

      // Partial unique index (ignore if already exists)
      await qi.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS ratings_unique_rater_ratee
          ON ratings (rater_id, ratee_id)
          WHERE ratee_id IS NOT NULL;
      `, { transaction: t });

      await qi.sequelize.query(`
        CREATE INDEX IF NOT EXISTS ratings_ratee_idx ON ratings (ratee_id);
      `, { transaction: t });

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    // Non-destructive down: just drop the indexes (leave columns/data intact)
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ratings_unique_rater_ratee;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ratings_ratee_idx;`);
  }
};
