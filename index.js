const express = require('express');
const session = require('express-session');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Database
const dbUrl = process.env.FIREBASE_DATABASE_URL || "https://xdemic-chat-test-default-rtdb.firebaseio.com";

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: dbUrl
  });
} else {
  admin.initializeApp({
    databaseURL: dbUrl
  });
}

const db = admin.database();

// Track password attempt lockouts (IP + Paste ID)
const attemptTracker = new Map();

// 🖼️ LOGO URL: Replace the URL inside the quotes with your direct logo image link anytime!
const LOGO_URL = "https://via.placeholder.com/150x50.png?text=Xdemic+Logo";

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'xdemic_secure_key_2026',
  resave: false,
  saveUninitialized: true
}));

// Modern Cyber Dark Theme Layout
const layout = (title, body, user = null) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title} | Xdemic Pastebin</title>
    <style>
      :root {
        --bg-color: #0b0c10;
        --card-bg: #14161d;
        --accent-color: #00e5ff;
        --accent-hover: #00b3cc;
        --border-color: #232733;
        --text-color: #e1e6f0;
        --text-muted: #8a94a6;
        --danger-color: #ff4757;
      }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: var(--bg-color); color: var(--text-color); padding: 20px; min-height: 100vh; }
      .container { max-width: 800px; margin: 0 auto; background: var(--card-bg); padding: 28px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
      .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 18px; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
      .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; color: #fff; }
      .logo-img { height: 42px; max-width: 160px; object-fit: contain; border-radius: 6px; }
      .brand-title { font-size: 22px; font-weight: 800; background: linear-gradient(135deg, #00e5ff, #7000ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .user-nav { display: flex; gap: 10px; align-items: center; font-size: 14px; }
      .user-badge { background: #1f2430; padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border-color); color: var(--accent-color); font-weight: 600; }
      h1, h2, h3 { color: #fff; margin-bottom: 12px; }
      .form-group { margin-bottom: 16px; }
      label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
      textarea, input[type="text"], input[type="password"], input[type="email"] { width: 100%; background: #0a0b0e; color: var(--accent-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px 14px; font-family: monospace; font-size: 14px; transition: border-color 0.2s; }
      textarea:focus, input:focus { border-color: var(--accent-color); outline: none; }
      textarea { min-height: 140px; resize: vertical; }
      .btn { display: inline-block; background: var(--accent-color); color: #000; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; cursor: pointer; text-align: center; transition: background 0.2s; width: 100%; }
      .btn:hover { background: var(--accent-hover); }
      .btn-secondary { background: #232733; color: #fff; margin-top: 8px; }
      .btn-secondary:hover { background: #2e3445; }
      .paste-card { background: #0e1015; padding: 16px; border-radius: 12px; margin-bottom: 14px; border: 1px solid var(--border-color); }
      .paste-meta { font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 10px; }
      pre { background: #050608; padding: 14px; border-radius: 8px; overflow-x: auto; color: #00ff88; font-family: monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; margin: 12px 0; border: 1px solid #1a1d26; }
      .code-box { background: #050608; color: #ffbe00; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; word-break: break-all; border: 1px dashed #333; margin: 10px 0; }
      a { color: var(--accent-color); text-decoration: none; }
      a:hover { text-decoration: underline; }
      .alert { background: rgba(255, 71, 87, 0.15); border: 1px solid var(--danger-color); color: var(--danger-color); padding: 12px; border-radius: 10px; font-weight: 600; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <a href="/" class="brand">
          ${LOGO_URL ? `<img src="${LOGO_URL}" alt="Logo" class="logo-img">` : ''}
          <span class="brand-title">Xdemic Pastebin</span>
        </a>
        <div class="user-nav">
          ${user ? `
            <span class="user-badge">👤 ${user.email}</span>
            <a href="/logout" class="btn btn-secondary" style="width: auto; padding: 6px 12px; font-size: 12px;">Logout</a>
          ` : `
            <a href="/login" class="btn" style="width: auto; padding: 6px 14px; font-size: 13px;">Email Login</a>
          `}
        </div>
      </div>
      ${body}
    </div>
  </body>
  </html>
`;

// Middleware to supply user session data
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// EMAIL LOGIN / ACCOUNT ROUTE
app.get('/login', (req, res) => {
  const body = `
    <h2>🔑 Email Account Login / Register</h2>
    <form action="/login" method="POST">
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" name="email" placeholder="yourname@gmail.com" required>
      </div>
      <div class="form-group">
        <label>Account Password</label>
        <input type="password" name="password" placeholder="Enter password" required>
      </div>
      <button type="submit" class="btn">Login / Create Account</button>
    </form>
  `;
  res.send(layout('Login', body, res.locals.user));
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.redirect('/login');

  const userKey = Buffer.from(email.toLowerCase().trim()).toString('hex');
  const userRef = db.ref(`users/${userKey}`);
  const snapshot = await userRef.once('value');

  if (snapshot.exists()) {
    const userData = snapshot.val();
    if (userData.password === password) {
      req.session.user = { email: userData.email, key: userKey };
      return res.redirect('/');
    } else {
      return res.send(layout('Error', '<div class="alert">❌ Incorrect Password for this Email!</div><a href="/login" class="btn">Try Again</a>', res.locals.user));
    }
  } else {
    // New user auto-registration
    const newUser = { email: email.toLowerCase().trim(), password, createdAt: new Date().toISOString() };
    await userRef.set(newUser);
    req.session.user = { email: newUser.email, key: userKey };
    return res.redirect('/');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// DASHBOARD / HOME
app.get('/', async (req, res) => {
  let listHtml = '';
  try {
    const snapshot = await db.ref('pastes').once('value');
    const pastes = snapshot.val() || {};
    Object.keys(pastes).forEach(id => {
      const data = pastes[id];
      const author = data.author ? `by ${data.author}` : 'Anonymous';
      listHtml += `
        <div class="paste-card">
          <h3>${data.title || 'Untitled Script'} ${data.password ? '🔒' : ''}</h3>
          <div class="paste-meta">Created ${author}</div>
          <p><a href="/v/${id}">View Script Page</a> | <a href="/raw/${id}" target="_blank">Raw URL</a></p>
          <div class="code-box">loadstring(game:HttpGet("${req.protocol}://${req.get('host')}/raw/${id}"))()</div>
        </div>
      `;
    });
  } catch (err) {
    console.error('Error fetching pastes:', err);
  }

  const body = `
    <h2>⚡ Create New Script Paste</h2>
    <form action="/create" method="POST">
      <div class="form-group">
        <label>Script Title</label>
        <input type="text" name="title" placeholder="e.g. Xdemic Hub V9" required>
      </div>
      <div class="form-group">
        <label>Lua Code / Script Content</label>
        <textarea name="content" placeholder="Paste your Lua script here..." required></textarea>
      </div>
      <div class="form-group">
        <label>Access Password (Optional - Protects viewer page)</label>
        <input type="password" name="password" placeholder="Set password to lock viewer page">
      </div>
      <button type="submit" class="btn">Save & Generate Loadstring</button>
    </form>
    <hr style="border: 0.5px solid var(--border-color); margin: 28px 0;">
    <h2>📂 Saved Scripts Dashboard</h2>
    ${listHtml || '<p style="color: var(--text-muted);">No scripts uploaded yet.</p>'}
  `;
  res.send(layout('Dashboard', body, res.locals.user));
});

// CREATE PASTE
app.post('/create', async (req, res) => {
  const id = Math.random().toString(36).substring(2, 8);
  const author = res.locals.user ? res.locals.user.email : 'Anonymous';

  await db.ref(`pastes/${id}`).set({
    title: req.body.title,
    content: req.body.content,
    password: req.body.password || null,
    author: author,
    createdAt: new Date().toISOString()
  });
  res.redirect('/v/' + id);
});

// VIEW PASTE (WITH RATE LIMIT & 5-MIN LOCKOUT)
app.get('/v/:id', async (req, res) => {
  const pasteId = req.params.id;
  const snapshot = await db.ref(`pastes/${pasteId}`).once('value');

  if (!snapshot.exists()) {
    return res.status(404).send(layout('404', '<h3>Paste not found!</h3><a href="/" class="btn">Go Home</a>', res.locals.user));
  }

  const paste = snapshot.val();
  const attemptKey = `${req.ip}_${pasteId}`;
  const attempt = attemptTracker.get(attemptKey) || { count: 0, lockUntil: 0 };

  // Check 5-minute lockout timer
  if (attempt.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((attempt.lockUntil - Date.now()) / 60000);
    const lockBody = `
      <div class="alert">⛔ LOCKED OUT FOR 5 MINUTES</div>
      <h3>Too many wrong password attempts!</h3>
      <p style="margin: 12px 0; color: var(--text-muted);">You entered the wrong password 3 times. Access to this URL is blocked for 5 minutes.</p>
      <p><strong>Time remaining:</strong> ~${minutesLeft} minute(s)</p>
      <a href="/" class="btn btn-secondary" style="margin-top: 16px;">Back to Home</a>
    `;
    return res.send(layout('Locked Out', lockBody, res.locals.user));
  }

  // Password verification prompt
  if (paste.password && req.session[`auth_${pasteId}`] !== true) {
    const attemptsLeft = 3 - attempt.count;
    const body = `
      <h3>🔒 This Paste is Password Protected</h3>
      <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">Enter password to view code (Attempts left: <strong>${attemptsLeft}</strong>)</p>
      <form action="/unlock/${pasteId}" method="POST">
        <div class="form-group">
          <input type="password" name="password" placeholder="Enter Password" required>
        </div>
        <button type="submit" class="btn">Unlock Script Page</button>
      </form>
    `;
    return res.send(layout('Locked Paste', body, res.locals.user));
  }

  const rawUrl = `${req.protocol}://${req.get('host')}/raw/${pasteId}`;
  const loadstringStr = `loadstring(game:HttpGet("${rawUrl}"))()`;
  const cleanContent = (paste.content || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body = `
    <h2>${paste.title}</h2>
    <p style="font-size: 12px; color: var(--text-muted);">Uploaded by ${paste.author || 'Anonymous'}</p>
    <div style="margin: 16px 0;">
      <label>Raw Code URL:</label>
      <p><a href="/raw/${pasteId}" target="_blank">${rawUrl}</a></p>
    </div>
    <div style="margin: 16px 0;">
      <label>Roblox Auto Loadstring:</label>
      <div class="code-box">${loadstringStr}</div>
    </div>
    <h3>Script Content:</h3>
    <pre>${cleanContent}</pre>
    <a href="/" class="btn btn-secondary">Back to Dashboard</a>
  `;
  res.send(layout(paste.title, body, res.locals.user));
});

// UNLOCK ATTEMPT (3 FAILS = 5 MIN LOCKOUT)
app.post('/unlock/:id', async (req, res) => {
  const pasteId = req.params.id;
  const snapshot = await db.ref(`pastes/${pasteId}`).once('value');

  if (!snapshot.exists()) return res.redirect('/');

  const paste = snapshot.val();
  const attemptKey = `${req.ip}_${pasteId}`;
  const attempt = attemptTracker.get(attemptKey) || { count: 0, lockUntil: 0 };

  if (attempt.lockUntil > Date.now()) {
    return res.redirect('/v/' + pasteId);
  }

  if (paste.password === req.body.password) {
    attemptTracker.delete(attemptKey); // reset attempts on success
    req.session[`auth_${pasteId}`] = true;
    return res.redirect('/v/' + pasteId);
  } else {
    attempt.count = (attempt.count || 0) + 1;

    if (attempt.count >= 3) {
      attempt.lockUntil = Date.now() + 5 * 60 * 1000; // 5 minute lockout trigger
      attemptTracker.set(attemptKey, attempt);
      return res.redirect('/v/' + pasteId);
    }

    attemptTracker.set(attemptKey, attempt);
    return res.redirect('/v/' + pasteId);
  }
});

// RAW ENDPOINT (FOR ROBLOX GAME:HTTPGET)
app.get('/raw/:id', async (req, res) => {
  const snapshot = await db.ref(`pastes/${req.params.id}`).once('value');
  if (!snapshot.exists()) return res.status(404).send('Paste not found');
  res.setHeader('Content-Type', 'text/plain');
  res.send(snapshot.val().content);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
