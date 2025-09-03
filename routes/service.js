// routes/service.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');

// Get all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: [{ model: User, attributes: ['username'] }]
        });
        res.json(services);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add a service
router.post('/', async (req, res) => {
    const { title, description, price, userId } = req.body;

    if (!title || !description || !price || !userId)
        return res.status(400).json({ error: 'All fields are required' });

    try {
        // Check user exists
        const user = await User.findByPk(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const service = await Service.create({ title, description, price, UserId: userId });
        res.status(201).json({ message: 'Service added', serviceId: service.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
