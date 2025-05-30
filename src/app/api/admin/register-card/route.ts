'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance, hashPin } from '@/lib/db/server-db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('Processing card registration request');
    
    // Extract and log the request body
    const body = await request.json();
    console.log('Registration request body:', body);
    
    const { cardUid, accessLevel, pin } = body;
    
    console.log('Extracted fields:', { cardUid, accessLevel, pin: pin ? '***' : 'not provided' });
    
    if (!cardUid) {
      console.log('Error: Card UID is required');
      return NextResponse.json(
        { success: false, message: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    if (accessLevel !== 'user' && accessLevel !== 'admin') {
      console.log('Error: Invalid access level:', accessLevel);
      return NextResponse.json(
        { success: false, message: 'Invalid access level' },
        { status: 400 }
      );
    }
    
    console.log('Getting database instance...');
    let db;
    try {
      db = await getDbInstance();
      console.log('Database instance obtained successfully');
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database connection error' },
        { status: 500 }
      );
    }
    
    // Verify database connection
    try {
      const testQuery = db.prepare('SELECT 1 as test').get();
      console.log('Database test query result:', testQuery);
    } catch (testError) {
      console.error('Database test query failed:', testError);
      return NextResponse.json(
        { success: false, message: 'Database query error' },
        { status: 500 }
      );
    }
    
    // Check if card is already registered
    try {
      console.log('Checking if card is already registered...');
      const existingCard = db.prepare(
        'SELECT id FROM access_profiles WHERE card_uid = ?'
      ).get(cardUid);
      
      console.log('Existing card check result:', existingCard);
      
      if (existingCard) {
        console.log('Error: Card is already registered');
        return NextResponse.json(
          { success: false, message: 'Card is already registered' },
          { status: 400 }
        );
      }
    } catch (queryError) {
      console.error('Error checking existing card:', queryError);
      return NextResponse.json(
        { success: false, message: 'Error checking if card exists' },
        { status: 500 }
      );
    }
    
    // Hash PIN if provided
    let pinHash = null;
    let pinSalt = null;
    
    if (pin) {
      try {
        console.log('Hashing PIN...');
        pinSalt = crypto.randomBytes(16).toString('hex');
        pinHash = await hashPin(pin, pinSalt);
        console.log('PIN hashed successfully');
      } catch (hashError) {
        console.error('Error hashing PIN:', hashError);
        return NextResponse.json(
          { success: false, message: 'Error processing PIN' },
          { status: 500 }
        );
      }
    }
    
    // Register the new card
    try {
      console.log('Registering new card...');
      db.prepare(`
        INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level)
        VALUES (?, ?, ?, ?)
      `).run(cardUid, pinHash, pinSalt, accessLevel);
      console.log('Card registered successfully');
      
      return NextResponse.json({
        success: true,
        message: 'Card registered successfully'
      });
    } catch (insertError) {
      console.error('Error inserting new card:', insertError);
      return NextResponse.json(
        { success: false, message: `Database error: ${insertError instanceof Error ? insertError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error registering card:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register card' },
      { status: 500 }
    );
  }
}
