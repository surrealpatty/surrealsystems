const jwt = require('jsonwebtoken');
const { User } = require('../models/user'); // lowercase
require('dotenv').config();

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    req.user = { id: user.id, username: user.username };
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Unauthorized' });
  }
};
