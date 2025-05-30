import { NextRequest, NextResponse } from 'next/server';

// Server-Sent Events (SSE) endpoint for card scan
export async function GET(request: NextRequest) {
  try {
    // Create a response with appropriate headers for SSE
    const encoder = new TextEncoder();
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    
    const response = new NextResponse(responseStream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

    // Send an initial message to establish the connection
    await writer.write(
      encoder.encode('event: connected\ndata: {"status":"waiting_for_card"}\n\n')
    );

    console.log('Connecting to RFID service at http://localhost:3333/api/listen');
    
    // Track connection status
    let isConnectionClosed = false;
    
    // RFID service URL
    const rfidServiceUrl = 'http://localhost:3333/api/listen';
    
    // Handle connection abort
    request.signal.addEventListener('abort', async () => {
      console.log('Client aborted the connection');
      isConnectionClosed = true;
      clearTimeout(timeout);
      
      // Don't try to write to the stream as it's likely already closed
      try {
        await writer.close();
      } catch (error) {
        // Ignore error if stream is already closed
      }
    });
    
    // Timeout after 10 seconds
    const timeout = setTimeout(async () => {
      if (isConnectionClosed) return;
      
      try {
        console.log('Card scan timed out');
        await writer.write(
          encoder.encode('event: timeout\ndata: {"timeout":true}\n\n')
        );
        isConnectionClosed = true;
        await writer.close();
      } catch (error) {
        console.error('Error sending timeout event:', error);
      }
    }, 10000); // 10 seconds
    
    // Function to fetch from the RFID service and pipe events to our client
    const fetchFromRFIDService = async () => {
      try {
        // Use node-fetch to connect to the RFID service
        const fetch = (await import('node-fetch')).default;
        const rfidResponse = await fetch(rfidServiceUrl);
        
        if (!rfidResponse.ok || !rfidResponse.body) {
          throw new Error(`Failed to connect to RFID service: ${rfidResponse.status}`);
        }
        
        // Process the response as a stream
        const reader = rfidResponse.body.getReader();
        const textDecoder = new TextDecoder();
        
        let buffer = '';
        
        // Process the stream
        while (!isConnectionClosed) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('RFID service connection closed');
            break;
          }
          
          // Decode the chunk and add it to our buffer
          buffer += textDecoder.decode(value, { stream: true });
          
          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep the last incomplete message in the buffer
          
          for (const message of messages) {
            if (message.trim() === '') continue;
            
            const lines = message.split('\n');
            const eventType = lines.find(line => line.startsWith('event:'))?.substring(6).trim() || 'message';
            const dataLine = lines.find(line => line.startsWith('data:'));
            
            if (dataLine) {
              const data = dataLine.substring(5).trim();
              
              try {
                const parsedData = JSON.parse(data);
                console.log(`Received ${eventType} event:`, parsedData);
                
                // If we got a card event with a cardUID, forward it to the client
                if ((eventType === 'message' || eventType === 'card') && parsedData.cardUID) {
                  console.log('*** CARD DETECTED! Forwarding to client ***', parsedData.cardUID);
                  
                  // Clear the timeout since we got a card
                  clearTimeout(timeout);
                  
                  const cardData = { cardUID: parsedData.cardUID };
                  console.log('Sending card data to client:', cardData);
                  
                  // Forward the card event to our client
                  await writer.write(
                    encoder.encode(`event: card\ndata: ${JSON.stringify(cardData)}\n\n`)
                  );
                  
                  console.log('Card data sent to client, closing connection');
                  
                  // Close our connection to the client
                  isConnectionClosed = true;
                  await writer.close();
                  break;
                }
              } catch (error) {
                console.error('Error parsing SSE data:', error);
              }
            }
          }
        }
        
        // If we get here and the connection isn't closed, close it
        if (!isConnectionClosed) {
          try {
            await writer.close();
          } catch (error) {
            // Ignore error if stream is already closed
          }
        }
      } catch (error) {
        console.error('Error connecting to RFID service:', error);
        
        if (!isConnectionClosed) {
          try {
            await writer.write(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ error: 'Failed to connect to RFID service' })}\n\n`)
            );
            isConnectionClosed = true;
            await writer.close();
          } catch (err) {
            // Ignore error if stream is already closed
          }
        }
      }
    };
    
    // Start fetching from the RFID service
    fetchFromRFIDService();
    
    return response;
  } catch (error) {
    console.error('Error in wait-for-card API route:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
