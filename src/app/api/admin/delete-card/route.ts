'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

export async function DELETE(request: NextRequest) {
  try {
    // Try to get card UID from URL params first
    const url = new URL(request.url);
    let cardUid = url.searchParams.get('cardUID') || url.searchParams.get('cardUid');
    
    // If not found in URL, try to get from request body
    if (!cardUid) {
      try {
        const body = await request.json();
        cardUid = body.cardUid || body.cardUID;
      } catch (e) {
        // If body parsing fails, that's ok - might be using URL params instead
      }
    }
    
    if (!cardUid) {
      return NextResponse.json(
        { success: false, message: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDbInstance();
    
    // Check if card exists
    const existingCard = db.prepare(
      'SELECT id FROM access_profiles WHERE card_uid = ?'
    ).get(cardUid);
    
    if (!existingCard) {
      return NextResponse.json(
        { success: false, message: 'Card not found' },
        { status: 404 }
      );
    }
    
    // Delete the card
    db.prepare('DELETE FROM access_profiles WHERE card_uid = ?').run(cardUid);
    
    return NextResponse.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete card' },
      { status: 500 }
    );
  }
}
