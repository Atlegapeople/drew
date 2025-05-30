import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Proxy endpoint to fetch the last card scan from the RFID service
 * This endpoint has two methods:
 * 1. Try to get data from the RFID service directly (http://localhost:3333/api/last-card)
 * 2. If that fails, read the latest scan from the card-scans directory
 */
export async function GET(request: NextRequest) {
  try {
    // Add a cache-busting parameter
    const cacheBuster = Date.now();
    
    // Try method 1: Get data from RFID service API
    let cardData = await tryGetFromRfidService(cacheBuster);
    
    // If that fails, try method 2: Read from JSON files
    if (!cardData || !cardData.success || !cardData.data.cardUID) {
      console.log('Trying to read card data from local JSON files...');
      cardData = await tryReadFromJsonFiles();
    }
    
    // Return whatever data we got
    return NextResponse.json(cardData);
  } catch (error) {
    console.error('Error in RFID proxy for last-card:', error);
    // Return a valid JSON response even on error
    return NextResponse.json({
      success: false,
      data: {
        cardUID: null,
        timestamp: new Date().toISOString(),
        status: 'error'
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Try to get card data from the RFID service API
 */
async function tryGetFromRfidService(cacheBuster: number) {
  // Forward the request to the RFID service with cache-busting
  const rfidServiceUrl = `http://localhost:3333/api/last-card?t=${cacheBuster}`;
  console.log('Proxying request to RFID service:', rfidServiceUrl);

  // Set a timeout for the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
  
  try {
    const response = await fetch(rfidServiceUrl, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    // Clear the timeout
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`RFID service returned non-OK status: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('RFID service response:', JSON.stringify(data));
    
    // Process the response to ensure it contains the card UID in a consistent format
    let processedData = {
      success: true,
      data: {
        cardUID: null,
        timestamp: new Date().toISOString(),
        status: 'success'
      }
    };
    
    // Extract cardUID from different possible locations in the response
    if (data.cardUID) {
      processedData.data.cardUID = data.cardUID;
    } else if (data.uid) {
      processedData.data.cardUID = data.uid;
    } else if (data.data && data.data.cardUID) {
      processedData.data.cardUID = data.data.cardUID;
    } else if (data.data && data.data.uid) {
      processedData.data.cardUID = data.data.uid;
    } else if (data.data && data.data.formattedUID) {
      // Remove colons from formatted UID if present
      processedData.data.cardUID = data.data.formattedUID.replace(/:/g, '');
    }
    
    if (processedData.data.cardUID) {
      console.log(`RFID proxy: Card ${processedData.data.cardUID} (from API)`);
    }
    
    // Extract timestamp if available
    if (data.timestamp) {
      processedData.data.timestamp = data.timestamp;
    } else if (data.time) {
      processedData.data.timestamp = data.time;
    } else if (data.data && data.data.timestamp) {
      processedData.data.timestamp = data.data.timestamp;
    } else if (data.data && data.data.time) {
      processedData.data.timestamp = data.data.time;
    }
    
    return processedData;
  } catch (error) {
    // Clear the timeout if there was an error
    clearTimeout(timeoutId);
    console.log('RFID service connection failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Try to read card data from the JSON files
 */
async function tryReadFromJsonFiles() {
  try {
    // Try to read the latest.json file from the public directory
    const latestFilePath = path.join(process.cwd(), 'public', 'card-scans', 'latest.json');
    
    // Check if the file exists
    if (!fs.existsSync(latestFilePath)) {
      console.log('Latest card scan file not found');
      return {
        success: false,
        data: {
          cardUID: null,
          timestamp: new Date().toISOString(),
          status: 'no_data'
        },
        message: 'No card scan data available'
      };
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(latestFilePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    console.log('Read card data from file:', JSON.stringify(data));
    
    // Create a response in the expected format
    const response = {
      success: true,
      data: {
        cardUID: data.cardUID || data.uid || (data.formattedUID ? data.formattedUID.replace(/:/g, '') : null),
        timestamp: data.timestamp || data.time || new Date().toISOString(),
        status: 'success',
        source: 'file'
      }
    };
    
    if (response.data.cardUID) {
      console.log(`RFID proxy: Card ${response.data.cardUID} (from file)`);
    }
    
    return response;
  } catch (error) {
    console.error('Error reading card data from file:', error);
    return {
      success: false,
      data: {
        cardUID: null,
        timestamp: new Date().toISOString(),
        status: 'error'
      },
      message: 'Error reading card data from file'
    };
  }
}
