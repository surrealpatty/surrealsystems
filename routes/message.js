const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Message = require('../models/Message');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// JWT Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, username }
        next();
    } catch (err) {
        console.error('JWT verification failed:', err);
        res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// GET messages for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { receiverId: req.user.id },
            include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
            order: [['createdAt', 'DESC']]
        });

        const formatted = messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            senderName: msg.sender.username,
            createdAt: msg.createdAt
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// POST a new message
router.post('/', authenticateToken, async (req, res) => {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: 'Receiver and content required' });

    try {
        const message = await Message.create({
            senderId: req.user.id,
            receiverId,
            content
        });

        const fullMessage = await Message.findByPk(message.id, {
            include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }]
        });

        res.json({ message: 'Message sent!', data: fullMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

module.exports = router;
