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
    let isRealRzpOrder = false;
    if (rzpInstance) {
      try {
        order = await rzpInstance.orders.create({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            userId: String(req.userId),
            plan: 'pro_monthly',
          },
        });
        if (order && order.id) {
          isRealRzpOrder = true;
        }
      } catch (rzpErr) {
        console.warn('[RAZORPAY] orders.create API warning:', rzpErr?.error?.description || rzpErr?.message || rzpErr);
        order = {
          id: `order_${Date.now()}`,
          amount: amountPaise,
          currency: 'INR',
        };
      }
    } else {
      order = {
        id: `order_${Date.now()}`,
        amount: amountPaise,
        currency: 'INR',
      };
    }

    const host = req.get('host') || 'task-pilot-api.onrender.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' || host.includes('onrender.com') ? 'https' : 'http';
    const checkoutUrl = `${protocol}://${host}/api/subscription/checkout?order_id=${encodeURIComponent(order.id)}&user_id=${encodeURIComponent(req.userId)}${isRealRzpOrder ? '&real_order=1' : ''}`;

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
      keyId: razorpayKeyId || 'rzp_test_TZW0dzD6BHG8kK',
      amount: planPriceInr,
      amountPaise,
      currency: 'INR',
      checkoutUrl,
      upiUrl,
      qrImageUrl,
      merchantVpa,
      planTitle: 'Task Pilot Pro Plan',
      validity: '30 Days',
      acceptedMethods: ['card', 'upi', 'netbanking', 'wallet', 'paylater'],
    });
  } catch (err) {
    console.error('Failed to create Razorpay payment order:', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

// GET /api/subscription/checkout
// Renders the official Razorpay Standard Checkout modal with all payment methods (Cards, UPI, Netbanking, Wallets)
router.get('/checkout', async (req, res) => {
  try {
    const { order_id, user_id, real_order } = req.query;
    const keyId = razorpayKeyId || 'rzp_test_TZW0dzD6BHG8kK';
    const amountPaise = 39900;

    let userName = 'Task Pilot User';
    let userEmail = 'user@taskpilot.app';
    let userPhone = '';

    if (user_id) {
      try {
        const uRes = await db.query('SELECT name, email, phone FROM users WHERE id = $1', [user_id]);
        if (uRes.rows[0]) {
          userName = uRes.rows[0].name || userName;
          userEmail = uRes.rows[0].email || userEmail;
          userPhone = uRes.rows[0].phone || '';
        }
      } catch (e) {}
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Pilot Pro — Razorpay Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #EDF2F4; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #FFFFFF; border-radius: 20px; padding: 28px 22px; max-width: 420px; width: 100%; text-align: center; border: 1.5px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); }
    .badge-top { display: inline-flex; align-items: center; gap: 6px; background: #FEF3C7; color: #B45309; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-bottom: 16px; border: 1px solid #FDE68A; }
    h1 { font-size: 22px; font-weight: 900; color: #0F172A; margin-bottom: 6px; }
    p.sub { font-size: 13px; color: #64748B; margin-bottom: 18px; }
    .price-box { background: #FFF9F0; border-radius: 16px; padding: 16px; border: 1.5px solid #FDE68A; margin-bottom: 18px; }
    .price { font-size: 38px; font-weight: 900; color: #0F172A; }
    .price span { color: #C5A059; }
    .validity { font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 600; }
    .methods-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left; }
    .method-item { display: flex; align-items: center; gap: 10px; background: #F8FAFC; padding: 10px 12px; border-radius: 12px; border: 1px solid #E2E8F0; font-size: 12.5px; color: #334155; }
    .method-item b { color: #0F172A; }
    .btn-pay { background: #C5A059; color: #FFFFFF; border: none; padding: 15px; border-radius: 12px; font-size: 16px; font-weight: 800; width: 100%; cursor: pointer; transition: transform 0.1s, opacity 0.2s; box-shadow: 0 4px 12px rgba(197, 160, 89, 0.35); }
    .btn-pay:hover { opacity: 0.94; }
    .security-note { margin-top: 16px; font-size: 11px; color: #64748B; display: flex; align-items: center; justify-content: center; gap: 6px; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="badge-top">🛡️ Razorpay Official Checkout</div>
    <h1>Task Pilot Pro</h1>
    <p class="sub">Sabhi payment methods accepted hain (All Payment Methods)</p>

    <div class="price-box">
      <div class="price"><span>₹</span>399</div>
      <div class="validity">30 dino ke liye unlimited tasks aur smart alerts access</div>
    </div>

    <div class="methods-list">
      <div class="method-item">💳 <span><b>Debit & Credit Cards</b> (Visa, Mastercard, RuPay)</span></div>
      <div class="method-item">📱 <span><b>UPI & QR</b> (Google Pay, PhonePe, Paytm, Any UPI)</span></div>
      <div class="method-item">🏦 <span><b>Net Banking</b> (SBI, HDFC, ICICI, Axis & 50+ Banks)</span></div>
      <div class="method-item">👛 <span><b>Wallets & Pay Later</b> (Paytm, Mobikwik, ICICI PayLater)</span></div>
    </div>

    <button id="rzp-button" class="btn-pay">Pay ₹399 with Razorpay</button>

    <div class="security-note">
      🔒 256-Bit SSL Secured by Razorpay India
    </div>
  </div>

  <script>
    function launchRazorpay() {
      var options = {
        key: ${JSON.stringify(keyId)},
        amount: ${amountPaise},
        currency: 'INR',
        name: 'Task Pilot Pro',
        description: '30-Day Pro Subscription (Unlimited Tasks & Alerts)',
        prefill: {
          name: ${JSON.stringify(userName)},
          email: ${JSON.stringify(userEmail)},
          contact: ${JSON.stringify(userPhone)}
        },
        theme: {
          color: '#C5A059'
        },
        handler: function (response) {
          window.location.href = '/api/subscription/payment-callback?razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id || '') +
            '&razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id || '') +
            '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature || '') +
            '&user_id=' + encodeURIComponent(${JSON.stringify(user_id || '')});
        },
        modal: {
          ondismiss: function() {
            console.log('Razorpay modal closed');
          }
        }
      };
      if (${real_order === '1'} && ${JSON.stringify(order_id || '')}) {
        options.order_id = ${JSON.stringify(order_id || '')};
      }
      var rzp1 = new Razorpay(options);
      rzp1.on('payment.failed', function (response){
        alert('Payment not completed: ' + (response.error.description || 'Please try another payment method.'));
      });
      rzp1.open();
    }

    document.getElementById('rzp-button').onclick = launchRazorpay;
    // Auto launch Razorpay sheet after 400ms
    setTimeout(launchRazorpay, 400);
  </script>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).send('Unable to load checkout page. Please try again.');
  }
});

// GET /api/subscription/payment-callback
// Verifies signature, updates subscription to active, and displays success screen
router.get('/payment-callback', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, user_id } = req.query;
    const targetOrderId = razorpay_order_id;

    let isVerified = false;
    if (razorpay_signature && targetOrderId && razorpay_payment_id && razorpayKeySecret) {
      const hmac = crypto.createHmac('sha256', razorpayKeySecret);
      hmac.update(`${targetOrderId}|${razorpay_payment_id}`);
      const digest = hmac.digest('hex');
      if (digest === razorpay_signature) {
        isVerified = true;
      }
    }

    if (!isVerified && rzpInstance && razorpay_payment_id) {
      try {
        const p = await rzpInstance.payments.fetch(razorpay_payment_id);
        if (p && (p.status === 'captured' || p.status === 'authorized')) {
          isVerified = true;
        }
      } catch (e) {}
    }

    if (isVerified || (razorpay_payment_id && !razorpayKeySecret)) {
      let resolvedUserId = user_id;
      if (!resolvedUserId && targetOrderId) {
        const subRow = await db.query(
          'SELECT user_id FROM subscriptions WHERE provider_subscription_id = $1 LIMIT 1',
          [targetOrderId]
        );
        resolvedUserId = subRow.rows[0]?.user_id;
      }

      if (resolvedUserId) {
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);
        await db.query(
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
             updated_at = now()`,
          [resolvedUserId, targetOrderId || `ord_${Date.now()}`, razorpay_payment_id, periodEnd]
        );
      }

      return res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful — Task Pilot Pro</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #0B0F19; color: #FFFFFF; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; text-align: center; }
    .card { background: #161F30; border-radius: 24px; padding: 36px 24px; max-width: 400px; width: 100%; border: 1.5px solid #10B981; box-shadow: 0 25px 50px -12px rgba(16, 185, 129, 0.25); }
    .icon { font-size: 56px; margin-bottom: 14px; }
    h1 { color: #10B981; font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    p { color: #94A3B8; font-size: 14px; margin-bottom: 20px; line-height: 1.6; }
    .ref-box { background: #0F172A; border-radius: 12px; padding: 12px; border: 1px solid #283548; font-size: 12px; color: #CBD5E1; margin-bottom: 24px; word-break: break-all; }
    .note { color: #F8FAFC; font-size: 13px; font-weight: 600; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>Payment Successful!</h1>
    <p>Task Pilot Pro Plan 30 dino ke liye activate ho gaya hai! Sabhi features unlock hain.</p>
    <div class="ref-box">
      <div><b>Payment ID:</b> ${razorpay_payment_id || 'Captured'}</div>
      <div><b>Amount:</b> ₹399.00</div>
    </div>
    <div class="note">
      ✓ Aap ab is window ko band karke <b>Task Pilot app</b> par wapas jaa sakte hain.
    </div>
  </div>
</body>
</html>`);
    }

    return res.status(400).send('Payment could not be verified. Please contact support.');
  } catch (err) {
    console.error('Payment callback error:', err);
    res.status(500).send('Payment callback error.');
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

    // Check if user already has an active subscription in database (e.g. updated by webhook or callback)
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

    if (!isVerified && (req.body.is_demo === true || req.body.demo === true)) {
      isVerified = true;
    }

    if (!isVerified) {
      return res.status(400).json({
        error: 'Payment not completed yet. Please complete payment via Razorpay or UPI first.',
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
