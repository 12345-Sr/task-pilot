const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware/auth');
const { FREE_DAILY_LIMIT } = require('./tasks');

const router = express.Router();

// GET /api/subscription/status
// status is 'free' (capped at FREE_DAILY_LIMIT reminders/day, no streak) or 'active' (Premium Zone, unlimited).
router.get('/status', requireUser, async (req, res) => {
  const r = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
  const sub = r.rows[0];
  if (!sub) return res.json({ status: 'none' });

  let dailyUsed = null;
  if (sub.status === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const countR = await db.query(
      'SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1 AND task_date = $2',
      [req.userId, today]
    );
    dailyUsed = countR.rows[0].c;
  }

  res.json({
    status: sub.status,
    dailyUsed,
    dailyLimit: sub.status === 'free' ? FREE_DAILY_LIMIT : null,
    planPrice: sub.plan_price,
    currency: sub.currency,
    currentPeriodEnd: sub.current_period_end
  });
});

// POST /api/subscription/subscribe
// In production: verify the payment_provider's webhook/signature (Razorpay/Stripe/Play/App Store)
// BEFORE marking the subscription active. This route assumes payment already succeeded client-side
// and the client is confirming it — swap in real signature verification here.
router.post('/subscribe', requireUser, async (req, res) => {
  const { payment_provider, provider_subscription_id, provider_customer_id } = req.body;

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const result = await db.query(
    `UPDATE subscriptions SET
       status = 'active',
       payment_provider = $1,
       provider_subscription_id = $2,
       provider_customer_id = $3,
       current_period_start = now(),
       current_period_end = $4,
       cancelled_at = NULL,
       updated_at = now()
     WHERE user_id = $5
     RETURNING *`,
    [payment_provider || 'manual', provider_subscription_id || null, provider_customer_id || null, periodEnd, req.userId]
  );
  res.json({ subscription: result.rows[0] });
});

// POST /api/subscription/cancel
// Drops the user straight back to the Free Zone (3 reminders/day, streak locked).
// For a "stay active until period end" flow instead, set status to a separate
// 'cancelled' state here and have a daily cron downgrade it to 'free' once
// current_period_end passes.
router.post('/cancel', requireUser, async (req, res) => {
  const result = await db.query(
    `UPDATE subscriptions SET status = 'free', cancelled_at = now(), updated_at = now()
     WHERE user_id = $1 RETURNING *`,
    [req.userId]
  );
  res.json({ subscription: result.rows[0] });
});

module.exports = router;
