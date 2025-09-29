const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth
router.post('/register', register); // POST /users/register
router.post('/login', login);       // POST /users/login

// Profile
router.get('/profile', authenticateToken, getProfile);  // GET /users/profile -> own profile
router.get('/:id', authenticateToken, getProfile);     // GET /users/:id -> any user
router.put('/profile', authenticateToken, updateProfile); // PUT /users/profile -> update own profile

// Upgrade
router.patch('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
