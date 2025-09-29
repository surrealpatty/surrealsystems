const { User } = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ---------------- Register ----------------
const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if email is already taken
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      tier: 'free'
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Remove sensitive info
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      description: user.description,
      tier: user.tier
    };

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// ---------------- Login ----------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Safe user object
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      description: user.description,
      tier: user.tier
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ---------------- Get Profile ----------------
const getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'description', 'tier']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
};

// ---------------- Update Profile ----------------
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { description } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.description = description || user.description;
    await user.save();

    res.json({ user });
  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ---------------- Upgrade Account ----------------
const upgradeToPaid = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.tier = 'paid';
    await user.save();

    res.json({ message: 'Account upgraded to paid', user });
  } catch (err) {
    console.error('❌ Upgrade account error:', err);
    res.status(500).json({ error: 'Failed to upgrade account' });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  upgradeToPaid
};
