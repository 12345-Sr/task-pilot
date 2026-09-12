-- ============================================================
-- Task Pilot — Database Schema (PostgreSQL)
-- Run: psql -U postgres -d taskpilot -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------- USERS ----------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(180) UNIQUE NOT NULL,
  phone           VARCHAR(20),
  password_hash   TEXT NOT NULL,
  language        VARCHAR(5) NOT NULL DEFAULT 'hi',   -- hi, en, mr, bn, ta, te, gu, pa
  push_token      TEXT,                                -- FCM/Expo push token for real device alerts
  install_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- SUBSCRIPTIONS ----------
-- Freemium model: every user starts on 'free' (no trial). Free users are capped at
-- FREE_DAILY_LIMIT (3) new task reminders per calendar day and don't get streak/progress
-- tracking — that gating is enforced in backend/routes/tasks.js. 'active' means the
-- ₹399/month Premium Zone subscription is live, which removes the daily cap and unlocks
-- streak tracking.
CREATE TABLE subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status                  VARCHAR(20) NOT NULL DEFAULT 'free',
                          -- free | active | cancelled | past_due
  plan_price              NUMERIC(10,2) NOT NULL DEFAULT 399.00,
  currency                VARCHAR(5) NOT NULL DEFAULT 'INR',
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,
  payment_provider        VARCHAR(30),                 -- razorpay | stripe | google_play | app_store
  provider_customer_id    TEXT,
  provider_subscription_id TEXT,
  cancelled_at            TIMESTAMPTZ,
  lifetime_tasks_created  INT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- ---------- TASKS ----------
CREATE TABLE tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(300) NOT NULL,
  description   TEXT,
  notes         TEXT,
  task_date     DATE NOT NULL,
  task_time     TIME NOT NULL,
  priority      VARCHAR(10) NOT NULL DEFAULT 'medium',  -- important | medium
  status        VARCHAR(10),                            -- NULL = not confirmed yet | done | missed
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_user_date ON tasks(user_id, task_date);

-- ---------- NOTIFICATION LOG (for alert scheduler / debugging / admin analytics) ----------
CREATE TABLE notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type    VARCHAR(20) NOT NULL,   -- morning | two_hour | one_hour | evening_confirm
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  status        VARCHAR(20) NOT NULL DEFAULT 'sent'   -- sent | failed
);

-- ---------- PASSWORD RESETS (for forgot password OTP) ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(180) NOT NULL,
  otp         VARCHAR(10) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

-- ---------- EMAIL VERIFICATIONS (for signup OTP verification) ----------
CREATE TABLE IF NOT EXISTS email_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(180) NOT NULL,
  otp         VARCHAR(10) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

-- ---------- ADMIN USERS (for the admin panel login) ----------
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'admin',   -- admin | support
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Helpful view: daily active-task progress per user (for admin + app "Progress" tab) ----------
CREATE VIEW user_progress AS
SELECT
  u.id AS user_id,
  u.name,
  t.task_date,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE t.status = 'done') AS done_tasks,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE t.status = 'done') / NULLIF(COUNT(*), 0), 1
  ) AS completion_pct
FROM tasks t
JOIN users u ON u.id = t.user_id
GROUP BY u.id, u.name, t.task_date;

-- ---------- Seed admin login ----------
-- Default admin is auto-initialized on backend start (admin@taskpilot.com / Admin@1234).
-- To create an additional admin manually, run:
-- node backend/scripts/create-admin.js "you@example.com" "your-password"

