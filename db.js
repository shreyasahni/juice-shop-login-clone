// db.js — creates and seeds a small SQLite users table using Node's built-in node:sqlite module
// Passwords are NEVER stored in plaintext; we store a bcrypt hash.
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const db = new DatabaseSync('users.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer'
  );
`);

// Seed demo accounts only if the table is empty.
const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
if (n === 0) {
  const insert = db.prepare(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)'
  );
  // bcrypt with a cost factor of 12
  const seed = [
    ['admin@juice-sh.op', bcrypt.hashSync('Admin!2345', 12), 'admin'],
    ['user@juice-sh.op',  bcrypt.hashSync('Password1', 12),  'customer'],
  ];
  for (const [email, hash, role] of seed) insert.run(email, hash, role);
  console.log('Seeded users table with demo accounts.');
} else {
  console.log(`Users table already has ${n} account(s); skipping seed.`);
}

export default db;
