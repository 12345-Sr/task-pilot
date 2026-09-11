require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

async function seed() {
  const email = 'rohan@example.com';
  const password = 'Password@123';
  const name = 'Rohan Sharma';
  const language = 'hi';

  const hash = await bcrypt.hash(password, 10);
  const userRes = await db.query(
    `INSERT INTO users (name, email, password_hash, language)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3
     RETURNING id, name, email, language`,
    [name, email, hash, language]
  );
  const user = userRes.rows[0];

  await db.query(
    `INSERT INTO subscriptions (user_id, status, plan_price)
     VALUES ($1, 'free', 899)
     ON CONFLICT (user_id) DO NOTHING`,
    [user.id]
  );

  console.log('Demo user ready:', user.email, 'password:', password);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
