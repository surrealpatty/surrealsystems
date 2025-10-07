const Service = require('../models/service');
const User = require('../models/user');

// GET all services
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'username', 'description'] }]
    });
    res.json({ services });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
};

// CREATE a service
exports.createService = async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !description || !price) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const service = await Service.create({ title, description, price: parseFloat(price), userId });
    res.status(201).json({ service });
  } catch (err) {
    console.error('Error creating service:', err);
    res.status(500).json({ error: 'Failed to create service' });
  }
};

// UPDATE a service
exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    const { title, description, price } = req.body;
    await service.update({ title, description, price: parseFloat(price) });
    res.json({ service });
  } catch (err) {
    console.error('Error updating service:', err);
    res.status(500).json({ error: 'Failed to update service' });
  }
};

// DELETE a service
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await service.destroy();
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error('Error deleting service:', err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
};
