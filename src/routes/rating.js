// routes/rating.js
const express = require('express');
const router = express.Router();
const { Rating, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

// GET ratings for a given user (ratee) + summary
router.get('/user/:userId', async (req, res) => {
  try {
    const rateeId = parseInt(req.params.userId, 10);
    if (Number.isNaN(rateeId)) return res.status(400).json({ error: 'Invalid user id' });

    const ratings = await Rating.findAll({
      where: { rateeId },
      include: [{ model: User, as: 'rater', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });

    const count = ratings.length;
    const avg = count ? (ratings.reduce((s, r) => s + r.stars, 0) / count) : 0;

    res.json({
      summary: { count, average: Number(avg.toFixed(2)) },
      ratings
    });
  } catch (err) {
    console.error('Get ratings error:', err);
    res.status(500).json({ error: 'Failed to load ratings' });
  }
});

// POST create or update a rating (upsert by raterId+rateeId)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const raterId = req.user.id;
    const { rateeId, stars, comment } = req.body;

    if (!rateeId || !stars) return res.status(400).json({ error: 'rateeId and stars are required' });
    if (Number(rateeId) === raterId) return res.status(400).json({ error: 'You cannot rate yourself' });

    const clamped = Math.max(1, Math.min(5, parseInt(stars, 10)));

    const [rating, created] = await Rating.findOrCreate({
      where: { raterId, rateeId },
      defaults: { stars: clamped, comment: comment || null }
    });

    if (!created) {
      rating.stars = clamped;
      rating.comment = comment || null;
      await rating.save();
    }

    // fresh summary
    const all = await Rating.findAll({ where: { rateeId } });
    const count = all.length;
    const avg = count ? (all.reduce((s, r) => s + r.stars, 0) / count) : 0;

    res.status(created ? 201 : 200).json({
      message: created ? 'Rating created' : 'Rating updated',
      rating,
      summary: { count, average: Number(avg.toFixed(2)) }
    });
  } catch (err) {
    console.error('Upsert rating error:', err);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

module.exports = router;
