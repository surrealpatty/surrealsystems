// src/routes/messages.js
const express = require('express');
const router = express.Router();

const { Message, User, Service } = require('../models');
const authenticateToken = require('../middlewares/authenticateToken');
const { body, query, param } = require('express-validator');
const validate = require('../middlewares/validate');

// Standard success/error wrappers
function ok(res, payload, status = 200) {
  // payload is usually { messages } or { message } or { root, messages }
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
      return err(res, 'Failed to load inbox', 500, error.message);
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
      return err(res, 'Failed to load sent messages', 500, error.message);
    }
  },
);

/* ------------------------------------------------------------------ */
/* POST /api/messages  (send a new message)                           */
/*  - accepts either `body` or `content` field for the text           */
/*  - auto-fills subject from the service title if missing            */
/* ------------------------------------------------------------------ */
router.post(
  '/',
  authenticateToken,
  [
    body('receiverId')
      .isInt()
      .withMessage('receiverId is required')
      .toInt(),
    // Let both `body` and `content` be optional strings;
    // we'll check that at least one is non-empty in the handler.
    body('body').optional().isString(),
    body('content').optional().isString(),
    body('subject')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 255 }),
    body('serviceId').optional().isInt().toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const { receiverId, serviceId } = req.body;
      let { subject } = req.body;

      const rawBody =
        typeof req.body.body === 'string'
          ? req.body.body
          : typeof req.body.content === 'string'
          ? req.body.content
          : '';

      const bodyText = rawBody.trim();

      if (!bodyText) {
        // manual validation so both old & new front-ends get the same message
        return err(res, 'Message body is required', 400);
      }

      // Normalise and auto-generate subject if needed
      let finalSubject = '';
      if (typeof subject === 'string') {
        finalSubject = subject.trim();
      }

      if (!finalSubject) {
        // Try to derive from the service title, if we have a serviceId
        if (serviceId) {
          const svc = await Service.findByPk(serviceId);
          if (svc && svc.title) {
            finalSubject = `RE "${svc.title}"`;
          }
        }

        // Fallback if no service or title found
        if (!finalSubject) {
          finalSubject = 'Message about your service';
        }
      }

      const created = await Message.create({
        senderId: req.user.id,
        receiverId,
        content: bodyText,
        serviceId: serviceId || null,
        subject: finalSubject,
      });

      const message = created.toJSON();
      return ok(res, { message }, 201);
    } catch (error) {
      console.error('ERROR: POST /api/messages failed:', error);
      return err(res, 'Failed to send message', 500, error.message);
    }
  },
);

/* ------------------------------------------------------------------ */
/* GET /api/messages/thread/:userId  (conversation by user)           */
/*  OLD route – kept for compatibility with any old UI                */
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
      return err(res, 'Failed to load conversation', 500, error.message);
    }
  },
);

/* ------------------------------------------------------------------ */
/* GET /api/messages/:id/thread  (conversation by message + ad)       */
/* ------------------------------------------------------------------ */
router.get(
  '/:id/thread',
  authenticateToken,
  [param('id').isInt()],
  validate,
  async (req, res) => {
    try {
      const messageId = parseInt(req.params.id, 10);

      const rootRow = await Message.findOne({
        where: { id: messageId },
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
      });

      if (!rootRow) {
        return err(res, 'Message not found', 404);
      }

      const root = rootRow.toJSON();

      // Make sure logged-in user is part of this message
      if (
        root.senderId !== req.user.id &&
        root.receiverId !== req.user.id
      ) {
        return err(
          res,
          'You are not part of this conversation',
          403,
        );
      }

      const otherUserId =
        root.senderId === req.user.id
          ? root.receiverId
          : root.senderId;

      const serviceId = root.serviceId || null;

      const where = {
        [Message.sequelize.Op.or]: [
          { senderId: req.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user.id },
        ],
      };

      // Lock to this specific ad / service if there is one
      if (serviceId !== null) {
        where.serviceId = serviceId;
      }

      const rows = await Message.findAll({
        where,
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

      return ok(res, { root, messages });
    } catch (error) {
      console.error('ERROR: GET /api/messages/:id/thread failed:', error);
      return err(res, 'Failed to load conversation thread', 500, error.message);
    }
  },
);

/* ------------------------------------------------------------------ */
/* DELETE /api/messages/:id  (delete a message you sent or received)  */
/* ------------------------------------------------------------------ */
router.delete(
  '/:id',
  authenticateToken,
  [param('id').isInt()],
  validate,
  async (req, res) => {
    try {
      const msgId = parseInt(req.params.id, 10);
      const userId = req.user.id;

      const Op = Message.sequelize.Op;

      const message = await Message.findOne({
        where: {
          id: msgId,
          [Op.or]: [{ senderId: userId }, { receiverId: userId }],
        },
      });

      if (!message) {
        return err(res, 'Message not found or unauthorized', 404);
      }

      await message.destroy();
      return ok(res, { message: 'Message deleted' });
    } catch (error) {
      console.error('ERROR: DELETE /api/messages/:id failed:', error);
      return err(res, 'Failed to delete message', 500, error.message);
    }
  },
);

module.exports = router;
