const db = require('../lib/db.js');
db.initDb();
const stats = db.getDashboardStats();
console.log('Total campaigns:', stats.totalCampaigns);
console.log('Total views:', stats.totalViews);
console.log('Total downloads:', stats.totalDownloads);
console.log('Campaigns list:', stats.campaigns.map(c => ({ id: c.id, slug: c.slug, title: c.title })));
