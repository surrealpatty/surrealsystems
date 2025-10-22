const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');

// Helper — remove password from returned objects
function toSafeUser(user) {
  if (!user) return user;
  const { password, ...safe } = user.toJSON ? user.toJSON() : user;
  return safe;
}

// --- Register ---
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, description } = req.body;
    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Username, email, and password are required' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail)
      return res.status(400).json({ error: 'Email already used' });

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername)
      return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      description: description || '',
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ token, user: toSafeUser(newUser) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// --- Login ---
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) {
      return res
        .status(400)
        .json({ error: 'Email/username and password required' });
    }

    const user = await User.findOne({ where: email ? { email } : { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// --- Profile: current user (/me) ---
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// --- Profile: by ID ---
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get /:id error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// --- Update description (3 routes) ---
router.put('/me/description', authenticateToken, async (req, res) => {
  await updateDescription(req, res, req.user.id);
});

router.put('/me', authenticateToken, async (req, res) => {
  await updateDescription(req, res, req.user.id);
});

router.put('/:id', authenticateToken, async (req, res) => {
  const targetId = req.params.id;
  if (String(targetId) !== String(req.user.id)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  await updateDescription(req, res, targetId);
});

// Shared update handler
async function updateDescription(req, res, targetId) {
  try {
    const { description } = req.body;
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.description = description;
    await user.save();

    res.json({
      message: 'Description updated successfully',
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error('Update description error:', err);
    res.status(500).json({ error: 'Failed to save description' });
  }
}

module.exports = router;
