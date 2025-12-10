// src/routes/messages.js
const express = require("express");
const router = express.Router();
const { Message, User, Service } = require("../models");
const authenticateToken = require("../middlewares/authenticateToken");
const { body, query } = require("express-validator");
const validate = require("../middlewares/validate");
const { Op } = require("sequelize");

// Standard helpers
function ok(res, payload, status = 200) {
  return res.status(status).json({ success: true, ...payload });
}
function err(res, message = "Something went wrong", status = 500) {
  return res.status(status).json({
    success: false,
    error: { message },
  });
}

/**
 * GET /api/messages/inbox
 * All messages where the logged-in user is the receiver.
 */
router.get(
  "/inbox",
  authenticateToken,
  [
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { receiverId: userId },
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "username", "email"],
          },
          {
            model: Service,
            as: "service",
            attributes: ["id", "title"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return ok(res, { messages: rows });
    } catch (e) {
      console.error("GET /api/messages/inbox error:", e);
      return err(res, "Failed to load inbox");
    }
  }
);

/**
 * GET /api/messages/sent
 * All messages where the logged-in user is the sender.
 */
router.get(
  "/sent",
  authenticateToken,
  [
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { senderId: userId },
        include: [
          {
            model: User,
            as: "receiver",
            attributes: ["id", "username", "email"],
          },
          {
            model: Service,
            as: "service",
            attributes: ["id", "title"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return ok(res, { messages: rows });
    } catch (e) {
      console.error("GET /api/messages/sent error:", e);
      return err(res, "Failed to load sent messages");
    }
  }
);

/**
 * GET /api/messages/conversation
 *
 * Query params:
 *   otherUserId (required) – the person you’re talking to
 *   serviceId   (optional) – limit to one service
 */
router.get(
  "/conversation",
  authenticateToken,
  [
    query("otherUserId").isInt({ min: 1 }).toInt(),
    query("serviceId").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 200 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const me = req.user.id;
      const { otherUserId, serviceId } = req.query;
      const limit = req.query.limit ?? 200;
      const offset = req.query.offset ?? 0;

      const where = {
        [Op.or]: [
          { senderId: me, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: me },
        ],
      };

      if (serviceId) {
        where.serviceId = serviceId;
      }

      const rows = await Message.findAll({
        where,
        include: [
          {
            model: User,
            as: "sender",
            attributes: ["id", "username", "email"],
          },
          {
            model: User,
            as: "receiver",
            attributes: ["id", "username", "email"],
          },
          {
            model: Service,
            as: "service",
            attributes: ["id", "title"],
          },
        ],
        order: [["createdAt", "ASC"]],
        limit,
        offset,
      });

      return ok(res, { messages: rows });
    } catch (e) {
      console.error("GET /api/messages/conversation error:", e);
      return err(res, "Failed to load conversation");
    }
  }
);

/**
 * POST /api/messages
 * Body: { receiverId, content, serviceId? }
 * Used for new messages AND replies.
 */
router.post(
  "/",
  authenticateToken,
  [
    body("receiverId").isInt({ min: 1 }).toInt(),
    body("content").isString().trim().isLength({ min: 1, max: 4000 }),
    body("serviceId").optional().isInt({ min: 1 }).toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const senderId = req.user.id;
      const { receiverId, content, serviceId } = req.body;

      if (senderId === receiverId) {
        return err(res, "You cannot send a message to yourself", 400);
      }

      const msg = await Message.create({
        senderId,
        receiverId,
        content,
        serviceId: serviceId || null,
      });

      return ok(res, { message: msg }, 201);
    } catch (e) {
      console.error("POST /api/messages error:", e);
      return err(res, "Failed to send message");
    }
  }
);

module.exports = router;
