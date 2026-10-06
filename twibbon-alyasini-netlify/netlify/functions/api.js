const crypto = require('node:crypto');
const db = require('../../lib/db.js');
const { parseMultipart } = require('../../lib/multipart.js');

// Ensure database is initialized
db.initDb();

const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function parseCookies(headers) {
  const cookieHeader = headers.cookie || headers.Cookie;
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    list[name] = decodeURIComponent(rest.join('=').trim());
  });
  return list;
}

function getAuthUser(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else {
    const cookies = parseCookies(headers);
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

function jsonResponse(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      ...extraHeaders
    },
    body: JSON.stringify(data)
  };
}

exports.handler = async (event, context) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return jsonResponse(204, {});
  }

  // Normalize path: e.g. /.netlify/functions/api/public/campaigns -> /api/public/campaigns
  let rawPath = event.path;
  if (rawPath.startsWith('/.netlify/functions/api')) {
    rawPath = rawPath.replace('/.netlify/functions/api', '/api');
  }
  if (!rawPath.startsWith('/api')) {
    rawPath = '/api' + (rawPath.startsWith('/') ? rawPath : '/' + rawPath);
  }

  const method = event.httpMethod.toUpperCase();
  const headers = event.headers || {};
  const clientInfo = {
    ip: headers['client-ip'] || headers['x-forwarded-for'] || '',
    ua: headers['user-agent'] || ''
  };

  // Decode body buffer
  let bodyBuffer = Buffer.alloc(0);
  if (event.body) {
    bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8');
  }

  try {
    // 1. Auth: Login
    if (rawPath === '/api/auth/login' && method === 'POST') {
      let body;
      try {
        body = JSON.parse(bodyBuffer.toString('utf8'));
      } catch {
        return jsonResponse(400, { error: 'Format JSON tidak valid' });
      }

      const { username, password } = body;
      if (!username || !password) {
        return jsonResponse(400, { error: 'Username dan password wajib diisi' });
      }

      const user = db.findAdminByUsername(username);
      if (!user || !db.verifyPassword(password, user.password_hash, user.salt)) {
        return jsonResponse(401, { error: 'Username atau password salah' });
      }

      const token = generateToken();
      sessions.set(token, {
        userId: user.id,
        username: user.username,
        expiresAt: Date.now() + SESSION_TTL_MS
      });

      return jsonResponse(200, {
        success: true,
        token,
        user: { username: user.username }
      }, {
        'Set-Cookie': `twibbon_admin_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
      });
    }

    // 2. Auth: Logout
    if (rawPath === '/api/auth/logout' && method === 'POST') {
      const cookies = parseCookies(headers);
      const token = cookies['twibbon_admin_session'];
      if (token) sessions.delete(token);

      return jsonResponse(200, { success: true }, {
        'Set-Cookie': 'twibbon_admin_session=; HttpOnly; Path=/; Max-Age=0'
      });
    }

    // 3. Auth: Current User
    if (rawPath === '/api/auth/me' && method === 'GET') {
      const auth = getAuthUser(headers);
      if (!auth) {
        return jsonResponse(200, { authenticated: false });
      }
      return jsonResponse(200, { authenticated: true, user: { username: auth.username } });
    }

    // 4. Public API: List campaigns
    if (rawPath === '/api/public/campaigns' && method === 'GET') {
      const campaigns = db.getAllCampaigns(true);
      return jsonResponse(200, { campaigns });
    }

    // 5. Public API: Get single campaign by slug & increment view
    if (rawPath.startsWith('/api/public/campaign/') && method === 'GET' && !rawPath.endsWith('/download')) {
      const slug = rawPath.replace('/api/public/campaign/', '').trim();
      const camp = db.getCampaignBySlug(slug, true, clientInfo);
      if (!camp || !camp.is_active) {
        return jsonResponse(404, { error: 'Kampanye twibbon tidak ditemukan' });
      }
      return jsonResponse(200, { campaign: camp });
    }

    // 6. Public API: Record download
    if (rawPath.startsWith('/api/public/campaign/') && rawPath.endsWith('/download') && method === 'POST') {
      const slug = rawPath.replace('/api/public/campaign/', '').replace('/download', '').trim();
      const ok = db.recordDownload(slug, clientInfo);
      if (!ok) {
        return jsonResponse(404, { error: 'Kampanye tidak ditemukan' });
      }
      return jsonResponse(200, { success: true });
    }

    // --- PROTECTED ADMIN ROUTES ---
    const auth = getAuthUser(headers);
    if (!auth) {
      return jsonResponse(401, { error: 'Akses ditolak. Silakan login sebagai admin.' });
    }

    // Change Password
    if (rawPath === '/api/auth/change-password' && method === 'POST') {
      let body;
      try {
        body = JSON.parse(bodyBuffer.toString('utf8'));
      } catch {
        return jsonResponse(400, { error: 'Format data tidak valid' });
      }

      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return jsonResponse(400, { error: 'Password saat ini dan password baru wajib diisi' });
      }
      if (newPassword.length < 6) {
        return jsonResponse(400, { error: 'Password baru minimal harus 6 karakter' });
      }

      const user = db.findAdminByUsername(auth.username);
      if (!user || !db.verifyPassword(currentPassword, user.password_hash, user.salt)) {
        return jsonResponse(401, { error: 'Password saat ini tidak sesuai' });
      }

      db.updateAdminPassword(auth.username, newPassword);
      return jsonResponse(200, { success: true, message: 'Password admin berhasil diubah!' });
    }

    // Admin Stats
    if (rawPath === '/api/stats' && method === 'GET') {
      const stats = db.getDashboardStats();
      return jsonResponse(200, stats);
    }

    // Admin Get All Campaigns
    if (rawPath === '/api/campaigns' && method === 'GET') {
      const campaigns = db.getAllCampaigns(false);
      return jsonResponse(200, { campaigns });
    }

    // Admin Create Campaign
    if (rawPath === '/api/campaigns' && method === 'POST') {
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      let fields = {};
      let framePath = '';

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          return jsonResponse(400, { error: 'Boundary form tidak ditemukan' });
        }
        const parsed = parseMultipart(bodyBuffer, boundaryMatch[1].trim());
        fields = parsed.fields;

        if (parsed.files && parsed.files.frame && parsed.files.frame.data.length > 0) {
          // Store frame as high-res Data URL (no disk dependency!)
          const mime = parsed.files.frame.contentType || 'image/png';
          framePath = `data:${mime};base64,${parsed.files.frame.data.toString('base64')}`;
        }
      } else {
        fields = JSON.parse(bodyBuffer.toString('utf8'));
        if (fields.frame_path) framePath = fields.frame_path;
      }

      const title = (fields.title || '').trim();
      let slug = (fields.slug || '').trim().toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-');

      if (!title) return jsonResponse(400, { error: 'Judul kampanye wajib diisi' });
      if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
      if (!framePath) framePath = '/assets/default-frame.png';

      const existing = db.getCampaignBySlug(slug);
      if (existing) slug = `${slug}-${Date.now().toString().slice(-4)}`;

      const newCamp = db.createCampaign({
        slug,
        title,
        description: fields.description || '',
        caption: fields.caption || '',
        hashtags: fields.hashtags || '',
        frame_path: framePath
      });

      return jsonResponse(201, { success: true, campaign: newCamp });
    }

    // Admin Update Campaign
    const updateMatch = rawPath.match(/^\/api\/campaigns\/(\d+)$/);
    if (updateMatch && method === 'PUT') {
      const id = parseInt(updateMatch[1], 10);
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      let fields = {};
      let newFramePath = null;

      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (boundaryMatch) {
          const parsed = parseMultipart(bodyBuffer, boundaryMatch[1].trim());
          fields = parsed.fields;
          if (parsed.files && parsed.files.frame && parsed.files.frame.data.length > 0) {
            const mime = parsed.files.frame.contentType || 'image/png';
            newFramePath = `data:${mime};base64,${parsed.files.frame.data.toString('base64')}`;
          }
        }
      } else {
        fields = JSON.parse(bodyBuffer.toString('utf8'));
      }

      if (newFramePath) fields.frame_path = newFramePath;

      const updated = db.updateCampaign(id, fields);
      if (!updated) return jsonResponse(404, { error: 'Kampanye tidak ditemukan' });
      return jsonResponse(200, { success: true, campaign: updated });
    }

    // Admin Delete Campaign
    if (updateMatch && method === 'DELETE') {
      const id = parseInt(updateMatch[1], 10);
      db.deleteCampaign(id);
      return jsonResponse(200, { success: true });
    }

    return jsonResponse(404, { error: 'Endpoint tidak ditemukan: ' + rawPath });
  } catch (err) {
    console.error('[Netlify Function Error]', err);
    return jsonResponse(500, { error: 'Internal Error: ' + err.message });
  }
};
