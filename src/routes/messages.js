// src/routes/messages.js
// Messaging routes for CodeCrowds
// - POST /messages        => send a message
// - GET  /messages/inbox  => messages received by current user
// - GET  /messages/sent   => messages sent by current user
// - GET  /messages/:id/thread => full conversation for ONE ad between two users

const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Message, Service, User } = require("../models");
const authenticateToken = require("../middlewares/authenticateToken");

// Small helper so we don't repeat the include list
const baseInclude = [
  {
    model: User,
    as: "sender",
    attributes: ["id", "username", "email", "displayName"],
  },
  {
    model: User,
    as: "receiver",
    attributes: ["id", "username", "email", "displayName"],
  },
  {
    model: Service,
    as: "service",
    attributes: ["id", "title", "name"],
  },
];

// ---------------------------------------------------------
// POST /messages  – send a message
// ---------------------------------------------------------
router.post("/", authenticateToken, async (req, res) => {
  try {
    const senderId = req.user && req.user.id;
    let { receiverId, content, serviceId, subject } = req.body;

    if (!senderId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    if (!receiverId) {
      return res.status(400).json({ message: "receiverId is required." });
    }

    if (!content || !String(content).trim()) {
      return res
        .status(400)
        .json({ message: "Message content cannot be empty." });
    }

    // Normalise types
    receiverId = Number(receiverId);
    if (Number.isNaN(receiverId)) {
      return res
        .status(400)
        .json({ message: "receiverId must be a number." });
    }

    if (serviceId !== undefined && serviceId !== null && serviceId !== "") {
      const n = Number(serviceId);
      serviceId = Number.isNaN(n) ? null : n;
    } else {
      serviceId = null;
    }

    if (!subject || !String(subject).trim()) {
      subject = "Message from CodeCrowds";
    }

    const created = await Message.create({
      content: String(content).trim(),
      senderId,
      receiverId,
      serviceId,
      // `subject` is safe to send even if the column doesn't exist;
      // Sequelize simply ignores attributes not in the model definition.
      subject,
    });

    // Optionally re-load with includes so front-end gets sender/service info
    const fullMessage = await Message.findByPk(created.id, {
      include: baseInclude,
    });

    return res.status(201).json(fullMessage || created);
  } catch (err) {
    console.error("Error creating message:", err);

    if (
      err.name === "SequelizeValidationError" ||
      err.name === "SequelizeUniqueConstraintError"
    ) {
      return res.status(400).json({
        message: "Validation failed",
        details: err.errors?.map((e) => e.message) || [],
      });
    }

    return res.status(500).json({ message: "Failed to send message." });
  }
});

// ---------------------------------------------------------
// GET /messages/inbox  – all messages received by this user
// ---------------------------------------------------------
router.get("/inbox", authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const messages = await Message.findAll({
      where: { receiverId: userId },
      include: baseInclude,
      order: [["createdAt", "DESC"]],
    });

    return res.json(messages);
  } catch (err) {
    console.error("Error loading inbox:", err);
    return res
      .status(500)
      .json({ message: "Failed to load inbox messages." });
  }
});

// ---------------------------------------------------------
// GET /messages/sent – all messages sent by this user
// ---------------------------------------------------------
router.get("/sent", authenticateToken, async (req, res) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    const messages = await Message.findAll({
      where: { senderId: userId },
      include: baseInclude,
      order: [["createdAt", "DESC"]],
    });

    return res.json(messages);
  } catch (err) {
    console.error("Error loading sent messages:", err);
    return res
      .status(500)
      .json({ message: "Failed to load sent messages." });
  }
});

// ---------------------------------------------------------
// GET /messages/:id/thread – ONE conversation (per ad)
// Uses the clicked message to find:
//   - the other user
//   - the serviceId (ad)
// and then returns ONLY messages between those two users
// for that one ad.
// ---------------------------------------------------------
router.get("/:id/thread", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user && req.user.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated." });
    }

    // 1) Load the message that was clicked
    const root = await Message.findByPk(id, {
      include: baseInclude,
    });

    if (!root) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Make sure current user is part of this conversation
    if (root.senderId !== userId && root.receiverId !== userId) {
      return res
        .status(403)
        .json({ message: "You are not part of this conversation." });
    }

    // 2) Work out the other participant
    const otherUserId =
      root.senderId === userId ? root.receiverId : root.senderId;

    // 3) Lock to this ad / service
    const serviceId = root.serviceId || null;

    const where = {
      [Op.or]: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    };

    if (serviceId !== null) {
      where.serviceId = serviceId;
    }

    // 4) Fetch thread messages
    const messages = await Message.findAll({
      where,
      include: baseInclude,
      order: [["createdAt", "ASC"]],
    });

    return res.json({
      root,
      messages,
    });
  } catch (err) {
    console.error("Error loading message thread:", err);
    return res
      .status(500)
      .json({ message: "Failed to load conversation thread." });
  }
});

module.exports = router;
