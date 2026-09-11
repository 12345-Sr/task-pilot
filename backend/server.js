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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Pilot API running on port ${PORT} (0.0.0.0)`);
  initDatabase().catch(() => {});
  scheduler.start();
});
