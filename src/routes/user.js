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

    // Check if email or username already exists
    const existingUser = await User.findOne({
      where: { 
        email 
      }
    });
    if (existingUser) return res.status(400).json({ error: 'Email already used' });

    const existingUsername = await User.findOne({
      where: { username }
    });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, email, password: hashedPassword, description });

    // Sign JWT with full user info
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({
      token,
      user: { 
        id: newUser.id, 
        username: newUser.username, 
        email: newUser.email, 
        description: newUser.description,
        tier: newUser.tier
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// ---------------- Login ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password)
      return res.status(400).json({ error: 'Email or username and password required' });

    // Find user by email or username
    const user = await User.findOne({
      where: email ? { email } : { username }
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        description: user.description,
        tier: user.tier
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- Get Profile ----------------
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Use id from JWT token
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
