// src/routes/service.js
const express = require('express');
const router = express.Router();
const models = require('../models');
const { Service, User, Rating, sequelize } = models;
const { QueryTypes } = require('sequelize');
const authenticateToken = require('../middlewares/authenticateToken');
const { query, param, body } = require('express-validator');
const validate = require('../middlewares/validate');

function ok(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload, data: payload });
}
function err(res, message = 'Something went wrong', status = 500, details) {
  const out = { success: false, error: { message } };
  if (details) out.error.details = details;
  return res.status(status).json(out);
}

// DEBUG route omitted for brevity — keep existing one if you have it

router.get(
  '/',
  [ /* validators omitted for brevity (keep yours) */ ],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const page = req.query.page;
      const offset = typeof page === 'number' ? (Math.max(1, page) - 1) * limit : (req.query.offset ?? 0);

      const where = {};
      if (req.query.userId) where.userId = Number(req.query.userId);

      // fetch services with owner
      const rows = await Service.findAll({
        where: Object.keys(where).length ? where : undefined,
        attributes: ['id','userId','title','description','price','createdAt','updatedAt'],
        include: [{ model: User, as: 'owner', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit,
        offset
      });

      if (!rows || !rows.length) return ok(res, { services: [], hasMore: false, nextOffset: offset });

      // Determine whether the DB has a column for serviceId (model now maps to camelCase)
      const ratingAttrs = Rating.rawAttributes || {};
      const hasServiceColumn = !!ratingAttrs.serviceId && ratingAttrs.serviceId.field !== undefined;

      const summaryMap = {};

      if (hasServiceColumn) {
        // column name (as stored in DB)
        const serviceCol = ratingAttrs.serviceId.field || 'serviceId';
        // run raw SQL aggregation using that column name
        try {
          const rowsRaw = await sequelize.query(
            `SELECT "${serviceCol}" AS "serviceId",
                    AVG(COALESCE(stars,score))::numeric(10,2) AS "avgRating",
                    COUNT(*)::int AS "ratingsCount"
             FROM ratings
             WHERE "${serviceCol}" IS NOT NULL
               AND "${serviceCol}" IN (:ids)
             GROUP BY "${serviceCol}"`,
            { replacements: { ids: rows.map(r => r.id) }, type: QueryTypes.SELECT }
          );

          (rowsRaw || []).forEach(r => {
            summaryMap[r.serviceId] = {
              avgRating: r.avgRating !== null && r.avgRating !== undefined ? Number(Number(r.avgRating).toFixed(2)) : null,
              ratingsCount: Number(r.ratingsCount || 0)
            };
          });
        } catch (e) {
          console.error('Ratings aggregation raw SQL failed, continuing without summaries:', e && e.stack ? e.stack : e);
          // leave summaryMap empty
        }
      } else {
        // No serviceId column in the ratings table — skip aggregation.
        console.info('ratings table has no serviceId column; skipping service-level aggregation.');
      }

      const services = rows.map(s => {
        const sum = summaryMap[s.id] || { avgRating: null, ratingsCount: 0 };
        return {
          id: s.id,
          title: s.title,
          description: s.description,
          price: s.price,
          owner: s.owner || null,
          user: s.owner || null,
          userId: s.userId,
          avgRating: sum.avgRating,
          ratingsCount: sum.ratingsCount,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        };
      });

      const hasMore = rows.length >= limit;
      return ok(res, { services, hasMore, nextOffset: offset + rows.length });
    } catch (e) {
      console.error('GET /api/services error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load services', 500);
    }
  }
);

module.exports = router;
