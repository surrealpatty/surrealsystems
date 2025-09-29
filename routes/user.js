const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth
router.post('/register', register);
router.post('/login', login);

// Profile
router.get('/profile', authenticateToken, getProfile); // own profile
router.get('/:id', authenticateToken, getProfile);     // any user
router.put('/:id', authenticateToken, updateProfile);  // update own

// Upgrade
router.patch('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
