// src/middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');

function getSecrets() {
  // Support: JWT_SECRETS = "oldsecret,newsecret" (comma-separated)
  // Fallback to JWT_SECRET if set.
  const raw = process.env.JWT_SECRETS || process.env.JWT_SECRET || '';
  return raw
    .split(',')
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}

module.exports = function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Missing or invalid Authorization header' },
      });
    }
    const token = auth.slice('Bearer '.length).trim();
    if (!token) return res.status(401).json({ success: false, error: { message: 'Empty token' } });

    const secrets = getSecrets();
    if (!secrets.length) {
      console.error('No JWT secrets configured');
      return res.status(500).json({ success: false, error: { message: 'Server misconfigured' } });
    }

    let payload = null;
    for (const secret of secrets) {
      try {
        payload = jwt.verify(token, secret);
        break;
      } catch (e) {
        // try the next secret
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

    req.user = {
      id: userId,
      email: payload.email,
      _payload: payload,
    };

    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    return res.status(401).json({ success: false, error: { message: msg } });
  }
};
