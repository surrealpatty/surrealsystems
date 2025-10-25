// src/routes/service.js
const express = require('express');
const router = express.Router();
const models = require('../models');
const { Service, User, Rating, sequelize } = models;
const { fn, col, QueryTypes } = require('sequelize');
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

// Dev debug route (keeps quick check without includes)
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

      // Fetch services with owner only (don't fetch ratings rows)
      const rows = await Service.findAll({
        where: Object.keys(where).length ? where : undefined,
        attributes: ['id','userId','title','description','price','createdAt','updatedAt'],
        include: [{ model: User, as: 'owner', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit,
        offset
      });

      // If no services, return early
      if (!rows || !rows.length) {
        return ok(res, { services: [], hasMore: false, nextOffset: offset });
      }

      const serviceIds = rows.map(r => r.id);
      let ratingsSummary = [];

      // Try aggregation several ways to tolerate schema differences:
      // 1) AVG(score)
      // 2) AVG(stars)
      // 3) raw SQL AVG(COALESCE(score, stars))
      // If all fail, continue with empty summaries.
      try {
        // Attempt 1: existing 'score' column (most likely)
        ratingsSummary = await Rating.findAll({
          attributes: [
            'serviceId',
            [fn('AVG', col('score')), 'avgRating'],
            [fn('COUNT', col('id')), 'ratingsCount']
          ],
          where: { serviceId: serviceIds },
          group: ['serviceId']
        });
      } catch (e1) {
        console.warn('Ratings aggregation with score failed, trying stars:', e1 && e1.message ? e1.message : e1);
        try {
          // Attempt 2: try 'stars'
          ratingsSummary = await Rating.findAll({
            attributes: [
              'serviceId',
              [fn('AVG', col('stars')), 'avgRating'],
              [fn('COUNT', col('id')), 'ratingsCount']
            ],
            where: { serviceId: serviceIds },
            group: ['serviceId']
          });
        } catch (e2) {
          console.warn('Ratings aggregation with stars failed, trying raw COALESCE:', e2 && e2.message ? e2.message : e2);
          try {
            // Attempt 3: raw SQL using COALESCE(score, stars)
            // Use named replacements for safety
            const rowsRaw = await sequelize.query(
              `SELECT "serviceId", AVG(COALESCE(score, stars))::numeric(10,2) AS "avgRating", COUNT(*)::int AS "ratingsCount"
               FROM ratings
               WHERE "serviceId" IN (:ids)
               GROUP BY "serviceId"`,
              { replacements: { ids: serviceIds }, type: QueryTypes.SELECT }
            );
            // rowsRaw is an array of plain objects; adapt to common shape
            ratingsSummary = rowsRaw.map(r => ({
              // emulate Sequelize Model.get() used later
              get: (k) => r[k]
            }));
          } catch (e3) {
            console.error('Ratings aggregation failed (all attempts). Continuing without ratings summaries:', e3 && e3.stack ? e3.stack : e3);
            ratingsSummary = [];
          }
        }
      }

      // Normalize summaries into a simple map: serviceId -> { avgRating, ratingsCount }
      const summaryMap = {};
      (ratingsSummary || []).forEach(r => {
        // r may be Sequelize model with get() or a plain object wrapped above
        let sid, avg, cnt;
        if (typeof r.get === 'function') {
          const d = r.get();
          sid = d.serviceId ?? d.serviceid ?? d.service_id;
          avg = d.avgRating ?? d.avgrating;
          cnt = d.ratingsCount ?? d.ratingscount ?? d.ratings_count;
        } else {
          sid = r.serviceId ?? r.serviceid ?? r.service_id;
          avg = r.avgRating ?? r.avgrating;
          cnt = r.ratingsCount ?? r.ratingscount ?? r.ratings_count;
        }
        summaryMap[sid] = {
          avgRating: avg !== null && avg !== undefined ? Number(Number(avg).toFixed(2)) : null,
          ratingsCount: Number(cnt || 0)
        };
      });

      // Build final services payload (use summaryMap)
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
          // include both 'score' and 'stars' to be tolerant
          { model: Rating, as: 'ratings', attributes: ['id','score','stars','comment','userId','createdAt'] }
        ]
      });
      if (!s) return err(res, 'Service not found', 404);

      const ratings = (s.ratings || []).map(r => {
        // r may be a Sequelize instance; use get if available
        const get = typeof r.get === 'function' ? r.get.bind(r) : (k) => r[k];
        const val = (get('stars') !== undefined && get('stars') !== null) ? get('stars') : get('score');
        return { id: get('id'), score: get('score'), stars: get('stars'), value: val, comment: get('comment'), userId: get('userId'), createdAt: get('createdAt') };
      });
      const avgRating = ratings.length ? (ratings.reduce((a,b) => a + Number(b.value || 0), 0) / ratings.length) : null;

      const serviceOut = {
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
      };

      return ok(res, { service: serviceOut });
    } catch (e) {
      console.error('GET /api/services/:id error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load service', 500);
    }
  }
);

router.post(
  '/',
  authenticateToken,
  [
    body('title').isString().isLength({ min: 1 }).trim(),
    body('description').optional().isString(),
    body('price').optional().isDecimal()
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, price } = req.body;
      const svc = await Service.create({
        userId: req.user.id,
        title,
        description: description || null,
        price: price || null
      });

      const out = {
        id: svc.id,
        title: svc.title,
        description: svc.description,
        price: svc.price,
        userId: svc.userId,
        createdAt: svc.createdAt,
        updatedAt: svc.updatedAt
      };

      return ok(res, { service: out }, 201);
    } catch (e) {
      console.error('POST /api/services error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to create service', 500);
    }
  }
);

module.exports = router;
