// src/routes/messages.js
const express = require("express");
const router = express.Router();

const { Message, User, Service } = require("../models");
const authenticateToken = require("../middlewares/authenticateToken");
const { body, query, param } = require("express-validator");
const validate = require("../middlewares/validate");

/* ------------ helpers ------------ */
function ok(res, payload, status = 200) {
  // keep shape compatible with your front-end extractMessages()
  return res.status(status).json({
    success: true,
    messages: payload,
    data: { messages: payload },
  });
}

function err(res, message = "Something went wrong", status = 500, details) {
  const out = { success: false, error: { message } };
  if (details) out.error.details = details;
  return res.status(status).json(out);
}

/* ============================================================
   GET /api/messages/inbox
   All messages RECEIVED by the logged-in user
   ============================================================ */
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
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { receiverId: req.user.id },
        include: [
          { model: User, as: "sender", attributes: ["id", "username", "email"] },
          { model: User, as: "receiver", attributes: ["id", "username", "email"] },
          { model: Service, as: "service", attributes: ["id", "title"] },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return ok(res, rows);
    } catch (e) {
      console.error("[GET /messages/inbox] error", e);
      return err(res, "Failed to load inbox", 500, e.message);
    }
  },
);

/* ============================================================
   GET /api/messages/sent
   All messages SENT by the logged-in user
   ============================================================ */
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
      const limit = req.query.limit ?? 50;
      const offset = req.query.offset ?? 0;

      const rows = await Message.findAll({
        where: { senderId: req.user.id },
        include: [
          { model: User, as: "sender", attributes: ["id", "username", "email"] },
          { model: User, as: "receiver", attributes: ["id", "username", "email"] },
          { model: Service, as: "service", attributes: ["id", "title"] },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return ok(res, rows);
    } catch (e) {
      console.error("[GET /messages/sent] error", e);
      return err(res, "Failed to load sent messages", 500, e.message);
    }
  },
);

/* ============================================================
   GET /api/messages/thread/:userId
   Conversation between logged-in user and another user
   ============================================================ */
router.get(
  "/thread/:userId",
  authenticateToken,
  [param("userId").isInt().toInt()],
  validate,
  async (req, res) => {
    try {
      const otherUserId = req.params.userId;

      const rows = await Message.findAll({
        where: {
          // either I sent it OR they sent it
          [Message.sequelize.Op.or]: [
            { senderId: req.user.id, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: req.user.id },
          ],
        },
        include: [
          { model: User, as: "sender", attributes: ["id", "username", "email"] },
          { model: User, as: "receiver", attributes: ["id", "username", "email"] },
          { model: Service, as: "service", attributes: ["id", "title"] },
        ],
        order: [["createdAt", "ASC"]],
      });

      return ok(res, rows);
    } catch (e) {
      console.error("[GET /messages/thread/:userId] error", e);
      return err(res, "Failed to load conversation", 500, e.message);
    }
  },
);

/* ============================================================
   POST /api/messages
   Send a message from logged-in user to someone else
   Body: { receiverId, content, serviceId? }
   ============================================================ */
router.post(
  "/",
  authenticateToken,
  [
    body("receiverId").isInt().withMessage("receiverId is required").toInt(),
    body("content")
      .isString()
      .isLength({ min: 1, max: 2000 })
      .withMessage("content must be 1–2000 characters"),
    body("serviceId").optional().isInt().toInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const { receiverId, content, serviceId } = req.body;
      const senderId = req.user.id;

      if (senderId === receiverId) {
        return err(res, "You cannot send a message to yourself", 400);
      }

      // optionally you can verify the receiver exists
      const receiver = await User.findByPk(receiverId);
      if (!receiver) {
        return err(res, "Receiver not found", 404);
      }

      const msg = await Message.create({
        senderId,
        receiverId,
        content,
        serviceId: serviceId || null,
      });

      const full = await Message.findByPk(msg.id, {
        include: [
          { model: User, as: "sender", attributes: ["id", "username", "email"] },
          { model: User, as: "receiver", attributes: ["id", "username", "email"] },
          { model: Service, as: "service", attributes: ["id", "title"] },
        ],
      });

      return ok(res, full, 201);
    } catch (e) {
      console.error("[POST /messages] error", e);
      return err(res, "Failed to send message", 500, e.message);
    }
  },
);

module.exports = router;
