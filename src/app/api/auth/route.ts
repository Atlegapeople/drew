import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance, verifyPin, hashPin } from '@/lib/db/server-db';
import crypto from 'crypto';

// Handle RFID authentication
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { method, cardUid, pin } = data;
    
    // Get database instance
    const db = await getDbInstance();
    
    if (method === 'rfid' && cardUid) {
      // Find profile by card UID
      const profile = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get(cardUid);
      
      if (!profile) {
        // Log failed attempt
        db.prepare('INSERT INTO access_logs (card_uid, method, result) VALUES (?, ?, ?)')
          .run(cardUid, 'rfid', 'denied');
        
        return NextResponse.json({ 
          success: false, 
          message: 'Card not recognized' 
        });
      }
      
      // Update last access time
      db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?').run(profile.id);
      
      // Log successful access
      db.prepare(
        'INSERT INTO access_logs (profile_id, card_uid, method, result) VALUES (?, ?, ?, ?)'
      ).run(profile.id, cardUid, 'rfid', 'granted');
      
      return NextResponse.json({
        success: true,
        profileId: profile.id,
        cardUid: profile.card_uid,
        accessLevel: profile.access_level
      });
    } 
    else if (method === 'pin' && pin) {
      // Find all profiles (PIN is not unique, so we need to check all)
      const profiles = db.prepare('SELECT * FROM access_profiles WHERE pin_hash IS NOT NULL').all();
      
      // Check if PIN matches any profile
      for (const profile of profiles) {
        // Await the result of verifyPin
        const isPinValid = await verifyPin(pin, profile.pin_hash, profile.pin_salt);
        if (isPinValid) {
          // Update last access time
          db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?').run(profile.id);
          
          // Log successful access
          db.prepare(
            'INSERT INTO access_logs (profile_id, card_uid, method, result) VALUES (?, ?, ?, ?)'
          ).run(profile.id, profile.card_uid, 'pin', 'granted');
          
          return NextResponse.json({
            success: true,
            profileId: profile.id,
            cardUid: profile.card_uid,
            accessLevel: profile.access_level
          });
        }
      }
      
      // If we get here, no match was found
      db.prepare(
        'INSERT INTO access_logs (method, result) VALUES (?, ?)'
      ).run('pin', 'denied');
      
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid PIN' 
      });
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Invalid request parameters' 
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during authentication' 
    }, { status: 500 });
  }
}

// Get failed PIN attempts in the last 5 minutes
export async function GET(request: NextRequest) {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    // Get database instance
    const db = await getDbInstance();
    
    const result = db.prepare(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE method = 'pin' 
      AND result = 'denied' 
      AND timestamp > ?
    `).get(fiveMinutesAgo);
    
    return NextResponse.json({ count: result.count });
  } catch (error) {
    console.error('Error getting failed attempts:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
