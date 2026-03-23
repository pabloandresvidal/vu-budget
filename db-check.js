import Database from 'better-sqlite3';

try {
  const db = new Database('./server/data/budget.db');
  const users = db.prepare('SELECT id, username, partner_code, linked_to FROM users').all();
  console.log('Users:', users);
} catch (err) {
  console.error(err);
}
