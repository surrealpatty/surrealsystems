const express = require('express');
const { register, login, getProfile, updateProfile, upgradeToPaid } = require('../controllers/userController');
const authenticateToken = require('../middlewares/authenticateToken');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/:id?', authenticateToken, getProfile);
router.put('/update', authenticateToken, updateProfile);
router.put('/upgrade', authenticateToken, upgradeToPaid);

module.exports = router;
