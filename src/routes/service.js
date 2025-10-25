// src/routes/service.js
const express = require('express');
const router = express.Router();
const { Service, User, Rating } = require('../models');
const { fn, col } = require('sequelize');
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

      // Aggregate ratings (one query for all serviceIds)
      const serviceIds = rows.map(r => r.id);
      let ratingsSummary = [];
      try {
        ratingsSummary = await Rating.findAll({
          attributes: [
            'serviceId',
            [fn('AVG', col('score')), 'avgRating'],
            [fn('COUNT', col('id')), 'ratingsCount']
          ],
          where: { serviceId: serviceIds },
          group: ['serviceId']
        });
      } catch (aggErr) {
        // If aggregation fails (e.g., ratings table missing), log and continue with empty summaries
        console.error('Ratings aggregation failed, continuing without ratings summaries:', aggErr && aggErr.stack ? aggErr.stack : aggErr);
        ratingsSummary = [];
      }

      // Map summaries to a dict: serviceId -> { avgRating, ratingsCount }
      const summaryMap = {};
      (ratingsSummary || []).forEach(r => {
        const sid = r.get('serviceId');
        summaryMap[sid] = {
          avgRating: r.get('avgRating') !== null ? Number(Number(r.get('avgRating')).toFixed(2)) : null,
          ratingsCount: Number(r.get('ratingsCount') || 0)
        };
      });

      // Build final services payload
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
          { model: Rating, as: 'ratings', attributes: ['id','score','comment','userId','createdAt'] }
        ]
      });
      if (!s) return err(res, 'Service not found', 404);

      const ratings = (s.ratings || []).map(r => ({ id: r.id, score: r.score, comment: r.comment, userId: r.userId, createdAt: r.createdAt }));
      const avgRating = ratings.length ? (ratings.reduce((a,b)=>a + (b.score||0), 0) / ratings.length) : null;

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
