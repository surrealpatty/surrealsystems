// src/routes/rating.js
const express = require('express');
const router = express.Router();
const { Rating, User, sequelize } = require('../models');
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
    // Log the full stack so we can debug
    console.error('Get ratings error (stack):', err && err.stack ? err.stack : err);

    // SAFE: don't return 500 to the UI — return an empty summary so the profile UI won't hang
    return res.json({
      summary: { count: 0, average: 0.0 },
      ratings: []
    });
  }
});

/**
 * POST /api/ratings
 * Create or update a rating (by rater -> ratee). Only paid users can rate.
 * body: { rateeId, stars, comment }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Debug input
    console.log('POST /api/ratings body:', req.body);
    console.log('POST /api/ratings req.user:', req.user && { id: req.user.id });

    // Ensure authenticated user
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const raterId = Number(req.user.id);

    // Validate inputs
    const rawRatee = req.body.rateeId;
    const rawStars = req.body.stars;
    const comment = req.body.comment || null;

    const rateeId = Number(rawRatee);
    if (!rawRatee || Number.isNaN(rateeId)) {
      return res.status(400).json({ error: 'Invalid rateeId' });
    }

    // parse stars robustly and clamp
    const parsedStars = parseInt(rawStars, 10);
    if (Number.isNaN(parsedStars)) {
      return res.status(400).json({ error: 'Invalid stars value' });
    }
    const stars = Math.max(1, Math.min(5, parsedStars));

    if (raterId === rateeId) return res.status(400).json({ error: 'You cannot rate yourself' });

    // Ensure rater exists and is paid
    const rater = await User.findByPk(raterId);
    if (!rater) return res.status(404).json({ error: 'User not found' });
    if (rater.tier !== 'paid') return res.status(403).json({ error: 'Upgrade to a paid account to rate others.' });

    // Ensure ratee exists
    const ratee = await User.findByPk(rateeId);
    if (!ratee) return res.status(404).json({ error: 'Ratee not found' });

    // Create or update rating (do it explicitly to avoid surprises)
    let rating = await Rating.findOne({ where: { raterId, rateeId } });
    let created = false;

    if (rating) {
      rating.stars = stars;
      rating.comment = comment;
      await rating.save();
    } else {
      rating = await Rating.create({ raterId, rateeId, stars, comment });
      created = true;
    }

    // Compute fresh summary using SQL aggregates for accuracy/performance
    const count = await Rating.count({ where: { rateeId } });

    // get sum of stars
    const sumResult = await Rating.findAll({
      where: { rateeId },
      attributes: [[sequelize.fn('SUM', sequelize.col('stars')), 'sumStars']],
      raw: false
    });
    const sumStars = Number((sumResult[0] && (sumResult[0].get('sumStars') || 0)) || 0);
    const avg = count ? (sumStars / count) : 0;

    return res.status(created ? 201 : 200).json({
      message: created ? 'Rating created' : 'Rating updated',
      rating,
      summary: { count, average: Number(avg.toFixed(2)) }
    });
  } catch (err) {
    // Verbose debug output (helpful during development)
    console.error('Upsert rating error (name):', err.name);
    console.error('Upsert rating error (message):', err.message);
    console.error('Upsert rating error (stack):', err.stack);
    if (err.errors && Array.isArray(err.errors)) {
      console.error('Sequelize validation errors:', err.errors.map(e => ({ path: e.path, message: e.message, value: e.value })));
    }

    // If Sequelize ValidationError -> return 400 with details
    const SequelizeValidationError = err && err.name && err.name === 'SequelizeValidationError';
    if (SequelizeValidationError && err.errors) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors.map(e => e.message) });
    }

    // Generic fallback
    return res.status(500).json({ error: 'Failed to save rating', details: err.message });
  }
});

module.exports = router;
