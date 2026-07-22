const express = require('express');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: 'xdemic_secret_key_123',
  resave: false,
  saveUninitialized: true
}));

const pastes = new Map();

const layout = (title, body) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f12; color: #e0e0e0; margin: 0; padding: 16px; }
      .container { max-width: 700px; margin: 0 auto; background: #18181c; padding: 20px; border-radius: 12px; border: 1px solid #2a2a32; }
      h1, h2, h3 { color: #fff; margin-top: 0; }
      textarea, input[type="text"], input[type="password"] { width: 100%; background: #0f0f12; color: #00ff88; border: 1px solid #333; border-radius: 8px; padding: 12px; font-family: monospace; margin-bottom: 12px; }
      button, .btn { display: inline-block; background: #007bff; color: white; border: none; padding: 12px 18px; border-radius: 8px; font-weight: bold; text-decoration: none; cursor: pointer; width: 100%; text-align: center; }
      .btn-secondary { background: #333; color: #ccc; margin-top: 8px; }
      .paste-card { background: #0f0f12; padding: 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #282830; }
      pre { background: #050508; padding: 12px; border-radius: 6px; overflow-x: auto; color: #00ff88; white-space: pre-wrap; word-break: break-all; }
      .code-box { background: #000; color: #ffbc00; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 13px; word-break: break-all; }
      a { color: #007bff; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Xdemic Pastebin</h1>
      ${body}
    </div>
  </body>
  </html>
`;

app.get('/', (req, res) => {
  let listHtml = '';
  pastes.forEach((data, id) => {
    listHtml += `
      <div class="paste-card">
        <h3>${data.title || 'Untitled Script'} ${data.password ? '🔒' : ''}</h3>
        <p><a href="/v/${id}">View Script</a> | <a href="/raw/${id}" target="_blank">Raw URL</a></p>
        <div class="code-box">loadstring(game:HttpGet("${req.protocol}://${req.get('host')}/raw/${id}"))()</div>
      </div>
    `;
  });

  const body = `
    <h2>Create New Paste / Script</h2>
    <form action="/create" method="POST">
      <input type="text" name="title" placeholder="Script Title (e.g. Xdemic Hub)" required>
      <textarea name="content" placeholder="Paste your script or code here..." required></textarea>
      <input type="password" name="password" placeholder="Set Access Password (Optional)">
      <button type="submit">Save Script</button>
    </form>
    <hr style="border: 0.5px solid #333; margin: 20px 0;">
    <h2>Saved Scripts Dashboard</h2>
    ${listHtml || '<p>No pastes saved yet.</p>'}
  `;
  res.send(layout('Xdemic Paste Dashboard', body));
});

app.post('/create', (req, res) => {
  const id = Math.random().toString(36).substring(2, 8);
  pastes.set(id, {
    title: req.body.title,
    content: req.body.content,
    password: req.body.password || null
  });
  res.redirect('/v/' + id);
});

app.get('/v/:id', (req, res) => {
  const paste = pastes.get(req.params.id);
  if (!paste) return res.status(404).send(layout('404', '<h3>Paste not found!</h3><a href="/" class="btn">Go Home</a>'));

  if (paste.password && req.session[`auth_${req.params.id}`] !== true) {
    const body = `
      <h3>🔒 This paste is password protected</h3>
      <form action="/unlock/${req.params.id}" method="POST">
        <input type="password" name="password" placeholder="Enter Password" required>
        <button type="submit">Unlock Paste</button>
      </form>
    `;
    return res.send(layout('Locked Paste', body));
  }

  const rawUrl = `${req.protocol}://${req.get('host')}/raw/${req.params.id}`;
  const loadstringStr = `loadstring(game:HttpGet("${rawUrl}"))()`;
  const cleanContent = paste.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body = `
    <h2>${paste.title}</h2>
    <p><strong>Raw URL:</strong> <a href="/raw/${req.params.id}" target="_blank">${rawUrl}</a></p>
    <p><strong>Auto Loadstring:</strong></p>
    <div class="code-box">${loadstringStr}</div>
    <h3>Script Content:</h3>
    <pre>${cleanContent}</pre>
    <a href="/" class="btn btn-secondary">Back to Dashboard</a>
  `;
  res.send(layout(paste.title, body));
});

app.post('/unlock/:id', (req, res) => {
  const paste = pastes.get(req.params.id);
  if (paste && paste.password === req.body.password) {
    req.session[`auth_${req.params.id}`] = true;
    res.redirect('/v/' + req.params.id);
  } else {
    res.send(layout('Error', '<h3>Incorrect Password!</h3><a href="/v/' + req.params.id + '" class="btn">Try Again</a>'));
  }
});

app.get('/raw/:id', (req, res) => {
  const paste = pastes.get(req.params.id);
  if (!paste) return res.status(404).send('Paste not found');
  res.setHeader('Content-Type', 'text/plain');
  res.send(paste.content);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

