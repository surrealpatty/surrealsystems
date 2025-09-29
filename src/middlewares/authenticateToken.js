const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findByPk(decoded.id); // attach user to request
    if (!req.user) return res.status(404).json({ error: 'User not found' });
    next();
  } catch (err) {
    console.error(err);
    res.status(403).json({ error: 'Invalid token' });
  }
};

module.exports = authenticateToken;
