require('dotenv').config(); // load .env if present

(async () => {
  try {
    // adjust path if your models index is somewhere else
    const { sequelize } = require('../src/models');

    // Add the column if it doesn't exist
    await sequelize.query(`ALTER TABLE ratings ADD COLUMN IF NOT EXISTS service_id INTEGER NULL;`);

    // Add FK constraint only if not present
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ratings_service_id_fkey'
        ) THEN
          ALTER TABLE ratings
            ADD CONSTRAINT ratings_service_id_fkey
            FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    console.log('Added service_id column and FK constraint (if needed).');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error while adding service_id:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
