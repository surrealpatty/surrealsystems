const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'Missing or invalid Authorization header' } });
    }
    const token = auth.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ success: false, error: { message: 'Empty token' } });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET is not set');
      return res.status(500).json({ success: false, error: { message: 'Server misconfigured' } });
    }

    const payload = jwt.verify(token, secret);
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message: msg } });
  }
};
