const express = require('express');
const db = require('../db');
const { requireUser } = require('../middleware/auth');
const { sendPush } = require('../scheduler');

const router = express.Router();

// Safe auto-migration for description, notes and lifetime_tasks_created columns
db.query(`
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS lifetime_tasks_created INT NOT NULL DEFAULT 0;
`).catch((err) => console.log('[DB] tasks migration check:', err.message));

const FREE_DAILY_LIMIT = 3;

// Shared helper: can this user add another task?
// Premium ('active') users are unlimited. Free-zone users are capped at
// FREE_DAILY_LIMIT (3 tasks lifetime maximum unless subscribed).
// Deleting a task does NOT restore or decrement the free creation quota.
async function getAccessStatus(userId) {
  const r = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [userId]);
  let sub = r.rows[0];
  if (!sub) return { allowed: false, reason: 'no_subscription' };

  // Check if Pro subscription has expired
  if (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) < new Date()) {
    const upd = await db.query(
      `UPDATE subscriptions SET status = 'free', plan_price = 0.00, cancelled_at = now(), updated_at = now()
       WHERE user_id = $1 RETURNING *`,
      [userId]
    );
    sub = upd.rows[0] || { ...sub, status: 'free' };

    // Fire expiration notification
    db.query('SELECT push_token, language FROM users WHERE id = $1', [userId])
      .then((uR) => {
        const token = uR.rows[0]?.push_token;
        const lang = uR.rows[0]?.language || 'en';
        if (token) {
          const title = lang === 'hi' ? '⚠️ Pro Plan Expire Ho Gaya' : '⚠️ Pro Plan Expired';
          const body = lang === 'hi'
            ? 'Aapka Pro subscription expire ho gaya hai. Naye tasks banane aur reminder alerts ke liye Pro upgrade karein.'
            : 'Your Pro subscription has expired. Upgrade to Pro to continue creating tasks and receiving reminder alerts.';
          sendPush(token, title, body, { type: 'SUBSCRIPTION_EXPIRED' }).catch(() => {});
        }
      })
      .catch(() => {});
  }

  if (sub.status === 'active') return { allowed: true, sub };

  // All non-active plans (free, expired, cancelled) redeem to free tier: strictly 3 tasks limit
  const countR = await db.query(
    'SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1',
    [userId]
  );
  const dbTotal = countR.rows[0]?.c || 0;
  const lifetimeUsed = Math.max(sub.lifetime_tasks_created || 0, dbTotal);
  const allowed = lifetimeUsed < FREE_DAILY_LIMIT;
  return {
    allowed,
    sub,
    used: Math.min(FREE_DAILY_LIMIT, lifetimeUsed),
    lifetimeUsed,
    limit: FREE_DAILY_LIMIT,
    reason: allowed ? null : 'free_limit_reached',
  };
}

// GET /api/tasks?date=YYYY-MM-DD  (omit date to get all user tasks)
router.get('/', requireUser, async (req, res) => {
  const { date } = req.query;
  let result;
  try {
    const alertCols = `
      t.*,
      COALESCE((SELECT COUNT(*)::int FROM notification_log nl WHERE nl.task_id = t.id), 0) AS alert_count,
      EXISTS(SELECT 1 FROM notification_log nl WHERE nl.task_id = t.id) AS first_alert_sent
    `;
    if (date) {
      result = await db.query(
        `SELECT ${alertCols} FROM tasks t WHERE t.user_id = $1 AND t.task_date = $2 AND (t.deleted_at IS NULL) ORDER BY t.task_time ASC`,
        [req.userId, date]
      );
    } else {
      result = await db.query(
        `SELECT ${alertCols} FROM tasks t WHERE t.user_id = $1 AND (t.deleted_at IS NULL) ORDER BY t.task_date ASC, t.task_time ASC`,
        [req.userId]
      );
    }

    let lifetimeCreated = 0;
    try {
      const subR = await db.query('SELECT status, lifetime_tasks_created FROM subscriptions WHERE user_id = $1', [req.userId]);
      const countR = await db.query('SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1', [req.userId]);
      lifetimeCreated = Math.max(subR.rows[0]?.lifetime_tasks_created || 0, countR.rows[0]?.c || 0);
    } catch (e) {}

    res.json({
      tasks: result.rows,
      lifetime_tasks_created: lifetimeCreated,
    });
  } catch (e) {
    if (date) {
      result = await db.query(
        'SELECT * FROM tasks WHERE user_id = $1 AND task_date = $2 ORDER BY task_time ASC',
        [req.userId, date]
      );
    } else {
      result = await db.query(
        'SELECT * FROM tasks WHERE user_id = $1 ORDER BY task_date ASC, task_time ASC',
        [req.userId]
      );
    }
    res.json({ tasks: result.rows, lifetime_tasks_created: result.rows.length });
  }
});

function normalizeDate(d) {
  const getLocalDateStr = (offsetDays = 0) => {
    const now = new Date();
    if (offsetDays) now.setDate(now.getDate() + offsetDays);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (!d) return getLocalDateStr(0);
  if (d === 'kal' || d === 'tomorrow') {
    return getLocalDateStr(1);
  }
  if (d === 'aaj' || d === 'today' || !/^\d{4}-\d{2}-\d{2}/.test(d)) {
    return getLocalDateStr(0);
  }
  return String(d).slice(0, 10);
}

function getNextDateStr(baseDateStr, offsetDays) {
  if (!baseDateStr) return normalizeDate();
  const cleanStr = String(baseDateStr).slice(0, 10);
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m - 1, d + offsetDays);
    const ny = dateObj.getFullYear();
    const nm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nd = String(dateObj.getDate()).padStart(2, '0');
    return `${ny}-${nm}-${nd}`;
  }
  const dateObj = new Date(baseDateStr);
  dateObj.setDate(dateObj.getDate() + offsetDays);
  return dateObj.toISOString().slice(0, 10);
}

// POST /api/tasks  { title, task_date, task_time, priority, description, notes }
router.post('/', requireUser, async (req, res, next) => {
  try {
    let { title, task_date, task_time, priority, description, notes } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    task_date = normalizeDate(task_date);
    task_time = task_time || '10:00:00';
    const taskDesc = description !== undefined ? description : (notes !== undefined ? notes : null);

    const pStr = String(priority || '').toUpperCase();
    const isImportant = priority === 'important' || pStr === 'URGENT' || pStr === 'ZAROORI' || pStr === 'HIGH' || pStr === 'IMPORTANT';

    const access = await getAccessStatus(req.userId);
    if (!access.allowed) {
      // Notify free user immediately via push that their free tier is over
      db.query('SELECT push_token, language FROM users WHERE id = $1', [req.userId])
        .then((uR) => {
          const token = uR.rows[0]?.push_token;
          const lang = uR.rows[0]?.language || 'en';
          if (token) {
            const notifTitle = lang === 'hi' ? '⚠️ Free Tier Limit Pura Ho Gaya' : '⚠️ Free Tier Limit Reached';
            const notifBody = lang === 'hi'
              ? 'Aapka free tier limit (3/3 kaam) pura ho chuka hai. Naye task banane aur reminder alerts ke liye Pro me upgrade karein.'
              : 'Your free tier is over (3/3 tasks used). Upgrade to Pro to create new tasks and receive reminder alerts.';
            sendPush(token, notifTitle, notifBody, { type: 'QUOTA_EXCEEDED' }).catch(() => {});
          }
        })
        .catch(() => {});

      return res.status(402).json({
        error: 'Free tier limit reached (3 tasks lifetime maximum)',
        message: 'Your free tier is over. Upgrade to Pro to create new tasks and receive reminder alerts.',
        reason: access.reason,
        used: access.used,
        limit: access.limit,
      });
    }

    let result;
    try {
      result = await db.query(
        `INSERT INTO tasks (user_id, title, task_date, task_time, priority, description, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.userId, title, task_date, task_time, isImportant ? 'important' : 'medium', taskDesc, taskDesc]
      );
    } catch (dbErr) {
      // Graceful fallback if columns not yet added
      result = await db.query(
        `INSERT INTO tasks (user_id, title, task_date, task_time, priority)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [req.userId, title, task_date, task_time, isImportant ? 'important' : 'medium']
      );
      if (result.rows[0]) {
        result.rows[0].description = taskDesc;
        result.rows[0].notes = taskDesc;
      }
    }

    // Safely increment lifetime_tasks_created count for this user
    db.query(
      `INSERT INTO subscriptions (user_id, status, lifetime_tasks_created)
       VALUES ($1, 'free', 1)
       ON CONFLICT (user_id)
       DO UPDATE SET
         lifetime_tasks_created = GREATEST(COALESCE(subscriptions.lifetime_tasks_created, 0) + 1, (SELECT COUNT(*)::int FROM tasks WHERE user_id = $1)),
         updated_at = now()`,
      [req.userId]
    ).catch(() => {});

    let recurringCount = 0;
    if (req.body.repeat_monthly) {
      const subR = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
      const sub = subR.rows[0];
      if (sub && sub.status === 'active') {
        const baseDateStr = normalizeDate(task_date);
        for (let i = 1; i <= 29; i++) {
          const dateStr = getNextDateStr(baseDateStr, i);
          try {
            await db.query(
              `INSERT INTO tasks (user_id, title, task_date, task_time, priority, description, notes)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [req.userId, title, dateStr, task_time, isImportant ? 'important' : 'medium', taskDesc, taskDesc]
            );
          } catch (e) {
            await db.query(
              `INSERT INTO tasks (user_id, title, task_date, task_time, priority)
               VALUES ($1,$2,$3,$4,$5)`,
              [req.userId, title, dateStr, task_time, isImportant ? 'important' : 'medium']
            );
          }
          recurringCount++;
        }
      }
    }

    // Send push notification confirming task creation
    db.query('SELECT push_token FROM users WHERE id = $1', [req.userId])
      .then((uR) => {
        const token = uR.rows[0]?.push_token;
        if (token) {
          sendPush(
            token,
            `✅ Kaam Joda Gaya: ${title}`,
            `"${title}" aapke schedule mein safalta-poorvak add ho gaya hai.`,
            { type: 'TASK_ADDED', taskId: result.rows[0].id }
          ).catch(() => {});
        }
      })
      .catch(() => {});

    res.status(201).json({ task: result.rows[0], recurringCount });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: err.message || 'Failed to create task' });
  }
});

// POST /api/tasks/:id/repeat-monthly
// Duplicates the task daily for the next 30 days. Subscription-only feature.
router.post('/:id/repeat-monthly', requireUser, async (req, res) => {
  try {
    const subR = await db.query('SELECT * FROM subscriptions WHERE user_id = $1', [req.userId]);
    const sub = subR.rows[0];
    if (!sub || sub.status !== 'active') {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Daily recurring tasks for the entire month is a Pro feature.',
        code: 'PRO_REQUIRED',
      });
    }

    const taskR = await db.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND (deleted_at IS NULL)', [req.params.id, req.userId]);
    if (!taskR.rows.length) return res.status(404).json({ error: 'Task not found' });
    const sourceTask = taskR.rows[0];

    const baseDateStr = normalizeDate(sourceTask.task_date);
    const createdTasks = [];

    for (let i = 1; i <= 30; i++) {
      const dateStr = getNextDateStr(baseDateStr, i);
      let r;
      try {
        r = await db.query(
          `INSERT INTO tasks (user_id, title, task_date, task_time, priority, description, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
          [req.userId, sourceTask.title, dateStr, sourceTask.task_time, sourceTask.priority, sourceTask.description || null, sourceTask.notes || null]
        );
      } catch (e) {
        r = await db.query(
          `INSERT INTO tasks (user_id, title, task_date, task_time, priority)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [req.userId, sourceTask.title, dateStr, sourceTask.task_time, sourceTask.priority]
        );
      }
      createdTasks.push(r.rows[0]);
    }

    res.status(201).json({
      success: true,
      count: createdTasks.length,
      tasks: createdTasks,
      message: 'Task successfully scheduled daily for the next 30 days.',
    });
  } catch (err) {
    console.error('Error repeating task monthly:', err);
    res.status(500).json({ error: err.message || 'Failed to repeat task' });
  }
});

// GET /api/tasks/history — full task creation history for user with stats
router.get('/history', requireUser, async (req, res) => {
  try {
    const { status, search, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT t.*,
             COALESCE((SELECT COUNT(*)::int FROM notification_log nl WHERE nl.task_id = t.id), 0) AS alert_count,
             EXISTS(SELECT 1 FROM notification_log nl WHERE nl.task_id = t.id) AS first_alert_sent
      FROM tasks t
      WHERE t.user_id = $1
    `;
    const params = [req.userId];
    let pIdx = 2;

    if (status && status !== 'all') {
      if (status === 'done' || status === 'completed') {
        query += ` AND t.status = 'done'`;
      } else if (status === 'missed') {
        query += ` AND t.status = 'missed'`;
      } else if (status === 'pending' || status === 'active') {
        query += ` AND (t.status IS NULL OR t.status = 'pending')`;
      }
    }

    if (search && search.trim()) {
      query += ` AND (t.title ILIKE $${pIdx} OR COALESCE(t.description, '') ILIKE $${pIdx} OR COALESCE(t.notes, '') ILIKE $${pIdx})`;
      params.push(`%${search.trim()}%`);
      pIdx++;
    }

    query += ` ORDER BY t.created_at DESC NULLS LAST, t.task_date DESC, t.task_time DESC`;
    query += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
    params.push(Number(limit) || 100, Number(offset) || 0);

    const result = await db.query(query, params);

    // Compute overall history stats for user
    const statsR = await db.query(`
      SELECT
        COUNT(*)::int AS total_created,
        COUNT(*) FILTER (WHERE status = 'done')::int AS total_completed,
        COUNT(*) FILTER (WHERE status = 'missed')::int AS total_missed,
        COUNT(*) FILTER (WHERE (status IS NULL OR status = 'pending') AND (deleted_at IS NULL))::int AS active_tasks,
        COUNT(*) FILTER (WHERE priority = 'important')::int AS important_tasks
      FROM tasks
      WHERE user_id = $1
    `, [req.userId]);

    const stats = statsR.rows[0] || {};
    const totalCreated = stats.total_created || 0;
    const totalCompleted = stats.total_completed || 0;
    const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

    res.json({
      tasks: result.rows,
      stats: {
        totalCreated,
        totalCompleted,
        totalMissed: stats.total_missed || 0,
        activeTasks: stats.active_tasks || 0,
        importantTasks: stats.important_tasks || 0,
        completionRate,
      },
    });
  } catch (err) {
    console.error('Error fetching task history:', err);
    res.status(500).json({ error: 'Failed to fetch task history', details: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', requireUser, async (req, res) => {
  const result = await db.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND (deleted_at IS NULL)', [req.params.id, req.userId]);
  if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
  res.json({ task: result.rows[0] });
});

// PATCH & PUT /api/tasks/:id — update task status or details
const handleTaskUpdate = async (req, res) => {
  const { status, title, task_date, task_time, priority, description, notes } = req.body;
  if (status !== undefined && ![null, 'done', 'missed'].includes(status)) {
    return res.status(400).json({ error: "status must be 'done', 'missed', or null" });
  }

  const updates = [];
  const values = [];
  let idx = 1;

  if (status !== undefined) {
    updates.push(`status = $${idx++}`);
    values.push(status);
  }
  if (title !== undefined) {
    updates.push(`title = $${idx++}`);
    values.push(title);
  }
  if (description !== undefined || notes !== undefined) {
    const dVal = description !== undefined ? description : notes;
    updates.push(`description = $${idx++}`);
    values.push(dVal);
    updates.push(`notes = $${idx++}`);
    values.push(dVal);
  }
  if (task_date !== undefined) {
    updates.push(`task_date = $${idx++}`);
    values.push(task_date);
  }
  if (task_time !== undefined) {
    updates.push(`task_time = $${idx++}`);
    values.push(task_time);
  }
  if (priority !== undefined) {
    const pStr = String(priority || '').toUpperCase();
    const isImportant = priority === 'important' || pStr === 'URGENT' || pStr === 'ZAROORI' || pStr === 'HIGH' || pStr === 'IMPORTANT';
    updates.push(`priority = $${idx++}`);
    values.push(isImportant ? 'important' : 'medium');
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields provided for update' });
  }

  updates.push(`updated_at = now()`);
  values.push(req.params.id, req.userId);

  const result = await db.query(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx++} AND user_id = $${idx++} RETURNING *`,
    values
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Task not found' });
  res.json({ task: result.rows[0] });
};

router.patch('/:id', requireUser, handleTaskUpdate);
router.put('/:id', requireUser, handleTaskUpdate);

// DELETE /api/tasks/:id — marks task as deleted while freeing up quota (disallowed if alert arrived)
router.delete('/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid task ID format' });
  }

  try {
    // Prevent deletion if an alert has already fired for this task
    const alertCheck = await db.query(
      'SELECT id FROM notification_log WHERE task_id = $1 LIMIT 1',
      [id]
    );
    if (alertCheck.rows.length > 0) {
      return res.status(403).json({
        error: 'Pehla alert bheja ja chuka hai. Alert aane ke baad kaam ko delete nahi kiya ja sakta.',
        message: 'Cannot delete task after the first alert has arrived.',
        code: 'ALERT_ALREADY_SENT',
      });
    }

    const result = await db.query(
      'UPDATE tasks SET deleted_at = now() WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.userId]
    );
    // Deleting a task does NOT reset or reduce the lifetime created count
    db.query(
      `UPDATE subscriptions SET lifetime_tasks_created = GREATEST(COALESCE(lifetime_tasks_created, 0), 1), updated_at = now() WHERE user_id = $1`,
      [req.userId]
    ).catch(() => {});
    if (!result.rows.length) {
      const hardResult = await db.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.userId]
      );
      if (!hardResult.rows.length) return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    try {
      const hardResult = await db.query(
        'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.userId]
      );
      if (!hardResult.rows.length) return res.status(404).json({ error: 'Task not found' });
      res.json({ ok: true });
    } catch (finalErr) {
      console.error('Failed to delete task:', finalErr.message);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  }
});

function toEpochDay(dateStr) {
  if (!dateStr) return NaN;
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length !== 3) return NaN;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return NaN;
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// GET /api/tasks/stats/progress — completion stats + streak for the Progress screen.
// Streak counts true consecutive unbroken days ("don't break the chain").
router.get('/stats/progress', requireUser, async (req, res) => {
  const subR = await db.query('SELECT status FROM subscriptions WHERE user_id = $1', [req.userId]);
  const isPremium = subR.rows[0]?.status === 'active';

  const totalR = await db.query('SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1 AND (deleted_at IS NULL)', [req.userId]);
  const doneR = await db.query(
    "SELECT COUNT(*)::int AS c FROM tasks WHERE user_id = $1 AND status = 'done' AND (deleted_at IS NULL)",
    [req.userId]
  );

  // Distinct dates where user completed at least one task
  const completedDatesR = await db.query(
    `SELECT DISTINCT task_date::text AS d FROM tasks
     WHERE user_id = $1 AND status = 'done' AND (deleted_at IS NULL)
     ORDER BY d DESC`,
    [req.userId]
  );

  const now = new Date();
  const todayStr = (req.query.today && /^\d{4}-\d{2}-\d{2}$/.test(req.query.today))
    ? req.query.today
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayEpoch = toEpochDay(todayStr);

  const rawEpochDays = completedDatesR.rows
    .map(r => toEpochDay(r.d))
    .filter(d => !isNaN(d));
  const uniqueEpochDays = Array.from(new Set(rawEpochDays)).sort((a, b) => b - a);
  const validDays = uniqueEpochDays.filter(day => day <= todayEpoch);

  let currentStreak = 0;
  // A streak is active if user completed a task today OR yesterday ("don't break the chain")
  if (validDays.length > 0 && (validDays[0] === todayEpoch || validDays[0] === todayEpoch - 1)) {
    let expected = validDays[0];
    for (const day of validDays) {
      if (day === expected) {
        currentStreak++;
        expected--;
      } else {
        break;
      }
    }
  }

  // Best streak ever (longest consecutive sequence in history)
  let bestStreak = 0;
  if (validDays.length > 0) {
    const ascendingDays = [...validDays].sort((a, b) => a - b);
    let tempStreak = 0;
    let prevDay = null;
    for (const day of ascendingDays) {
      if (prevDay === null || day === prevDay + 1) {
        tempStreak = (prevDay === null) ? 1 : tempStreak + 1;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      prevDay = day;
    }
  }
  bestStreak = Math.max(bestStreak, currentStreak);

  // Dynamic last 7 days metrics
  const weekDays = [];
  const dayLabels = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    weekDays.push({ date: dateStr, day: dayLabels[d.getDay()] });
  }

  let weeklyDays = [];
  try {
    const weekQueryR = await db.query(
      `SELECT task_date::text AS d,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'done')::int AS completed
       FROM tasks
       WHERE user_id = $1 AND task_date >= $2 AND task_date <= $3 AND (deleted_at IS NULL)
       GROUP BY task_date`,
      [req.userId, weekDays[0].date, weekDays[weekDays.length - 1].date]
    );
    const weekDataMap = new Map(weekQueryR.rows.map(r => [r.d, r]));
    weeklyDays = weekDays.map(w => {
      const row = weekDataMap.get(w.date);
      return {
        day: w.day,
        date: w.date,
        total: row?.total ?? 0,
        completed: row?.completed ?? 0,
        active: true,
      };
    });
  } catch (err) {
    weeklyDays = weekDays.map(w => ({ day: w.day, completed: 0, total: 0, active: true }));
  }

  res.json({
    total: totalR.rows[0]?.c ?? 0,
    done: doneR.rows[0]?.c ?? 0,
    streakDays: currentStreak,
    bestStreak,
    weeklyDays,
    streakLocked: false,
  });
});

// GET /api/tasks/quota/check — how many free-zone reminders are used lifetime
router.get('/quota/check', requireUser, async (req, res) => {
  const access = await getAccessStatus(req.userId);
  if (access.sub?.status === 'active') {
    return res.json({ unlimited: true });
  }
  res.json({ unlimited: false, used: access.used ?? 0, limit: FREE_DAILY_LIMIT });
});

module.exports = { router, getAccessStatus, FREE_DAILY_LIMIT };
