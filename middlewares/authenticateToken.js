const jwt = require('jsonwebtoken');

// JWT authentication middleware
module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Expect "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // Verify token with your secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');

        // Attach user info to req
        req.user = decoded; // decoded = { id, username, ... }
        next();
    } catch (err) {
        console.error('JWT verification error:', err); // Logs the exact error
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};
