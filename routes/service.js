const express = require('express');
const router = express.Router();
const Service = require('../models/service'); // <-- go up one folder
const User = require('../models/User');

// Create a new service
router.post('/', async (req, res) => {
    try {
        const { title, description, price, userId } = req.body;
        if (!title || !description || price == null || !userId) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const service = await Service.create({ title, description, price, userId });
        res.status(201).json({ message: 'Service created successfully', service });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Get all services with associated users
router.get('/', async (req, res) => {
    try {
        const services = await Service.findAll({
            include: { model: User, attributes: { exclude: ['password'] } }
        });
        res.json(services);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get a single service
router.get('/:id', async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id, {
            include: { model: User, attributes: { exclude: ['password'] } }
        });
        if (!service) return res.status(404).json({ error: 'Service not found' });
        res.json(service);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a service
router.delete('/:id', async (req, res) => {
    try {
        const service = await Service.findByPk(req.params.id);
        if (!service) return res.status(404).json({ error: 'Service not found' });

        await service.destroy();
        res.json({ message: 'Service deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
