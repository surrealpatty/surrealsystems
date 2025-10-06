const express = require('express');
const router = express.Router();
const Rating = require('../models/rating');
const User = require('../models/user');
const Service = require('../models/services');
const authenticateToken = require('../middlewares/authenticateToken'); // ✅ direct import, no destructure

// Add a new rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serviceId, rating, comment } = req.body;

    if (!serviceId || !rating) {
      return res.status(400).json({ success: false, message: 'Service ID and rating are required' });
    }

    const newRating = await Rating.create({
      userId: req.user.id,
      serviceId,
      rating,
      comment
    });

    res.status(201).json({ success: true, data: newRating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all ratings for a service
router.get('/:serviceId', async (req, res) => {
  try {
    const { serviceId } = req.params;

    const ratings = await Rating.findAll({
      where: { serviceId },
      include: [{ model: User, attributes: ['id', 'username'] }]
    });

    res.status(200).json({ success: true, data: ratings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
