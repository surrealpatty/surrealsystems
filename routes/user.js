const express = require('express');
const router = express.Router();
const User = require('../models/User'); // <-- use ../models/User to go up one folder

// Register a new user
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

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await user.checkPassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect password' });

        const { password: _, ...userData } = user.toJSON();
        res.json({ message: 'Login successful', user: userData });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.findAll({ attributes: { exclude: ['password'] } });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
