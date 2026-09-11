const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool, types } = require('pg');

// PostgreSQL OID 1082 is DATE. Parse as literal string (YYYY-MM-DD)
// to prevent JS Date UTC conversion from shifting dates backwards across timezones (e.g. IST)
types.setTypeParser(1082, (val) => val);

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.USER || 'sratanshushukla'}@127.0.0.1:5432/kalkakaam`;

// Cloud databases (Render / Neon / Supabase) require SSL with rejectUnauthorized: false
const isCloudDb = Boolean(
  process.env.DATABASE_URL &&
  (connectionString.includes('render.com') ||
   connectionString.includes('sslmode=') ||
   process.env.NODE_ENV === 'production' ||
   !connectionString.includes('127.0.0.1'))
);

const pool = new Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
});

console.log(`[DATABASE] Connecting to ${isCloudDb ? 'Cloud PostgreSQL (SSL enabled)' : 'Local PostgreSQL'}`);

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
