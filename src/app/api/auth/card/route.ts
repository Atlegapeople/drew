'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

export async function POST(request: NextRequest) {
  try {
    const { cardUid } = await request.json();
    
    if (!cardUid) {
      return NextResponse.json(
        { success: false, message: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDbInstance();
    
    // Check if card exists and get profile
    const profile = db.prepare(`
      SELECT id, access_level
      FROM access_profiles
      WHERE card_uid = ?
    `).get(cardUid);
    
    if (!profile) {
      // Log unauthorized access attempt
      db.prepare(`
        INSERT INTO access_logs (card_uid, method, result)
        VALUES (?, ?, ?)
      `).run(cardUid, 'rfid', 'unauthorized');
      
      return NextResponse.json(
        { success: false, message: 'Unauthorized card' },
        { status: 401 }
      );
    }
    
    // Update last access time
    db.prepare(`
      UPDATE access_profiles
      SET last_access = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(profile.id);
    
    // Log successful access
    db.prepare(`
      INSERT INTO access_logs (profile_id, card_uid, method, result)
      VALUES (?, ?, ?, ?)
    `).run(profile.id, cardUid, 'rfid', 'success');
    
    return NextResponse.json({
      success: true,
      accessLevel: profile.access_level,
      profileId: profile.id
    });
  } catch (error) {
    console.error('Error authenticating card:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to authenticate card' },
      { status: 500 }
    );
  }
}
