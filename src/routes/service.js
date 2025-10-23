const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Service, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

// Small helpers to keep responses consistent
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}
function sendError(res, message = 'Something went wrong', status = 500, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

/**
 * GET /api/services
 * Optional query:
 *   userId=<number>  filter by owner
 *   page=<number>    default 1
 *   limit=<number>   default 12, max 50
 *   sort=newest|priceLow|priceHigh (default newest)
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const sort = String(req.query.sort || 'newest').toLowerCase();
    let order;
    if (sort === 'pricelow') order = [['price', 'ASC']];
    else if (sort === 'pricehigh') order = [['price', 'DESC']];
    else order = [['createdAt', 'DESC']]; // newest

    const where = {};
    if (userId) where.userId = userId;

    const { rows, count } = await Service.findAndCountAll({
      where,
      attributes: ['id', 'title', 'description', 'price', 'userId', 'createdAt'],
      include: [
        {
          model: User,
          as: 'user',                // make sure your association uses this alias
          attributes: ['id', 'username'],
          required: false,
        },
      ],
      order,
      limit,
      offset,
      subQuery: false,              // helps performance on joins + pagination
    });

    const hasMore = offset + rows.length < count;
    res.set('Cache-Control', 'private, max-age=15');

    return sendSuccess(res, {
      services: rows,
      hasMore,
      page,
      limit,
      total: count,
      sort,
      filter: { userId },
    });
  } catch (err) {
    console.error('Fetch services error:', err);
    return sendError(res, 'Failed to fetch services', 500);
  }
});

/**
 * POST /api/services  (create; auth required)
 * Body: { title, description, price }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, price } = req.body;

    if (!title || !description) {
      return sendError(res, 'Title and description are required', 400);
    }

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return sendError(res, 'Price must be a non-negative number', 400);
    }

    const newService = await Service.create({
      title: String(title).trim(),
      description: String(description).trim(),
      price: priceNum,
      userId: req.user.id,
    });

    return sendSuccess(res, { service: newService }, 201);
  } catch (err) {
    console.error('Create service error:', err);
    if (err.name === 'SequelizeValidationError') {
      return sendError(
        res,
        err.errors?.map(e => e.message).join(', ') || 'Validation failed',
        400
      );
    }
    return sendError(res, 'Failed to create service', 500);
  }
});

/**
 * PUT /api/services/:id  (update; owner only)
 * Body: { title?, description?, price? }
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return sendError(res, 'Invalid service id', 400);
    }

    const service = await Service.findByPk(idNum);
    if (!service) return sendError(res, 'Service not found', 404);
    if (String(service.userId) !== String(req.user.id)) {
      return sendError(res, 'Unauthorized', 403);
    }

    const updates = {};
    if (typeof req.body.title === 'string' && req.body.title.trim()) {
      updates.title = req.body.title.trim();
    }
    if (typeof req.body.description === 'string' && req.body.description.trim()) {
      updates.description = req.body.description.trim();
    }
    if (req.body.price !== undefined) {
      const priceNum = Number(req.body.price);
      if (!Number.isFinite(priceNum) || priceNum < 0) {
        return sendError(res, 'Price must be a non-negative number', 400);
      }
      updates.price = priceNum;
    }

    await service.update(updates);
    return sendSuccess(res, { service });
  } catch (err) {
    console.error('Update service error:', err);
    if (err.name === 'SequelizeValidationError') {
      return sendError(
        res,
        err.errors?.map(e => e.message).join(', ') || 'Validation failed',
        400
      );
    }
    return sendError(res, 'Failed to update service', 500);
  }
});

/**
 * DELETE /api/services/:id  (owner only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return sendError(res, 'Invalid service id', 400);
    }

    const service = await Service.findByPk(idNum);
    if (!service) return sendError(res, 'Service not found', 404);
    if (String(service.userId) !== String(req.user.id)) {
      return sendError(res, 'Unauthorized', 403);
    }

    await service.destroy();
    return sendSuccess(res, { message: 'Service deleted' });
  } catch (err) {
    console.error('Delete service error:', err);
    return sendError(res, 'Failed to delete service', 500);
  }
});

module.exports = router;
