const jwt = require('jsonwebtoken');

async function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;

    // Check active status in database
    try {
      const db = require('../db');
      const u = await db.query('SELECT is_active FROM users WHERE id = $1', [req.userId]);
      if (u.rows.length && u.rows[0].is_active === false) {
        return res.status(403).json({
          error: 'Your account has been deactivated by administrator. Please contact support.',
          isDeactivated: true
        });
      }
    } catch (dbErr) {
      // Allow execution if DB is offline/initializing
    }

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Admin login required' });
  try {
    const payload = jwt.verify(token, process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'secret');
    req.adminId = payload.adminId;
    req.adminRole = payload.role;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired admin session' });
  }
}

module.exports = { requireUser, requireAdmin };
