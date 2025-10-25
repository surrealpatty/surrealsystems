// src/routes/user.js
const express = require('express');
const router = express.Router();
const { User, Service, Message } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');
const { body, param, oneOf, query } = require('express-validator');
const validate = require('../middlewares/validate');

function toSafeUser(user) {
  if (!user) return user;
  const raw = user.toJSON ? user.toJSON() : user;
  const { password, ...safe } = raw;
  return safe;
}
function normalizeUsername(u) {
  if (!u) return u;
  const out = { ...u };
  if (!out.username || String(out.username).trim() === '') {
    const fromEmail = out.email ? String(out.email).split('@')[0] : '';
    out.username = out.name || out.displayName || fromEmail || 'User';
  }
  return out;
}
function respondCompat(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload, data: payload });
}
function sendError(res, message = 'Something went wrong', status = 500, details) {
  const payload = { success: false, error: { message } };
  if (details) payload.error.details = details;
  return res.status(status).json(payload);
}

router.post(
  '/register',
  [
    body('username').trim().isString().isLength({ min: 3 }),
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
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

      if (!process.env.JWT_SECRET) return sendError(res, 'Server misconfigured', 500);
      const token = jwt.sign({ id: newUser.id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

      const user = normalizeUsername(toSafeUser(newUser));
      return respondCompat(res, { token, user }, 201);
    } catch (err) {
      console.error('Register error:', err && err.stack ? err.stack : err);
      return sendError(res, 'Registration failed', 500);
    }
  }
);

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
      const userRec = await User.findOne({ where: email ? { email } : { username } });
      if (!userRec) return sendError(res, 'Invalid credentials', 401);

      const valid = await bcrypt.compare(password, userRec.password);
      if (!valid) return sendError(res, 'Invalid credentials', 401);

      if (!process.env.JWT_SECRET) return sendError(res, 'Server misconfigured', 500);
      const token = jwt.sign({ id: userRec.id, email: userRec.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

      const user = normalizeUsername(toSafeUser(userRec));
      return respondCompat(res, { token, user });
    } catch (err) {
      console.error('Login error:', err && err.stack ? err.stack : err);
      return sendError(res, 'Login failed', 500);
    }
  }
);

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'description', 'tier', 'createdAt', 'updatedAt']
    });
    if (!me) return sendError(res, 'User not found', 404);
    const user = normalizeUsername(toSafeUser(me));

    res.set('Cache-Control', 'private, max-age=15');
    return respondCompat(res, { user });
  } catch (err) {
    console.error('Get /me error:', err && err.stack ? err.stack : err);
    return sendError(res, 'Failed to fetch user', 500);
  }
});

router.get(
  '/me/messages',
  authenticateToken,
  [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const rows = await Message.findAll({
        where: { receiverId: req.user.id },
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'sender', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit
      });
      res.set('Cache-Control', 'private, max-age=10');
      return res.status(200).json({ success: true, messages: rows, data: { messages: rows } });
    } catch (e) {
      console.error('GET /api/users/me/messages error:', e && e.stack ? e.stack : e);
      return res.status(500).json({ success: false, error: { message: 'Failed to load messages' } });
    }
  }
);

router.get('/me/services', authenticateToken, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const rows = await Service.findAll({
      where: { userId: req.user.id },
      attributes: ['id','title','price','createdAt','updatedAt'],
      order: [['createdAt','DESC']],
      limit,
      offset
    });
    const payload = { services: rows, nextOffset: offset + rows.length };
    res.set('Cache-Control', 'private, max-age=15');
    return respondCompat(res, payload);
  } catch (err) {
    console.error('Get /me/services error:', err && err.stack ? err.stack : err);
    return sendError(res, 'Failed to fetch services', 500);
  }
});

router.get('/:id', [param('id').isInt({ min: 1 }).withMessage('Invalid user id')], validate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userRec = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!userRec) return sendError(res, 'User not found', 404);
    const user = normalizeUsername(toSafeUser(userRec));
    return respondCompat(res, { user });
  } catch (err) {
    console.error('Get user by id error:', err && err.stack ? err.stack : err);
    return sendError(res, 'Failed to fetch user', 500);
  }
});

router.put('/me/description', authenticateToken, [body('description').exists().isString().isLength({ max: 500 }).trim()], validate, async (req, res) => {
  try {
    const userRec = await User.findByPk(req.user.id);
    if (!userRec) return sendError(res, 'User not found', 404);
    userRec.description = req.body.description.trim();
    await userRec.save();
    const user = normalizeUsername(toSafeUser(userRec));
    return respondCompat(res, { message: 'Description updated successfully', user });
  } catch (err) {
    console.error('Update description error:', err && err.stack ? err.stack : err);
    return sendError(res, 'Failed to save description', 500);
  }
});

router.put('/me/upgrade', authenticateToken, async (req, res) => {
  try {
    const userRec = await User.findByPk(req.user.id);
    if (!userRec) return sendError(res, 'User not found', 404);
    userRec.tier = 'paid';
    await userRec.save();
    const user = normalizeUsername(toSafeUser(userRec));
    return respondCompat(res, { message: 'Account upgraded to paid', user });
  } catch (err) {
    console.error('Upgrade error:', err && err.stack ? err.stack : err);
    return sendError(res, 'Failed to upgrade account', 500);
  }
});

module.exports = router;
