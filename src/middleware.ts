import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware function runs before any request is completed
export function middleware(request: NextRequest) {
  // Add proper caching headers for static assets
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('/images/') ||
    request.nextUrl.pathname.endsWith('.ico')
  ) {
    const headers = new Headers(request.headers);
    headers.set('Cache-Control', 'public, max-age=3600');
    
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }
  
  return NextResponse.next();
}
