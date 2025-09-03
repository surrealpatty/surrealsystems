const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const exists = await User.findOne({ where: { email } });
        if (exists) return res.status(400).json({ error: 'Email already exists' });

        const user = await User.create({ username, email, password });
        res.json({ message: 'User registered successfully', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid email or password' });

        res.json({ message: 'Login successful', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
