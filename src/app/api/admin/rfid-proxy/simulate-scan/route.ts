import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy endpoint to simulate a card scan on the RFID service
 */
export async function POST(request: NextRequest) {
  try {
    // Get the card UID from the request body
    const body = await request.json();
    const { cardUID } = body;
    
    if (!cardUID) {
      return NextResponse.json(
        { success: false, error: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    // Forward the simulation request to the RFID service
    const rfidServiceUrl = 'http://localhost:3333/api/simulate-scan';
    console.log(`Proxying simulation request to RFID service: ${rfidServiceUrl} with UID: ${cardUID}`);
    
    const response = await fetch(rfidServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cardUID }),
    });
    
    const data = await response.json();
    
    // Return the proxied response
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in RFID proxy for simulate-scan:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to simulate card scan on RFID service',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
