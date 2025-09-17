const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// GET all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'username'], // only return safe user fields
                },
            ],
        });
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

// CREATE service
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !description || !price) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const service = await Service.create({
            title,
            description,
            price,
            userId,
        });

        // include username of creator in the response
        const createdService = await Service.findByPk(service.id, {
            include: [{ model: User, attributes: ['id', 'username'] }],
        });

        res.json({ message: 'Service added successfully', service: createdService });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add service' });
    }
});

// UPDATE service
router.put('/:id', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id;

    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        if (title) service.title = title;
        if (description) service.description = description;
        if (price) service.price = price;

        await service.save();

        // return updated with username
        const updatedService = await Service.findByPk(service.id, {
            include: [{ model: User, attributes: ['id', 'username'] }],
        });

        res.json({ message: 'Service updated successfully', service: updatedService });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update service' });
    }
});

// DELETE service
router.delete('/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });
        if (service.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });

        await service.destroy();
        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete service' });
    }
});

module.exports = router;
