'use server';

import { NextRequest, NextResponse } from 'next/server';

/**
 * This is a diagnostic endpoint to test the full card scan flow
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Testing card scan flow...');
    
    // 1. Make a direct request to the RFID service
    const fetch = (await import('node-fetch')).default;
    
    // First get the status to check if service is running
    const statusResponse = await fetch('http://localhost:3333/api/status');
    const statusData = await statusResponse.json();
    
    console.log('RFID Service Status:', statusData);
    
    // 2. Simulate a card scan through the service
    const simulateResponse = await fetch('http://localhost:3333/api/simulate-scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cardUID: 'TEST' + Date.now().toString().slice(-4) }),
    });
    
    const simulateData = await simulateResponse.json();
    console.log('Simulate Card Response:', simulateData);
    
    // 3. Get the last card from the service
    const lastCardResponse = await fetch('http://localhost:3333/api/last-card');
    const lastCardData = await lastCardResponse.json();
    
    console.log('Last Card Data:', lastCardData);
    
    // Return all test results
    return NextResponse.json({
      success: true,
      serviceStatus: statusData,
      simulateResult: simulateData,
      lastCard: lastCardData
    });
  } catch (error) {
    console.error('Error in test-card-flow:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test card flow',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
