const form = document.getElementById('loginForm');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');
const clientError = document.getElementById('clientError');
const result = document.getElementById('result');

// Flip to true ONLY to reproduce the Part 3 reflected-XSS demo. This renders the
// server's message as HTML (unsafe). Keep it false for the secure build.
const RENDER_AS_HTML = false;

// Client-side validation: non-empty fields, email contains "@",
// password is at least 8 characters.
function validateCredentials(email, password) {
  if (!email.trim() || !password.trim()) return 'Please fill in both fields.';
  if (!email.includes('@')) return 'Email must contain "@".';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return null;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clientError.textContent = '';
  result.textContent = '';
  result.className = 'result';

  const email = emailEl.value;
  const password = passwordEl.value;

  const error = validateCredentials(email, password);
  if (error) {
    clientError.textContent = error; // textContent never executes HTML
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    result.className = 'result ' + (data.ok ? 'success' : 'fail');
    if (RENDER_AS_HTML) {
      result.innerHTML = data.message; // vulnerability only for demo
    } else {
      result.textContent = data.message;
    }
  } catch (err) {
    result.className = 'result fail';
    result.textContent = 'Network error. Is the server running?';
  }
});
