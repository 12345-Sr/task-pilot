// Usage: node scripts/create-admin.js "you@example.com" "your-strong-password"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/create-admin.js "you@example.com" "your-strong-password"');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query(
    `INSERT INTO admin_users (email, password_hash, role) VALUES ($1,$2,'admin')
     ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
    [email, hash]
  );
  console.log(`Admin login ready: ${email}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
