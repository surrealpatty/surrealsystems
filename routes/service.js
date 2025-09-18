const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const authenticateToken = require('../middlewares/authenticateToken');

// GET all services with user info
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: { model: User, as: 'user', attributes: ['id', 'username'] }
        });

        // Flatten so frontend can use s.userId and s.username
        const servicesWithUser = services.map(s => ({
            id: s.id,
            title: s.title,
            description: s.description,
            price: s.price,
            userId: s.user.id,
            username: s.user.username
        }));

        res.json(servicesWithUser);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

// POST a new service (requires token)
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !description || !price) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const service = await Service.create({ title, description, price, userId });

        const createdService = await Service.findByPk(service.id, {
            include: { model: User, as: 'user', attributes: ['id', 'username'] }
        });

        res.status(201).json({
            message: 'Service added successfully',
            service: {
                id: createdService.id,
                title: createdService.title,
                description: createdService.description,
                price: createdService.price,
                userId: createdService.user.id,
                username: createdService.user.username
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add service' });
    }
});

// PUT /services/:id
router.put('/:id', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const serviceId = req.params.id;
    const userId = req.user.id;

    try {
        const service = await Service.findByPk(serviceId);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        service.title = title || service.title;
        service.description = description || service.description;
        service.price = price !== undefined ? price : service.price;
        await service.save();

        const updatedService = await Service.findByPk(service.id, {
            include: { model: User, as: 'user', attributes: ['id', 'username'] }
        });

        res.json({
            message: 'Service updated',
            service: {
                id: updatedService.id,
                title: updatedService.title,
                description: updatedService.description,
                price: updatedService.price,
                userId: updatedService.user.id,
                username: updatedService.user.username
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE /services/:id
router.delete('/:id', authenticateToken, async (req, res) => {
    const serviceId = req.params.id;
    const userId = req.user.id;

    try {
        const service = await Service.findByPk(serviceId);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        await service.destroy();
        res.json({ message: 'Service deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
