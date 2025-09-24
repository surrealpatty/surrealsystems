const express = require('express');
const router = express.Router();
const authenticateToken = require('../middlewares/authenticateToken');
const {
    registerUser,
    loginUser,
    getUsers,
    getUserById,      // 👈 added
    updateProfile
} = require('../controllers/userController');

// Routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/', authenticateToken, getUsers);
router.get('/:id', authenticateToken, getUserById); // 👈 new route
router.put('/:id', authenticateToken, updateProfile);

module.exports = router;
