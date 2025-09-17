// src/middlewares/authenticateToken.js
const jwt = require('jsonwebtoken');

/**
 * Middleware to authenticate JWT tokens
 */
module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const secretKey = process.env.JWT_SECRET || 'supersecretkey';

    try {
        const decoded = jwt.verify(token, secretKey);
        req.user = decoded; // decoded = { id, email }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expired. Please log in again.' });
        }
        return res.status(403).json({ error: 'Invalid token.' });
    }
};
