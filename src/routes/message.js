const express = require('express');
const router = express.Router();
const Message = require('../models/message');
const User = require('../models/user');
const authenticateToken = require('../middlewares/authenticateToken');

// ---------------- Send a message ----------------
router.post('/', authenticateToken, async (req, res) => {
  const { receiverId, content } = req.body;
  if (!receiverId || !content) return res.status(400).json({ error: 'Receiver and content required' });

  try {
    const message = await Message.create({
      senderId: req.user.id,
      receiverId,
      content
    });
    res.json({ message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ---------------- Get inbox ----------------
router.get('/', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { receiverId: req.user.id },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ---------------- Get conversation with a user ----------------
router.get('/conversation/:otherUserId', authenticateToken, async (req, res) => {
  const otherUserId = req.params.otherUserId;
  try {
    const messages = await Message.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id }
        ]
      },
      include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

module.exports = router;
