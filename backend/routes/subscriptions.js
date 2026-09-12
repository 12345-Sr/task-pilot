const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const db = require('../db');
const { requireUser } = require('../middleware/auth');
const { FREE_DAILY_LIMIT } = require('./tasks');

const router = express.Router();

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || process.env.RZP_KEY_ID;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.RZP_KEY_SECRET;

let rzpInstance = null;
if (razorpayKeyId && razorpayKeySecret) {
  try {
    rzpInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  } catch (e) {
    console.warn('Razorpay init warning:', e.message);
  }
}

// GET /api/subscription/status
// status is 'free' (capped at FREE_DAILY_LIMIT reminders/day) or 'active' (Pro Plan, unlimited).
router.get('/status', requireUser, async (req, res) => {
  let r = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
  let sub = r.rows[0];
  if (!sub) {
    const created = await db.query(
      `INSERT INTO subscriptions (user_id, status, plan_price) VALUES ($1, 'free', 0.00)
       ON CONFLICT (user_id) DO NOTHING RETURNING *`,
      [req.userId]
    );
    sub = created.rows[0] || { status: 'free', plan_price: 0.00 };
  }

  // Check if active Pro subscription has passed its expiration date
  let wasExpired = false;
  if (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
    wasExpired = true;
    const upd = await db.query(
      `UPDATE subscriptions
       SET status = 'free', plan_price = 0.00, cancelled_at = now(), updated_at = now()
       WHERE user_id = $1 RETURNING *`,
      [req.userId]
    );
    sub = upd.rows[0] || { ...sub, status: 'free', plan_price: 0.00 };

    // Send expiration alert notification to user device
    db.query('SELECT push_token, language FROM users WHERE id = $1', [req.userId])
      .then((uR) => {
        const token = uR.rows[0]?.push_token;
        const lang = uR.rows[0]?.language || 'hi';
        if (token) {
          const { sendPush } = require('../scheduler');
          const notifTitle = lang === 'hi' ? '⚠️ Pro Plan Expire Ho Gaya' : '⚠️ Pro Plan Expired';
          const notifBody = lang === 'hi'
            ? 'Aapka Pro plan expire ho gaya hai. Aap wapas Free tier par aa gaye hain. Naye tasks aur reminder alerts ke liye Pro upgrade karein.'
            : 'Your Pro plan has expired and returned to Free tier. Upgrade to Pro to continue creating tasks and receiving reminder alerts.';
          sendPush(token, notifTitle, notifBody, { type: 'SUBSCRIPTION_EXPIRED' }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  let dailyUsed = null;
  if (sub.status === 'free') {
    const countR = await db.query(
      'SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1',
      [req.userId]
    );
    const dbTotal = countR.rows[0]?.c || 0;
    const lifetimeUsed = Math.max(sub.lifetime_tasks_created || 0, dbTotal);
    dailyUsed = Math.min(FREE_DAILY_LIMIT, lifetimeUsed);
  }

  res.json({
    status: sub.status,
    isPremium: sub.status === 'active',
    dailyUsed,
    dailyLimit: sub.status === 'free' ? FREE_DAILY_LIMIT : null,
    planPrice: sub.plan_price,
    currency: sub.currency,
    currentPeriodEnd: sub.current_period_end,
    expired: wasExpired,
    message: wasExpired
      ? 'Your Pro plan has expired. Returned to free tier (3 tasks limit).'
      : null,
  });
});

// POST /api/subscription/create-order
// Creates a Razorpay order and generates dynamic UPI QR details for the payment wall
router.post('/create-order', requireUser, async (req, res) => {
  try {
    const planPriceInr = 399;
    const amountPaise = planPriceInr * 100;
    const receipt = `tp_${String(req.userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}_${Date.now()}`;

    let order = null;
    if (rzpInstance) {
      order = await rzpInstance.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          userId: String(req.userId),
          plan: 'pro_monthly',
        },
      });
    } else {
      order = {
        id: `order_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
      };
    }

    const merchantVpa = process.env.RAZORPAY_MERCHANT_VPA || 'taskpilot.rzp@icici';
    const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent('Task Pilot')}&tr=${encodeURIComponent(order.id)}&am=399.00&cu=INR&tn=${encodeURIComponent('Task Pilot Pro Plan')}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUrl)}&margin=10`;

    // Save pending intent in subscriptions table
    await db.query(
      `INSERT INTO subscriptions (
         user_id, status, plan_price, currency, payment_provider,
         provider_subscription_id, updated_at
       )
       VALUES ($1, 'free', 399.00, 'INR', 'razorpay', $2, now())
       ON CONFLICT (user_id) DO UPDATE SET
         provider_subscription_id = EXCLUDED.provider_subscription_id,
         updated_at = now()`,
      [req.userId, order.id]
    ).catch(() => {});

    res.json({
      ok: true,
      orderId: order.id,
      keyId: razorpayKeyId || 'rzp_live_taskpilot',
      amount: planPriceInr,
      amountPaise,
      currency: 'INR',
      upiUrl,
      qrImageUrl,
      merchantVpa,
      planTitle: 'Task Pilot Pro Plan',
      validity: '30 Days',
    });
  } catch (err) {
    console.error('Failed to create Razorpay payment order:', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// POST /api/subscription/verify-payment
// Verifies Razorpay payment signature and activates the 30-day Pro plan
router.post('/verify-payment', requireUser, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    const targetOrderId = razorpay_order_id || order_id;

    let isVerified = false;

    // 1. Verify cryptographic signature if passed
    if (razorpay_signature && targetOrderId && razorpay_payment_id && razorpayKeySecret) {
      const hmac = crypto.createHmac('sha256', razorpayKeySecret);
      hmac.update(`${targetOrderId}|${razorpay_payment_id}`);
      const digest = hmac.digest('hex');
      if (digest === razorpay_signature) {
        isVerified = true;
      } else {
        return res.status(400).json({ error: 'Payment signature verification failed.' });
      }
    }

    // 2. If Razorpay client is available, verify order status with Razorpay
    if (!isVerified && rzpInstance && targetOrderId && targetOrderId.startsWith('order_')) {
      try {
        const rzpOrder = await rzpInstance.orders.fetch(targetOrderId);
        if (rzpOrder && (rzpOrder.status === 'paid' || (rzpOrder.amount_paid && rzpOrder.amount_paid >= 39900))) {
          isVerified = true;
        }
      } catch (e) {
        console.warn('Could not fetch Razorpay order status:', e?.message);
      }
    }

    // 3. If Razorpay payment ID is passed, check payment status
    if (!isVerified && rzpInstance && razorpay_payment_id && razorpay_payment_id.startsWith('pay_')) {
      try {
        const rzpPayment = await rzpInstance.payments.fetch(razorpay_payment_id);
        if (rzpPayment && (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized')) {
          isVerified = true;
        }
      } catch (e) {
        console.warn('Could not fetch Razorpay payment status:', e?.message);
      }
    }

    if (!isVerified) {
      return res.status(400).json({
        error: 'Payment not completed yet. Please scan the QR code and complete your UPI payment first.',
      });
    }

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30); // 30-day Pro plan

    const result = await db.query(
      `INSERT INTO subscriptions (
         user_id, status, plan_price, currency, payment_provider,
         provider_subscription_id, provider_customer_id,
         current_period_start, current_period_end, updated_at
       )
       VALUES ($1, 'active', 399.00, 'INR', 'razorpay', $2, $3, now(), $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'active',
         plan_price = 399.00,
         payment_provider = 'razorpay',
         provider_subscription_id = EXCLUDED.provider_subscription_id,
         provider_customer_id = EXCLUDED.provider_customer_id,
         current_period_start = now(),
         current_period_end = EXCLUDED.current_period_end,
         cancelled_at = NULL,
         updated_at = now()
       RETURNING *`,
      [req.userId, targetOrderId, razorpay_payment_id || `pay_${Date.now()}`, periodEnd]
    );

    // Send push notification to user device
    db.query('SELECT push_token, language FROM users WHERE id = $1', [req.userId])
      .then((uR) => {
        const token = uR.rows[0]?.push_token;
        const lang = uR.rows[0]?.language || 'hi';
        if (token) {
          const { sendPush } = require('../scheduler');
          const title = lang === 'hi' ? '🎉 Pro Plan Activate Ho Gaya!' : '🎉 Pro Plan Activated!';
          const body = lang === 'hi'
            ? 'Aapka Task Pilot Pro plan safalta-poorvak shuru ho gaya hai. Unlimited task reminders unlock ho chuke hain!'
            : 'Your Task Pilot Pro plan is now active! Enjoy unlimited daily reminders and all pro features.';
          sendPush(token, title, body, { type: 'PRO_ACTIVATED' }).catch(() => {});
        }
      })
      .catch(() => {});

    res.json({
      ok: true,
      isPremium: true,
      subscription: result.rows[0],
      message: 'Subscription successfully activated!',
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// POST /api/subscription/subscribe
// Direct subscription activation requires verified payment
router.post('/subscribe', requireUser, async (req, res) => {
  res.status(400).json({
    error: 'Direct subscription without payment is not permitted. Please use /create-order and pay via UPI QR code.',
  });
});

// POST /api/subscription/cancel
// Drops the user back to Free tier
router.post('/cancel', requireUser, async (req, res) => {
  const result = await db.query(
    `UPDATE subscriptions SET status = 'free', plan_price = 0.00, cancelled_at = now(), updated_at = now()
     WHERE user_id = $1 RETURNING *`,
    [req.userId]
  );
  res.json({ subscription: result.rows[0], isPremium: false });
});

module.exports = router;
