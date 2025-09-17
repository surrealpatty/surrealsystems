const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Public routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Protected routes
router.get('/', authenticateToken, userController.getUsers);
router.put('/:id', authenticateToken, userController.updateProfile);

module.exports = router;
