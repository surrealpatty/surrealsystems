const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth
router.post('/register', register);
router.post('/login', login);

// Profile
router.get('/profile', authenticateToken, getProfile);
router.get('/:id', authenticateToken, getProfile);
router.put('/:id', authenticateToken, updateProfile);

// Upgrade
router.patch('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
