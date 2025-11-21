// src/middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');
const { getJwtSecrets } = require('../lib/jwtSecrets');

module.exports = function authenticateToken(req, res, next) {
  try {
    // First try the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    let token = null;

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice('Bearer '.length).trim();
    } else {
      // Fallback: try to read cookie named 'codecrowds_token' from Cookie header
      // (we avoid adding cookie-parser as a dependency and parse the header directly)
      const cookieHeader = req.headers.cookie || '';
      if (cookieHeader && typeof cookieHeader === 'string') {
        const m = cookieHeader.match(/(?:^|;\s*)codecrowds_token=([^;]+)/);
        if (m && m[1]) {
          try {
            token = decodeURIComponent(m[1]);
          } catch (e) {
            token = m[1];
          }
        }
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing or invalid Authorization header' },
      });
    }

    const secrets = getJwtSecrets();
    if (!secrets.length) {
      console.error('No JWT secrets configured');
      return res.status(500).json({ success: false, error: { message: 'Server misconfigured' } });
    }

    // Try each secret (support rotation). If expired, return explicit message.
    let payload = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch (e) {
        if (e && e.name === 'TokenExpiredError') {
          // Expired token -> explicit message.
          return res.status(401).json({ success: false, error: { message: 'Token expired' } });
        }
        // else try next secret
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

    // Expose payload on req.user
    req.user = {
      id: userId,
      email: payload.email,
      _payload: payload,
    };

    next();
  } catch (err) {
    const msg = err && err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message: msg } });
  }
};
