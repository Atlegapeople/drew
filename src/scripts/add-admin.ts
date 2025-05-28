// Script to add or update the admin user
import { getDbInstance, hashPin } from '../lib/db/server-db';
import crypto from 'crypto';

async function addAdminUser() {
  try {
    console.log('Getting database instance...');
    const db = await getDbInstance();
    
    // Check if admin user exists
    const adminExists = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get('ADMIN0001');
    
    if (adminExists) {
      console.log('Admin user already exists, updating...');
      
      // Generate new credentials
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminPin = '9999';
      const adminHash = await hashPin(adminPin, adminSalt);
      
      // Update the admin user
      db.prepare(
        'UPDATE access_profiles SET pin_hash = ?, pin_salt = ?, access_level = ? WHERE card_uid = ?'
      ).run(adminHash, adminSalt, 'admin', 'ADMIN0001');
      
      console.log('Admin user updated successfully with PIN 9999.');
    } else {
      console.log('Admin user does not exist, creating...');
      
      // Generate credentials
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminPin = '9999';
      const adminHash = await hashPin(adminPin, adminSalt);
      
      // Add admin user
      db.prepare(
        'INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level) VALUES (?, ?, ?, ?)'
      ).run('ADMIN0001', adminHash, adminSalt, 'admin');
      
      console.log('Admin user created successfully with PIN 9999.');
    }
    
    // Update demo user to be a regular user
    const demoExists = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get('DEMO0001');
    if (demoExists) {
      db.prepare('UPDATE access_profiles SET access_level = ? WHERE card_uid = ?').run('user', 'DEMO0001');
      console.log('Updated DEMO0001 user to regular user access level.');
    }
    
    // Display all users for verification
    const users = db.prepare('SELECT id, card_uid, access_level FROM access_profiles').all();
    console.log('\nCurrent users in database:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Card: ${user.card_uid}, Access Level: ${user.access_level}`);
    });
    
    console.log('\nDone! Admin user (ADMIN0001) with PIN 9999 is now set up.');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the function
addAdminUser();
