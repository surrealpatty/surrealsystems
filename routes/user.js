const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to protect routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// REGISTER
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

    try {
        if (await User.findOne({ where: { email } })) return res.status(400).json({ error: 'Email already in use' });
        if (await User.findOne({ where: { username } })) return res.status(400).json({ error: 'Username taken' });

        const hash = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hash });

        const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: 'User registered successfully',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email, description: newUser.description || '' }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email & password required' });

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email, description: user.description || '' }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// UPDATE PROFILE
router.put('/:id', authenticateToken, async (req, res) => {
    const { username, description } = req.body;

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (username) user.username = username;
        if (description) user.description = description;

        await user.save();
        res.json({ message: 'Profile updated successfully', user: { id: user.id, username: user.username, email: user.email, description: user.description || '' } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
