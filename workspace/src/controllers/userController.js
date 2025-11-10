const { User, Service } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Helper: remove sensitive fields
function toSafeUser(user) {
  if (!user) return user;
  const raw = user.toJSON ? user.toJSON() : user;
  const { password, ...safe } = raw;
  return safe;
}

function requireJwtSecretOr500(res) {
  if (!process.env.JWT_SECRET) {
    console.error('Missing JWT_SECRET');
    res.status(500).json({ error: 'Server misconfigured' });
    return false;
  }
  return true;
}

// --- Register ---
const register = async (req, res) => {
  try {
    const { username, email, password, description } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Basic normalization
    const normUsername = String(username).trim();
    const normEmail = String(email).trim().toLowerCase();

    const existingEmail = await User.findOne({ where: { email: normEmail } });
    if (existingEmail) return res.status(400).json({ error: 'Email already in use' });

    const existingUsername = await User.findOne({
      where: { username: normUsername },
    });
    if (existingUsername) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normUsername,
      email: normEmail,
      password: hashedPassword,
      description: (description || '').trim(),
    });

    if (!requireJwtSecretOr500(res)) return;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    // ✅ Always return token+user on success
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// --- Login (email OR username) ---
const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Email/username and password required' });
    }

    const where = email
      ? { email: String(email).trim().toLowerCase() }
      : { username: String(username).trim() };

    const user = await User.findOne({ where });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!requireJwtSecretOr500(res)) return;
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// --- Get logged-in user's profile ---
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Service, as: 'services', required: false }],
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// --- Get another user's profile ---
const getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error('Get user by id error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// --- Update description ---
const updateDescription = async (req, res) => {
  try {
    const { description } = req.body;
    if (typeof description !== 'string')
      return res.status(400).json({ error: 'Description must be a string' });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.description = description.trim();
    await user.save();

    res.json({
      message: 'Description updated successfully',
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error('Update description error:', err);
    res.status(500).json({ error: 'Failed to save description' });
  }
};

module.exports = { register, login, getMe, getById, updateDescription };
