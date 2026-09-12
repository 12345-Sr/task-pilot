const db = require('./db');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    await db.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name            VARCHAR(120) NOT NULL,
        email           VARCHAR(180) UNIQUE NOT NULL,
        phone           VARCHAR(20),
        password_hash   TEXT NOT NULL,
        language        VARCHAR(5) NOT NULL DEFAULT 'hi',
        push_token      TEXT,
        install_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status                  VARCHAR(20) NOT NULL DEFAULT 'free',
        plan_price              NUMERIC(10,2) NOT NULL DEFAULT 399.00,
        currency                VARCHAR(5) NOT NULL DEFAULT 'INR',
        current_period_start    TIMESTAMPTZ,
        current_period_end      TIMESTAMPTZ,
        payment_provider        VARCHAR(30),
        provider_customer_id    TEXT,
        provider_subscription_id TEXT,
        cancelled_at            TIMESTAMPTZ,
        created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title         VARCHAR(300) NOT NULL,
        description   TEXT,
        notes         TEXT,
        task_date     DATE NOT NULL,
        task_time     TIME NOT NULL,
        priority      VARCHAR(10) NOT NULL DEFAULT 'medium',
        status        VARCHAR(10),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

      CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, task_date);

      CREATE TABLE IF NOT EXISTS notification_log (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        alert_type    VARCHAR(20) NOT NULL,
        sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        status        VARCHAR(20) NOT NULL DEFAULT 'sent'
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(180) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'admin',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS password_resets (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(180) NOT NULL,
        otp         VARCHAR(10) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used        BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

      CREATE TABLE IF NOT EXISTS email_verifications (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(180) NOT NULL,
        otp         VARCHAR(10) NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        verified    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

      CREATE TABLE IF NOT EXISTS support_tickets (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
        user_name       VARCHAR(120),
        user_email      VARCHAR(180),
        category        VARCHAR(80) NOT NULL DEFAULT 'general',
        subject         VARCHAR(250) NOT NULL,
        message         TEXT NOT NULL,
        status          VARCHAR(30) NOT NULL DEFAULT 'open',
        admin_reply     TEXT,
        admin_replied_at TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);
    `);

    // Ensure default admin user exists and credentials are up to date
    const defaultAdminEmail = (process.env.ADMIN_EMAIL || 'admin@taskpilot.com').trim().toLowerCase();
    const defaultAdminPass = (process.env.ADMIN_PASSWORD || 'Admin@1234').trim();
    const adminHash = await bcrypt.hash(defaultAdminPass, 10);
    await db.query(
      `INSERT INTO admin_users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
      [defaultAdminEmail, adminHash]
    );
    console.log(`[DB INIT] Default admin user initialized & synced (${defaultAdminEmail})`);
    console.log('[DB INIT] Database tables and indexes verified.');
  } catch (err) {
    console.warn('[DB INIT] Database auto-init status:', err.message);
  }
}

module.exports = initDatabase;
