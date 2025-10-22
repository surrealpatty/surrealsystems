// src/routes/user.js
const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');

// Validators
const { body, param, oneOf } = require('express-validator');
const validate = require('../middlewares/validate');

// Helper — remove password from returned objects
function toSafeUser(user) {
  if (!user) return user;
  const { password, ...safe } = user.toJSON ? user.toJSON() : user;
  return safe;
}

// Helper — success/error responders (inline so this file is self-contained)
function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, data });
}
function sendError(res, message = 'Something went wrong', status = 500, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

/**
 * --- Register ---
 * POST /api/users/register
 * Body: { username, email, password, description? }
 */
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isString().withMessage('Username must be a string')
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email address')
      .normalizeEmail(),
    body('password')
      .isString().withMessage('Password must be a string')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('description')
      .optional({ nullable: true })
      .isString().withMessage('Description must be a string')
      .isLength({ max: 500 }).withMessage('Description must be 500 chars or fewer')
      .trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { username, email, password, description } = req.body;

      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return sendError(res, 'Email already used', 400);

      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) return sendError(res, 'Username already taken', 400);

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        username,
        email,
        password: hashedPassword,
        description: description || '',
        tier: 'free',
      });

      const token = jwt.sign(
        { id: newUser.id, email: newUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return sendSuccess(res, { token, user: toSafeUser(newUser) }, 201);
    } catch (err) {
      console.error('Register error:', err);
      return sendError(res, 'Registration failed', 500);
    }
  }
);

/**
 * --- Login ---
 * POST /api/users/login
 * Body: { email OR username, password }
 */
router.post(
  '/login',
  [
    oneOf(
      [
        body('email')
          .exists({ checkFalsy: true }).withMessage('Email is required when username is not provided')
          .bail()
          .isEmail().withMessage('Invalid email address')
          .normalizeEmail(),
        body('username')
          .exists({ checkFalsy: true }).withMessage('Username is required when email is not provided')
          .bail()
          .isString().withMessage('Username must be a string')
          .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
          .trim(),
      ],
      'Either a valid email or a username is required'
    ),
    body('password')
      .exists({ checkFalsy: true }).withMessage('Password is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { email, username, password } = req.body;

      const user = await User.findOne({ where: email ? { email } : { username } });
      if (!user) return sendError(res, 'Invalid credentials', 401);

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return sendError(res, 'Invalid credentials', 401);

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return sendSuccess(res, { token, user: toSafeUser(user) });
    } catch (err) {
      console.error('Login error:', err);
      return sendError(res, 'Login failed', 500);
    }
  }
);

/**
 * --- Profile: current user (/me) ---
 * GET /api/users/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return sendError(res, 'User not found', 404);
    return sendSuccess(res, { user });
  } catch (err) {
    console.error('Get /me error:', err);
    return sendError(res, 'Failed to fetch user', 500);
  }
});

/**
 * --- Public profile by ID ---
 * GET /api/users/:id
 */
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid user id')],
  validate,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
      if (!user) return sendError(res, 'User not found', 404);
      return sendSuccess(res, { user });
    } catch (err) {
      console.error('Get user by id error:', err);
      return sendError(res, 'Failed to fetch user', 500);
    }
  }
);

/**
 * --- Update description (current user) ---
 * PUT /api/users/me/description
 * Body: { description }
 */
router.put(
  '/me/description',
  authenticateToken,
  [
    body('description')
      .exists().withMessage('Description is required')
      .bail()
      .isString().withMessage('Description must be a string')
      .isLength({ max: 500 }).withMessage('Description must be 500 chars or fewer')
      .trim(),
  ],
  validate,
  async (req, res) => {
    try {
      const { description } = req.body;

      const user = await User.findByPk(req.user.id);
      if (!user) return sendError(res, 'User not found', 404);

      user.description = description.trim();
      await user.save();

      return sendSuccess(res, { message: 'Description updated successfully', user: toSafeUser(user) });
    } catch (err) {
      console.error('Update description error:', err);
      return sendError(res, 'Failed to save description', 500);
    }
  }
);

/**
 * --- Upgrade to paid ---
 * PUT /api/users/me/upgrade
 */
router.put('/me/upgrade', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return sendError(res, 'User not found', 404);

    user.tier = 'paid';
    await user.save();

    return sendSuccess(res, { message: 'Account upgraded to paid', user: toSafeUser(user) });
  } catch (err) {
    console.error('Upgrade error:', err);
    return sendError(res, 'Failed to upgrade account', 500);
  }
});

module.exports = router;
