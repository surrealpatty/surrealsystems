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

// Debug route
router.get('/debug/no-include', async (req, res) => {
  try {
    const rows = await Service.findAll({ attributes: ['id','userId','title'], limit: 5 });
    return res.json({ ok: true, rows });
  } catch (e) {
    console.error('DEBUG /api/services/no-include error:', e && e.stack ? e.stack : e);
    return res.status(500).send(e && e.stack ? e.stack : String(e));
  }
});

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

      const serviceIds = rows.map(r => r.id);

      // Use raw SQL aggregation with COALESCE(stars, score) against snake_case DB columns.
      // Our model uses underscored: true, so DB columns are service_id, stars, score.
      let rowsRaw = [];
      try {
        rowsRaw = await sequelize.query(
          `SELECT service_id AS "serviceId", AVG(COALESCE(stars, score))::numeric(10,2) AS "avgRating", COUNT(*)::int AS "ratingsCount"
           FROM ratings
           WHERE service_id IN (:ids)
           GROUP BY service_id`,
          { replacements: { ids: serviceIds }, type: QueryTypes.SELECT }
        );
      } catch (e) {
        console.error('Ratings aggregation raw SQL failed, continuing without summaries:', e && e.stack ? e.stack : e);
        rowsRaw = [];
      }

      const summaryMap = {};
      (rowsRaw || []).forEach(r => {
        summaryMap[r.serviceId] = {
          avgRating: r.avgRating !== null && r.avgRating !== undefined ? Number(Number(r.avgRating).toFixed(2)) : null,
          ratingsCount: Number(r.ratingsCount || 0)
        };
      });

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

router.get(
  '/:id',
  [ param('id').isInt({ min: 1 }).toInt() ],
  validate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const s = await Service.findByPk(id, {
        attributes: ['id','userId','title','description','price','createdAt','updatedAt'],
        include: [
          { model: User, as: 'owner', attributes: ['id','username'] },
          // include ratings and the rater info for details
          { model: Rating, as: 'ratings', attributes: ['id','stars','score','comment','raterId','createdAt'], include: [{ model: User, as: 'rater', attributes: ['id','username'] }] }
        ]
      });
      if (!s) return err(res, 'Service not found', 404);

      const ratings = (s.ratings || []).map(r => {
        const get = typeof r.get === 'function' ? r.get.bind(r) : (k) => r[k];
        const val = (get('stars') !== undefined && get('stars') !== null) ? get('stars') : get('score');
        return {
          id: get('id'),
          stars: get('stars'),
          score: get('score'),
          value: val,
          comment: get('comment'),
          rater: r.rater || null,
          raterId: get('raterId'),
          createdAt: get('createdAt')
        };
      });

      const avgRating = ratings.length ? (ratings.reduce((a,b) => a + Number(b.value || 0), 0) / ratings.length) : null;

      return ok(res, {
        service: {
          id: s.id,
          title: s.title,
          description: s.description,
          price: s.price,
          owner: s.owner || null,
          user: s.owner || null,
          userId: s.userId,
          ratings,
          avgRating,
          ratingsCount: ratings.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        }
      });
    } catch (e) {
      console.error('GET /api/services/:id error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load service', 500);
    }
  }
);

module.exports = router;
