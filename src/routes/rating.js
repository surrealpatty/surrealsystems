const express = require('express');
const router = express.Router();
const Rating = require('../models/rating');
const authenticateToken = require('../middlewares/authenticateToken');

// Add a rating
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { serviceId, score, comment } = req.body;
    if (!serviceId || !score) return res.status(400).json({ error: 'Service ID and score required' });

    const rating = await Rating.create({
      userId: req.user.id,
      serviceId,
      score,
      comment
    });
    res.status(201).json({ rating });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add rating' });
  }
});

// Get ratings for a service
router.get('/:serviceId', async (req, res) => {
  try {
    const ratings = await Rating.findAll({
      where: { serviceId: req.params.serviceId }
    });
    res.json(ratings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

module.exports = router;
