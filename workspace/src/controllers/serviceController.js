const { Service } = require('../models');

// Helpers
function ownOr403(service, userId, res) {
  if (!service) return res.status(404).json({ error: 'Service not found' });
  if (String(service.userId) !== String(userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  return null;
}

// GET /api/services?search=&page=&limit=
exports.list = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
    const offset = (page - 1) * limit;
    const where = {};
    // simple search by title
    if (req.query.search) where.title = { $iLike: `%${req.query.search}%` }; // requires Sequelize.Op.iLike below
    const { Op } = require('sequelize');
    if (where.title) where.title = { [Op.iLike]: `%${req.query.search}%` };

    const result = await Service.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    res.json({
      items: result.rows,
      total: result.count,
      page,
      pages: Math.ceil(result.count / limit),
    });
  } catch (err) {
    console.error('Services list error:', err);
    res.status(500).json({ error: 'Failed to list services' });
  }
};

// GET /api/services/:id
exports.getById = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (err) {
    console.error('Service get error:', err);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
};

// POST /api/services  (protected)
exports.create = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const service = await Service.create({
      title,
      description,
      price,
      userId: req.user.id,
    });
    res.status(201).json({ service });
  } catch (err) {
    console.error('Service create error:', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

// PUT /api/services/:id  (protected + owner)
exports.update = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    const early = ownOr403(service, req.user.id, res);
    if (early) return;

    const { title, description, price } = req.body;
    if (title !== undefined) service.title = title;
    if (description !== undefined) service.description = description;
    if (price !== undefined) service.price = price;
    await service.save();

    res.json({ service });
  } catch (err) {
    console.error('Service update error:', err);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

// DELETE /api/services/:id  (protected + owner)
exports.remove = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    const early = ownOr403(service, req.user.id, res);
    if (early) return;

    await service.destroy();
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('Service delete error:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};
