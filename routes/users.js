const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.create({ username, email, password });
        const { password: _, ...userData } = user.toJSON();
        res.status(201).json({ message: 'User created successfully', user: userData });
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        res.status(400).json({ error: err.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await user.checkPassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            'supersecretkey', // Use .env in production
            { expiresIn: '1h' }
        );

        const { password: _, ...userData } = user.toJSON();
        res.json({ message: 'Login successful', token, user: userData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
