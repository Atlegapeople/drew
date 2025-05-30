import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to clear the latest card scan after successful registration
 * DELETE /api/admin/clear-card-scan
 */
export async function DELETE() {
  try {
    const latestFilePath = path.join(process.cwd(), 'public', 'card-scans', 'latest.json');
    
    // Check if the file exists
    if (fs.existsSync(latestFilePath)) {
      // Delete the file
      fs.unlinkSync(latestFilePath);
      console.log('Deleted latest card scan file');
      
      return NextResponse.json({
        success: true,
        message: 'Latest card scan cleared'
      });
    } else {
      console.log('Latest card scan file not found');
      return NextResponse.json({
        success: true,
        message: 'Latest card scan file not found'
      });
    }
  } catch (error) {
    console.error('Error clearing latest card scan:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to clear latest card scan' },
      { status: 500 }
    );
  }
}
