// src/routes/service.js
const express = require('express');
const router = express.Router();
const { Service, User, Rating } = require('../models');
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

      const rows = await Service.findAll({
        where: Object.keys(where).length ? where : undefined,
        attributes: ['id','userId','title','description','price','createdAt','updatedAt'],
        include: [
          { model: User, as: 'owner', attributes: ['id','username'] },
          { model: Rating, as: 'ratings', attributes: ['score'] }
        ],
        order: [['createdAt','DESC']],
        limit,
        offset
      });

      const services = rows.map(s => {
        const ratings = (s.ratings || []).map(r => r.score).filter(x => typeof x === 'number');
        const avgRating = ratings.length ? (ratings.reduce((a,b) => a + b, 0) / ratings.length) : null;

        return {
          id: s.id,
          title: s.title,
          description: s.description,
          price: s.price,
          owner: s.owner || null,
          user: s.owner || null,
          userId: s.userId,
          avgRating,
          ratingsCount: ratings.length,
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
