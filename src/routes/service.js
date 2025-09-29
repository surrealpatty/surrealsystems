const express = require('express');
const { getAllServices, createService } = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');
const router = express.Router();

router.get('/', getAllServices);
router.post('/', authenticateToken, createService);

module.exports = router;
