import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

// Get access logs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') as string) : 50;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset') as string) : 0;
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const method = searchParams.get('method') || '';
    const result = searchParams.get('result') || '';
    
    // Get database instance
    const db = await getDbInstance();
    
    // Build query with optional filters
    let query = `
      SELECT * FROM access_logs
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (startDate) {
      query += ' AND timestamp >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND timestamp <= ?';
      params.push(endDate);
    }
    
    if (method) {
      query += ' AND method = ?';
      params.push(method);
    }
    
    if (result) {
      query += ' AND result = ?';
      params.push(result);
    }
    
    // Add order and pagination
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    // Get access logs with pagination
    const logs = db.prepare(query).all(...params);
    
    // Get total count for pagination
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count').split('ORDER BY')[0];
    const countResult = db.prepare(countQuery).get(...params.slice(0, -2));
    
    return NextResponse.json({ 
      success: true, 
      data: logs,
      total: countResult.count,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < countResult.count
      }
    });
  } catch (error) {
    console.error('Error getting access logs:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching access logs' 
    }, { status: 500 });
  }
}
