import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'budget.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    email TEXT,
    email_notifications INTEGER DEFAULT 1,
    partner_code TEXT UNIQUE,
    linked_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    budget_id INTEGER,
    vendor TEXT DEFAULT '',
    description TEXT DEFAULT '',
    amount REAL NOT NULL,
    percentage REAL DEFAULT 100,
    effective_amount REAL NOT NULL,
    raw_sms TEXT DEFAULT '',
    categorized_by TEXT DEFAULT NULL,
    needs_review INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    header_name TEXT DEFAULT 'X-SMS-Body',
    secret_token TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_id INTEGER,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ignored_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pattern TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS webhook_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    raw_sms TEXT,
    vendor TEXT,
    amount REAL,
    status TEXT NOT NULL,
    transaction_id INTEGER,
    matched_pattern TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
  );
`);

// Run migrations for existing databases (add new columns if they don't exist)
const runMigration = (sql) => {
  try { db.exec(sql); } catch (_) { /* column already exists */ }
};

runMigration(`ALTER TABLE users ADD COLUMN email TEXT`);
runMigration(`ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1`);
runMigration(`ALTER TABLE users ADD COLUMN partner_code TEXT`);
try { db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_code ON users(partner_code)`); } catch (_) {}
runMigration(`ALTER TABLE users ADD COLUMN linked_to INTEGER REFERENCES users(id) ON DELETE SET NULL`);
runMigration(`ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1`);
runMigration(`ALTER TABLE users ADD COLUMN verify_token TEXT`);

// Notification Preferences
runMigration(`ALTER TABLE users ADD COLUMN notify_budget_updates INTEGER DEFAULT 1`);
runMigration(`ALTER TABLE users ADD COLUMN notify_tx_updates INTEGER DEFAULT 1`);
runMigration(`ALTER TABLE users ADD COLUMN notify_weekly_summary INTEGER DEFAULT 1`);
runMigration(`ALTER TABLE users ADD COLUMN notify_high_spending INTEGER DEFAULT 1`);

// Password Recovery
runMigration(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
runMigration(`ALTER TABLE users ADD COLUMN reset_expires DATETIME`);

// App Onboarding & Monetization
runMigration(`ALTER TABLE users ADD COLUMN onboarding_completed INTEGER DEFAULT 0`);
runMigration(`ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free'`);

// Passwordless login
runMigration(`ALTER TABLE users ADD COLUMN login_code TEXT`);
runMigration(`ALTER TABLE users ADD COLUMN login_code_expires DATETIME`);

// Budget automation and UI features
runMigration(`ALTER TABLE budgets ADD COLUMN auto_reset INTEGER DEFAULT 0`);
runMigration(`ALTER TABLE budgets ADD COLUMN carry_over INTEGER DEFAULT 0`);
runMigration(`ALTER TABLE budgets ADD COLUMN last_reset_at TEXT`);

// Currency preference
runMigration(`ALTER TABLE users ADD COLUMN currency TEXT DEFAULT 'USD'`);

export default db;
