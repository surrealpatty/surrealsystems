// src/routes/messages.js
const express = require('express');
const router = express.Router();
const { Message, User } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');
const { query, param } = require('express-validator');
const validate = require('../middlewares/validate');

/**
 * Utility helpers
 */
function ok(res, payload = {}, status = 200) {
  return res.status(status).json({ success: true, ...payload });
}

function err(res, message = 'Something went wrong', status = 500, details) {
  const out = { success: false, error: { message } };
  if (details) out.error.details = details;
  return res.status(status).json(out);
}

/**
 * GET /api/messages/inbox
 * List messages where the logged-in user is the receiver.
 */
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

      const { rows, count } = await Message.findAndCountAll({
        where: { receiverId: req.user.id },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return ok(res, {
        messages: rows,
        count,
        limit,
        offset,
      });
    } catch (e) {
      console.error('GET /api/messages/inbox error:', e);
      return err(res, 'Failed to load inbox');
    }
  }
);

/**
 * GET /api/messages/sent
 * List messages where the logged-in user is the sender.
 */
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

      const { rows, count } = await Message.findAndCountAll({
        where: { senderId: req.user.id },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return ok(res, {
        messages: rows,
        count,
        limit,
        offset,
      });
    } catch (e) {
      console.error('GET /api/messages/sent error:', e);
      return err(res, 'Failed to load sent messages');
    }
  }
);

/**
 * GET /api/messages/:id
 * Fetch a single message (only if the user is sender or receiver).
 */
router.get(
  '/:id',
  authenticateToken,
  [param('id').isInt().toInt()],
  validate,
  async (req, res) => {
    try {
      const id = req.params.id;

      const message = await Message.findOne({
        where: { id },
        include: [{ model: User, attributes: ['id', 'username', 'email'] }],
      });

      if (!message) {
        return err(res, 'Message not found', 404);
      }

      // make sure this user is part of the message
      if (
        message.senderId !== req.user.id &&
        message.receiverId !== req.user.id
      ) {
        return err(res, 'Not allowed to view this message', 403);
      }

      return ok(res, { message });
    } catch (e) {
      console.error('GET /api/messages/:id error:', e);
      return err(res, 'Failed to load message');
    }
  }
);

/**
 * POST /api/messages
 * Send a message.
 *
 * We are flexible with request body field names so the frontend
 * can send { body }, { content }, { message }, or { text }.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      receiverId,
      body: bodyField,
      content,
      message,
      text,
      serviceId,
    } = req.body || {};

    // 1) Figure out the message text from any of the possible fields
    const messageBody =
      (typeof bodyField === 'string' && bodyField.trim()) ||
      (typeof content === 'string' && content.trim()) ||
      (typeof message === 'string' && message.trim()) ||
      (typeof text === 'string' && text.trim()) ||
      '';

    // 2) Validate receiver + text
    if (!receiverId) {
      return err(res, 'receiverId is required', 400);
    }

    if (!messageBody) {
      return err(res, 'Message body is required', 400);
    }

    if (Number(receiverId) === Number(req.user.id)) {
      return err(res, 'You cannot send a message to yourself', 400);
    }

    // 3) Make sure receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return err(res, 'Receiver not found', 404);
    }

    // 4) Build payload that matches the Message model
    // Most likely the DB column is called "content".
    const payload = {
      senderId: req.user.id,
      receiverId,
      content: messageBody, // <– map to `content` column
    };

    // If your Message model has serviceId, this will be used,
    // otherwise Sequelize simply ignores it.
    if (serviceId) {
      payload.serviceId = serviceId;
    }

    const msg = await Message.create(payload);

    return ok(res, { message: msg }, 201);
  } catch (e) {
    console.error('POST /api/messages error:', e);
    // Send real error message to the client so we can see it in the UI
    return err(res, e.message || 'Failed to send message');
  }
});

module.exports = router;
