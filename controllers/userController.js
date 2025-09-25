const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// User registration
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            tier: 'free' // 👈 new users start free
        });

        res.status(201).json({ message: 'User registered successfully', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// User login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user) return res.status(404).json({ error: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
};

// Get profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { attributes: { exclude: ['password'] } });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load profile' });
    }
};

// 👇 Upgrade account to paid
exports.upgradeToPaid = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        user.tier = 'paid';
        await user.save();

        res.json({ message: 'Account upgraded to paid', user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upgrade account' });
    }
};
