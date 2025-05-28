import InventoryService, { ProductType, DispensingResult } from './inventory-service';
import { AuthResult } from './auth-service';

interface ProductDispenseProps {
  productType: ProductType;
  profileId: number;
  cardUid: string;
}

export class ProductService {
  // Dispense a product, update inventory, and log usage
  static dispenseProduct(props: ProductDispenseProps): Promise<DispensingResult> {
    try {
      const { productType, profileId, cardUid } = props;
      
      // Validate that a product type was selected
      if (!productType) {
        return Promise.resolve({
          success: false,
          message: 'No product selected'
        });
      }
      
      // Validate authentication information is present
      if (!profileId || !cardUid) {
        return Promise.resolve({
          success: false,
          message: 'Authentication required'
        });
      }
      
      // Dispense the product (this will also update inventory and log usage)
      const result = InventoryService.dispenseProduct(productType, profileId, cardUid);
      
      return Promise.resolve(result);
    } catch (error) {
      console.error('Error dispensing product:', error);
      return Promise.resolve({
        success: false,
        message: 'Error dispensing product'
      });
    }
  }
  
  // Get product inventory status
  static getProductInventory(productType: ProductType) {
    return InventoryService.getInventoryStatus(productType);
  }
  
  // Get all product inventory
  static getAllProductInventory() {
    return InventoryService.getAllInventory();
  }
}

export default ProductService;
