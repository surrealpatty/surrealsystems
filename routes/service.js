const express = require('express');
const Service = require('../models/Service');
const User = require('../models/User');
const router = express.Router();

// Get all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({ include: User });
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add service
router.post('/', async (req, res) => {
    const { title, description, price, userId } = req.body;
    if (!title || !description || !price || !userId)
        return res.status(400).json({ error: 'All fields required' });

    try {
        const service = await Service.create({ title, description, price, UserId: userId });
        res.json({ message: 'Service added', serviceId: service.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
