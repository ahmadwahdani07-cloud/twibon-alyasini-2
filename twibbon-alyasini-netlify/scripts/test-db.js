const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(':memory:');

db.exec(`
  CREATE TABLE test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);
  INSERT INTO test (name) VALUES ('Al-Yasini');
`);

const stmt = db.prepare('SELECT * FROM test WHERE id = ?');
const row = stmt.get(1);
console.log('Row:', row);
console.log('node:sqlite test passed!');
