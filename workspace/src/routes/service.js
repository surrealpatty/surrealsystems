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

/* ------------------------------ LIST ------------------------------- */
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('userId').optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const page = req.query.page;
      const offset =
        typeof page === 'number' ? (Math.max(1, page) - 1) * limit : (req.query.offset ?? 0);

      const where = {};
      if (req.query.userId) where.userId = Number(req.query.userId);

      // fetch services with owner
      const rows = await Service.findAll({
        where: Object.keys(where).length ? where : undefined,
        attributes: ['id', 'userId', 'title', 'description', 'price', 'createdAt', 'updatedAt'],
        include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      if (!rows || !rows.length)
        return ok(res, { services: [], hasMore: false, nextOffset: offset });

      // Try raw aggregation using COALESCE(stars, score).
      // Use DB column names (camelCase) and alias to serviceId for JS code.
      const serviceIds = rows.map((r) => r.id);
      console.info(
        '[services] fetched rows count=%d, serviceIds=%o',
        rows.length,
        serviceIds.slice(0, 5),
      );
      const summaryMap = {};

      try {
        // NOTE: ratings table columns use camelCase ("serviceId"). Alias to "serviceId"
        const rowsRaw = await sequelize.query(
          `SELECT "serviceId",
                  AVG(COALESCE(stars, score))::numeric(10,2) AS "avgRating",
                  COUNT(*)::int AS "ratingsCount"
           FROM ratings
           WHERE "serviceId" IS NOT NULL AND "serviceId" IN (:ids)
           GROUP BY "serviceId"`,
          { replacements: { ids: serviceIds }, type: QueryTypes.SELECT },
        );

        console.info('[services] aggregation rowsRaw sample:', (rowsRaw || []).slice(0, 5));

        (rowsRaw || []).forEach((r) => {
          summaryMap[r.serviceId] = {
            avgRating:
              r.avgRating !== null && r.avgRating !== undefined
                ? Number(Number(r.avgRating).toFixed(2))
                : null,
            ratingsCount: Number(r.ratingsCount || 0),
          };
        });
      } catch (e) {
        // If raw aggregation fails because column doesn't exist (or other DB issue),
        // we continue without summaries (avgRating=null) and log the error for debugging.
        console.info(
          'Ratings aggregation skipped or failed (no service-level ratings or DB schema mismatch):',
          e && e.message ? e.message : e,
        );
      }

      const services = rows.map((s) => {
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
          updatedAt: s.updatedAt,
        };
      });

      const hasMore = rows.length >= limit;
      return ok(res, { services, hasMore, nextOffset: offset + rows.length });
    } catch (e) {
      console.error('GET /api/services error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load services', 500);
    }
  },
);

/* ----------------------------- other routes unmodified ------------------------------ */
// CREATE / GET by ID / UPDATE / DELETE remain unchanged - keep original code below

router.post(
  '/',
  authenticateToken,
  [
    body('title').isString().isLength({ min: 3 }).withMessage('Title is required (min 3 chars)'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('price').optional({ nullable: true }).isDecimal().withMessage('Invalid price'),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = Number(req.user.id);
      const { title, description, price } = req.body;

      const svc = await Service.create({
        userId,
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        price: price != null ? Number(price) : null,
      });

      return ok(res, { service: svc }, 201);
    } catch (e) {
      console.error('Create service error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to create service', 500);
    }
  },
);

router.get('/:id', [param('id').isInt({ min: 1 }).toInt()], validate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const svc = await Service.findByPk(id, {
      include: [{ model: User, as: 'owner', attributes: ['id', 'username'] }],
    });
    if (!svc) return err(res, 'Service not found', 404);
    return ok(res, { service: svc });
  } catch (e) {
    console.error('Get service error:', e && e.stack ? e.stack : e);
    return err(res, 'Failed to load service', 500);
  }
});

router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isInt({ min: 1 }).toInt(),
    body('title').optional().isString().isLength({ min: 3 }),
    body('description').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    body('price').optional({ nullable: true }).isDecimal(),
  ],
  validate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const svc = await Service.findByPk(id);
      if (!svc) return err(res, 'Service not found', 404);
      if (Number(svc.userId) !== Number(req.user.id)) return err(res, 'Forbidden', 403);

      const { title, description, price } = req.body;
      await svc.update({
        title: title !== undefined ? String(title).trim() : svc.title,
        description:
          description !== undefined
            ? description
              ? String(description).trim()
              : null
            : svc.description,
        price: price !== undefined ? (price !== null ? Number(price) : null) : svc.price,
      });
      return ok(res, { service: svc });
    } catch (e) {
      console.error('Update service error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to update service', 500);
    }
  },
);

router.delete(
  '/:id',
  authenticateToken,
  [param('id').isInt({ min: 1 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const svc = await Service.findByPk(id);
      if (!svc) return err(res, 'Service not found', 404);
      if (Number(svc.userId) !== Number(req.user.id)) return err(res, 'Forbidden', 403);

      await svc.destroy();
      return ok(res, { message: 'Service deleted' });
    } catch (e) {
      console.error('Delete service error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to delete service', 500);
    }
  },
);

module.exports = router;
