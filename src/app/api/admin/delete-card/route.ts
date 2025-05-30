import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

export async function DELETE(request: NextRequest) {
  let db = null;
  
  try {
    // Try to get card UID from URL params first
    const url = new URL(request.url);
    let cardUid = url.searchParams.get('cardUID') || url.searchParams.get('cardUid');
    
    // If not found in URL, try to get from request body
    if (!cardUid) {
      try {
        // Clone the request before reading the body to avoid potential stream consumed errors
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        console.log('Received delete body:', body); 
        cardUid = body.cardUid || body.cardUID;
      } catch (e) {
        console.error('Error parsing request body:', e);
        // If body parsing fails, that's ok - might be using URL params instead
      }
    }
    
    console.log('Attempting to delete card with UID:', cardUid);
    
    if (!cardUid) {
      return NextResponse.json(
        { success: false, message: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    // Initialize database connection
    try {
      db = await getDbInstance();
      console.log('Database connection established');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Check if card exists
    let existingCard;
    try {
      existingCard = db.prepare(
        'SELECT id FROM access_profiles WHERE card_uid = ?'
      ).get(cardUid);
      console.log('Existing card check result:', existingCard);
    } catch (queryError) {
      console.error('Error checking if card exists:', queryError);
      return NextResponse.json(
        { success: false, message: 'Error checking if card exists' },
        { status: 500 }
      );
    }
    
    if (!existingCard) {
      return NextResponse.json(
        { success: false, message: 'Card not found' },
        { status: 404 }
      );
    }
    
    // First, we need to delete related records in access_logs and usage_logs
    // to avoid foreign key constraint errors
    try {
      // Begin a transaction for data integrity
      db.exec('BEGIN TRANSACTION');
      
      // Get the profile_id for this card to delete related records
      const profileData = db.prepare('SELECT id FROM access_profiles WHERE card_uid = ?').get(cardUid);
      const profileId = profileData?.id;
      
      console.log('Related profile ID:', profileId);
      
      if (profileId) {
        // Delete related records in access_logs
        const accessLogsResult = db.prepare('DELETE FROM access_logs WHERE profile_id = ?').run(profileId);
        console.log('Deleted access logs:', accessLogsResult);
        
        // Delete related records in usage_logs
        const usageLogsResult = db.prepare('DELETE FROM usage_logs WHERE profile_id = ?').run(profileId);
        console.log('Deleted usage logs:', usageLogsResult);
      }
      
      // Now delete the card from access_profiles
      const deleteResult = db.prepare('DELETE FROM access_profiles WHERE card_uid = ?').run(cardUid);
      console.log('Delete card result:', deleteResult);
      
      // Commit the transaction if everything succeeded
      db.exec('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: 'Card deleted successfully'
      });
    } catch (deleteError) {
      // If anything fails, roll back the transaction
      try {
        db.exec('ROLLBACK');
        console.log('Transaction rolled back due to error');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
      
      console.error('Error deleting card from database:', deleteError);
      
      // Provide a more user-friendly error message
      let errorMessage = 'Failed to delete card from database';
      
      // Type guard to check if the error has a code property
      if (deleteError && typeof deleteError === 'object' && 'code' in deleteError) {
        if (deleteError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
          errorMessage = 'This card has usage history that prevents deletion. The system will now attempt to remove this history first.';
        }
      }
      
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete card' },
      { status: 500 }
    );
  }
}
