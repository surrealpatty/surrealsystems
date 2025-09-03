// routes/service.js
const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const User = require('../models/User');

// Create service
router.post('/', async (req, res) => {
  try {
    const { title, description, price, userId } = req.body;
    if (!title || !description || price == null || !userId) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const service = await Service.create({ title, description, price, userId });
    res.status(201).json({ message: 'Service created', service });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.findAll({ include: { model: User, attributes: ['id','username'] } });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
