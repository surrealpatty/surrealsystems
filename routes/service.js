const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');

// Get all services
router.get('/', async (req, res) => {
    const services = await Service.findAll({ include: User });
    res.json(services);
});

// Add a service
router.post('/', async (req, res) => {
    try {
        const { title, description, price, userId } = req.body;
        const user = await User.findByPk(userId);
        if (!user) return res.status(400).json({ error: 'User not found' });

        const service = await Service.create({ title, description, price, UserId: userId });
        res.json({ message: 'Service created', service });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
