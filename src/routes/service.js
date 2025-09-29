const express = require('express');
const {
    getAllServices,
    createService,
    updateService,
    deleteService
} = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

// Get all services (public)
router.get('/', authenticateToken, getAllServices);

// Create a new service (authenticated)
router.post('/', authenticateToken, createService);

// Update a service by ID (authenticated)
router.put('/:id', authenticateToken, updateService);

// Delete a service by ID (authenticated)
router.delete('/:id', authenticateToken, deleteService);

module.exports = router;
