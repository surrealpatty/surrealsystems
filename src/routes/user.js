// routes/service.js
const express = require('express');
const router = express.Router();
const { Service, User } = require('../models');
const { body, param, query } = require('express-validator');
const authenticateToken = require('../middlewares/authenticateToken');
const validate = require('../middlewares/validate'); // <-- add

// GET /api/services
router.get(
  '/',
  [
    query('userId').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
      const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const where = {};
      if (userId) where.userId = userId;

      const [services, total] = await Promise.all([
        Service.findAll({
          where,
          attributes: ['id', 'title', 'description', 'price', 'userId', 'createdAt'],
          include: [{ model: User, as: 'user', attributes: ['id', 'username'] }],
          order: [['createdAt', 'DESC']],
          limit,
          offset: (page - 1) * limit,
        }),
        Service.count({ where }),
      ]);

      const hasMore = page * limit < total;
      res.set('Cache-Control', 'private, max-age=15');
      res.json({ services, page, limit, total, hasMore });
    } catch (err) {
      console.error('Fetch services error:', err);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  }
);

// POST /api/services (create)
router.post(
  '/',
  authenticateToken,
  [
    body('title').isString().trim().isLength({ min: 3, max: 120 }),
    body('description').isString().isLength({ min: 10, max: 5000 }),
    body('price').isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { title, description, price } = req.body;
      const newService = await Service.create({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        userId: req.user.id,
      });
      res.status(201).json({ service: newService });
    } catch (err) {
      console.error('Create service error:', err);
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: err.errors?.map(e => e.message).join(', ') });
      }
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// PUT /api/services/:id (update)
router.put(
  '/:id',
  authenticateToken,
  [
    param('id').isInt(),
    body('title').optional().isString().trim().isLength({ min: 3, max: 120 }),
    body('description').optional().isString().isLength({ min: 10, max: 5000 }),
    body('price').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const service = await Service.findByPk(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (String(service.userId) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const updates = {};
      if (req.body.title !== undefined) updates.title = req.body.title.trim();
      if (req.body.description !== undefined) updates.description = req.body.description.trim();
      if (req.body.price !== undefined) updates.price = Number(req.body.price);

      await service.update(updates);
      res.json({ service });
    } catch (err) {
      console.error('Update service error:', err);
      if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ error: err.errors?.map(e => e.message).join(', ') });
      }
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

// DELETE /api/services/:id
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  validate,
  async (req, res) => {
    try {
      const service = await Service.findByPk(req.params.id);
      if (!service) return res.status(404).json({ error: 'Service not found' });
      if (String(service.userId) !== String(req.user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      await service.destroy();
      res.json({ message: 'Service deleted' });
    } catch (err) {
      console.error('Delete service error:', err);
      res.status(500).json({ error: 'Failed to delete service' });
    }
  }
);

module.exports = router;
