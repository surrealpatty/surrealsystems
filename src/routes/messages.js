// src/routes/messages.js
const express = require('express');
const router = express.Router();
const { Message, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');
const { body, query, param } = require('express-validator');
const validate = require('../middlewares/validate');

function ok(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload, data: payload });
}
function err(res, message = 'Something went wrong', status = 500) {
  return res.status(status).json({ success: false, error: { message } });
}

// GET /api/messages/inbox
router.get(
  '/inbox',
  authenticateToken,
  [query('limit').optional().isInt({ min:1, max:100 }).toInt(), query('offset').optional().isInt({ min:0 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;
      const rows = await Message.findAll({
        where: { receiverId: req.user.id },
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'sender', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit, offset
      });
      res.set('Cache-Control', 'private, max-age=10');
      return ok(res, { messages: rows, nextOffset: offset + rows.length });
    } catch (e) {
      console.error('GET /messages/inbox error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load inbox');
    }
  }
);

// GET /api/messages/sent
router.get(
  '/sent',
  authenticateToken,
  [query('limit').optional().isInt({ min:1, max:100 }).toInt(), query('offset').optional().isInt({ min:0 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;
      const rows = await Message.findAll({
        where: { senderId: req.user.id },
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'receiver', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit, offset
      });
      res.set('Cache-Control', 'private, max-age=10');
      return ok(res, { messages: rows, nextOffset: offset + rows.length });
    } catch (e) {
      console.error('GET /messages/sent error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load sent messages');
    }
  }
);

// GET /api/messages/thread/:userId
router.get(
  '/thread/:userId',
  authenticateToken,
  [param('userId').isInt({min:1}).toInt(), query('limit').optional().isInt({min:1,max:200}).toInt(), query('offset').optional().isInt({min:0}).toInt()],
  validate,
  async (req, res) => {
    try {
      const otherId = req.params.userId;
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;
      const { Op } = require('sequelize');

      const rows = await Message.findAll({
        where: {
          [Op.or]: [
            { senderId: req.user.id, receiverId: otherId },
            { senderId: otherId, receiverId: req.user.id }
          ]
        },
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'sender', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit, offset
      });

      res.set('Cache-Control', 'private, max-age=5');
      return ok(res, { messages: rows, nextOffset: offset + rows.length, withUserId: Number(otherId) });
    } catch (e) {
      console.error('GET /messages/thread/:userId error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load thread');
    }
  }
);

// GET /api/users/me/messages (alias)
router.get(
  '/users/me/messages',
  authenticateToken,
  [query('limit').optional().isInt({ min:1, max:100 }).toInt()],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const rows = await Message.findAll({
        where: { receiverId: req.user.id },
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'sender', attributes: ['id','username'] }],
        order: [['createdAt','DESC']],
        limit
      });
      res.set('Cache-Control', 'private, max-age=10');
      return ok(res, { messages: rows });
    } catch (e) {
      console.error('GET /users/me/messages error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to load messages');
    }
  }
);

// POST /api/messages
router.post(
  '/',
  authenticateToken,
  [body('to').isInt({ min:1 }).withMessage('Recipient id required'), body('content').isString().isLength({ min:1, max:5000 }).trim()],
  validate,
  async (req, res) => {
    try {
      const { to, content } = req.body;
      if (Number(to) === Number(req.user.id)) return err(res, 'Cannot message yourself', 400);

      const recipient = await User.findByPk(to, { attributes: ['id'] });
      if (!recipient) return err(res, 'Recipient not found', 404);

      const msg = await Message.create({ senderId: req.user.id, receiverId: to, content });
      // optionally include sender
      const msgWithSender = await Message.findByPk(msg.id, {
        attributes: ['id','senderId','receiverId','content','createdAt','updatedAt'],
        include: [{ model: User, as: 'sender', attributes: ['id','username'] }]
      });

      return ok(res, { message: msgWithSender }, 201);
    } catch (e) {
      console.error('POST /messages error:', e && e.stack ? e.stack : e);
      return err(res, 'Failed to send message');
    }
  }
);

module.exports = router;
