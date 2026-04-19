import express from "express";
import { nanoid } from "nanoid";
import { requireAuth } from "../middleware/auth.js";
import { readDb, writeDb } from "../utils/db.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", (req, res) => {
  const { toEmail, content } = req.body || {};

  if (!toEmail || !content) {
    return res.status(400).json({ error: "toEmail and content are required" });
  }

  const db = readDb();
  const recipient = db.users.find((u) => u.email === String(toEmail).toLowerCase().trim());

  if (!recipient) {
    return res.status(404).json({ error: "Recipient not found" });
  }

  const message = {
    id: nanoid(),
    fromEmail: req.user.email,
    toEmail: recipient.email,
    content: String(content),
    isRead: false,
    createdAt: new Date().toISOString()
  };

  db.messages.push(message);
  writeDb(db);

  return res.status(201).json({ message });
});

router.get("/conversations", (req, res) => {
  const db = readDb();
  const mine = db.messages.filter(
    (m) => m.fromEmail === req.user.email || m.toEmail === req.user.email
  );
  const userByEmail = new Map(db.users.map((u) => [u.email, u]));

  const grouped = new Map();

  for (const msg of mine) {
    const partnerEmail = msg.fromEmail === req.user.email ? msg.toEmail : msg.fromEmail;
    const current = grouped.get(partnerEmail);
    const unreadIncrement = msg.toEmail === req.user.email && !msg.isRead ? 1 : 0;

    if (!current) {
      grouped.set(partnerEmail, {
        partnerEmail,
        partnerName: userByEmail.get(partnerEmail)?.name || partnerEmail,
        lastMessage: msg,
        unreadCount: unreadIncrement
      });
    } else {
      if (new Date(msg.createdAt) > new Date(current.lastMessage.createdAt)) {
        current.lastMessage = msg;
      }
      current.unreadCount += unreadIncrement;
    }
  }

  const conversations = [...grouped.values()].sort(
    (a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
  );

  return res.json({ conversations });
});

router.get("/with/:partnerEmail", (req, res) => {
  const partnerEmail = String(req.params.partnerEmail || "").toLowerCase();
  const db = readDb();

  const messages = db.messages
    .filter(
      (m) =>
        (m.fromEmail === req.user.email && m.toEmail === partnerEmail) ||
        (m.fromEmail === partnerEmail && m.toEmail === req.user.email)
    )
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  return res.json({ messages });
});

router.patch("/:id/read", (req, res) => {
  const db = readDb();
  const msg = db.messages.find((m) => m.id === req.params.id);

  if (!msg) {
    return res.status(404).json({ error: "Message not found" });
  }

  if (msg.toEmail !== req.user.email) {
    return res.status(403).json({ error: "Not allowed" });
  }

  msg.isRead = true;
  writeDb(db);

  return res.json({ message: msg });
});

export default router;
