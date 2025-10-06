const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');

// ---------------- Public: Get all services ----------------
router.get('/', serviceController.getAllServices);

// ---------------- Protected: Create, Update, Delete ----------------
router.post('/', authenticateToken, serviceController.createService);
router.put('/:id', authenticateToken, serviceController.updateService);
router.delete('/:id', authenticateToken, serviceController.deleteService);

module.exports = router;
