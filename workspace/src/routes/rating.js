// src/routes/rating.js
const express = require('express');
const router = express.Router();
const { Rating, User, sequelize, Billing } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

/**
 * Helper: return true if user has paid access (tier=paid or billing active/trialing)
 */
async function isUserPaid(user) {
  if (!user) return false;
  if (user.tier === 'paid') return true;

  const bill = await Billing.findOne({
    where: { userId: user.id },
    order: [['id', 'DESC']],
  });
  if (!bill) return false;
  return ['active', 'trialing'].includes(String(bill.status));
}

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
      order: [['createdAt', 'DESC']],
    });

    // safe average calculation: handle Sequelize instances or plain objects, fallback to score
    const count = ratings.length;
    const sum = ratings.reduce((s, r) => {
      const get = typeof r.get === 'function' ? r.get.bind(r) : (k) => r[k];
      const v = get('stars') !== undefined && get('stars') !== null ? get('stars') : get('score');
      return s + Number(v || 0);
    }, 0);
    const avg = count ? sum / count : 0;

    return res.json({
      summary: { count, average: Number(avg.toFixed(2)) },
      ratings,
    });
  } catch (err) {
    console.error('Get ratings error (stack):', err && err.stack ? err.stack : err);

    return res.json({
      summary: { count: 0, average: 0.0 },
      ratings: [],
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
    console.log('POST /api/ratings body:', req.body);
    console.log('POST /api/ratings req.user:', req.user && { id: req.user.id });

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const raterId = Number(req.user.id);

    const rawRatee = req.body.rateeId;
    const rawStars = req.body.stars;
    const comment = req.body.comment || null;

    const rateeId = Number(rawRatee);
    if (!rawRatee || Number.isNaN(rateeId)) {
      return res.status(400).json({ error: 'Invalid rateeId' });
    }

    const parsedStars = parseInt(rawStars, 10);
    if (Number.isNaN(parsedStars)) {
      return res.status(400).json({ error: 'Invalid stars value' });
    }
    const stars = Math.max(1, Math.min(5, parsedStars));

    if (raterId === rateeId) return res.status(400).json({ error: 'You cannot rate yourself' });

    const rater = await User.findByPk(raterId);
    if (!rater) return res.status(404).json({ error: 'User not found' });

    if (!(await isUserPaid(rater))) {
      return res.status(403).json({ error: 'Upgrade to a paid account to rate others.' });
    }

    const ratee = await User.findByPk(rateeId);
    if (!ratee) return res.status(404).json({ error: 'Ratee not found' });

    const [rating, created] = await Rating.findOrCreate({
      where: { raterId, rateeId },
      defaults: { stars, comment },
    });
    if (!created) {
      await rating.update({ stars, comment });
    }

    const agg = await Rating.findOne({
      where: { rateeId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('stars')), 'avg'],
      ],
      raw: true,
    });
    const count = Number(agg?.count || 0);
    const average = count ? Number(Number(agg.avg).toFixed(2)) : 0;

    return res.status(created ? 201 : 200).json({
      message: created ? 'Rating created' : 'Rating updated',
      rating,
      summary: { count, average },
    });
  } catch (err) {
    console.error('Upsert rating error (name):', err.name);
    console.error('Upsert rating error (message):', err.message);
    console.error('Upsert rating error (stack):', err.stack);
    if (err.errors && Array.isArray(err.errors)) {
      console.error(
        'Sequelize validation errors:',
        err.errors.map((e) => ({
          path: e.path,
          message: e.message,
          value: e.value,
        })),
      );
    }

    if (err && err.name === 'SequelizeValidationError' && err.errors) {
      return res.status(400).json({
        error: 'Validation failed',
        details: err.errors.map((e) => e.message),
      });
    }

    return res.status(500).json({ error: 'Failed to save rating', details: err.message });
  }
});

module.exports = router;
