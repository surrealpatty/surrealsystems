// src/middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'Missing or invalid Authorization header' } });
    }
    const token = auth.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ success: false, error: { message: 'Empty token' } });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ success: false, error: { message: 'Server misconfigured' } });
    }

    // Verify token and extract an explicit user id from common fields:
    const payload = jwt.verify(token, secret);
    const userId = payload.id || payload.userId || payload.sub;
    if (!userId) {
      console.error('authenticateToken: token has no user id payload', payload);
      return res.status(401).json({ success: false, error: { message: 'Invalid token payload' } });
    }

    // Expose useful payload information on req.user for downstream handlers
    req.user = {
      id: userId,
      email: payload.email,
      // keep full payload available for debugging if needed:
      _payload: payload
    };

    // debug (safe for dev)
    // console.log('authenticateToken set req.user:', req.user);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message: msg } });
  }
};
