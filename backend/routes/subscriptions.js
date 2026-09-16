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
  if (!rzpClient || !orderId || !userId) return false;
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
        const lang = uR.rows[0]?.language || 'hi';
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
    // ⚠️ TEMP LIVE-MODE TEST PRICE — set to ₹1 to verify the real Razorpay checkout
    // completes end-to-end in production. Change back to 399 before real launch.
    const planPriceInr = 1;
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
    const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent('Task Pilot')}&tr=${encodeURIComponent(order.id)}&am=1.00&cu=INR&tn=${encodeURIComponent('Task Pilot Pro Plan')}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(upiUrl)}&margin=10`;

    // Save pending intent in subscriptions table
    await db.query(
      `INSERT INTO subscriptions (
         user_id, status, plan_price, currency, payment_provider,
         provider_subscription_id, updated_at
       )
       VALUES ($1, 'free', 1.00, 'INR', 'razorpay', $2, now())
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
    // SECURITY: never trust a key_id from the query string on this public,
    // unauthenticated route — always use the server's own configured key,
    // otherwise anyone could point the checkout page at an arbitrary key.
    const keyId = getCleanKeyId();
    if (!keyId) {
      return res.status(500).send('Razorpay Key ID is not configured. Please set RAZORPAY_KEY_ID in .env.');
    }
    const amountPaise = 100;

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
      } catch (e) { }
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
    body { background: #EDF2F4; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #FFFFFF; border-radius: 24px; padding: 28px 24px; max-width: 420px; width: 100%; text-align: center; border: 1.5px solid #FDE68A; box-shadow: 0 20px 45px -12px rgba(197, 160, 89, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.05); }
    .badge-top { display: inline-flex; align-items: center; gap: 6px; background: #FFF9F0; color: #92400E; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; margin-bottom: 12px; border: 1px solid #FDE68A; }
    h1 { font-size: 24px; font-weight: 900; color: #0F172A; margin-bottom: 4px; letter-spacing: -0.5px; }
    h1 span { color: #C5A059; }
    p.sub { font-size: 13px; color: #64748B; margin-bottom: 18px; line-height: 1.5; }
    .price-box { background: linear-gradient(135deg, #FFF9F0 0%, #FEF3C7 100%); border-radius: 16px; padding: 16px; border: 1.5px solid #FDE68A; margin-bottom: 18px; }
    .price-row { display: flex; align-items: baseline; justify-content: center; gap: 2px; }
    .currency { font-size: 26px; font-weight: 900; color: #C5A059; }
    .price { font-size: 42px; font-weight: 900; color: #0F172A; letter-spacing: -1px; }
    .period { font-size: 14px; font-weight: 600; color: #64748B; margin-left: 4px; }
    .validity { font-size: 12px; color: #78350F; margin-top: 6px; font-weight: 600; }
    .methods-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; text-align: left; }
    .method-item { display: flex; align-items: center; gap: 10px; background: #F8FAFC; padding: 11px 13px; border-radius: 12px; border: 1px solid #E2E8F0; font-size: 12.5px; color: #334155; }
    .method-item b { color: #0F172A; font-weight: 700; }
    .btn-pay { background: #C5A059; color: #FFFFFF; border: none; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 800; width: 100%; cursor: pointer; transition: transform 0.1s, background-color 0.2s; box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4); margin-bottom: 12px; }
    .btn-pay:hover { background: #B38E46; }
    .btn-pay:active { transform: scale(0.98); }
    .test-guide { background: #FFFBEB; border: 1px dashed #F59E0B; border-radius: 14px; padding: 12px 14px; text-align: left; font-size: 12px; color: #78350F; margin-bottom: 16px; line-height: 1.5; }
    .test-guide-title { color: #B45309; font-weight: 800; font-size: 12.5px; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    .security-note { margin-top: 10px; font-size: 11.5px; color: #64748B; display: flex; align-items: center; justify-content: center; gap: 6px; font-weight: 500; }
  </style>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body>
  <div class="card">
    <div class="badge-top">🛡️ Razorpay Official Checkout</div>
    <h1>Task Pilot <span>PRO</span></h1>
    <p class="sub">Sabhi payment options enabled hain (UPI, Cards, NetBanking)</p>

    <div class="price-box">
      <div class="price-row">
        <span class="currency">₹</span>
        <span class="price">1</span>
        <span class="period">/ month</span>
      </div>
      <div class="validity">30 dino ke liye unlimited tasks aur proactive alerts access</div>
    </div>

    ${isTestMode ? `
    <div class="test-guide">
      <div class="test-guide-title">🧪 Razorpay Test Mode</div>
      <div>Test Mode active hai. UPI ID me <code>success@razorpay</code> use karein.</div>
    </div>
    ` : ''}

    <div class="methods-list">
      <div class="method-item">📱 <span><b>UPI Apps</b> (Google Pay, PhonePe, Paytm, Any UPI)</span></div>
      <div class="method-item">💳 <span><b>Cards</b> (Visa, Mastercard, RuPay Debit/Credit)</span></div>
      <div class="method-item">🏦 <span><b>Net Banking</b> (SBI, HDFC, ICICI, Axis & 50+ Banks)</span></div>
      <div class="method-item">👛 <span><b>Wallets</b> (Paytm, Mobikwik)</span></div>
    </div>

    <button id="rzp-button" class="btn-pay">Pay ₹1 with Razorpay</button>

    <div id="error-banner" style="display:none; background: #FEF2F2; border: 1px solid #FCA5A5; color: #DC2626; border-radius: 12px; padding: 12px; font-size: 12.5px; text-align: left; margin-bottom: 12px; line-height: 1.5;"></div>

    <div class="security-note">
      🔒 256-Bit SSL Secured by Razorpay India
    </div>
  </div>

  <script>
    var currentUserId = ${JSON.stringify(user_id || '')};
    var currentOrderId = ${JSON.stringify(order_id || '')};

    function showError(msg) {
      var banner = document.getElementById('error-banner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = '⚠️ ' + msg;
      }
    }
    function clearError() {
      var banner = document.getElementById('error-banner');
      if (banner) banner.style.display = 'none';
    }

    var isLaunching = false;
    function launchRazorpay() {
      if (isLaunching) return;
      isLaunching = true;
      clearError();
      var btn = document.getElementById('rzp-button');
      if (btn) btn.innerText = 'Opening Razorpay... ⏳';

      if (typeof Razorpay === 'undefined') {
        isLaunching = false;
        if (btn) btn.innerText = 'Pay ₹1 with Razorpay';
        showError('Payment gateway script failed to load. Please check your internet connection and reopen this page.');
        return;
      }

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
            if (btn) btn.innerText = 'Pay ₹1 with Razorpay';
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
          if (btn) btn.innerText = 'Pay ₹1 with Razorpay';
          var reason = (response && response.error && response.error.description) ? response.error.description : 'Payment cancelled or failed. Please try again.';
          showError(reason);
          console.warn('[RAZORPAY] Payment failed:', reason);
        });
        rzp1.open();
      } catch (e) {
        isLaunching = false;
        if (btn) btn.innerText = 'Pay ₹1 with Razorpay';
        showError('Could not open the payment window (' + (e && e.message ? e.message : 'unknown error') + '). Please try again.');
        console.error('[RAZORPAY] Error opening modal:', e);
      }

      setTimeout(function() {
        isLaunching = false;
        if (btn && btn.innerText.indexOf('Opening') !== -1) {
          btn.innerText = 'Pay ₹1 with Razorpay';
        }
      }, 4000);
    }

    document.getElementById('rzp-button').onclick = launchRazorpay;
    // NOTE: we intentionally do NOT auto-open the modal on page load anymore.
    // Opening it (and any subsequent redirect into a UPI app like GPay/PhonePe)
    // needs to happen inside a real, direct user tap. Mobile Chrome/Android can
    // silently block app-switch redirects that trace back to a programmatic
    // page-load trigger instead of a genuine click — which looks exactly like
    // "it never redirects to GPay" with no visible error.
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
            try { await rzpClient.payments.capture(p.id, 100, 'INR'); } catch (e) { }
          }
          isVerified = true;
        }
      } catch (e) { }
    }

    // 3. If still not verified, check if order itself is paid
    if (!isVerified && rzpClient && targetOrderId && targetOrderId.startsWith('order_')) {
      try {
        const rzpOrder = await rzpClient.orders.fetch(targetOrderId);
        if (rzpOrder && (rzpOrder.status === 'paid' || (rzpOrder.amount_paid && rzpOrder.amount_paid >= 100))) {
          isVerified = true;
        }
      } catch (e) { }

      if (!isVerified) {
        try {
          const payments = await rzpClient.orders.fetchPayments(targetOrderId);
          if (payments && payments.items && payments.items.length > 0) {
            const cap = payments.items.find(p => p.status === 'captured' || p.status === 'authorized');
            if (cap) {
              if (cap.status === 'authorized') {
                try { await rzpClient.payments.capture(cap.id, 100, 'INR'); } catch (e) { }
              }
              isVerified = true;
            }
          }
        } catch (e) { }
      }
    }

    if (!isVerified) {
      return res.status(400).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Not Verified — Task Pilot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #EDF2F4; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; text-align: center; }
    .card { background: #FFFFFF; border-radius: 24px; padding: 36px 24px; max-width: 420px; width: 100%; border: 1.5px solid #FCA5A5; box-shadow: 0 20px 45px -12px rgba(239, 68, 68, 0.15), 0 8px 16px -4px rgba(15, 23, 42, 0.05); }
    .icon { font-size: 52px; margin-bottom: 12px; }
    h1 { color: #DC2626; font-size: 22px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.3px; }
    p { color: #64748B; font-size: 13.5px; margin-bottom: 16px; line-height: 1.6; }
    .btn { display: inline-block; background: #DC2626; color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(220, 38, 38, 0.35); transition: opacity 0.2s; }
    .btn:active { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Payment Not Verified</h1>
    <p>Razorpay se payment confirm nahi ho saka. Agar aapke account se amount deduct hua hai toh woh automatically refund ho jayega.</p>
    <p>Kripya Task Pilot app me wapas jaake dobara try karein.</p>
    <div style="margin-top: 20px;">
      <a href="taskpilot://payment-failed" class="btn">👉 Return to Task Pilot App</a>
    </div>
  </div>
</body>
</html>`);
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Not Linked — Task Pilot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body { background: #EDF2F4; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; text-align: center; }
    .card { background: #FFFFFF; border-radius: 24px; padding: 36px 24px; max-width: 420px; width: 100%; border: 1.5px solid #FDE68A; box-shadow: 0 20px 45px -12px rgba(197, 160, 89, 0.2), 0 8px 16px -4px rgba(15, 23, 42, 0.05); }
    .icon { font-size: 52px; margin-bottom: 12px; }
    h1 { color: #B45309; font-size: 22px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.3px; }
    p { color: #64748B; font-size: 13.5px; margin-bottom: 16px; line-height: 1.6; }
    .ref-box { background: #F8FAFC; border-radius: 12px; padding: 12px; border: 1px solid #E2E8F0; font-size: 12px; color: #475569; margin-bottom: 20px; word-break: break-all; text-align: left; }
    .btn { display: inline-block; background: #C5A059; color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Payment Received — Account Not Linked</h1>
    <p>Payment Razorpay se confirm ho gaya hai, lekin aapka account identify nahi ho saka. Kripya app me wapas jaake "Verify Payment" button dabayein — woh aapke logged-in account se Pro activate karega.</p>
    <div class="ref-box">
      <div><b>Payment ID:</b> ${razorpay_payment_id || 'N/A'}</div>
      <div><b>Order ID:</b> ${targetOrderId || 'N/A'}</div>
    </div>
    <div style="margin-top: 10px;">
      <a href="taskpilot://payment-success" class="btn">👉 Return to App & Verify</a>
    </div>
  </div>
</body>
</html>`);
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
       VALUES ($1, 'active', 1.00, 'INR', 'razorpay', $2, $3, now(), $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'active',
         plan_price = 1.00,
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
    body { background: #EDF2F4; color: #0F172A; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; text-align: center; }
    .card { background: #FFFFFF; border-radius: 24px; padding: 36px 24px; max-width: 420px; width: 100%; border: 1.5px solid #FDE68A; box-shadow: 0 20px 45px -12px rgba(197, 160, 89, 0.25), 0 8px 16px -4px rgba(15, 23, 42, 0.05); }
    .icon { font-size: 56px; margin-bottom: 12px; }
    h1 { color: #0F172A; font-size: 24px; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.5px; }
    h1 span { color: #C5A059; }
    p { color: #64748B; font-size: 13.5px; margin-bottom: 20px; line-height: 1.6; }
    .ref-box { background: linear-gradient(135deg, #FFF9F0 0%, #FEF3C7 100%); border-radius: 14px; padding: 14px; border: 1.5px solid #FDE68A; font-size: 12.5px; color: #78350F; margin-bottom: 20px; text-align: left; }
    .ref-box div { margin-bottom: 4px; }
    .ref-box div:last-child { margin-bottom: 0; }
    .note { color: #475569; font-size: 13px; font-weight: 600; line-height: 1.5; margin-bottom: 20px; }
    .btn { display: inline-block; background: #C5A059; color: #FFFFFF; text-decoration: none; font-weight: 800; font-size: 15px; padding: 15px 30px; border-radius: 14px; box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4); transition: background-color 0.2s; }
    .btn:hover { background: #B38E46; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🎉</div>
    <h1>Task Pilot <span>PRO</span> Active!</h1>
    <p>Aapka payment safalta-poorvak verify ho gaya hai. Task Pilot Pro Plan agle 30 dino ke liye activate ho chuka hai!</p>
    <div class="ref-box">
      <div><b>Payment ID:</b> ${razorpay_payment_id || 'Captured'}</div>
      <div><b>Amount:</b> ₹1.00</div>
      <div><b>Validity:</b> 30 Days Unlimited Access</div>
    </div>
    <div class="note">
      ✓ Aap ab is window ko band karke app me wapas jaa sakte hain.
    </div>
    <div>
      <a href="taskpilot://payment-success" class="btn">👉 Return to Task Pilot App</a>
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
          if (rzpOrder && (rzpOrder.status === 'paid' || (rzpOrder.amount_paid && rzpOrder.amount_paid >= 100))) {
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
                try { await rzpClient.payments.capture(cap.id, 100, 'INR'); } catch (e) { }
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
          if (rzpPayment && (rzpPayment.status === 'captured' || rzpPayment.status === 'authorized')) {
            if (rzpPayment.status === 'authorized') {
              try { await rzpClient.payments.capture(rzpPayment.id, 100, 'INR'); } catch (e) { }
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
       VALUES ($1, 'active', 1.00, 'INR', 'razorpay', $2, $3, now(), $4, now())
       ON CONFLICT (user_id) DO UPDATE SET
         status = 'active',
         plan_price = 1.00,
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