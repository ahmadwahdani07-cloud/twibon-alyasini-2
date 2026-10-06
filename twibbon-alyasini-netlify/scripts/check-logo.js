const fs = require('fs');
const buf = fs.readFileSync('public/assets/logo-alyasini.png');
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
console.log(`Logo dimensions: ${width} x ${height}`);
