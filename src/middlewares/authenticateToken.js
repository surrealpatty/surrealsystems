// src/middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');
const { getJwtSecrets } = require('../lib/jwtSecrets');

module.exports = function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: { message: 'Missing or invalid Authorization header' } });
    }
    const token = auth.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ success: false, error: { message: 'Empty token' } });

    const secrets = getJwtSecrets();
    if (!secrets.length) {
      console.error('No JWT secrets configured');
      return res.status(500).json({ success: false, error: { message: 'Server misconfigured' } });
    }

    // Try all secrets; if any verifies, we accept the payload.
    // If token is expired we return an explicit message immediately.
    let payload = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch (e) {
        if (e && e.name === 'TokenExpiredError') {
          // Expired token -> return explicit message
          return res.status(401).json({ success: false, error: { message: 'Token expired' } });
        }
        // Invalid signature for this secret -> try next secret
      }
    }

    if (!payload) {
      return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
    }

    const userId = payload.id || payload.userId || payload.sub;
    if (!userId) {
      console.error('authenticateToken: token has no user id payload', payload);
      return res.status(401).json({ success: false, error: { message: 'Invalid token payload' } });
    }

    // Expose useful payload information on req.user for downstream handlers
    req.user = {
      id: userId,
      email: payload.email,
      _payload: payload
    };

    next();
  } catch (err) {
    // Unexpected errors: if it's TokenExpiredError, be explicit; else generic invalid
    const msg = err && err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message: msg } });
  }
};
