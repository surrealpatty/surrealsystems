const express = require('express');
const router = express.Router();
const { DataTypes } = require('sequelize');
const sequelize = require('../models/database');

// Define Service model
const Service = sequelize.define('Service', {
  title: DataTypes.STRING,
  description: DataTypes.TEXT,
  price: DataTypes.FLOAT,
  userId: DataTypes.INTEGER
});

// Associations (optional)
const User = sequelize.models.User;
Service.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Service, { foreignKey: 'userId' });

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.findAll({ include: User });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load services' });
  }
});

// Add service
router.post('/', async (req, res) => {
  const { title, description, price, userId } = req.body;
  if (!title || !description || !price || !userId) return res.status(400).json({ error: 'All fields required' });

  try {
    await Service.create({ title, description, price, userId });
    res.json({ message: 'Service added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add service' });
  }
});

module.exports = router;
