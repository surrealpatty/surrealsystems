const express = require('express');
const router = express.Router();
const { getAllServices, createService } = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');

router.get('/', getAllServices);
router.post('/', authenticateToken, createService);

module.exports = router;
