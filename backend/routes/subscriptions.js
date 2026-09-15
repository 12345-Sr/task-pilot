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
  return String(raw).trim().replace(/['"\\s]/g, '');
}

function getCleanKeySecret() {
  const raw = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.RZP_KEY_SECRET;
  if (!raw || !String(raw).trim()) return '';
  return String(raw).trim().replace(/['"\\s]/g, '');
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

    const host = req.get('host') || 'task-pilot-api.onrender.com';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' || host.includes('onrender.com') ? 'https' : 'http';
    const checkoutUrl = `${protocol}://${host}/api/subscription/checkout?order_id=${encodeURIComponent(order.id)}&user_id=${encodeURIComponent(req.userId)}&key_id=${encodeURIComponent(activeKeyId)}&real_order=1`;

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
      keyId: activeKeyId,
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
    const { order_id, user_id } = req.query;
    const keyId = req.query.key_id || getCleanKeyId();
    if (!keyId) {
      return res.status(500).send('Razorpay Key ID is not configured. Please set RAZORPAY_KEY_ID in .env.');
    }
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

    const isTestMode = String(keyId).startsWith('rzp_test_');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Pilot Pro — Razorpay Checkout</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #0B0F19; color: #FFFFFF; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #161F30; border-radius: 24px; padding: 28px 22px; max-width: 420px; width: 100%; text-align: center; border: 1.5px solid #283548; box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5); }
    .badge-top { display: inline-flex; align-items: center; gap: 6px; background: rgba(197, 160, 89, 0.15); color: #E5C378; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-bottom: 14px; border: 1px solid rgba(197, 160, 89, 0.3); }
    h1 { font-size: 22px; font-weight: 900; color: #FFFFFF; margin-bottom: 6px; }
    p.sub { font-size: 13px; color: #94A3B8; margin-bottom: 16px; }
    .price-box { background: rgba(15, 23, 42, 0.6); border-radius: 16px; padding: 16px; border: 1.5px solid #C5A059; margin-bottom: 18px; }
    .price { font-size: 38px; font-weight: 900; color: #FFFFFF; }
    .price span { color: #C5A059; }
    .validity { font-size: 12px; color: #94A3B8; margin-top: 4px; font-weight: 600; }
    .methods-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left; }
    .method-item { display: flex; align-items: center; gap: 10px; background: #0F172A; padding: 10px 12px; border-radius: 12px; border: 1px solid #1E293B; font-size: 12.5px; color: #E2E8F0; }
    .method-item b { color: #FFFFFF; }
    .btn-pay { background: #C5A059; color: #FFFFFF; border: none; padding: 15px; border-radius: 12px; font-size: 16px; font-weight: 800; width: 100%; cursor: pointer; transition: transform 0.1s, opacity 0.2s; box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4); margin-bottom: 12px; }
    .btn-pay:hover { opacity: 0.94; }
    .test-guide { background: rgba(16, 185, 129, 0.08); border: 1px dashed rgba(16, 185, 129, 0.4); border-radius: 14px; padding: 14px; text-align: left; font-size: 12px; color: #CBD5E1; margin-bottom: 16px; line-height: 1.6; }
    .test-guide-title { color: #10B981; font-weight: 800; font-size: 12.5px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
    .test-guide code { background: #0F172A; color: #38BDF8; padding: 2px 6px; border-radius: 6px; font-family: monospace; font-size: 11.5px; }
    .security-note { margin-top: 10px; font-size: 11px; color: #64748B; display: flex; align-items: center; justify-content: center; gap: 6px; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="badge-top">🛡️ Razorpay Official Checkout</div>
    <h1>Task Pilot Pro</h1>
    <p class="sub">Sabhi payment methods accepted hain (Cards, UPI, NetBanking)</p>

    <div class="price-box">
      <div class="price"><span>₹</span>399</div>
      <div class="validity">30 dino ke liye unlimited tasks aur smart alerts access</div>
    </div>

    ${isTestMode ? `
    <div class="test-guide">
      <div class="test-guide-title">🧪 Razorpay Test Mode — Use These Credentials:</div>
      <div>• <b>UPI:</b> Enter <code>success@razorpay</code> as UPI ID. (Real personal UPI IDs won't work in test mode.)</div>
      <div>• <b>Card:</b> <code>4111 1111 1111 1111</code>, Expiry: <code>12/28</code>, CVV: <code>123</code>, OTP: any.</div>
      <div>• <b>Netbanking:</b> Select any bank → click green <b>[Success]</b> button on the test page.</div>
    </div>
    ` : ''}

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
    var currentUserId = ${JSON.stringify(user_id || '')};
    var currentOrderId = ${JSON.stringify(order_id || '')};

    var isLaunching = false;
    function launchRazorpay() {
      if (isLaunching) return;
      isLaunching = true;
      var btn = document.getElementById('rzp-button');
      if (btn) btn.innerText = 'Opening Razorpay... ⏳';

      var options = {
        key: ${JSON.stringify(keyId)},
        amount: ${amountPaise},
        currency: 'INR',
        name: 'Task Pilot Pro',
        description: '30-Day Pro Subscription (Unlimited Tasks & Alerts)',
        retry: {
          enabled: true,
          max_count: 3
        },
        prefill: {
          name: ${JSON.stringify(userName)},
          email: ${JSON.stringify(userEmail)},
          contact: ${JSON.stringify(userPhone)}
        },
        theme: {
          color: '#C5A059'
        },
        handler: function (response) {
          isLaunching = false;
          window.location.href = '/api/subscription/payment-callback?razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id || '') +
            '&razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id || currentOrderId) +
            '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature || '') +
            '&user_id=' + encodeURIComponent(currentUserId);
        },
        modal: {
          ondismiss: function() {
            isLaunching = false;
            if (btn) btn.innerText = 'Pay ₹399 with Razorpay';
            console.log('Razorpay modal closed');
          }
        }
      };

      if (currentOrderId && currentOrderId.startsWith('order_')) {
        options.order_id = currentOrderId;
      }

      try {
        var rzp1 = new Razorpay(options);
        rzp1.on('payment.failed', function (response){
          isLaunching = false;
          if (btn) btn.innerText = 'Pay ₹399 with Razorpay';
          var reason = (response && response.error && response.error.description) ? response.error.description : 'Payment cancelled or failed. Please try again.';
          console.warn('[RAZORPAY] Payment failed:', reason);
        });
        rzp1.open();
      } catch (e) {
        isLaunching = false;
        if (btn) btn.innerText = 'Pay ₹399 with Razorpay';
        console.error('[RAZORPAY] Error opening modal:', e);
      }

      setTimeout(function() {
        isLaunching = false;
        if (btn) btn.innerText = 'Pay ₹399 with Razorpay';
      }, 4000);
    }

    document.getElementById('rzp-button').onclick = launchRazorpay;
    // Open modal safely once page finishes loading
    window.addEventListener('load', function() {
      setTimeout(launchRazorpay, 500);
    });
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
// Verifies signature or payment status with Razorpay, then activates subscription.
// SECURITY: user_id is resolved from (1) query param, (2) order stored in DB. Never guesses.
router.get('/payment-callback', async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, user_id } = req.query;
    const targetOrderId = razorpay_order_id;

    let isVerified = false;

    // 1. Verify cryptographic signature (Razorpay Standard Checkout provides this)
    if (razorpay_signature && targetOrderId && razorpay_payment_id) {
      if (verifySignature(targetOrderId, razorpay_payment_id, razorpay_signature)) {
        isVerified = true;
      }
    }

    // 2. If signature missing/failed, verify payment status directly with Razorpay API (.env credentials)
    const rzpClient = getRzpInstance();
    if (!isVerified && rzpClient && razorpay_payment_id && razorpay_payment_id.startsWith('pay_')) {
      try {
        const p = await rzpClient.payments.fetch(razorpay_payment_id);
        if (p && (p.status === 'captured' || p.status === 'authorized')) {
          if (p.status === 'authorized') {
            try { await rzpClient.payments.capture(p.id, 39900, 'INR'); } catch (e) {}
          }
          isVerified = true;
        }
      } catch (e) {}
    }

    // 3. If still not verified, check if order itself is paid
    if (!isVerified && rzpClient && targetOrderId && targetOrderId.startsWith('order_')) {
      try {
        const rzpOrder = await rzpClient.orders.fetch(targetOrderId);
        if (rzpOrder && (rzpOrder.status === 'paid' || (rzpOrder.amount_paid && rzpOrder.amount_paid >= 39900))) {
          isVerified = true;
        }
      } catch (e) {}

      if (!isVerified) {
        try {
          const payments = await rzpClient.orders.fetchPayments(targetOrderId);
          if (payments && payments.items && payments.items.length > 0) {
            const cap = payments.items.find(p => p.status === 'captured' || p.status === 'authorized');
            if (cap) {
              if (cap.status === 'authorized') {
                try { await rzpClient.payments.capture(cap.id, 39900, 'INR'); } catch (e) {}
              }
              isVerified = true;
            }
          }
        } catch (e) {}
      }
    }

    if (!isVerified) {
      return res.status(400).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Payment Not Verified</title>
<style>*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,sans-serif}body{background:#0B0F19;color:#FFF;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center}.card{background:#161F30;border-radius:24px;padding:36px 24px;max-width:400px;width:100%;border:1.5px solid #EF4444;box-shadow:0 25px 50px -12px rgba(239,68,68,0.25)}.icon{font-size:56px;margin-bottom:14px}h1{color:#EF4444;font-size:22px;font-weight:800;margin-bottom:8px}p{color:#94A3B8;font-size:14px;margin-bottom:16px;line-height:1.6}</style>
</head><body><div class="card"><div class="icon">⚠️</div><h1>Payment Not Verified</h1><p>Razorpay se payment confirm nahi ho saka. Agar aapke account se amount deduct hua hai toh woh automatically refund ho jayega.</p><p>Kripya Task Pilot app me wapas jaake dobara try karein.</p><div style="margin-top:16px"><a href="taskpilot://payment-failed" style="display:inline-block;background:#EF4444;color:#FFF;text-decoration:none;font-weight:800;font-size:14px;padding:12px 24px;border-radius:12px;">Return to App</a></div></div></body></html>`);
    }

    // SECURITY: Resolve user_id from (1) query param, (2) order stored in DB during create-order.
    // Never fall back to "latest user" — that would attribute payment to the wrong person.
    let resolvedUserId = user_id;
    if (!resolvedUserId && targetOrderId) {
      const subRow = await db.query(
        'SELECT user_id FROM subscriptions WHERE provider_subscription_id = $1 LIMIT 1',
        [targetOrderId]
      );
      resolvedUserId = subRow.rows[0]?.user_id;
    }

    if (!resolvedUserId) {
      console.error('[PAYMENT-CALLBACK] Could not resolve user_id for order:', targetOrderId, 'payment:', razorpay_payment_id);
      return res.status(400).send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>User Not Found</title>
<style>*{box-sizing:border-box;margin:0;padding:0;font-family:-apple-system,sans-serif}body{background:#0B0F19;color:#FFF;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center}.card{background:#161F30;border-radius:24px;padding:36px 24px;max-width:400px;width:100%;border:1.5px solid #F59E0B;box-shadow:0 25px 50px -12px rgba(245,158,11,0.25)}.icon{font-size:56px;margin-bottom:14px}h1{color:#F59E0B;font-size:22px;font-weight:800;margin-bottom:8px}p{color:#94A3B8;font-size:14px;margin-bottom:16px;line-height:1.6}</style>
</head><body><div class="card"><div class="icon">⚠️</div><h1>Payment Received — Account Not Linked</h1><p>Payment Razorpay se confirm ho gaya hai, lekin aapka account identify nahi ho saka. Kripya app me wapas jaake "Verify Payment" button dabayein — woh aapke logged-in account se Pro activate karega.</p><p style="font-size:12px;color:#64748B">Payment ID: ${razorpay_payment_id || 'N/A'}<br>Order: ${targetOrderId || 'N/A'}</p><div style="margin-top:16px"><a href="taskpilot://payment-success" style="display:inline-block;background:#F59E0B;color:#FFF;text-decoration:none;font-weight:800;font-size:14px;padding:12px 24px;border-radius:12px;">Return to App & Verify</a></div></div></body></html>`);
    }

    // Activate Pro for the resolved user
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
      [resolvedUserId, targetOrderId, razorpay_payment_id, periodEnd]
    );

    console.log(`[PAYMENT-CALLBACK] Pro activated for user ${resolvedUserId}, payment ${razorpay_payment_id}, order ${targetOrderId}`);

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
    <div style="margin-top: 20px;">
      <a href="taskpilot://payment-success" style="display: inline-block; background: #10B981; color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">👉 Return to Task Pilot App</a>
    </div>
  </div>
  <script>
    setTimeout(function() {
      try { window.location.href = 'taskpilot://payment-success'; } catch(e) {}
    }, 1200);
  </script>
</body>
</html>`);
  } catch (err) {
    console.error('Payment callback error:', err);
    res.status(500).send('Payment callback error.');
  }
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
          if (rzpOrder && (rzpOrder.status === 'paid' || (rzpOrder.amount_paid && rzpOrder.amount_paid >= 39900))) {
            isVerified = true;
            break;
          }
        } catch (e) {}

        try {
          const payments = await rzpClient.orders.fetchPayments(targetOrderId);
          if (payments && payments.items && payments.items.length > 0) {
            const cap = payments.items.find(p => p.status === 'captured' || p.status === 'authorized');
            if (cap) {
              if (cap.status === 'authorized') {
                try { await rzpClient.payments.capture(cap.id, 39900, 'INR'); } catch (e) {}
              }
              isVerified = true;
              break;
            }
          }
        } catch (e) {}
      }

      // 3. Verify payment by ID directly with Razorpay API (.env credentials)
      if (!isVerified && rzpClient && razorpay_payment_id && razorpay_payment_id.startsWith('pay_')) {
        try {
          const rzpPayment = await rzpClient.payments.fetch(razorpay_payment_id);
          if (rzpPayment && (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized')) {
            if (rzpPayment.status === 'authorized') {
              try { await rzpClient.payments.capture(rzpPayment.id, 39900, 'INR'); } catch (e) {}
            }
            isVerified = true;
            break;
          }
        } catch (e) {}
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
