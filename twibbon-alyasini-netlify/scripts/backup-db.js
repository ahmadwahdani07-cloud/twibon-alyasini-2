const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'data', 'twibbon.db');
const backupDir = path.join(__dirname, '..', 'data', 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

if (fs.existsSync(src)) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(backupDir, `twibbon-backup-${timestamp}.db`);
  fs.copyFileSync(src, dest);
  console.log(`[Backup] Berhasil mencadangkan database ke: ${dest}`);
} else {
  console.warn('[Backup] File database belum ditemukan.');
}
