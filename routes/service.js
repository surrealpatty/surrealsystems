const express = require('express');
const Service = require('../models/Service');
const User = require('../models/User');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

// GET all services with user info
router.get('/', authenticateToken, async (req, res) => {
    try {
        const services = await Service.findAll({
            include: [
                { model: User, as: 'user', attributes: ['id', 'username'] } // include username
            ]
        });
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// POST new service
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    try {
        const service = await Service.create({
            title,
            description,
            price,
            userId: req.user.id
        });
        res.status(201).json(service);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create service' });
    }
});

// PUT service (owner only)
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { title, description, price } = req.body;

    try {
        const service = await Service.findByPk(id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

        service.title = title;
        service.description = description;
        service.price = price;
        await service.save();
        res.json(service);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE service (owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const service = await Service.findByPk(id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

        await service.destroy();
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
