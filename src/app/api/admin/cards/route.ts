'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

// GET handler to retrieve all cards
export async function GET() {
  try {
    const db = await getDbInstance();
    
    const cards = db.prepare(`
      SELECT id, card_uid, access_level, last_access
      FROM access_profiles
      ORDER BY id DESC
    `).all();
    
    return NextResponse.json({
      success: true,
      cards
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}
