const express = require('express');
const router = express.Router();
const { register, login, getProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Profile route
router.get('/profile', authenticateToken, getProfile);

// Upgrade account
router.patch('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
