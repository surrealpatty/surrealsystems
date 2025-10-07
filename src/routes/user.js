const express = require('express');
const router = express.Router();
const { User, Service } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');

// ---------------- Register ----------------
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, description } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email already used' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, email, password: hashedPassword, description });

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email, description: newUser.description }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ---------------- Login ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, description: user.description }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- Get Profile ----------------
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'description', 'tier'],
      include: [{ model: Service, as: 'services' }]
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
