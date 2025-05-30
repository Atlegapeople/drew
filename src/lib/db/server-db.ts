'use server';

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

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
export async function getDb() {
  ensureDbDir();
  const db = new Database(DB_PATH);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
  
  return db;
}

// Create tables if they don't exist
export async function initDb() {
  const db = await getDb();
  
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
  
  // Add demo and admin users if there are no users
  const userCount = db.prepare('SELECT COUNT(*) as count FROM access_profiles').get();
  
  if (userCount.count === 0) {
    // Add demo user with PIN 1234 and a sample RFID card
    const demoSalt = crypto.randomBytes(16).toString('hex');
    const demoPin = '1234';
    const demoHash = await hashPin(demoPin, demoSalt);
    
    db.prepare(
      'INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level) VALUES (?, ?, ?, ?)'
    ).run('DEMO0001', demoHash, demoSalt, 'user');
    
    // Add admin user with PIN 9999 and a dedicated admin RFID card
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminPin = '9999';
    const adminHash = await hashPin(adminPin, adminSalt);
    
    db.prepare(
      'INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level) VALUES (?, ?, ?, ?)'
    ).run('ADMIN0001', adminHash, adminSalt, 'admin');
  }
  
  // Always ensure admin user exists (to handle previously initialized databases)
  const adminExists = db.prepare('SELECT COUNT(*) as count FROM access_profiles WHERE card_uid = ?').get('ADMIN0001');
  
  if (adminExists.count === 0) {
    // Create admin user if it doesn't exist yet
    const adminSalt = crypto.randomBytes(16).toString('hex');
    const adminPin = '9999';
    const adminHash = await hashPin(adminPin, adminSalt);
    
    db.prepare(
      'INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level) VALUES (?, ?, ?, ?)'
    ).run('ADMIN0001', adminHash, adminSalt, 'admin');
    
    console.log('Added admin user with PIN 9999 and card_uid ADMIN0001');
  }
  
  // Update DEMO0001 user to have user access level instead of admin (fix for previous initialization)
  db.prepare('UPDATE access_profiles SET access_level = ? WHERE card_uid = ? AND access_level = ?')
    .run('user', 'DEMO0001', 'admin');
  
  return db;
}

// Hash PIN with salt using SHA-256
export async function hashPin(pin: string, salt: string): Promise<string> {
  return crypto
    .createHash('sha256')
    .update(pin + salt)
    .digest('hex');
}

// Verify PIN
export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  const pinHash = await hashPin(pin, salt);
  return pinHash === hash;
}

// Initialize database as needed
let dbInstance: any = null;

// Get or create database instance
export async function getDbInstance() {
  if (!dbInstance) {
    dbInstance = await initDb();
  }
  return dbInstance;
}

// Only export async functions as required by 'use server'
// No default export of objects allowed
