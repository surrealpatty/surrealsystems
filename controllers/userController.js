const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Register
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });

        if (await User.findOne({ where: { email } })) return res.status(400).json({ error: 'Email already in use' });
        if (await User.findOne({ where: { username } })) return res.status(400).json({ error: 'Username taken' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ username, email, password: hashedPassword });

        const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: newUser });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
};

// Login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Login failed' }); }
};

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({ attributes: ['id', 'username', 'email', 'description'] });
        res.json(users);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch users' }); }
};

// Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, { attributes: ['id', 'username', 'email', 'description'] });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch user' }); }
};

// Update profile
exports.updateProfile = async (req, res) => {
    try {
        const { username, description } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (username) user.username = username;
        if (description) user.description = description;

        await user.save();
        res.json({ user });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update profile' }); }
};
