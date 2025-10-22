// routes/service.js
const express = require('express');
const router = express.Router();
const { Service, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

/**
 * GET /api/services
 * Optional query params:
 *   userId: number  -> filter by owner
 *   page:   number  -> 1-based page (default 1)
 *   limit:  number  -> page size (default 12, max 50)
 *
 * Examples:
 *   /api/services?userId=123
 *   /api/services?userId=123&page=2&limit=12
 */
router.get('/', async (req, res) => {
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
    // Small private cache to protect your API and avoid thrash
    res.set('Cache-Control', 'private, max-age=15');
    res.json({ services, page, limit, total, hasMore });
  } catch (err) {
    console.error('Fetch services error:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// CREATE a service (auth required)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }
    const priceNum = Number(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    const newService = await Service.create({
      title,
      description,
      price: priceNum,
      userId: req.user.id
    });

    res.status(201).json({ service: newService });
  } catch (err) {
    console.error('Create service error:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors?.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// UPDATE a service (auth required, owner only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const updates = {};
    if (typeof req.body.title === 'string' && req.body.title.trim()) updates.title = req.body.title.trim();
    if (typeof req.body.description === 'string' && req.body.description.trim()) updates.description = req.body.description.trim();

    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'Price must be a non-negative number' });
      }
      updates.price = priceNum;
    }

    await service.update(updates);
    res.json({ service });
  } catch (err) {
    console.error('Update service error:', err);
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: err.errors?.map(e => e.message).join(', ') });
    }
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// DELETE a service (auth required, owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await service.destroy();
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('Delete service error:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
