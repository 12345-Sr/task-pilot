const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware/auth');
const { FREE_DAILY_LIMIT } = require('./tasks');

const router = express.Router();

// GET /api/subscription/status
// status is 'free' (capped at FREE_DAILY_LIMIT reminders/day, no streak) or 'active' (Premium Zone, unlimited).
router.get('/status', requireUser, async (req, res) => {
  let r = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
  let sub = r.rows[0];
  if (!sub) {
    const created = await db.query(
      `INSERT INTO subscriptions (user_id, status, plan_price) VALUES ($1, 'free', $2)
       ON CONFLICT (user_id) DO NOTHING RETURNING *`,
      [req.userId, process.env.SUBSCRIPTION_PRICE_PAISE ? process.env.SUBSCRIPTION_PRICE_PAISE / 100 : 399]
    );
    sub = created.rows[0] || { status: 'free', plan_price: 399 };
  }

  let dailyUsed = null;
  if (sub.status === 'free') {
    const today = new Date().toISOString().slice(0, 10);
    const countR = await db.query(
      'SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1 AND task_date = $2 AND (deleted_at IS NULL)',
      [req.userId, today]
    );
    dailyUsed = countR.rows[0].c;
  }

  res.json({
    status: sub.status,
    isPremium: sub.status === 'active',
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
  const planPrice = process.env.SUBSCRIPTION_PRICE_PAISE ? process.env.SUBSCRIPTION_PRICE_PAISE / 100 : 399;

  const result = await db.query(
    `INSERT INTO subscriptions (
       user_id, status, plan_price, currency, payment_provider,
       provider_subscription_id, provider_customer_id,
       current_period_start, current_period_end, updated_at
     )
     VALUES ($1, 'active', $2, 'INR', $3, $4, $5, now(), $6, now())
     ON CONFLICT (user_id) DO UPDATE SET
       status = 'active',
       plan_price = EXCLUDED.plan_price,
       payment_provider = EXCLUDED.payment_provider,
       provider_subscription_id = EXCLUDED.provider_subscription_id,
       provider_customer_id = EXCLUDED.provider_customer_id,
       current_period_start = now(),
       current_period_end = EXCLUDED.current_period_end,
       cancelled_at = NULL,
       updated_at = now()
     RETURNING *`,
    [req.userId, planPrice, payment_provider || 'manual', provider_subscription_id || null, provider_customer_id || null, periodEnd]
  );
  res.json({ subscription: result.rows[0], isPremium: true });
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
