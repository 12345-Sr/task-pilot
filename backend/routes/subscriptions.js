const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const db = require('../db');
const { requireUser } = require('../middleware/auth');
const { FREE_DAILY_LIMIT } = require('./tasks');

const router = express.Router();


function getCleanKeyId() {
  const raw = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY || process.env.RZP_KEY_ID;
  if (!raw || !String(raw).trim()) return '';
  // NOTE: previously this was /['"\\s]/g which matches a literal backslash
  // plus the literal letter "s" -- it was silently deleting every "s"
  // character from real Razorpay keys. Fixed to strip quotes/whitespace only.
  return String(raw).trim().replace(/['"\s]/g, '');
}

function getCleanKeySecret() {
  const raw = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.RZP_KEY_SECRET;
  if (!raw || !String(raw).trim()) return '';
  return String(raw).trim().replace(/['"\s]/g, '');
}

function getRzpInstance(keyId, keySecret) {
  const id = (keyId || getCleanKeyId()).trim();
  const secret = (keySecret || getCleanKeySecret()).trim();
  if (!id || !secret) {
    return null;
  }
  try {
    return new Razorpay({ key_id: id, key_secret: secret });
  } catch (e) {
    console.error('[RAZORPAY] Client initialization failed:', e.message);
    return null;
  }
}

function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const secret = getCleanKeySecret();
  if (!secret) return false;
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${orderId}|${paymentId}`);
    return hmac.digest('hex') === signature;
  } catch (e) {
    return false;
  }
}

// SECURITY: a paid order is not sufficient on its own to activate Pro for whoever
// happens to call /verify-payment. We must also confirm the order was created for
// THIS user (matches the notes.userId stamped at /create-order time). Without this,
// any authenticated user who obtains any valid paid order_id/payment_id (their own
// old one, or a leaked/shared one) could activate Pro on a different account for free.
async function orderBelongsToUser(rzpClient, orderId, userId) {
  if (!orderId || !userId) return false;
  try {
    const dbCheck = await db.query(
      `SELECT 1 FROM subscriptions WHERE user_id = $1 AND provider_subscription_id = $2`,
      [userId, orderId]
    );
    if (dbCheck.rows && dbCheck.rows.length > 0) return true;
  } catch (e) { }

  if (!rzpClient) return false;
  try {
    const order = await rzpClient.orders.fetch(orderId);
    return !!(order && order.notes && String(order.notes.userId) === String(userId));
  } catch (e) {
    return false;
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
        const lang = uR.rows[0]?.language || 'en';
        if (token) {
          const { sendPush } = require('../scheduler');
          const notifTitle = lang === 'hi' ? '⚠️ Pro Plan Expire Ho Gaya' : '⚠️ Pro Plan Expired';
          const notifBody = lang === 'hi'
            ? 'Aapka Pro plan expire ho gaya hai. Aap wapas Free tier par aa gaye hain. Naye tasks aur reminder alerts ke liye Pro upgrade karein.'
            : 'Your Pro plan has expired and returned to Free tier. Upgrade to Pro to continue creating tasks and receiving reminder alerts.';
          sendPush(token, notifTitle, notifBody, { type: 'SUBSCRIPTION_EXPIRED' }).catch(() => { });
        }
      })
      .catch(() => { });
  }

  let dailyUsed = null;
  if (sub.status !== 'active') {
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
    dailyLimit: sub.status !== 'active' ? FREE_DAILY_LIMIT : null,
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
    // Subscription fee: configured via SUBSCRIPTION_PRICE_PAISE (default 39900 paise = ₹399.00)
    const amountPaise = parseInt(process.env.SUBSCRIPTION_PRICE_PAISE || '39900', 10);
    const planPriceInr = 399;
    const receipt = `tp_${String(req.userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    let order = null;
    let isRealRzpOrder = false;
    const activeKeyId = getCleanKeyId();
    const activeKeySecret = getCleanKeySecret();
    const rzp = getRzpInstance(activeKeyId, activeKeySecret);

    if (!rzp || !activeKeyId || !activeKeySecret) {
      console.error('[RAZORPAY] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment variables (.env)');
      return res.status(500).json({
        error: 'Razorpay keys are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env',
      });
    }

    try {
      order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: {
          userId: String(req.userId),
          plan: 'pro_monthly',
        },
      });
      if (order && order.id) {
        isRealRzpOrder = true;
      }
    } catch (rzpErr) {
      const errDesc = rzpErr?.error?.description || rzpErr?.message || String(rzpErr);
      console.error(`[RAZORPAY] orders.create error with key (${activeKeyId ? activeKeyId.slice(0, 8) + '...' + activeKeyId.slice(-4) : 'EMPTY'}, secret length: ${activeKeySecret ? activeKeySecret.length : 0}):`, errDesc);
      return res.status(500).json({
        error: errDesc || 'Failed to create payment order with Razorpay. Please verify credentials in .env.',
      });
    }

    // Save pending intent in subscriptions table
    await db.query(
      `INSERT INTO subscriptions (
         user_id, status, plan_price, currency, payment_provider,
         provider_subscription_id, updated_at
       )
       VALUES ($1, 'free', ${planPriceInr}.00, 'INR', 'razorpay', $2, now())
       ON CONFLICT (user_id) DO UPDATE SET
         provider_subscription_id = EXCLUDED.provider_subscription_id,
         updated_at = now()`,
      [req.userId, order.id]
    ).catch(() => { });

    res.json({
      ok: true,
      orderId: order.id,
      keyId: activeKeyId,
      amount: planPriceInr,
      amountPaise,
      currency: 'INR',
      planTitle: 'TaskAlert Pro Plan',
      validity: '30 Days',
    });
  } catch (err) {
    console.error('Failed to create Razorpay payment order:', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// POST /api/subscription/create-web-order
// Public order endpoint for taskalert.in website visitors
router.post('/create-web-order', async (req, res) => {
  try {
    const amountPaise = parseInt(process.env.SUBSCRIPTION_PRICE_PAISE || '39900', 10);
    const planPriceInr = 399;
    const receipt = `web_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const activeKeyId = getCleanKeyId();
    const activeKeySecret = getCleanKeySecret();
    const rzp = getRzpInstance(activeKeyId, activeKeySecret);

    if (!rzp || !activeKeyId || !activeKeySecret) {
      return res.status(500).json({ error: 'Razorpay keys are not configured on the server.' });
    }

    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      payment_capture: 1,
      notes: {
        source: 'taskalert_website',
        plan: 'pro_monthly',
      },
    });

    res.json({
      ok: true,
      orderId: order.id,
      keyId: activeKeyId,
      amount: planPriceInr,
      planAmount: planPriceInr,
      amountPaise,
      currency: 'INR',
    });
  } catch (err) {
    console.error('Failed to create web payment order:', err);
    res.status(500).json({ error: 'Failed to create web payment order.' });
  }
});

// GET /api/subscription/public-key
// Returns public key_id configured in .env (never secret)
router.get('/public-key', (req, res) => {
  const activeKeyId = getCleanKeyId();
  const amountPaise = parseInt(process.env.SUBSCRIPTION_PRICE_PAISE || '39900', 10);
  res.json({
    ok: !!activeKeyId,
    keyId: activeKeyId || '',
    amountPaise,
    amount: 399,
    planAmount: 399,
    currency: 'INR',
  });
});



// POST /api/subscription/verify-payment
// Called from the mobile app after user returns from Chrome checkout.
// SECURITY: Only verifies via Razorpay server-side APIs. No client-trusted bypasses.
// Uses req.userId (from JWT) — always activates Pro for the correct logged-in user.
router.post('/verify-payment', requireUser, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    const targetOrderId = razorpay_order_id || order_id;

    // 0. Check if user already has an active subscription (e.g. updated by callback)
    const existingActive = await db.query(
      `SELECT * FROM subscriptions WHERE user_id = $1 AND status = 'active' AND current_period_end > now()`,
      [req.userId]
    );
    if (existingActive.rows.length > 0) {
      return res.json({
        ok: true,
        isPremium: true,
        message: 'Pro subscription is already active!',
        subscription: existingActive.rows[0],
      });
    }

    let isVerified = false;
    const rzpClient = getRzpInstance();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // Resolve which order we're actually verifying. If only a payment_id was given,
    // look up its parent order first so we have something to check ownership against.
    let resolvedOrderId = targetOrderId;
    if (!resolvedOrderId && rzpClient && razorpay_payment_id && razorpay_payment_id.startsWith('pay_')) {
      try {
        const p = await rzpClient.payments.fetch(razorpay_payment_id);
        resolvedOrderId = p && p.order_id;
      } catch (e) { }
    }

    // SECURITY: confirm this order was created for the logged-in user before doing
    // anything else. A valid, paid order that belongs to someone else must never
    // activate Pro for the current caller.
    if (rzpClient && resolvedOrderId) {
      const owns = await orderBelongsToUser(rzpClient, resolvedOrderId, req.userId);
      if (!owns) {
        console.warn(`[VERIFY-PAYMENT] Ownership mismatch: user ${req.userId} tried to verify order ${resolvedOrderId} that does not belong to them.`);
        return res.status(403).json({ error: 'This payment does not belong to your account.' });
      }
    } else if (!rzpClient) {
      return res.status(500).json({ error: 'Razorpay is not configured on the server.' });
    } else {
      return res.status(400).json({ error: 'Missing order id.' });
    }

    // Retry check up to 3 times with 1.2s delay to catch fast webhook/bank settlement delays
    for (let attempt = 1; attempt <= 3; attempt++) {
      // 1. Verify cryptographic signature if all three parts are present
      if (!isVerified && razorpay_signature && targetOrderId && razorpay_payment_id) {
        if (verifySignature(targetOrderId, razorpay_payment_id, razorpay_signature)) {
          isVerified = true;
          break;
        }
      }

      // 2. Verify order status and attached payments with Razorpay API (.env credentials)
      if (!isVerified && rzpClient && targetOrderId && targetOrderId.startsWith('order_')) {
        try {
          const rzpOrder = await rzpClient.orders.fetch(targetOrderId);
          if (rzpOrder && rzpOrder.status === 'paid') {
            isVerified = true;
            break;
          }
        } catch (e) { }

        try {
          const payments = await rzpClient.orders.fetchPayments(targetOrderId);
          if (payments && payments.items && payments.items.length > 0) {
            const cap = payments.items.find(p => p.status === 'captured' || p.status === 'authorized');
            if (cap) {
              if (cap.status === 'authorized') {
                try { await rzpClient.payments.capture(cap.id, cap.amount, 'INR'); } catch (e) { }
              }
              isVerified = true;
              break;
            }
          }
        } catch (e) { }
      }

      // 3. Verify payment by ID directly with Razorpay API (.env credentials)
      if (!isVerified && rzpClient && razorpay_payment_id && razorpay_payment_id.startsWith('pay_')) {
        try {
          const rzpPayment = await rzpClient.payments.fetch(razorpay_payment_id);
          if (rzpPayment && rzpPayment.order_id === resolvedOrderId && (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized')) {
            if (rzpPayment.status === 'authorized') {
              try { await rzpClient.payments.capture(rzpPayment.id, rzpPayment.amount, 'INR'); } catch (e) { }
            }
            isVerified = true;
            break;
          }
        } catch (e) { }
      }

      if (isVerified) break;
      if (attempt < 3) {
        await sleep(1200);
      }
    }

    if (!isVerified) {
      return res.status(400).json({
        error: 'Payment not completed yet. Please complete payment via Razorpay first.',
      });
    }

    // Activate Pro for THIS user (req.userId from JWT — always correct, never guessed)
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

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
      [req.userId, targetOrderId || `ord_${Date.now()}`, razorpay_payment_id || `pay_${Date.now()}`, periodEnd]
    );

    console.log(`[VERIFY-PAYMENT] Pro activated for user ${req.userId}, order ${targetOrderId}, payment ${razorpay_payment_id}`);

    // Send push notification to user device
    db.query('SELECT push_token, language FROM users WHERE id = $1', [req.userId])
      .then((uR) => {
        const token = uR.rows[0]?.push_token;
        const lang = uR.rows[0]?.language || 'en';
        if (token) {
          const { sendPush } = require('../scheduler');
          const title = lang === 'hi' ? '🎉 Pro Plan Activate Ho Gaya!' : '🎉 Pro Plan Activated!';
          const body = lang === 'hi'
            ? 'Aapka TaskAlert Pro plan safalta-poorvak shuru ho gaya hai. Unlimited task reminders unlock ho chuke hain!'
            : 'Your TaskAlert Pro plan is now active! Enjoy unlimited daily reminders and all pro features.';
          sendPush(token, title, body, { type: 'PRO_ACTIVATED' }).catch(() => { });
        }
      })
      .catch(() => { });

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
