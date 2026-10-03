# Juice Shop — Login Form Clone

A minimal login page similar to [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/). It has an HTML/JavaScript front end with client-side validation, an Express back end with server-side validation, and secure password handling using bcrypt.

The server ships with two modes so you can see the same feature built the insecure way and the secure way:

- Secure mode (default): parameterized SQL queries, bcrypt password verification, server-side validation, and generic error messages. SQL Injection and XSS attempts fail here.
- Insecure mode (`--vulnerable`, for demo only): string-concatenated SQL and reflected input, so you can reproduce a SQL Injection login bypass and a reflected XSS for the Part 3 write-up — and then watch the secure build block them.

## What it does

- Email + password login form (`public/index.html`)
- Client-side validation (`public/app.js`): blocks empty submissions and checks that the email contains `@` and the password is at least 8 characters.
- Server-side validation (`server.js`): re-runs the same checks on the server, because browser validation can be bypassed.
- Secure password handling: passwords are stored only as **bcrypt** hashes (cost factor 12) and verified with `bcrypt.compare` — never compared in plaintext.
- Parameterized queries: user input can never alter the SQL structure.

## Requirements

- Node.js 22.13 or newer (24+ recommended).

## How to run

```bash
# 1. Install dependencies
npm install

# 2. Create and seed the SQLite database (creates users.db)
npm run seed

# 3. Start the server (SECURE mode)
npm start
# -> http://localhost:3000
```

### Demo accounts

| Email                | Password     | Role     |
| -------------------- | ------------ | -------- |
| `admin@juice-sh.op`  | `Admin!2345` | admin    |
| `user@juice-sh.op`   | `Password1`  | customer |

## Part 3: reproducing the vulnerabilities (demo)

> These steps intentionally run the insecure build and then secure build.

**1. SQL Injection (authentication bypass)**

Start the server in vulnerable mode:

```bash
npm run vuln   # node server.js --vulnerable
```

In the form, log in with:

- Email: `admin@juice-sh.op'--`
- Password: anything 8+ chars (e.g. `whatever1`)

The `'--` closes the string and comments out the password check, so you are logged in as admin without the real password. (Bypassing the browser entirely, e.g. `curl`, the classic payload `' OR 1=1--` in the email field has the same effect.)

**2. Reflected XSS**

Keep the server in vulnerable mode and set `RENDER_AS_HTML = true` in `public/app.js`, then reload. Log in with:

- Email: `x@<img src=x onerror=alert(1)>`
- Password: anything 8+ chars

The server echoes the raw email into its response, and the page renders it with `innerHTML`, so the `onerror` handler runs and pops an `alert`.

**3. Confirm the fixes**

Restart with `npm start` (secure mode) and set `RENDER_AS_HTML = false`. Repeat both payloads — the login bypass fails (parameterized query treats the input as a literal string) and the XSS does not fire (generic message + `textContent`).

## Fixes applied in the secure build

- **SQL Injection** → parameterized queries (`db.prepare('… WHERE email = ?').get(email)`), so input stays data.
- **XSS** → render untrusted text with `textContent`, never `innerHTML`; the server returns a constant message and never reflects input.
- **Password handling** → bcrypt hashing (cost 12); Argon2 or PBKDF2 with a high iteration count are equally valid; never plaintext.
- **Error handling & logging** → generic failure message, and failed attempts are logged without the password.
- **Validation** → enforced on both client (UX) and server (the real security boundary).
- **Transport** → serve over HTTPS (TLS 1.2/1.3) with HSTS in production.
