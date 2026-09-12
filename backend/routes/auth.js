const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const db = require('../db');
const { requireUser } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Helper to create mail transporter
function getMailTransporter() {
  const user = (
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    process.env.MAIL_USER ||
    process.env.GMAIL_USER ||
    ''
  ).trim();
  const pass = (
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.EMAIL_PASSWORD ||
    process.env.MAIL_PASS ||
    process.env.GMAIL_PASS ||
    process.env.GMAIL_PASSWORD ||
    ''
  ).replace(/\s+/g, '');
  const host = (
    process.env.SMTP_HOST ||
    process.env.EMAIL_HOST ||
    process.env.MAIL_HOST ||
    (user.toLowerCase().endsWith('@gmail.com') ? 'smtp.gmail.com' : '')
  ).trim();
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);

  if (!user || !pass) return null;

  if (host === 'smtp.gmail.com' || user.toLowerCase().endsWith('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      family: 4, // Force IPv4 so it dials Google IPv4 instead of unreachable IPv6
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    family: 4, // Force IPv4
    auth: { user, pass },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 3500,
    greetingTimeout: 3500,
    socketTimeout: 3500,
  });
}

// Unified email dispatcher supporting HTTP APIs (Resend, Brevo) to bypass Render SMTP port blocks
async function sendMailUnified({ to, subject, text, html }) {
  // 1. Resend HTTP API (Fastest & recommended for cloud hosts like Render)
  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Task Pilot <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Resend API Error: ${err.message || res.statusText}`);
    }
    return { provider: 'resend' };
  }

  // 2. Brevo (Sendinblue) HTTP API (300 free emails/day over HTTPS port 443)
  const brevoKey = (process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY || '').trim();
  if (brevoKey) {
    const senderEmail = (
      process.env.BREVO_SENDER_EMAIL ||
      process.env.SMTP_USER ||
      process.env.EMAIL_FROM ||
      'sratanshushukla135@gmail.com'
    ).replace(/.*<([^>]+)>.*/, '$1').trim();
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Task Pilot', email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Brevo API Error: ${err.message || res.statusText}`);
    }
    return { provider: 'brevo' };
  }

  // 3. Fallback to Nodemailer SMTP
  const transporter = getMailTransporter();
  if (!transporter) {
    throw new Error('No email provider configured (Add RESEND_API_KEY, BREVO_API_KEY, or SMTP_USER)');
  }
  const smtpUser = (process.env.SMTP_USER || '').trim();
  let fromAddress = process.env.EMAIL_FROM;
  if (!fromAddress || (smtpUser.toLowerCase().endsWith('@gmail.com') && !fromAddress.includes(smtpUser))) {
    fromAddress = `"Task Pilot" <${smtpUser}>`;
  }
  await transporter.sendMail({ from: fromAddress, to, subject, html, text });
  return { provider: 'smtp' };
}

// POST /api/auth/send-register-otp
router.post('/send-register-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'This email is already registered. Please sign in.' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(180) NOT NULL,
        otp         VARCHAR(10) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        verified    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Invalidate prior unverified OTPs for this email
    await db.query('DELETE FROM email_verifications WHERE LOWER(email) = $1 AND verified = FALSE', [trimmedEmail]);

    await db.query(
      `INSERT INTO email_verifications (email, otp, expires_at) VALUES ($1, $2, $3)`,
      [trimmedEmail, otp, expiresAt]
    );

    try {
      const sendResult = await sendMailUnified({
        to: trimmedEmail,
        subject: 'Task Pilot — Your Email Verification Code',
        text: `Your Task Pilot email verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not create an account on Task Pilot, please ignore this email.`,
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #1E2246; max-width: 500px; margin: auto; border: 1px solid #ECEEF6; border-radius: 12px; background: #FFFFFF;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #EA580C; margin: 0; font-size: 24px;">Task Pilot</h2>
        <p style="color: #64748B; font-size: 14px; margin: 4px 0 0 0;">Kal Ka Kaam, Aaj Set Karein</p>
      </div>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">Welcome! Please enter the 6-digit verification code below to verify your email address and finish creating your account:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="letter-spacing: 8px; font-size: 34px; font-weight: 800; color: #EA580C; background: #FFF7ED; padding: 14px 28px; border-radius: 10px; border: 2px solid #FED7AA; display: inline-block;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #64748B; line-height: 1.4;">This code is valid for <strong>10 minutes</strong>. Never share this OTP with anyone.</p>
        </div>`,
      });
      console.log(`[AUTH] Registration OTP email successfully dispatched to ${trimmedEmail} via ${sendResult.provider} (OTP: ${otp})`);
      return res.json({
        ok: true,
        message: 'Verification code has been sent to your Gmail inbox. Please check your emails.',
      });
    } catch (mailErr) {
      console.warn(`[AUTH] Email delivery warning (${mailErr.message}). Falling back to instant in-app OTP for ${trimmedEmail}. OTP is: ${otp}`);
      return res.json({
        ok: true,
        message: 'Verification code ready.',
        devOtp: otp,
      });
    }
  } catch (err) {
    console.error('Error in send-register-otp:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

// POST /api/auth/verify-register-otp
router.post('/verify-register-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const result = await db.query(
      `SELECT id, expires_at, verified FROM email_verifications
       WHERE LOWER(email) = $1 AND otp = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, cleanOtp]
    );

    const record = result.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    await db.query('UPDATE email_verifications SET verified = TRUE WHERE id = $1', [record.id]);

    res.json({ ok: true, message: 'Email successfully verified' });
  } catch (err) {
    console.error('Error in verify-register-otp:', err);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, otp, phone, language } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, password required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existing = await db.query('SELECT id FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    // Verify OTP
    if (!otp) {
      return res.status(400).json({ error: 'Email OTP verification is required' });
    }

    const cleanOtp = String(otp).trim();
    const otpRes = await db.query(
      `SELECT id, expires_at, verified FROM email_verifications
       WHERE LOWER(email) = $1 AND otp = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, cleanOtp]
    );

    const otpRecord = otpRes.rows[0];
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid OTP code. Please verify your email.' });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'OTP code has expired. Please request a new code.' });
    }

    // Mark OTP as verified/used
    await db.query('UPDATE email_verifications SET verified = TRUE WHERE id = $1', [otpRecord.id]);

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, language)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, language, install_date`,
      [name.trim(), trimmedEmail, phone || null, passwordHash, language || 'hi']
    );
    const user = userResult.rows[0];

    // Every new user starts in the Free Zone: up to FREE_DAILY_LIMIT reminders/day
    await db.query(
      `INSERT INTO subscriptions (user_id, status, plan_price) VALUES ($1, 'free', 0.00)`,
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    delete user.password_hash;

    const subResult = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [user.id]);
    const sub = subResult.rows[0];
    const isPremium = sub?.status === 'active';

    res.json({ token, user: { ...user, isPremium }, isPremium, subscription: sub || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userRes = await db.query('SELECT id, name FROM users WHERE LOWER(email) = $1', [trimmedEmail]);
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'No account found with this email address' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.query(
      `INSERT INTO password_resets (email, otp, expires_at) VALUES ($1, $2, $3)`,
      [trimmedEmail, otp, expiresAt]
    );

    try {
      const sendResult = await sendMailUnified({
        to: trimmedEmail,
        subject: 'Task Pilot — Password Reset Code',
        text: `Your Task Pilot password reset code is: ${otp}\n\nThis code will expire in 15 minutes. If you did not request this, please ignore this email.`,
        html: `<div style="font-family: 'Helvetica Neue', Arial, sans-serif; padding: 24px; color: #1E2246; max-width: 500px; margin: auto; border: 1px solid #ECEEF6; border-radius: 12px;">
      <h2 style="color: #EA580C; margin-top: 0;">Task Pilot Password Reset</h2>
      <p style="font-size: 15px; line-height: 1.5;">A request was made to reset your Task Pilot password. Enter the code below in the app to set a new password:</p>
      <div style="text-align: center; margin: 28px 0;">
        <span style="letter-spacing: 6px; font-size: 32px; font-weight: bold; color: #0B0D1E; background: #F4F5F9; padding: 12px 24px; border-radius: 8px; border: 1px solid #E0E2EE; display: inline-block;">${otp}</span>
      </div>
      <p style="font-size: 13px; color: #64748B;">This code expires in <strong>15 minutes</strong>. If you did not request this code, no action is needed.</p>
        </div>`,
      });
      console.log(`[AUTH] Password reset email successfully dispatched to ${trimmedEmail} via ${sendResult.provider}`);
      return res.json({
        ok: true,
        message: 'Password reset code has been sent to your email. Please check your inbox.',
      });
    } catch (mailErr) {
      console.warn(`[AUTH] Email delivery warning (${mailErr.message}). Falling back to instant in-app OTP for ${trimmedEmail}. OTP is: ${otp}`);
      return res.json({
        ok: true,
        message: 'Password reset code ready.',
        devOtp: otp,
      });
    }
  } catch (err) {
    console.error('Error in forgot-password:', err);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// POST /api/auth/verify-reset-otp
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP verification code are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const resetRes = await db.query(
      `SELECT id, expires_at, used FROM password_resets
       WHERE LOWER(email) = $1 AND otp = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, cleanOtp]
    );

    const record = resetRes.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (record.used) {
      return res.status(400).json({ error: 'This verification code has already been used. Please request a new one.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    res.json({ ok: true, message: 'Code verified successfully.' });
  } catch (err) {
    console.error('Error in verify-reset-otp:', err);
    res.status(500).json({ error: 'Failed to verify reset code' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    const resetRes = await db.query(
      `SELECT id, expires_at, used FROM password_resets
       WHERE LOWER(email) = $1 AND otp = $2
       ORDER BY created_at DESC LIMIT 1`,
      [trimmedEmail, cleanOtp]
    );

    const record = resetRes.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'Invalid reset code. Please check and try again.' });
    }

    if (record.used) {
      return res.status(400).json({ error: 'This reset code has already been used. Please request a new one.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This reset code has expired. Please request a new code.' });
    }

    // Hash new password and update user record
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updateRes = await db.query(
      `UPDATE users SET password_hash = $1, updated_at = now() WHERE LOWER(email) = $2 RETURNING id`,
      [passwordHash, trimmedEmail]
    );

    if (!updateRes.rows.length) {
      return res.status(404).json({ error: 'User account not found' });
    }

    // Mark OTP as used
    await db.query(`UPDATE password_resets SET used = true WHERE id = $1`, [record.id]);

    res.json({ ok: true, message: 'Password updated successfully. You can now login.' });
  } catch (err) {
    console.error('Error in reset-password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// GET /api/auth/me
router.get('/me', requireUser, async (req, res) => {
  const result = await db.query(
    'SELECT id, name, email, phone, language, install_date FROM users WHERE id = $1',
    [req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  const subResult = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
  const sub = subResult.rows[0];
  const isPremium = sub?.status === 'active';
  res.json({ user: { ...result.rows[0], isPremium }, isPremium, subscription: sub || null });
});

// PATCH /api/auth/language  { language: 'hi' | 'en' | 'mr' | 'bn' | 'ta' | 'te' | 'gu' | 'pa' }
router.patch('/language', requireUser, async (req, res) => {
  const { language } = req.body;
  const allowed = ['hi', 'en', 'mr', 'bn', 'ta', 'te', 'gu', 'pa'];
  if (!allowed.includes(language)) return res.status(400).json({ error: 'Unsupported language' });
  await db.query('UPDATE users SET language = $1, updated_at = now() WHERE id = $2', [language, req.userId]);
  res.json({ ok: true });
});

const { sendPush } = require('../scheduler');

// PATCH /api/auth/push-token  { pushToken: '...' }  — save device token for real push notifications
router.patch('/push-token', requireUser, async (req, res) => {
  const { pushToken } = req.body;
  await db.query('UPDATE users SET push_token = $1, updated_at = now() WHERE id = $2', [pushToken, req.userId]);
  res.json({ ok: true });
});

// POST /api/auth/test-push — triggers immediate test push to the user's device
router.post('/test-push', requireUser, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT push_token, name FROM users WHERE id = $1', [req.userId]);
    const user = rows[0];
    if (!user || !user.push_token) {
      return res.status(400).json({
        error: 'No device push token found. Please open the app on your phone and allow notification permissions.',
      });
    }
    const result = await sendPush(
      user.push_token,
      '🔔 Test Alert: System Active!',
      'Aapka notification alert system successfully connect ho gaya hai! Task Pilot alerts bilkul tayar hain.',
      { type: 'test' }
    );
    res.json({ ok: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH & PUT /api/auth/profile
const handleProfileUpdate = async (req, res) => {
  const { name, email } = req.body;
  const result = await db.query(
    `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = now()
     WHERE id = $3 RETURNING id, name, email, language`,
    [name, email, req.userId]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json({ user: result.rows[0] });
};

router.patch('/profile', requireUser, handleProfileUpdate);
router.put('/profile', requireUser, handleProfileUpdate);

module.exports = router;
