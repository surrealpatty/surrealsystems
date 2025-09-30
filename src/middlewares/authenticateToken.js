const jwt = require('jsonwebtoken');
const User = require('../models/user'); // ✅ direct import
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Expect: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Invalid token user.' });
    }

    req.user = { id: user.id, username: user.username, email: user.email }; // ✅ attach user to req
    next();
  } catch (err) {
    console.error('JWT error:', err);
    res.status(403).json({ error: 'Invalid token.' });
  }
};

module.exports = authenticateToken;
