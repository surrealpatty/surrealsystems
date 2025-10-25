// src/routes/service.js
const express = require('express');
const router = express.Router();
const { Service, User, Rating } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');
const { query, param, body } = require('express-validator');
const validate = require('../middlewares/validate');

/* helpers */
function ok(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload, data: payload });
}
function err(res, message = 'Something went wrong', status = 500, details) {
  const out = { success: false, error: { message } };
  if (details) out.error.details = details;
  return res.status(status).json(out);
}

/**
 * GET /api/services
 * List services (with owner info and basic rating summary)
 * optional: ?limit&offset
 */
router.get(
  '/',
  [ query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt() ],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;

      const rows = await Service.findAll({
        attributes: ['id','userId','title','description','price','createdAt','updatedAt'],
        include: [
          { model: User, as: 'owner', attributes: ['id','username'] },
          { model: Rating, as: 'ratings', attributes: ['score'] }
        ],
        order: [['createdAt','DESC']],
        limit, offset
      });

      // compute average rating/client-friendly payload
      const services = rows.map(s => {
        const ratings = (s.ratings || []).map(r => r.score).filter(x => typeof x === 'number');
        const avgRating = ratings.length ? (ratings.reduce((a,b) => a + b, 0) / ratings.length) : null;
        return {
          id: s.id,
          title: s.title,
          description: s.description,
          price: s.price,
          owner: s.owner || null,
          avgRating,
          ratingsCount: ratings.length,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        };
      });

      return ok(res, { services, nextOffset: offset + services.length });
    } catch (e) {
      console.error('GET /api/services error:', e);
      return err(res, 'Failed to load services', 500);
    }
  }
);

/**
 * GET /api/services/:id
 */
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
      return ok(res, { service: s });
    } catch (e) {
      console.error('GET /api/services/:id error:', e);
      return err(res, 'Failed to load service', 500);
    }
  }
);

/**
 * POST /api/services
 * Create new service (requires authentication)
 * { title, description, price }
 */
router.post(
  '/',
  authenticateToken,
  [ body('title').isString().isLength({ min: 1 }).trim(),
    body('description').optional().isString(),
    body('price').optional().isDecimal() ],
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

      return ok(res, { service: svc }, 201);
    } catch (e) {
      console.error('POST /api/services error:', e);
      return err(res, 'Failed to create service', 500);
    }
  }
);

module.exports = router;
