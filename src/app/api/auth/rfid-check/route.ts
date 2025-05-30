import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDbInstance } from '@/lib/db/server-db';

/**
 * Checks for the latest RFID scan, validates it against the database,
 * and moves the file to the done folder on successful authentication
 * GET /api/auth/rfid-check
 */
export async function GET() {
  try {
    const latestFilePath = path.join(process.cwd(), 'public', 'card-scans', 'latest.json');
    
    // Check if the latest.json file exists
    if (!fs.existsSync(latestFilePath)) {
      return NextResponse.json({
        status: 'waiting',
        message: 'No card scan detected'
      });
    }
    
    // Read the latest card scan
    const scanData = JSON.parse(fs.readFileSync(latestFilePath, 'utf8'));
    const cardUid = scanData.cardUID;
    
    if (!cardUid) {
      return NextResponse.json({
        status: 'error',
        message: 'Invalid card scan data'
      });
    }
    
    // Get database instance
    const db = await getDbInstance();
    
    // Find profile by card UID
    const profile = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get(cardUid);
    
    if (!profile) {
      // Card not recognized in database
      return NextResponse.json({ 
        status: 'denied',
        message: 'Card not registered in system' 
      });
    }
    
    // Card is valid - update last access time
    db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?').run(profile.id);
    
    // Log successful access
    db.prepare(
      'INSERT INTO access_logs (profile_id, card_uid, method, result) VALUES (?, ?, ?, ?)'
    ).run(profile.id, cardUid, 'rfid', 'granted');
    
    // Move the latest.json file to the done folder
    const doneDir = path.join(process.cwd(), 'public', 'card-scans', 'done');
    
    // Create done directory if it doesn't exist
    if (!fs.existsSync(doneDir)) {
      fs.mkdirSync(doneDir, { recursive: true });
    }
    
    // Create timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const doneFilePath = path.join(doneDir, `scan-${timestamp}.json`);
    
    // Copy the file content to the done directory
    fs.writeFileSync(doneFilePath, JSON.stringify(scanData, null, 2));
    
    // Delete the latest.json file
    fs.unlinkSync(latestFilePath);
    
    // Return success with profile info
    return NextResponse.json({
      status: 'granted',
      profileId: profile.id,
      cardUid: profile.card_uid,
      accessLevel: profile.access_level
    });
  } catch (error) {
    console.error('RFID check error:', error);
    return NextResponse.json({ 
      status: 'error',
      message: 'Error processing card scan' 
    }, { status: 500 });
  }
}
