const express = require('express');
const router = express.Router();
const { User } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middlewares/authenticateToken');

// ---------------- Register ----------------
router.post('/register', async (req, res) => {
  try {
    console.log('Received registration body:', req.body); // ✅ debug log

    const { username, email, password, description } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) return res.status(400).json({ error: 'Email already used' });

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ default to empty string if description not sent
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      description: description || '',
    });

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ---------------- Login ----------------
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password)
      return res.status(400).json({ error: 'Email/username and password required' });

    const user = await User.findOne({ where: email ? { email } : { username } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- Profile ----------------
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
