import { NextRequest, NextResponse } from 'next/server';

// API endpoint to manually simulate a card scan
export async function POST(request: NextRequest) {
  try {
    // Get the card UID from the request body
    const body = await request.json();
    const { cardUID } = body;
    
    if (!cardUID) {
      return NextResponse.json(
        { error: 'Card UID is required' },
        { status: 400 }
      );
    }
    
    // Import the manual RFID service instead
    const rfidService = await import('@/lib/services/rfid-manual-mode');
    
    // Simulate a card scan
    console.log(`Manually simulating card scan with UID: ${cardUID}`);
    await rfidService.simulateCardScan(cardUID);
    
    return NextResponse.json(
      { success: true, message: `Card scan simulated with UID: ${cardUID}` },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error simulating card scan:', error);
    return NextResponse.json(
      { error: 'Failed to simulate card scan', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
