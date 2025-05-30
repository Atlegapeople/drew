'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

// DELETE handler for a specific card
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = parseInt(params.id);
    
    if (isNaN(cardId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid card ID' },
        { status: 400 }
      );
    }
    
    const db = await getDbInstance();
    
    // Check if card exists
    const card = db.prepare('SELECT * FROM access_profiles WHERE id = ?').get(cardId);
    
    if (!card) {
      return NextResponse.json(
        { success: false, message: 'Card not found' },
        { status: 404 }
      );
    }
    
    // Don't allow deleting the last admin card
    if (card.access_level === 'admin') {
      const adminCount = db.prepare(
        'SELECT COUNT(*) as count FROM access_profiles WHERE access_level = ?'
      ).get('admin');
      
      if (adminCount.count <= 1) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete the last admin card' },
          { status: 400 }
        );
      }
    }
    
    // Delete the card
    db.prepare('DELETE FROM access_profiles WHERE id = ?').run(cardId);
    
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
