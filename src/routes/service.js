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

router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('userId').optional().isInt({ min: 1 }).toInt()
  ],
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

      // Try raw aggregation using COALESCE(stars, score).
      // If the DB doesn't have serviceId or aggregation fails, we'll skip summaries.
      const serviceIds = rows.map(r => r.id);
      const summaryMap = {};

      try {
        // Use camelCase column name 'serviceId' since your DB uses camelCase
        const rowsRaw = await sequelize.query(
          `SELECT "serviceId",
                  AVG(COALESCE(stars, score))::numeric(10,2) AS "avgRating",
                  COUNT(*)::int AS "ratingsCount"
           FROM ratings
           WHERE "serviceId" IS NOT NULL AND "serviceId" IN (:ids)
           GROUP BY "serviceId"`,
          { replacements: { ids: serviceIds }, type: QueryTypes.SELECT }
        );

        (rowsRaw || []).forEach(r => {
          summaryMap[r.serviceId] = {
            avgRating: r.avgRating !== null && r.avgRating !== undefined ? Number(Number(r.avgRating).toFixed(2)) : null,
            ratingsCount: Number(r.ratingsCount || 0)
          };
        });
      } catch (e) {
        // If raw aggregation fails because column doesn't exist (or other DB issue),
        // we continue without summaries (avgRating=null) and log the error.
        console.info('Ratings aggregation skipped or failed (no service-level ratings or DB schema mismatch):', e && e.message ? e.message : e);
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
