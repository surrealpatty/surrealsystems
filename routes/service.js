const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User'); // ✅ make sure this matches your Sequelize model
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to authenticate token
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

// GET all services with associated user
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: {
                model: User,
                attributes: ['id', 'username'] // only username and id for front-end
            }
        });
        res.json(services); // ✅ always return JSON
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load services' });
    }
});

// CREATE a new service
router.post('/', authenticateToken, async (req, res) => {
    const { title, description, price } = req.body;
    const userId = req.user.id;

    if (!title || !description || !price) {
        return res.status(400).json({ error: 'All fields required' });
    }

    try {
        const service = await Service.create({ title, description, price, userId });

        // Include username in response
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
