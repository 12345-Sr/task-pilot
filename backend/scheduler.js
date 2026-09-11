const cron = require('node-cron');
const db = require('./db');
const fs = require('fs');
const path = require('path');

let admin = null;
try {
  admin = require('firebase-admin');
} catch (_) {}

let firebaseAdmin = null;
try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  let serviceAccount = null;

  if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = require(serviceAccountPath);
    } catch (_) {}
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
    } catch (_) {}
  }

  // Only initialize if valid server credentials with private_key exist
  if (admin && serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
    if (!admin.apps || !admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firebaseAdmin = admin;
    console.log('[FIREBASE] Admin SDK initialized successfully with service account.');
  } else {
    const googleServicesPath = path.join(__dirname, 'google-services.json');
    if (fs.existsSync(googleServicesPath)) {
      console.log('[FIREBASE] google-services.json detected (Project: task-pilot-76dea). Push notifications active via Expo Push / FCM Relay.');
    } else {
      console.log('[FIREBASE] Direct service account not provided; using Expo Push / FCM Relay (standard for Expo mobile app).');
    }
  }
} catch (e) {
  console.log('[FIREBASE] Direct SDK not active; using Expo Push Relay.');
}

/**
 * Sends push notification via Firebase Cloud Messaging (FCM) or Expo Push Relay.
 * Delivers directly to Android and iOS.
 */
async function sendPush(pushToken, title, body, extraData = {}) {
  if (!pushToken) {
    console.log('[PUSH SKIP] No push_token found for user.');
    return null;
  }
  console.log(`[PUSH DISPATCH] -> ${pushToken}: "${title}" - "${body}"`);

  // Direct Firebase FCM if Admin SDK is loaded and token is native FCM
  if (firebaseAdmin && !pushToken.startsWith('ExponentPushToken') && !pushToken.startsWith('ExpoPushToken')) {
    try {
      const message = {
        token: pushToken,
        notification: {
          title,
          body,
        },
        data: Object.fromEntries(
          Object.entries(extraData || {}).map(([k, v]) => [k, String(v)])
        ),
        android: {
          priority: 'high',
          notification: {
            channelId: 'task-alerts',
            sound: 'default',
            priority: 'max',
          },
        },
      };
      const response = await firebaseAdmin.messaging().send(message);
      console.log(`[FIREBASE FCM DIRECT SUCCESS]`, response);
      return { success: true, messageId: response };
    } catch (fcmErr) {
      console.error(`[FIREBASE FCM ERROR]`, fcmErr.message);
      // Fall through to Expo relay if applicable
    }
  }

  // Expo Push API / FCM Relay Dispatch
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: extraData,
        priority: 'high',
        channelId: 'task-alerts',
        _displayInForeground: true,
      }),
    });
    const result = await res.json();
    console.log(`[PUSH RESPONSE]`, JSON.stringify(result));
    return result;
  } catch (err) {
    console.error(`[PUSH ERROR]`, err.message || err);
    return null;
  }
}

async function logAlert(taskId, userId, alertType) {
  try {
    await db.query(
      'INSERT INTO notification_log (task_id, user_id, alert_type) VALUES ($1,$2,$3)',
      [taskId, userId, alertType]
    );
  } catch (e) {
    console.error('Error logging alert:', e.message);
  }
}

function parseTaskDateTime(taskDate, taskTime) {
  try {
    let datePart = typeof taskDate === 'string' ? taskDate.slice(0, 10) : taskDate.toISOString().slice(0, 10);
    const [y, m, d] = datePart.split('-').map(Number);
    let hours = 9;
    let minutes = 0;
    if (taskTime) {
      const isPM = /pm/i.test(taskTime);
      const isAM = /am/i.test(taskTime);
      const clean = taskTime.replace(/am|pm/gi, '').trim();
      const parts = clean.split(':').map(Number);
      hours = parts[0] || 0;
      minutes = parts[1] || 0;
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
    }
    return new Date(y, m - 1, d, hours, minutes, 0, 0);
  } catch {
    return null;
  }
}

// Runs every minute. Finds tasks due today and sends alerts.
async function checkAlerts() {
  try {
    const { rows: dueTasks } = await db.query(`
      SELECT t.id, t.title, t.task_date, t.task_time, u.id AS user_id, u.push_token, u.language
      FROM tasks t
      JOIN users u ON u.id = t.user_id
      WHERE t.task_date = CURRENT_DATE
        AND t.status IS NULL
        AND (t.deleted_at IS NULL)
    `);

    const now = new Date();

    for (const task of dueTasks) {
      const due = parseTaskDateTime(task.task_date, task.task_time);
      if (!due) continue;

      const diffMin = (due.getTime() - now.getTime()) / 60000;

      // 1. Exact deadline window (due right now: between -2 and +2 minutes)
      if (diffMin <= 2 && diffMin >= -2) {
        const already = await db.query(
          "SELECT id FROM notification_log WHERE task_id = $1 AND alert_type = 'exact_time'",
          [task.id]
        );
        if (!already.rows.length) {
          await sendPush(
            task.push_token,
            `⏰ Kaam Ka Waqt: ${task.title}`,
            `Aapka kaam "${task.title}" (${task.task_time}) poora karne ka waqt ho gaya hai!`,
            { taskId: task.id, type: 'exact_time' }
          );
          await logAlert(task.id, task.user_id, 'exact_time');
        }
      }

      // 2. 10-minute advance reminder
      if (diffMin <= 11 && diffMin >= 9) {
        const already = await db.query(
          "SELECT id FROM notification_log WHERE task_id = $1 AND alert_type = 'ten_min'",
          [task.id]
        );
        if (!already.rows.length) {
          await sendPush(
            task.push_token,
            `⏳ 10 Min Baaki: ${task.title}`,
            `Dhyan dein! "${task.title}" ke liye sirf 10 minute baaki hain (${task.task_time}).`,
            { taskId: task.id, type: 'ten_min' }
          );
          await logAlert(task.id, task.user_id, 'ten_min');
        }
      }

      // 3. 1-hour advance reminder
      if (diffMin <= 61 && diffMin >= 59) {
        const already = await db.query(
          "SELECT id FROM notification_log WHERE task_id = $1 AND alert_type = 'one_hour'",
          [task.id]
        );
        if (!already.rows.length) {
          await sendPush(
            task.push_token,
            `⏰ 1 Ghanta Baaki: ${task.title}`,
            `"${task.title}" ke liye 1 ghanta baaki hai.`,
            { taskId: task.id, type: 'one_hour' }
          );
          await logAlert(task.id, task.user_id, 'one_hour');
        }
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      // PostgreSQL is not started locally; log clean status instead of crash dump
      console.log('[SCHEDULER] Database connection waiting (PostgreSQL not running yet).');
    } else {
      console.error('Error checking alerts:', err);
    }
  }
}

// Runs once a day at 07:00 server time — sends morning briefing
async function sendMorningBriefings() {
  try {
    const { rows: users } = await db.query(
      `SELECT id, push_token, language, name FROM users WHERE push_token IS NOT NULL`
    );
    for (const user of users) {
      const { rows: todaysTasks } = await db.query(
        `SELECT title, task_time, priority FROM tasks
         WHERE user_id = $1 AND task_date = CURRENT_DATE AND status IS NULL AND (deleted_at IS NULL)
         ORDER BY task_time ASC`,
        [user.id]
      );
      if (!todaysTasks.length) continue;
      const summary = `Aaj aapke ${todaysTasks.length} zaroori kaam hain — Pehla: ${todaysTasks[0].title}`;
      await sendPush(user.push_token, '🌅 Subah Ki Briefing', summary, { type: 'briefing' });
    }
  } catch (err) {
    console.error('Error sending morning briefings:', err);
  }
}

function start() {
  // Every minute: check alerts
  cron.schedule('* * * * *', () => {
    checkAlerts().catch((e) => console.error('checkAlerts failed', e));
  });

  // Every day at 07:00: morning briefing
  cron.schedule('0 7 * * *', () => {
    sendMorningBriefings().catch((e) => console.error('sendMorningBriefings failed', e));
  });

  console.log('Scheduler running: alerts checked every minute, morning briefing at 07:00 daily.');
}

module.exports = { start, sendPush, checkAlerts };
