// server.js — serves the static form and handles POST /api/login.
//
// Two modes:
//   node server.js              -> SECURE  (default)
//   node server.js --vulnerable -> VULNERABLE (for the Part 3 exploit demo only)
//
// The secure path uses parameterized queries + bcrypt + server-side validation
// and returns a generic error (no input reflected). The vulnerable path builds
// SQL by string concatenation and echoes the raw email back — on purpose — so
// you can reproduce SQL Injection and reflected XSS and then see the fix.
import express from 'express';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const VULNERABLE = process.argv.includes('--vulnerable');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Server-side validation — the real security boundary. The browser can be
// bypassed (curl, DevTools, Burp), so we re-check everything here.
function validate(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string')
    return 'Invalid input.';
  if (!email.trim() || !password) return 'Email and password are required.';
  if (!email.includes('@')) return 'Email must contain "@".';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

app.post('/api/login', (req, res) => {
  const { email, password } = req.body ?? {};

  if (VULNERABLE) {
    // ---------------------------------------------------------------
    // VULNERABLE PATH (demo only)
    // ---------------------------------------------------------------
    const sql =
      `SELECT * FROM users WHERE email = '${email}' ` +
      `AND password_hash = '${password}'`;
    let user;
    try {
      user = db.prepare(sql).get();
    } catch (e) {
      return res.status(400).json({ ok: false, message: 'SQL error: ' + e.message });
    }
    if (user) {
      return res.json({ ok: true, message: `Welcome back, ${email}! Role: ${user.role}` });
    }
    return res.status(401).json({ ok: false, message: `Login failed for ${email}` });
  }

  // ---------------------------------------------------------------
  // SECURE PATH (default).
  // ---------------------------------------------------------------
  // Input validation
  const error = validate(email, password);
  if (error) return res.status(400).json({ ok: false, message: error });

  // Parameterized query: user input can never change the query structure.
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Verify against a bcrypt hash; never compare plaintext.
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    // Log failed attempts (never the password) so they can be monitored
    console.warn(`[auth] FAILED login for "${String(email).slice(0, 64)}" @ ${new Date().toISOString()}`);
    // Constant, generic message don't reveal which field was wrong, and never
    // reflect user input back into the response.
    return res.status(401).json({ ok: false, message: 'Invalid email or password.' });
  }

  console.info(`[auth] OK login: ${user.email} (${user.role}) @ ${new Date().toISOString()}`);
  return res.json({ ok: true, message: `Welcome back! You are signed in as ${user.role}.` });
});

app.listen(PORT, () => {
  console.log(
    `Server running at http://localhost:${PORT}  (mode: ${VULNERABLE ? 'VULNERABLE ⚠️' : 'secure ✅'})`
  );
});
