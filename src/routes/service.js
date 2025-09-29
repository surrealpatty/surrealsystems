const express = require('express');
const {
  getAllServices,
  createService,
  updateService,
  deleteService,
} = require('../controllers/serviceController');
const authenticateToken = require('../middlewares/authenticateToken');

const router = express.Router();

router.get('/', authenticateToken, getAllServices);
router.post('/', authenticateToken, createService);
router.put('/:id', authenticateToken, updateService);
router.delete('/:id', authenticateToken, deleteService);

module.exports = router;
