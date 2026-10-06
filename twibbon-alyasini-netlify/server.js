const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./lib/db.js');
const { parseMultipart } = require('./lib/multipart.js');

// Initialize Database
db.initDb();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// In-memory active session tokens
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(req) {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const val = rest.join('=').trim();
    list[name] = decodeURIComponent(val);
  });
  return list;
}

function getAuthUser(req) {
  // Check Authorization Bearer header first
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookies = parseCookies(req);
    token = cookies['twibbon_admin_session'];
  }

  if (!token) return null;
  const sess = sessions.get(token);
  if (!sess) return null;
  if (Date.now() > sess.expiresAt) {
    sessions.delete(token);
    return null;
  }
  return sess;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function readBody(req, maxBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error('Payload too large (maximum 20MB)'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS & Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);
  const method = req.method.toUpperCase();

  const clientInfo = {
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '',
    ua: req.headers['user-agent'] || ''
  };

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Auth: Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const bodyBuf = await readBody(req);
        let body;
        try {
          body = JSON.parse(bodyBuf.toString('utf8'));
        } catch {
          return sendError(res, 400, 'Format JSON tidak valid');
        }

        const { username, password } = body;
        if (!username || !password) {
          return sendError(res, 400, 'Username dan password wajib diisi');
        }

        const user = db.findAdminByUsername(username);
        if (!user || !db.verifyPassword(password, user.password_hash, user.salt)) {
          return sendError(res, 401, 'Username atau password salah');
        }

        const token = generateToken();
        sessions.set(token, {
          userId: user.id,
          username: user.username,
          expiresAt: Date.now() + SESSION_TTL_MS
        });

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': `twibbon_admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
        });
        return res.end(JSON.stringify({
          success: true,
          token,
          user: { username: user.username }
        }));
      }

      // 2. Auth: Logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const cookies = parseCookies(req);
        const token = cookies['twibbon_admin_session'];
        if (token) sessions.delete(token);

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': 'twibbon_admin_session=; HttpOnly; Path=/; Max-Age=0'
        });
        return res.end(JSON.stringify({ success: true }));
      }

      // 3. Auth: Current User
      if (pathname === '/api/auth/me' && method === 'GET') {
        const auth = getAuthUser(req);
        if (!auth) {
          return sendJson(res, 200, { authenticated: false });
        }
        return sendJson(res, 200, {
          authenticated: true,
          user: { username: auth.username }
        });
      }

      // 4. Public API: List active campaigns
      if (pathname === '/api/public/campaigns' && method === 'GET') {
        const campaigns = db.getAllCampaigns(true);
        return sendJson(res, 200, { campaigns });
      }

      // 5. Public API: Get single campaign by slug & increment view
      if (pathname.startsWith('/api/public/campaign/') && method === 'GET') {
        const slug = pathname.replace('/api/public/campaign/', '').trim();
        const camp = db.getCampaignBySlug(slug, true, clientInfo);
        if (!camp || !camp.is_active) {
          return sendError(res, 404, 'Kampanye twibbon tidak ditemukan atau sudah nonaktif');
        }
        return sendJson(res, 200, { campaign: camp });
      }

      // 6. Public API: Record download
      if (pathname.startsWith('/api/public/campaign/') && pathname.endsWith('/download') && method === 'POST') {
        const slug = pathname.replace('/api/public/campaign/', '').replace('/download', '').trim();
        const ok = db.recordDownload(slug, clientInfo);
        if (!ok) {
          return sendError(res, 404, 'Kampanye tidak ditemukan');
        }
        return sendJson(res, 200, { success: true });
      }

      // --- ADMIN ONLY ROUTES ---
      const auth = getAuthUser(req);
      if (!auth) {
        return sendError(res, 401, 'Akses ditolak. Silakan login sebagai admin.');
      }

      // Admin: Change Password
      if (pathname === '/api/auth/change-password' && method === 'POST') {
        const bodyBuf = await readBody(req);
        let body;
        try {
          body = JSON.parse(bodyBuf.toString('utf8'));
        } catch {
          return sendError(res, 400, 'Format data tidak valid');
        }

        const { currentPassword, newPassword } = body;
        if (!currentPassword || !newPassword) {
          return sendError(res, 400, 'Password saat ini dan password baru wajib diisi');
        }
        if (newPassword.length < 6) {
          return sendError(res, 400, 'Password baru minimal harus 6 karakter');
        }

        const user = db.findAdminByUsername(auth.username);
        if (!user || !db.verifyPassword(currentPassword, user.password_hash, user.salt)) {
          return sendError(res, 401, 'Password saat ini tidak sesuai');
        }

        db.updateAdminPassword(auth.username, newPassword);
        return sendJson(res, 200, { success: true, message: 'Password admin berhasil diubah!' });
      }

      // 7. Admin: Dashboard Stats
      if (pathname === '/api/stats' && method === 'GET') {
        const stats = db.getDashboardStats();
        return sendJson(res, 200, stats);
      }

      // 8. Admin: Get all campaigns
      if (pathname === '/api/campaigns' && method === 'GET') {
        const campaigns = db.getAllCampaigns(false);
        return sendJson(res, 200, { campaigns });
      }

      // 9. Admin: Create Campaign
      if (pathname === '/api/campaigns' && method === 'POST') {
        const contentType = req.headers['content-type'] || '';
        let fields = {};
        let framePath = '';

        if (contentType.includes('multipart/form-data')) {
          const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
          if (!boundaryMatch) {
            return sendError(res, 400, 'Multipart boundary tidak ditemukan');
          }
          const boundary = boundaryMatch[1].trim();
          const bodyBuf = await readBody(req);
          const parsed = parseMultipart(bodyBuf, boundary);
          fields = parsed.fields;

          // Save frame file if provided
          if (parsed.files && parsed.files.frame && parsed.files.frame.data.length > 0) {
            const file = parsed.files.frame;
            const ext = path.extname(file.filename || '.png') || '.png';
            const safeName = `frame-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
            const dest = path.join(UPLOAD_DIR, safeName);
            fs.writeFileSync(dest, file.data);
            framePath = `/uploads/${safeName}`;
          }
        } else {
          // JSON fallback
          const bodyBuf = await readBody(req);
          fields = JSON.parse(bodyBuf.toString('utf8'));
          if (fields.frame_path) {
            framePath = fields.frame_path;
          }
        }

        const title = (fields.title || '').trim();
        let slug = (fields.slug || '').trim().toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .replace(/-+/g, '-');

        if (!title) {
          return sendError(res, 400, 'Judul kampanye wajib diisi');
        }
        if (!slug) {
          slug = title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
        }
        if (!framePath) {
          // Default to official frame if not uploaded
          framePath = '/uploads/frame-haul-24.png';
        }

        // Check if slug exists
        const existing = db.getCampaignBySlug(slug);
        if (existing) {
          slug = `${slug}-${Date.now().toString().slice(-4)}`;
        }

        const newCamp = db.createCampaign({
          slug,
          title,
          description: fields.description || '',
          caption: fields.caption || '',
          hashtags: fields.hashtags || '',
          frame_path: framePath
        });

        return sendJson(res, 201, { success: true, campaign: newCamp });
      }

      // 10. Admin: Update Campaign
      const updateMatch = pathname.match(/^\/api\/campaigns\/(\d+)$/);
      if (updateMatch && method === 'PUT') {
        const id = parseInt(updateMatch[1], 10);
        const contentType = req.headers['content-type'] || '';
        let fields = {};
        let newFramePath = null;

        if (contentType.includes('multipart/form-data')) {
          const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
          if (!boundaryMatch) {
            return sendError(res, 400, 'Multipart boundary tidak ditemukan');
          }
          const boundary = boundaryMatch[1].trim();
          const bodyBuf = await readBody(req);
          const parsed = parseMultipart(bodyBuf, boundary);
          fields = parsed.fields;

          if (parsed.files && parsed.files.frame && parsed.files.frame.data.length > 0) {
            const file = parsed.files.frame;
            const ext = path.extname(file.filename || '.png') || '.png';
            const safeName = `frame-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
            const dest = path.join(UPLOAD_DIR, safeName);
            fs.writeFileSync(dest, file.data);
            newFramePath = `/uploads/${safeName}`;
          }
        } else {
          const bodyBuf = await readBody(req);
          fields = JSON.parse(bodyBuf.toString('utf8'));
        }

        if (newFramePath) {
          fields.frame_path = newFramePath;
        }

        const updated = db.updateCampaign(id, fields);
        if (!updated) {
          return sendError(res, 404, 'Kampanye tidak ditemukan');
        }
        return sendJson(res, 200, { success: true, campaign: updated });
      }

      // 11. Admin: Delete Campaign
      const deleteMatch = pathname.match(/^\/api\/campaigns\/(\d+)$/);
      if (deleteMatch && method === 'DELETE') {
        const id = parseInt(deleteMatch[1], 10);
        db.deleteCampaign(id);
        return sendJson(res, 200, { success: true });
      }

      return sendError(res, 404, 'API endpoint tidak ditemukan');
    } catch (err) {
      console.error('[API Error]', err);
      return sendError(res, 500, 'Internal Server Error: ' + err.message);
    }
  }

  // -------------------------------------------------------------
  // STATIC FILES & PAGE ROUTING
  // -------------------------------------------------------------
  if (method === 'GET' || method === 'HEAD') {
    // Exact page routes
    if (pathname === '/' || pathname === '/index.html') {
      return serveFile(path.join(PUBLIC_DIR, 'index.html'), res);
    }
    if (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin.html') {
      return serveFile(path.join(PUBLIC_DIR, 'admin.html'), res);
    }

    // Direct public file check
    const normalizedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
    const candidateFile = path.join(PUBLIC_DIR, normalizedPath);

    // Prevent directory traversal
    if (candidateFile.startsWith(PUBLIC_DIR) && fs.existsSync(candidateFile) && fs.statSync(candidateFile).isFile()) {
      return serveFile(candidateFile, res);
    }

    // Check if pathname is a campaign slug: e.g. /haul-24-alyasini or /c/haul-24-alyasini
    let candidateSlug = pathname.replace(/^\//, '').replace(/^c\//, '').trim();
    if (candidateSlug && !candidateSlug.includes('.')) {
      const camp = db.getCampaignBySlug(candidateSlug);
      if (camp) {
        // Serve the visitor twibbon page!
        return serveFile(path.join(PUBLIC_DIR, 'twibbon.html'), res);
      }
    }

    // Fallback: 404
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Halaman Tidak Ditemukan - Al-Yasini Twibbon</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: system-ui, sans-serif; background: #004e38; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 20px; }
          .card { background: #fff; color: #111; max-width: 480px; padding: 40px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
          h1 { color: #006d4e; margin-top: 0; }
          a { display: inline-block; margin-top: 20px; background: #006d4e; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>404</h1>
          <p>Tautan kampanye twibbon tidak ditemukan atau sudah dinonaktifkan.</p>
          <a href="/">Kembali ke Beranda</a>
        </div>
      </body>
      </html>
    `);
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

function serveFile(filePath, res) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error loading file: ' + err.message);
  }
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Twibbon Portal Al-Yasini Running!`);
  console.log(`  URL Beranda Publik: http://localhost:${PORT}`);
  console.log(`  Portal Admin     : http://localhost:${PORT}/admin`);
  console.log(`  Login Admin      : admin / alyasini2026`);
  console.log(`  Kampanye Bawaan  : http://localhost:${PORT}/haul-24-alyasini`);
  console.log(`====================================================`);
});
