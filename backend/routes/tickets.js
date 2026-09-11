const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

// POST /api/tickets - Create a new support ticket
router.post('/', requireUser, async (req, res) => {
  try {
    const { subject, category = 'general', message } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject / Title is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Issue description is required' });
    }

    // Get user details
    const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [req.userId]);
    const userName = userRes.rows[0]?.name || 'User';
    const userEmail = userRes.rows[0]?.email || '';

    const cleanSubject = subject.trim();
    const cleanCategory = String(category).trim().toLowerCase();
    const cleanMessage = message.trim();

    const insertRes = await db.query(
      `INSERT INTO support_tickets (user_id, user_name, user_email, category, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'open')
       RETURNING *`,
      [req.userId, userName, userEmail, cleanCategory, cleanSubject, cleanMessage]
    );

    const ticket = insertRes.rows[0];
    console.log(`[TICKETS] New ticket created #${ticket.id.slice(0, 8)} by ${userEmail}: "${cleanSubject}"`);

    res.status(201).json({
      ok: true,
      message: 'Support ticket successfully submitted! Our team will review and reply soon.',
      ticket,
    });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// GET /api/tickets/my - Get all tickets submitted by current user
router.get('/my', requireUser, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, category, subject, message, status, admin_reply, admin_replied_at, created_at, updated_at
       FROM support_tickets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );

    res.json({
      ok: true,
      tickets: result.rows,
    });
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

module.exports = router;
