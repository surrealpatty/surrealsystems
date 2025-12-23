const { project } = require('../models');

// Helpers
function ownOr403(project, userId, res) {
  if (!project) return res.status(404).json({ error: 'project not found' });
  if (String(project.userId) !== String(userId)) {
    return res.status(403).json({ error: 'Not allowed' });
  }
  return null;
}

// GET /api/projects?search=&page=&limit=
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

    const result = await project.findAndCountAll({
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
    console.error('projects list error:', err);
    res.status(500).json({ error: 'Failed to list projects' });
  }
};

// GET /api/projects/:id
exports.getById = async (req, res) => {
  try {
    const project = await project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'project not found' });
    res.json({ project });
  } catch (err) {
    console.error('project get error:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// POST /api/projects  (protected)
exports.create = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const project = await project.create({
      title,
      description,
      price,
      userId: req.user.id,
    });
    res.status(201).json({ project });
  } catch (err) {
    console.error('project create error:', err);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// PUT /api/projects/:id  (protected + owner)
exports.update = async (req, res) => {
  try {
    const project = await project.findByPk(req.params.id);
    const early = ownOr403(project, req.user.id, res);
    if (early) return;

    const { title, description, price } = req.body;
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (price !== undefined) project.price = price;
    await project.save();

    res.json({ project });
  } catch (err) {
    console.error('project update error:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// DELETE /api/projects/:id  (protected + owner)
exports.remove = async (req, res) => {
  try {
    const project = await project.findByPk(req.params.id);
    const early = ownOr403(project, req.user.id, res);
    if (early) return;

    await project.destroy();
    res.json({ message: 'project deleted' });
  } catch (err) {
    console.error('project delete error:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};
