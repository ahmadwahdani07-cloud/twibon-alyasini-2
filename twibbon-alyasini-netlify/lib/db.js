const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs');

const isNetlify = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dbPath = isNetlify
  ? path.join('/tmp', 'twibbon.db')
  : path.join(__dirname, '..', 'data', 'twibbon.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

// Password hashing helper
function hashPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  const result = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return result === hash;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      caption TEXT,
      hashtags TEXT,
      frame_path TEXT NOT NULL,
      view_count INTEGER DEFAULT 0,
      download_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER,
      event_type TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );
  `);

  // Seed default admin if table is empty
  const adminCheck = db.prepare('SELECT count(*) as count FROM admin_users').get();
  if (adminCheck.count === 0) {
    const { hash, salt } = hashPassword('alyasini2026');
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (username, password_hash, salt)
      VALUES (?, ?, ?)
    `);
    insertAdmin.run('admin', hash, salt);
    console.log('[DB] Default admin initialized: admin / alyasini2026');
  }

  // Seed default campaigns if table is empty
  const campCheck = db.prepare('SELECT count(*) as count FROM campaigns').get();
  if (campCheck.count === 0) {
    const insertCamp = db.prepare(`
      INSERT INTO campaigns (slug, title, description, caption, hashtags, frame_path, view_count, download_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCamp.run(
      'haul-24-alyasini',
      'Haul Masyayikh Ke-24 & Silatnas Insani Alyasini 2026 (Frame Lingkaran Emas)',
      'Sambut dan semarakkan peringatan Haul Masyayikh Ke-24 Pondok Pesantren Terpadu Al-Yasini serta Silaturahmi Nasional Insani Alyasini tahun 2026 di Areng-Areng, Wonorejo, Pasuruan.',
      `Bismillahirrohmanirrohim. Saya siap menyukseskan & menyemarakkan Haul Masyayikh Ke-24 Pondok Pesantren Terpadu Al-Yasini dan Silatnas Insani Alyasini 2026.

"Sambung Sanad, Sambung Silaturahmi, dan Regenerasi Tiada Putus"

Ayo ramaikan dan pasang twibbon kebersamaan kita!`,
      '#HaulMasyayikh24 #SilatnasInsaniAlyasini #SantriAlyasini #AlYasini2026 #PesantrenAlyasini #Pasuruan',
      '/uploads/frame-haul-24.png',
      128,
      45
    );

    insertCamp.run(
      'silatnas-insani-2026',
      'Silatnas Insani Alyasini 2026 (Frame Modern Squircle)',
      'Frame edisi modern bergradien hijau emerald dan emas untuk seluruh santri, alumni, pengurus, dan simpatisan Ponpes Terpadu Al-Yasini.',
      `Kami bangga menjadi bagian dari keluarga besar Pondok Pesantren Terpadu Al-Yasini. Siap hadir dalam perhelatan akbar Silatnas Insani Alyasini 2026!

Haul Masyayikh Ke-24 • Pondok Pesantren Terpadu Al-Yasini Pasuruan.`,
      '#SilatnasInsaniAlyasini #HaulMasyayikh24 #InsaniAlyasini #PesantrenKeren',
      '/uploads/frame-silatnas-modern.png',
      84,
      27
    );

    console.log('[DB] Default campaigns seeded successfully.');
  }
}

// Admin Auth
function findAdminByUsername(username) {
  return db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
}

function updateAdminPassword(username, newPassword) {
  const { hash, salt } = hashPassword(newPassword);
  const stmt = db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE username = ?');
  return stmt.run(hash, salt, username);
}

// Campaign Queries
function getAllCampaigns(activeOnly = false) {
  if (activeOnly) {
    return db.prepare('SELECT * FROM campaigns WHERE is_active = 1 ORDER BY created_at DESC').all();
  }
  return db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
}

function getCampaignById(id) {
  return db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
}

function getCampaignBySlug(slug, incrementView = false, clientInfo = {}) {
  const camp = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(slug);
  if (!camp) return null;

  if (incrementView) {
    db.prepare('UPDATE campaigns SET view_count = view_count + 1 WHERE id = ?').run(camp.id);
    db.prepare('INSERT INTO analytics_events (campaign_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)').run(
      camp.id,
      'view',
      clientInfo.ip || null,
      clientInfo.ua || null
    );
    camp.view_count += 1;
  }
  return camp;
}

function recordDownload(slug, clientInfo = {}) {
  const camp = db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(slug);
  if (!camp) return false;

  db.prepare('UPDATE campaigns SET download_count = download_count + 1 WHERE id = ?').run(camp.id);
  db.prepare('INSERT INTO analytics_events (campaign_id, event_type, ip_address, user_agent) VALUES (?, ?, ?, ?)').run(
    camp.id,
    'download',
    clientInfo.ip || null,
    clientInfo.ua || null
  );
  return true;
}

function createCampaign({ slug, title, description, caption, hashtags, frame_path }) {
  const stmt = db.prepare(`
    INSERT INTO campaigns (slug, title, description, caption, hashtags, frame_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(slug, title, description || '', caption || '', hashtags || '', frame_path);
  return getCampaignBySlug(slug);
}

function updateCampaign(id, fields) {
  const existing = getCampaignById(id);
  if (!existing) return null;

  const title = fields.title !== undefined ? fields.title : existing.title;
  const slug = fields.slug !== undefined ? fields.slug : existing.slug;
  const description = fields.description !== undefined ? fields.description : existing.description;
  const caption = fields.caption !== undefined ? fields.caption : existing.caption;
  const hashtags = fields.hashtags !== undefined ? fields.hashtags : existing.hashtags;
  const frame_path = fields.frame_path !== undefined ? fields.frame_path : existing.frame_path;
  const is_active = fields.is_active !== undefined ? Number(fields.is_active) : existing.is_active;

  const stmt = db.prepare(`
    UPDATE campaigns
    SET slug = ?, title = ?, description = ?, caption = ?, hashtags = ?, frame_path = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(slug, title, description, caption, hashtags, frame_path, is_active, id);
  return getCampaignById(id);
}

function deleteCampaign(id) {
  db.prepare('DELETE FROM analytics_events WHERE campaign_id = ?').run(id);
  return db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
}

function getDashboardStats() {
  const summary = db.prepare(`
    SELECT 
      COUNT(id) as total_campaigns,
      COALESCE(SUM(view_count), 0) as total_views,
      COALESCE(SUM(download_count), 0) as total_downloads
    FROM campaigns
  `).get();

  const campaigns = db.prepare(`
    SELECT id, slug, title, frame_path, view_count, download_count, is_active, created_at
    FROM campaigns
    ORDER BY created_at DESC
  `).all();

  const totalViews = Number(summary.total_views);
  const totalDownloads = Number(summary.total_downloads);
  const conversionRate = totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) : 0;

  return {
    totalCampaigns: Number(summary.total_campaigns),
    totalViews,
    totalDownloads,
    conversionRate: Number(conversionRate),
    campaigns
  };
}

module.exports = {
  db,
  initDb,
  hashPassword,
  verifyPassword,
  findAdminByUsername,
  updateAdminPassword,
  getAllCampaigns,
  getCampaignById,
  getCampaignBySlug,
  recordDownload,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getDashboardStats
};
