const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const authenticateToken = require('../middleware/authenticateToken');

// Create service (authenticated)
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { title, description, price } = req.body;
        const userId = req.user.id;

        if (!title || !description || price == null) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const service = await Service.create({ title, description, price, userId });
        res.status(201).json({ message: 'Service created successfully', service });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all services
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: { model: User, attributes: ['id', 'username'] }
        });
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
