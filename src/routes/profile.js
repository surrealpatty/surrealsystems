const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Message = require('../models/Message');
const User = require('../models/User');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// GET inbox
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

// GET conversation with another user
router.get('/conversation/:otherUserId', authenticateToken, async (req, res) => {
    const otherUserId = req.params.otherUserId;
    try {
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
        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch conversation history' });
    }
});

// POST send message
router.post('/', authenticateToken, async (req, res) => {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
        return res.status(400).json({ error: 'Receiver and content required' });
    }

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
