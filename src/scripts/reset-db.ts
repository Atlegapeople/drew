// Script to reset the database and reinitialize it
import fs from 'fs';
import path from 'path';
import { initDb } from '../lib/db/server-db';

const DB_PATH = path.join(process.cwd(), 'local-data', 'access.db');

console.log('Checking for database at:', DB_PATH);

// Delete the existing database if it exists
if (fs.existsSync(DB_PATH)) {
  console.log('Database found, deleting...');
  fs.unlinkSync(DB_PATH);
  console.log('Database deleted successfully.');
} else {
  console.log('No existing database found.');
}

// Create directory if it doesn't exist
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  console.log(`Creating directory: ${dir}`);
  fs.mkdirSync(dir, { recursive: true });
}

// Initialize the database
console.log('Initializing new database...');
initDb().then(() => {
  console.log('Database initialized successfully with:');
  console.log('- Demo user (DEMO0001) with PIN 1234');
  console.log('- Admin user (ADMIN0001) with PIN 9999');
  console.log('Done!');
}).catch(err => {
  console.error('Error initializing database:', err);
});
