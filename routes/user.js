const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: 'Registration successful', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'All fields required' });

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Incorrect password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login successful', token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all users (protected)
router.get('/', authenticateToken, async (req, res) => {
    const users = await User.findAll({ attributes: ['id', 'username', 'email', 'description'] });
    res.json(users);
});

module.exports = router;
