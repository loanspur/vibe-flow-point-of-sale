import { useBusinessSettings } from './useBusinessSettings';
import { useToast } from './use-toast';

/**
 * Hook to validate and enforce product settings restrictions
 * This ensures business rules are applied consistently across the application
 */
export const useProductSettingsValidation = () => {
  const { product: productSettings, inventory: inventorySettings } = useBusinessSettings();
  const { toast } = useToast();

  /**
   * Validate product creation/editing based on settings
   */
  const validateProductCreation = (productData: any) => {
    const errors: string[] = [];

    // SKU validation
    if (productSettings.autoGenerateSku && !productData.sku) {
      errors.push('SKU is required when auto-generate SKU is enabled');
    }

    // Brand validation
    if (productSettings.enableBrands && !productData.brand_id) {
      errors.push('Brand is required when brand management is enabled');
    }

    // Unit validation
    if (productSettings.enableProductUnits && !productData.unit_id) {
      errors.push('Product unit is required when unit management is enabled');
    }

    // Expiry date validation
    if (productSettings.enableProductExpiry && productData.has_expiry_date && !productData.expiry_date) {
      errors.push('Expiry date is required when product expiry tracking is enabled');
    }

    // Warranty validation
    if (productSettings.enableWarranty && productData.has_warranty && !productData.warranty_period) {
      errors.push('Warranty period is required when warranty tracking is enabled');
    }

    // Pricing validation
    if (productSettings.enableRetailPricing && !productData.retail_price) {
      errors.push('Retail price is required when retail pricing is enabled');
    }

    if (productSettings.enableWholesalePricing && !productData.wholesale_price) {
      errors.push('Wholesale price is required when wholesale pricing is enabled');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Validate sales based on inventory settings
   */
  const validateSale = (saleItems: any[], currentStock: any[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const item of saleItems) {
      const stockItem = currentStock.find(s => s.product_id === item.product_id);
      
      if (!stockItem) {
        errors.push(`Product ${item.product_name} not found in inventory`);
        continue;
      }

      const availableStock = stockItem.quantity || 0;
      const requestedQuantity = item.quantity || 0;

      // Check for overselling
      if (!inventorySettings.enableOverselling && requestedQuantity > availableStock) {
        errors.push(`Cannot sell ${requestedQuantity} of ${item.product_name}. Only ${availableStock} available in stock.`);
      }

      // Check for negative stock
      if (!inventorySettings.enableNegativeStock && requestedQuantity > availableStock) {
        errors.push(`Cannot sell ${requestedQuantity} of ${item.product_name}. Insufficient stock (${availableStock} available).`);
      }

      // Low stock warning - reduce noise when overselling is enabled
      if (inventorySettings.lowStockAlerts && availableStock <= inventorySettings.lowStockThreshold) {
        // When overselling is enabled, only show warnings for very low stock (≤ 2) to reduce noise
        if (inventorySettings.enableOverselling) {
          if (availableStock <= 2) {
            warnings.push(`Very low stock warning: ${item.product_name} has only ${availableStock} units remaining.`);
          }
        } else {
          // When overselling is disabled, show warnings for all items below threshold
          warnings.push(`Low stock warning: ${item.product_name} has only ${availableStock} units remaining.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  /**
   * Validate purchase based on settings
   */
  const validatePurchase = (purchaseItems: any[]) => {
    const errors: string[] = [];

    for (const item of purchaseItems) {
      // Validate product units if enabled
      if (productSettings.enableProductUnits && !item.unit_id) {
        errors.push(`Product unit is required for ${item.product_name} when unit management is enabled`);
      }

      // Validate pricing if fixed pricing is enabled
      if (productSettings.enableFixedPricing && item.unit_cost <= 0) {
        errors.push(`Unit cost is required for ${item.product_name} when fixed pricing is enabled`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  /**
   * Check if a product feature is enabled
   */
  const isFeatureEnabled = (feature: keyof typeof productSettings) => {
    return productSettings[feature] || false;
  };

  /**
   * Get required fields based on enabled features
   */
  const getRequiredFields = () => {
    const required: string[] = [];

    if (productSettings.enableBrands) required.push('brand_id');
    if (productSettings.enableProductUnits) required.push('unit_id');
    if (productSettings.enableProductExpiry) required.push('expiry_date');
    if (productSettings.enableWarranty) required.push('warranty_period');
    if (productSettings.enableRetailPricing) required.push('retail_price');
    if (productSettings.enableWholesalePricing) required.push('wholesale_price');
    if (productSettings.autoGenerateSku) required.push('sku');

    return required;
  };

  /**
   * Show validation errors as toast notifications
   */
  const showValidationErrors = (errors: string[], warnings: string[] = []) => {
    if (errors.length > 0) {
      toast({
        title: "Validation Errors",
        description: errors.join(', '),
        variant: "destructive",
      });
    }

    if (warnings.length > 0) {
      toast({
        title: "Warnings",
        description: warnings.join(', '),
        variant: "default",
      });
    }
  };

  /**
   * Validate inventory adjustments
   */
  const validateInventoryAdjustment = (productId: string, currentStock: number, adjustment: number) => {
    const newStock = currentStock + adjustment;
    
    if (!inventorySettings.enableNegativeStock && newStock < 0) {
      return {
        isValid: false,
        error: `Cannot reduce stock below 0 when negative stock is disabled. Current stock: ${currentStock}, Adjustment: ${adjustment}`,
      };
    }

    return {
      isValid: true,
      newStock,
    };
  };

  /**
   * Check if barcode scanning is required
   */
  const isBarcodeRequired = () => {
    return productSettings.enableBarcodeScanning;
  };

  /**
   * Get default markup percentage
   */
  const getDefaultMarkup = () => {
    return productSettings.defaultMarkupPercentage || 0;
  };

  /**
   * Get stock accounting method
   */
  const getStockAccountingMethod = () => {
    return productSettings.stockAccountingMethod || 'FIFO';
  };

  return {
    // Validation functions
    validateProductCreation,
    validateSale,
    validatePurchase,
    validateInventoryAdjustment,
    
    // Feature checks
    isFeatureEnabled,
    isBarcodeRequired,
    
    // Settings getters
    getRequiredFields,
    getDefaultMarkup,
    getStockAccountingMethod,
    
    // UI helpers
    showValidationErrors,
    
    // Raw settings access
    productSettings,
    inventorySettings,
  };
};
