const express = require('express');
const Service = require('../models/Service');
const User = require('../models/User');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

// GET all visible services with user info
router.get('/', authenticateToken, async (req, res) => {
    try {
        const services = await Service.findAll({
            where: { hidden: false }, // only show non-hidden services
            include: [
                { model: User, as: 'user', attributes: ['id', 'username'] }
            ],
            order: [['createdAt', 'DESC']]
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
    const { title, description, price, featured, hidden } = req.body;

    try {
        const service = await Service.findByPk(id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

        // Update fields if provided
        if (title !== undefined) service.title = title;
        if (description !== undefined) service.description = description;
        if (price !== undefined) service.price = price;
        if (featured !== undefined) service.featured = featured;
        if (hidden !== undefined) service.hidden = hidden;

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

// PATCH toggle featured (owner only)
router.patch('/:id/featured', authenticateToken, async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

        service.featured = !service.featured;
        await service.save();
        res.json(service);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle featured' });
    }
});

// PATCH toggle hidden (owner only)
router.patch('/:id/hidden', authenticateToken, async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== req.user.id) return res.status(403).json({ error: 'Not allowed' });

        service.hidden = !service.hidden;
        await service.save();
        res.json(service);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to toggle hidden' });
    }
});

module.exports = router;
