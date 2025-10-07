const express = require('express');
const router = express.Router();
const { Service, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'username'] }]
    });
    res.json({ services });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a service
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, price } = req.body;
    if (!title || !description || !price) return res.status(400).json({ error: 'All fields are required' });

    const newService = await Service.create({
      title,
      description,
      price: parseFloat(price),
      userId: req.user.id
    });
    res.status(201).json({ service: newService });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update a service
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await service.update(req.body);
    res.json({ service });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Delete a service
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.userId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });

    await service.destroy();
    res.json({ message: 'Service deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
