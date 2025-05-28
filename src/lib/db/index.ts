import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// For development environments, store in project directory
// For production on Raspberry Pi, use the specified path
const DB_PATH = process.env.NODE_ENV === 'production' 
  ? '/home/pi/drew-access/access.db'
  : path.join(process.cwd(), 'local-data', 'access.db');

// Ensure directory exists
const ensureDbDir = () => {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Initialize database
export function getDb() {
  ensureDbDir();
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  return db;
}

// Create tables if they don't exist
export function initDb() {
  const db = getDb();
  
  // Create access_profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_uid TEXT UNIQUE,
      pin_hash TEXT,
      pin_salt TEXT,
      access_level TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_access DATETIME
    )
  `);
  
  // Create access_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER,
      card_uid TEXT,
      method TEXT,
      result TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (profile_id) REFERENCES access_profiles(id)
    )
  `);
  
  // Create inventory table
  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory (
      product_type TEXT PRIMARY KEY,
      current_stock INTEGER,
      max_capacity INTEGER,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create usage_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER,
      card_uid TEXT,
      product_type TEXT,
      quantity INTEGER DEFAULT 1,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      week_number INTEGER,
      month INTEGER,
      year INTEGER,
      FOREIGN KEY (profile_id) REFERENCES access_profiles(id),
      FOREIGN KEY (product_type) REFERENCES inventory(product_type)
    )
  `);
  
  // Initialize inventory if empty
  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory').get();
  
  if (inventoryCount.count === 0) {
    db.prepare('INSERT INTO inventory (product_type, current_stock, max_capacity) VALUES (?, ?, ?)').run('tampons', 50, 50);
    db.prepare('INSERT INTO inventory (product_type, current_stock, max_capacity) VALUES (?, ?, ?)').run('pads', 50, 50);
  }
  
  // Add a demo user if there are no users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM access_profiles').get();
  
  if (userCount.count === 0) {
    // Add demo user with PIN 1234 and a sample RFID card
    const salt = crypto.randomBytes(16).toString('hex');
    const pin = '1234';
    const hash = hashPin(pin, salt);
    
    db.prepare(
      'INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level) VALUES (?, ?, ?, ?)'
    ).run('DEMO0001', hash, salt, 'admin');
  }
  
  return db;
}

// Hash PIN with salt using SHA-256
export function hashPin(pin: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(pin + salt)
    .digest('hex');
}

// Verify PIN
export function verifyPin(pin: string, hash: string, salt: string): boolean {
  const pinHash = hashPin(pin, salt);
  return pinHash === hash;
}

// Create a new database instance
const db = initDb();

export default db;
