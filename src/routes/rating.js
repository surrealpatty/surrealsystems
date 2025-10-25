// src/routes/rating.js
const express = require('express');
const router = express.Router();
const { Rating, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

/**
 * GET /api/ratings/user/:userId
 * Return ratings received by a user (ratee) with rater info + summary
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const rateeId = parseInt(req.params.userId, 10);
    if (Number.isNaN(rateeId)) return res.status(400).json({ error: 'Invalid user id' });

    // include rater info (alias 'rater' defined in models/index.js)
    const ratings = await Rating.findAll({
      where: { rateeId },
      include: [{ model: User, as: 'rater', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });

    // safe average calculation: handle Sequelize instances or plain objects, fallback to score
    const count = ratings.length;
    const sum = ratings.reduce((s, r) => {
      const get = typeof r.get === 'function' ? r.get.bind(r) : (k) => r[k];
      const v = (get('stars') !== undefined && get('stars') !== null) ? get('stars') : get('score');
      return s + Number(v || 0);
    }, 0);
    const avg = count ? (sum / count) : 0;

    return res.json({
      summary: { count, average: Number(avg.toFixed(2)) },
      ratings
    });
  } catch (err) {
    console.error('Get ratings error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to load ratings' });
  }
});

/**
 * POST /api/ratings
 * Create or update a rating (by rater -> ratee). Only paid users can rate.
 * body: { rateeId, stars, comment }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const raterId = req.user.id;
    const { rateeId, stars, comment } = req.body;

    if (!rateeId || !stars) return res.status(400).json({ error: 'rateeId and stars are required' });
    if (Number(rateeId) === Number(raterId)) return res.status(400).json({ error: 'You cannot rate yourself' });

    const rater = await User.findByPk(raterId);
    if (!rater) return res.status(404).json({ error: 'User not found' });
    if (rater.tier !== 'paid') return res.status(403).json({ error: 'Upgrade to a paid account to rate others.' });

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

    // fresh summary for ratee (safe same way)
    const all = await Rating.findAll({ where: { rateeId } });
    const count = all.length;
    const sum = all.reduce((s, r) => {
      const get = typeof r.get === 'function' ? r.get.bind(r) : (k) => r[k];
      const v = (get('stars') !== undefined && get('stars') !== null) ? get('stars') : get('score');
      return s + Number(v || 0);
    }, 0);
    const avg = count ? (sum / count) : 0;

    return res.status(created ? 201 : 200).json({
      message: created ? 'Rating created' : 'Rating updated',
      rating,
      summary: { count, average: Number(avg.toFixed(2)) }
    });
  } catch (err) {
    console.error('Upsert rating error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to save rating' });
  }
});

module.exports = router;
