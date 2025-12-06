// src/routes/messages.js
const express = require('express');
const router = express.Router();

const { Message, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');
const { body, query, param } = require('express-validator');
const validate = require('../middlewares/validate');

// Standard success/error wrappers
function ok(res, payload, status = 200) {
  // payload is usually { messages } or { message }
  return res.status(status).json({
    success: true,
    ...payload,
    // keep a "data" field for any frontend that expects it
    data: payload,
  });
}

function err(res, message = 'Something went wrong', status = 500, details) {
  const out = { success: false, error: { message } };
  if (details) out.error.details = details;
  return res.status(status).json(out);
}

/* ------------------------------------------------------------------ */
/* GET /api/messages/inbox  (list messages you RECEIVED)              */
/* ------------------------------------------------------------------ */
router.get(
  '/inbox',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { receiverId: req.user.id },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      const messages = rows.map((m) => m.toJSON());
      return ok(res, { messages });
    } catch (error) {
      console.error('ERROR: GET /api/messages/inbox failed:', error);
      return err(res, 'Failed to load inbox', 500);
    }
  },
);

/* ------------------------------------------------------------------ */
/* GET /api/messages/sent  (list messages you SENT)                   */
/* ------------------------------------------------------------------ */
router.get(
  '/sent',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const limit = req.query.limit ?? 20;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { senderId: req.user.id },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      const messages = rows.map((m) => m.toJSON());
      return ok(res, { messages });
    } catch (error) {
      console.error('ERROR: GET /api/messages/sent failed:', error);
      return err(res, 'Failed to load sent messages', 500);
    }
  },
);

/* ------------------------------------------------------------------ */
/* POST /api/messages  (send a new message)                           */
/* ------------------------------------------------------------------ */
router.post(
  '/',
  authenticateToken,
  [
    body('receiverId').isInt().withMessage('receiverId is required'),
    body('subject').optional().isString().isLength({ max: 255 }),
    body('body').isString().notEmpty().withMessage('Message body is required'),
  ],
  validate,
  async (req, res) => {
    try {
      const { receiverId, subject, body } = req.body;

      const created = await Message.create({
        senderId: req.user.id,
        receiverId,
        subject: subject || '',
        body,
      });

      const message = created.toJSON();
      return ok(res, { message }, 201);
    } catch (error) {
      console.error('ERROR: POST /api/messages failed:', error);
      return err(res, 'Failed to send message', 500);
    }
  },
);

/* ------------------------------------------------------------------ */
/* OPTIONAL: GET /api/messages/thread/:userId  (conversation)         */
/* ------------------------------------------------------------------ */
router.get(
  '/thread/:userId',
  authenticateToken,
  [param('userId').isInt()],
  validate,
  async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId, 10);

      const rows = await Message.findAll({
        where: {
          // either I sent to them or they sent to me
          [Message.sequelize.Op.or]: [
            { senderId: req.user.id, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: req.user.id },
          ],
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'email'],
          },
          {
            model: User,
            as: 'receiver',
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'ASC']],
      });

      const messages = rows.map((m) => m.toJSON());
      return ok(res, { messages });
    } catch (error) {
      console.error('ERROR: GET /api/messages/thread/:userId failed:', error);
      return err(res, 'Failed to load conversation', 500);
    }
  },
);

module.exports = router;
