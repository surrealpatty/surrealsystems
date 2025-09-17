const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const authenticateToken = require('../middlewares/authenticateToken');

// GET all services with user info
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: { model: User, attributes: ['id', 'username'] }
        });
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

// POST a new service (requires token)
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id; // from middleware

    if (!title || !description || !price) return res.status(400).json({ error: 'All fields required' });

    try {
        const service = await Service.create({ title, description, price, userId });
        const createdService = await Service.findByPk(service.id, {
            include: { model: User, attributes: ['id', 'username'] }
        });
        res.status(201).json({ message: 'Service added successfully', service: createdService });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add service' });
    }
});

module.exports = router;
