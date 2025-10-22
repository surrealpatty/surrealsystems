// src/routes/messages.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Message = require('../models/message');
const User = require('../models/user');
const authenticateToken = require('../middlewares/authenticateToken');

// POST /api/messages — send a message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, serviceId } = req.body || {};
    if (!receiverId || !content || !String(content).trim()) {
      return res.status(400).json({ error: 'Receiver and content required' });
    }

    const msg = await Message.create({
      senderId: req.user.id, // set by authenticateToken
      receiverId,
      content: String(content).trim(),
      serviceId: serviceId || null
    });

    return res.status(201).json({ message: 'Message sent', data: msg });
  } catch (err) {
    console.error('POST /api/messages error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages — current user's inbox
router.get('/', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { receiverId: req.user.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    return res.json(messages);
  } catch (err) {
    console.error('GET /api/messages error:', err);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// GET /api/messages/conversation/:otherUserId — DM thread
router.get('/conversation/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const otherUserId = req.params.otherUserId;
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id }
        ]
      },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
      order: [['createdAt', 'ASC']]
    });
    return res.json(messages);
  } catch (err) {
    console.error('GET /api/messages/conversation/:otherUserId error:', err);
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

module.exports = router;
