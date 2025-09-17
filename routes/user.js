// src/routes/user.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');

// Auth routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// User routes
router.get('/', authenticateToken, userController.getUsers); // protected
router.put('/:id', authenticateToken, userController.updateProfile); // protected

module.exports = router;
