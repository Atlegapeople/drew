'use server';

import { NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

/**
 * API route to get all registered RFID cards
 * GET /api/admin/registered-cards
 */
export async function GET() {
  try {
    console.log('Fetching registered cards from database');
    
    // Get database instance
    const db = await getDbInstance();
    
    // Query all cards from the database
    const cards = db.prepare(`
      SELECT 
        id, 
        card_uid, 
        access_level, 
        created_at, 
        last_access,
        CASE WHEN pin_hash IS NULL THEN 0 ELSE 1 END as has_pin
      FROM access_profiles
      ORDER BY created_at DESC
    `).all();
    
    console.log(`Found ${cards.length} registered cards`);
    
    // Return the cards
    return NextResponse.json({ 
      success: true,
      cards: cards 
    });
  } catch (error) {
    console.error('Error fetching registered cards:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch registered cards',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
