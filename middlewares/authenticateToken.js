const jwt = require('jsonwebtoken');

// Use environment secret if available, else fallback
const JWT_SECRET = process.env.JWT_SECRET || 's7n3!vZx@9qK4m1L';
if (!process.env.JWT_SECRET) {
    console.warn('⚠️ Warning: JWT_SECRET is not set in environment variables. Using fallback secret.');
}

/**
 * Middleware to authenticate JWT tokens
 */
module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // decoded = { id, email }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expired. Please log in again.' });
        }
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};
