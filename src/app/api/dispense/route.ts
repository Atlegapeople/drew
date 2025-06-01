import { NextRequest, NextResponse } from "next/server";
import fs from 'fs';
import path from 'path';
import { getDbInstance } from '@/lib/db/server-db';
import { cookies } from 'next/headers';

// We've removed the authentication logic since we're using a simpler approach for vending machines
// No need to check session IDs from a sessions table

// Directory to store dispense request files
const DISPENSE_DIR = path.join(process.cwd(), 'public', 'dispense-requests');

// Ensure the dispense requests directory exists
if (!fs.existsSync(DISPENSE_DIR)) {
  fs.mkdirSync(DISPENSE_DIR, { recursive: true });
}

// Helper function to write dispense request to file
function writeDispenseRequest(productType: string): string {
  try {
    // Ensure the directory exists
    if (!fs.existsSync(DISPENSE_DIR)) {
      console.log(`Creating dispense directory: ${DISPENSE_DIR}`);
      fs.mkdirSync(DISPENSE_DIR, { recursive: true });
    }
    
    const timestamp = new Date().getTime();
    const filename = `dispense-${timestamp}.json`;
    const filePath = path.join(DISPENSE_DIR, filename);
    
    const dispenseData = {
      productType,
      timestamp,
      status: 'pending'
    };
    
    console.log(`Writing dispense request to: ${filePath}`);
    fs.writeFileSync(filePath, JSON.stringify(dispenseData, null, 2));
    console.log('Successfully wrote dispense request file');
    return filename;
  } catch (error) {
    console.error('Error writing dispense request file:', error);
    throw new Error('Failed to write dispense request file');
  }
}

// Helper function to communicate with the motor control service
function sendToMotorService(productType: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Ensure the dispense directory exists
      if (!fs.existsSync(DISPENSE_DIR)) {
        console.log(`Creating dispense directory: ${DISPENSE_DIR}`);
        fs.mkdirSync(DISPENSE_DIR, { recursive: true });
      }
      
      // Create latest.json for real-time processing by the motor service
      const latestPath = path.join(DISPENSE_DIR, 'latest.json');
      const dispenseData = {
        productType,
        timestamp: new Date().getTime(),
        status: 'pending'
      };
      
      // Log the file write operation
      console.log(`Writing dispense request to: ${latestPath}`);
      console.log('Dispense data:', dispenseData);
      
      // Write the file with exception handling
      try {
        fs.writeFileSync(latestPath, JSON.stringify(dispenseData, null, 2));
        console.log('Successfully wrote dispense request file');
      } catch (writeError) {
        console.error('Error writing dispense request file:', writeError);
        resolve(false);
        return;
      }
      
      // Give the service some time to process and then check status
      setTimeout(() => {
        try {
          if (fs.existsSync(latestPath)) {
            console.log('Checking dispense status from latest.json');
            const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
            console.log('Dispense status:', data.status);
            resolve(data.status === 'complete');
          } else {
            // File was processed and removed
            console.log('Dispense file was removed, assuming success');
            resolve(true);
          }
        } catch (readError) {
          console.error('Error checking dispense status:', readError);
          resolve(false);
        }
      }, 5000); // Wait 5 seconds for processing
    } catch (error) {
      console.error('Critical error in sendToMotorService:', error);
      resolve(false);
    }
  });
}

// POST handler for dispensing products
export async function POST(request: NextRequest) {
  try {
    // Log the request details for debugging
    console.log('Dispense API called with origin:', request.headers.get('origin'));
    console.log('Request method:', request.method);
    
    // For a vending machine, we've simplified authentication
    // We just use the profileId directly from the request body

    // Parse the request body
    const body = await request.json();
    const { productType, profileId } = body;
    
    // Validate product type
    if (!productType || (productType !== 'tampon' && productType !== 'pad')) {
      return NextResponse.json({ 
        error: 'Invalid product type. Must be "tampon" or "pad"' 
      }, { status: 400 });
    }
    
    // Validate profileId
    if (!profileId) {
      console.log('No profile ID provided in request');
      return NextResponse.json({ 
        error: 'Missing profile ID', 
        message: 'Please provide a valid profile ID'
      }, { status: 400 });
    }
    
    // Write dispense request to file
    const filename = writeDispenseRequest(productType);
    
    // Send to motor control service
    const success = await sendToMotorService(productType);
    
    // Connect to database to log the usage
    console.log('Connecting to database to log usage');
    let db;
    try {
      db = await getDbInstance();
      console.log('Successfully connected to database');
    } catch (dbError) {
      console.error('Error connecting to database:', dbError);
      // Continue without database operations - don't block dispensing
      return NextResponse.json({
        success: true,
        message: `Dispensing ${productType}`,
        filename,
        dispensed: success,
        warning: 'Usage not logged due to database connection error'
      });
    }
    
    try {
      console.log('Beginning database transaction');
      // Begin transaction
      db.prepare('BEGIN TRANSACTION').run();
      
      // Log product usage - use profileId from request body
      console.log(`Logging usage for profile ${profileId}, product ${productType}`);
      try {
        db.prepare(
          `INSERT INTO usage_logs (profile_id, product_type, timestamp) 
           VALUES (?, ?, datetime('now'))`
        ).run(profileId, productType);
        console.log('Successfully logged usage');
      } catch (insertError) {
        console.error('Error logging usage:', insertError);
        // Continue with inventory update even if logging fails
      }
      
      // Update inventory
      console.log(`Updating inventory for ${productType}`);
      try {
        db.prepare(
          `UPDATE inventory 
           SET current_stock = current_stock - 1 
           WHERE product_type = ?`
        ).run(productType);
        console.log('Successfully updated inventory');
      } catch (updateError) {
        console.error('Error updating inventory:', updateError);
        // Continue with commit even if update fails
      }
      
      // Commit transaction
      console.log('Committing transaction');
      db.prepare('COMMIT').run();
      console.log('Transaction committed successfully');
    } catch (error) {
      console.error('Database transaction error:', error);
      try {
        db.prepare('ROLLBACK').run();
        console.log('Transaction rolled back');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      // Don't block dispensing due to database errors
    }
    
    return NextResponse.json({
      success: true,
      message: `Dispensing ${productType}`,
      filename,
      dispensed: success
    });
  } catch (error) {
    console.error('Error in dispense API:', error);
    return NextResponse.json({ 
      error: 'Failed to process dispense request' 
    }, { status: 500 });
  }
}

// DELETE handler to clear the latest dispense request
export async function DELETE(request: NextRequest) {
  try {
    // For a vending machine, we don't need complex session validation
    // Anyone who can physically access the machine can clear dispense requests

    // Clear the latest.json file
    const latestPath = path.join(DISPENSE_DIR, 'latest.json');
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Dispense request cleared'
    });
  } catch (error) {
    console.error('Error clearing dispense request:', error);
    return NextResponse.json({ 
      error: 'Failed to clear dispense request' 
    }, { status: 500 });
  }
}
