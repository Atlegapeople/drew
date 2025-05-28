import db from '../db';

export type ProductType = 'tampons' | 'pads';

export interface InventoryStatus {
  productType: ProductType;
  currentStock: number;
  maxCapacity: number;
  percentRemaining: number;
  lastUpdated: string;
  lowStock: boolean;
}

export interface DispensingResult {
  success: boolean;
  message?: string;
  inventoryStatus?: InventoryStatus;
}

export class InventoryService {
  // Get current inventory status for a product
  static getInventoryStatus(productType: ProductType): InventoryStatus | null {
    try {
      const inventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      
      if (!inventory) {
        return null;
      }
      
      const percentRemaining = Math.round((inventory.current_stock / inventory.max_capacity) * 100);
      const lowStock = percentRemaining <= 20; // Low stock warning at 20%
      
      return {
        productType,
        currentStock: inventory.current_stock,
        maxCapacity: inventory.max_capacity,
        percentRemaining,
        lastUpdated: inventory.last_updated,
        lowStock
      };
    } catch (error) {
      console.error(`Error getting inventory for ${productType}:`, error);
      return null;
    }
  }
  
  // Get inventory status for all products
  static getAllInventory(): InventoryStatus[] {
    try {
      const inventories = db.prepare('SELECT * FROM inventory').all();
      
      return inventories.map(inventory => {
        const percentRemaining = Math.round((inventory.current_stock / inventory.max_capacity) * 100);
        const lowStock = percentRemaining <= 20;
        
        return {
          productType: inventory.product_type as ProductType,
          currentStock: inventory.current_stock,
          maxCapacity: inventory.max_capacity,
          percentRemaining,
          lastUpdated: inventory.last_updated,
          lowStock
        };
      });
    } catch (error) {
      console.error('Error getting all inventory:', error);
      return [];
    }
  }
  
  // Dispense a product (reduce inventory and log usage)
  static dispenseProduct(productType: ProductType, profileId: number, cardUid: string): DispensingResult {
    try {
      // Begin transaction
      const transaction = db.transaction(() => {
        // Check current stock
        const inventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
        
        if (!inventory || inventory.current_stock <= 0) {
          throw new Error(`Out of stock: ${productType}`);
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
        
        return {
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
        };
      });
      
      return transaction();
    } catch (error) {
      console.error(`Error dispensing ${productType}:`, error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Dispensing error' 
      };
    }
  }
  
  // Restock a product
  static restockProduct(productType: ProductType, quantity: number): DispensingResult {
    try {
      // Get current inventory
      const inventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      
      if (!inventory) {
        return { 
          success: false, 
          message: `Product type not found: ${productType}` 
        };
      }
      
      // Calculate new stock, ensuring it doesn't exceed max capacity
      const newStock = Math.min(inventory.current_stock + quantity, inventory.max_capacity);
      
      // Update inventory
      db.prepare(`
        UPDATE inventory 
        SET current_stock = ?, last_updated = CURRENT_TIMESTAMP 
        WHERE product_type = ?
      `).run(newStock, productType);
      
      // Get updated inventory status
      const updatedInventory = db.prepare('SELECT * FROM inventory WHERE product_type = ?').get(productType);
      const percentRemaining = Math.round((updatedInventory.current_stock / updatedInventory.max_capacity) * 100);
      const lowStock = percentRemaining <= 20;
      
      return {
        success: true,
        message: `${productType} restocked to ${newStock} units`,
        inventoryStatus: {
          productType,
          currentStock: updatedInventory.current_stock,
          maxCapacity: updatedInventory.max_capacity,
          percentRemaining,
          lastUpdated: updatedInventory.last_updated,
          lowStock
        }
      };
    } catch (error) {
      console.error(`Error restocking ${productType}:`, error);
      return { 
        success: false, 
        message: 'Restocking error' 
      };
    }
  }
  
  // Get usage stats for a particular time period
  static getUsageStats(period: 'week' | 'month' | 'year', value: number): any {
    try {
      let query;
      
      if (period === 'week') {
        query = `
          SELECT 
            card_uid, 
            product_type, 
            SUM(quantity) as total_quantity
          FROM usage_logs
          WHERE week_number = ? AND year = ?
          GROUP BY card_uid, product_type
          ORDER BY card_uid, product_type
        `;
        
        // For week, we need the current year too
        const currentYear = new Date().getFullYear();
        return db.prepare(query).all(value, currentYear);
      } else if (period === 'month') {
        query = `
          SELECT 
            card_uid, 
            product_type, 
            SUM(quantity) as total_quantity
          FROM usage_logs
          WHERE month = ? AND year = ?
          GROUP BY card_uid, product_type
          ORDER BY card_uid, product_type
        `;
        
        // For month, we need the current year too
        const currentYear = new Date().getFullYear();
        return db.prepare(query).all(value, currentYear);
      } else {
        query = `
          SELECT 
            card_uid, 
            product_type, 
            SUM(quantity) as total_quantity
          FROM usage_logs
          WHERE year = ?
          GROUP BY card_uid, product_type
          ORDER BY card_uid, product_type
        `;
        
        return db.prepare(query).all(value);
      }
    } catch (error) {
      console.error(`Error getting usage stats for ${period} ${value}:`, error);
      return [];
    }
  }
  
  // Get usage by product type
  static getUsageByProduct(startDate?: string, endDate?: string): any {
    try {
      let query;
      
      if (startDate && endDate) {
        query = `
          SELECT 
            product_type, 
            SUM(quantity) as total_quantity
          FROM usage_logs
          WHERE timestamp >= ? AND timestamp <= ?
          GROUP BY product_type
        `;
        
        return db.prepare(query).all(startDate, endDate);
      } else {
        query = `
          SELECT 
            product_type, 
            SUM(quantity) as total_quantity
          FROM usage_logs
          GROUP BY product_type
        `;
        
        return db.prepare(query).all();
      }
    } catch (error) {
      console.error('Error getting usage by product:', error);
      return [];
    }
  }
  
  // Export usage data as CSV
  static exportUsageData(startDate?: string, endDate?: string): string {
    try {
      let query;
      let rows;
      
      if (startDate && endDate) {
        query = `
          SELECT 
            card_uid, 
            product_type, 
            quantity,
            timestamp
          FROM usage_logs
          WHERE timestamp >= ? AND timestamp <= ?
          ORDER BY timestamp DESC
        `;
        
        rows = db.prepare(query).all(startDate, endDate);
      } else {
        query = `
          SELECT 
            card_uid, 
            product_type, 
            quantity,
            timestamp
          FROM usage_logs
          ORDER BY timestamp DESC
        `;
        
        rows = db.prepare(query).all();
      }
      
      // Convert to CSV
      if (rows.length === 0) {
        return 'card_uid,product_type,quantity,timestamp\n';
      }
      
      const headers = Object.keys(rows[0]).join(',');
      const csvRows = rows.map(row => {
        return Object.values(row).map(value => `"${value}"`).join(',');
      });
      
      return [headers, ...csvRows].join('\n');
    } catch (error) {
      console.error('Error exporting usage data:', error);
      return 'Error generating CSV';
    }
  }
}

// Helper function to get ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default InventoryService;
