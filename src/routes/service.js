const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');

// Get all services
router.get('/', serviceController.getAllServices);

// Create a new service
router.post('/', authenticateToken, serviceController.createService);

// Update a service
router.put('/:id', authenticateToken, serviceController.updateService);

// Delete a service
router.delete('/:id', authenticateToken, serviceController.deleteService);

module.exports = router;
