const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, 'supersecretkey');
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// CREATE SERVICE
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, description, price } = req.body;
        const userId = req.user.id;

        if (!title || !description || price == null) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const service = await Service.create({ title, description, price, userId });
        res.status(201).json({ message: 'Service created', service });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET ALL SERVICES
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({ include: { model: User, attributes: ['id', 'username'] } });
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
