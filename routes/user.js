const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Profile routes
router.get('/profile', authenticateToken, getProfile); // logged-in user
router.get('/:id', authenticateToken, getProfile);     // view any user
router.put('/:id', authenticateToken, updateProfile);  // update own profile

// Upgrade
router.patch('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
