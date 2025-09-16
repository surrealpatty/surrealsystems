const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');

// REGISTER (signup)
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            email,
            password: hashedPassword
        });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                description: user.description || ''
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// LOGIN (signin)
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid email or password' });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                description: user.description || ''
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET PROFILE
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        if (parseInt(req.params.id) !== req.user.id) {
            return res.status(403).json({ error: 'You can only view your own profile' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            description: user.description || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

// UPDATE PROFILE
router.put('/:id', authenticateToken, async (req, res) => {
    const { username, description } = req.body;
    try {
        if (parseInt(req.params.id) !== req.user.id) {
            return res.status(403).json({ error: 'You can only update your own profile' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (username) user.username = username;
        if (description) user.description = description;

        await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                description: user.description || ''
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

module.exports = router;
