// routes/user.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.create({ username, email, password });
    const { password: _, ...userData } = user.toJSON();
    res.status(201).json({ message: 'User created', user: userData });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await user.checkPassword(password);
    if (!match) return res.status(400).json({ error: 'Incorrect password' });

    const token = jwt.sign({ id: user.id, username: user.username, email: user.email }, 'supersecretkey', { expiresIn: '1h' });
    const { password: _, ...userData } = user.toJSON();
    res.json({ message: 'Login successful', token, user: userData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
