import { NextRequest, NextResponse } from 'next/server';
import { getDbInstance } from '@/lib/db/server-db';

// Get inventory status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productType = searchParams.get('productType');
    const db = await getDbInstance();
    
    if (productType) {
      // Get specific product inventory
      const inventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      
      if (!inventory) {
        return NextResponse.json({ success: false, message: 'Product not found' }, { status: 404 });
      }
      
      const percentRemaining = Math.round((inventory.current_stock / inventory.max_capacity) * 100);
      const lowStock = percentRemaining <= 20; // Low stock warning at 20%
      
      return NextResponse.json({
        success: true,
        data: {
          productType: inventory.product_type,
          currentStock: inventory.current_stock,
          maxCapacity: inventory.max_capacity,
          percentRemaining,
          lastUpdated: inventory.last_updated,
          lowStock
        }
      });
    } else {
      // Get all inventory
      const inventories = db.prepare('SELECT * FROM inventory').all();
      
      // Define inventory type to fix the implicit any
      interface InventoryItem {
        product_type: string;
        current_stock: number;
        max_capacity: number;
        last_updated: string;
      }
      
      const data = inventories.map((inventory: InventoryItem) => {
        const percentRemaining = Math.round((inventory.current_stock / inventory.max_capacity) * 100);
        const lowStock = percentRemaining <= 20;
        
        return {
          productType: inventory.product_type,
          currentStock: inventory.current_stock,
          maxCapacity: inventory.max_capacity,
          percentRemaining,
          lastUpdated: inventory.last_updated,
          lowStock
        };
      });
      
      return NextResponse.json({ success: true, data });
    }
  } catch (error) {
    console.error('Error getting inventory:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error while fetching inventory'
    }, { status: 500 });
  }
}

// Dispense a product
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { productType, profileId, cardUid } = data;
    
    // Check if all required fields are present
    if (!productType || !profileId || !cardUid) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 });
    }
    
    const db = await getDbInstance();
    
    // Begin transaction
    db.exec('BEGIN TRANSACTION');
    
    try {
      // Check current stock
      const inventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      
      if (!inventory || inventory.current_stock <= 0) {
        db.exec('ROLLBACK');
        return NextResponse.json({ 
          success: false, 
          message: `Out of stock: ${productType}` 
        });
      }
      
      // Update inventory
      db.prepare(`
        UPDATE inventory 
        SET current_stock = current_stock - 1, last_updated = CURRENT_TIMESTAMP 
        WHERE product_type = ?
      `).run(productType);
      
      // Get current date components for reporting
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      const month = now.getMonth() + 1; // JS months are 0-indexed
      const year = now.getFullYear();
      
      // Log usage
      db.prepare(`
        INSERT INTO usage_logs 
          (profile_id, card_uid, product_type, quantity, week_number, month, year) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(profileId, cardUid, productType, 1, weekNumber, month, year);
      
      // Get updated inventory status
      const updatedInventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      const percentRemaining = Math.round((updatedInventory.current_stock / updatedInventory.max_capacity) * 100);
      const lowStock = percentRemaining <= 20;
      
      db.exec('COMMIT');
      
      return NextResponse.json({
        success: true,
        message: `${productType} dispensed successfully`,
        inventoryStatus: {
          productType,
          currentStock: updatedInventory.current_stock,
          maxCapacity: updatedInventory.max_capacity,
          percentRemaining,
          lastUpdated: updatedInventory.last_updated,
          lowStock
        }
      });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error dispensing product:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error during dispensing' 
    }, { status: 500 });
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
