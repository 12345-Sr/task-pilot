const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const { router: taskRoutes } = require('./routes/tasks');
const subscriptionRoutes = require('./routes/subscriptions');
const adminRoutes = require('./routes/admin');
const ticketRoutes = require('./routes/tickets');
const scheduler = require('./scheduler');

const app = express();

// Trust reverse proxy (e.g. Render, Cloudflare, Heroku) for accurate client IP in rate limiting
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});
app.use('/api/', limiter);

app.get('/', (req, res) => res.redirect('/admin'));
app.get('/health', (req, res) => res.json({ ok: true, status: 'Task Pilot API is running', time: new Date().toISOString() }));
app.get('/api', (req, res) => res.json({
  ok: true,
  status: 'Task Pilot API is running',
  endpoints: {
    health: '/api/health',
    auth: '/api/auth',
    tasks: '/api/tasks',
    tickets: '/api/tickets',
    subscriptions: '/api/subscriptions',
    admin: '/admin'
  },
  time: new Date().toISOString()
}));
app.get('/api/health', (req, res) => res.json({ ok: true, status: 'Task Pilot API is running', time: new Date().toISOString() }));

const dns = require('dns').promises;
const db = require('./db');

app.get('/api/db-status', async (req, res) => {
  const result = {
    time: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      DB_REGION: process.env.DB_REGION,
      RENDER: process.env.RENDER,
      RENDER_REGION: process.env.RENDER_REGION,
    },
    dnsChecks: {},
    poolStatus: null,
    testQuery: null,
  };

  const rawUrl = process.env.DATABASE_URL || '';
  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      result.databaseConfig = {
        protocol: u.protocol,
        user: u.username,
        host: u.hostname,
        port: u.port || '5432',
        database: u.pathname.replace(/^\//, ''),
        hasPassword: Boolean(u.password),
        passwordLength: u.password ? u.password.length : 0,
      };

      const bareHost = u.hostname.replace(/\..*$/, '');
      const hostsToTest = [
        u.hostname,
        bareHost,
        `${bareHost}.singapore-postgres.render.com`,
        `${bareHost}.oregon-postgres.render.com`,
        `${bareHost}.frankfurt-postgres.render.com`
      ];
      const uniqueHosts = [...new Set(hostsToTest)];
      for (const h of uniqueHosts) {
        try {
          const lookup = await dns.lookup(h);
          result.dnsChecks[h] = { ok: true, address: lookup.address };
        } catch (e) {
          result.dnsChecks[h] = { ok: false, error: e.code || e.message };
        }
      }
    } catch (e) {
      result.databaseConfig = { error: e.message };
    }
  }

  const { Client } = require('pg');
  const regions = ['singapore', 'oregon', 'frankfurt', 'ohio', 'virginia'];
  const probeResults = {};

  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      const bareHost = u.hostname.replace(/\..*$/, '');
      for (const reg of regions) {
        const testHost = `${bareHost}.${reg}-postgres.render.com`;
        const testClient = new Client({
          user: u.username,
          password: u.password,
          host: testHost,
          port: u.port || 5432,
          database: u.pathname.replace(/^\//, ''),
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 4000,
        });
        try {
          await testClient.connect();
          const r = await testClient.query('SELECT 1 AS ok');
          await testClient.end();
          probeResults[reg] = { ok: true, host: testHost, result: r.rows };
        } catch (err) {
          probeResults[reg] = { ok: false, host: testHost, error: err.message };
        }
      }
    } catch (e) {
      probeResults.error = e.message;
    }
  }
  result.probeResults = probeResults;

  try {
    const r = await db.query('SELECT 1 AS connected, current_database() AS db, current_user AS user');
    result.testQuery = { ok: true, rows: r.rows };
    result.poolStatus = 'CONNECTED';
    return res.json(result);
  } catch (err) {
    result.testQuery = {
      ok: false,
      message: err.message,
      code: err.code,
      syscall: err.syscall,
      routine: err.routine
    };
    result.poolStatus = 'DISCONNECTED';
    return res.status(500).json(result);
  }
});

const adminDir = require('fs').existsSync(path.join(__dirname, '../admin'))
  ? path.join(__dirname, '../admin')
  : path.join(__dirname, '../admin-panel');
app.use('/admin', express.static(adminDir));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

const initDatabase = require('./init-db');

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Task Pilot API running on port ${PORT} (0.0.0.0)`);
  try {
    await initDatabase();
  } catch (err) {
    console.error('[DB INIT] Error initializing database:', err);
  }
  scheduler.start();
});
