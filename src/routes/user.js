const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');
const { body, param, oneOf } = require('express-validator');
const validate = require('../middlewares/validate');

// helpers
function toSafeUser(user) {
  if (!user) return user;
  const raw = user.toJSON ? user.toJSON() : user;
  const { password, ...safe } = raw;
  return safe;
}
function withNormalizedUsername(safeUser) {
  if (!safeUser) return safeUser;
  const out = { ...safeUser };
  if (!out.username || String(out.username).trim() === '') {
    const fromEmail = out.email ? String(out.email).split('@')[0] : '';
    out.username = out.name || out.displayName || fromEmail || 'User';
  }
  return out;
}
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}
function sendError(res, message = 'Something went wrong', status = 500, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

/** Register */
router.post(
  '/register',
  [
    body('username').trim().isString().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').trim().isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('description').optional({ nullable: true }).isString().isLength({ max: 500 }).trim()
  ],
  validate,
  async (req, res) => {
    try {
      const { username, email, password, description } = req.body;

      const [existingEmail, existingUsername] = await Promise.all([
        User.findOne({ where: { email } }),
        User.findOne({ where: { username } })
      ]);
      if (existingEmail) return sendError(res, 'Email already used', 400);
      if (existingUsername) return sendError(res, 'Username already taken', 400);

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        description: (description || '').trim(),
        tier: 'free'
      });

      if (!process.env.JWT_SECRET) {
        console.error('Missing JWT_SECRET at sign time');
        return sendError(res, 'Server misconfigured', 500);
      }
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const safe = withNormalizedUsername(toSafeUser(newUser));
      return sendSuccess(res, { token, user: safe }, 201);
    } catch (err) {
      console.error('Register error:', err);
      return sendError(res, 'Registration failed', 500);
    }
  }
);

/** Login (email or username) */
router.post(
  '/login',
  [
    oneOf([
      body('email').exists({ checkFalsy: true }).isEmail().normalizeEmail(),
      body('username').exists({ checkFalsy: true }).isString().isLength({ min: 3 }).trim()
    ], 'Either a valid email or a username is required'),
    body('password').exists({ checkFalsy: true })
  ],
  validate,
  async (req, res) => {
    try {
      const { email, username, password } = req.body;
      const user = await User.findOne({ where: email ? { email } : { username } });
      if (!user) return sendError(res, 'Invalid credentials', 401);

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return sendError(res, 'Invalid credentials', 401);

      if (!process.env.JWT_SECRET) {
        console.error('Missing JWT_SECRET at sign time');
        return sendError(res, 'Server misconfigured', 500);
      }
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const safe = withNormalizedUsername(toSafeUser(user));
      return sendSuccess(res, { token, user: safe });
    } catch (err) {
      console.error('Login error:', err);
      return sendError(res, 'Login failed', 500);
    }
  }
);

/** Me (optimized & briefly cached) */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'description', 'tier', 'createdAt', 'updatedAt']
    });
    if (!user) return sendError(res, 'User not found', 404);

    res.set('Cache-Control', 'private, max-age=15');
    return sendSuccess(res, { user });
  } catch (err) {
    console.error('Get /me error:', err);
    return sendError(res, 'Failed to fetch user', 500);
  }
});

/** Public profile by id */
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid user id')],
  validate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
      if (!user) return sendError(res, 'User not found', 404);
      const safe = withNormalizedUsername(toSafeUser(user));
      return sendSuccess(res, { user: safe });
    } catch (err) {
      console.error('Get user by id error:', err);
      return sendError(res, 'Failed to fetch user', 500);
    }
  }
);

/** Update description (me) */
router.put(
  '/me/description',
  authenticateToken,
  [body('description').exists().isString().isLength({ max: 500 }).trim()],
  validate,
  async (req, res) => {
    try {
      const { description } = req.body;
      const user = await User.findByPk(req.user.id);
      if (!user) return sendError(res, 'User not found', 404);

      user.description = description.trim();
      await user.save();

      const safe = withNormalizedUsername(toSafeUser(user));
      return sendSuccess(res, { message: 'Description updated successfully', user: safe });
    } catch (err) {
      console.error('Update description error:', err);
      return sendError(res, 'Failed to save description', 500);
    }
  }
);

/** Upgrade to paid (me) */
router.put('/me/upgrade', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return sendError(res, 'User not found', 404);
    user.tier = 'paid';
    await user.save();
    const safe = withNormalizedUsername(toSafeUser(user));
    return sendSuccess(res, { message: 'Account upgraded to paid', user: safe });
  } catch (err) {
    console.error('Upgrade error:', err);
    return sendError(res, 'Failed to upgrade account', 500);
  }
});

module.exports = router;
