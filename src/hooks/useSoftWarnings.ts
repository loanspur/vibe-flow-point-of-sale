import { useToast } from '@/hooks/use-toast';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { useApp } from '@/contexts/AppContext';

export interface WarningConfig {
  showLowStockWarnings?: boolean;
  showNegativeStockWarnings?: boolean;
  showWholesalePricingWarnings?: boolean;
  showCreditLimitWarnings?: boolean;
  showOversellingWarnings?: boolean;
}

export const useSoftWarnings = (config: WarningConfig = {}) => {
  const { toast } = useToast();
  const { formatCurrency } = useApp();
  const { inventory: inventorySettings } = useBusinessSettings();

  const {
    showLowStockWarnings = true,
    showNegativeStockWarnings = true,
    showWholesalePricingWarnings = true,
    showCreditLimitWarnings = true,
    showOversellingWarnings = true,
  } = config;

  // Low stock warnings - Info level
  const showLowStockWarning = (productName: string, currentStock: number, locationName?: string) => {
    if (!showLowStockWarnings) return;
    
    const threshold = inventorySettings.lowStockThreshold || 10;
    if (currentStock > 0 && currentStock <= threshold) {
      const locationText = locationName ? ` at ${locationName}` : '';
      const severity = currentStock <= 3 ? 'warning' : 'default';
      
      toast({
        title: currentStock <= 3 ? "Critical Low Stock" : "Low Stock Alert",
        description: `${productName} has ${currentStock} units remaining${locationText}. ${currentStock <= 3 ? 'Immediate restocking recommended.' : 'Consider restocking soon.'}`,
        variant: severity,
        duration: currentStock <= 3 ? 8000 : 5000
      });
    }
  };

  // Negative stock warnings - Warning level
  const showNegativeStockWarning = (productName: string, currentStock: number, locationName?: string) => {
    if (!showNegativeStockWarnings) return;
    
    if (currentStock < 0) {
      const locationText = locationName ? ` at ${locationName}` : '';
      toast({
        title: "Negative Stock Detected",
        description: `${productName} has negative stock (${currentStock} units)${locationText}. This indicates overselling has occurred.`,
        variant: "destructive",
        duration: 10000
      });
    }
  };

  // Out of stock warnings - Warning level
  const showOutOfStockWarning = (productName: string, locationName?: string, allowOverselling = false) => {
    if (!showNegativeStockWarnings) return;
    
    const locationText = locationName ? ` at ${locationName}` : '';
    const oversellingText = allowOverselling ? ' Item added due to overselling being enabled.' : '';
    
    toast({
      title: "Out of Stock",
      description: `${productName} is out of stock${locationText}.${oversellingText}`,
      variant: allowOverselling ? "default" : "destructive",
      duration: allowOverselling ? 5000 : 8000
    });
  };

  // Wholesale pricing warnings - Success level with info
  const showWholesalePricingWarning = (customerName: string) => {
    if (!showWholesalePricingWarnings) return;
    
    toast({
      title: "Wholesale Pricing Applied",
      description: `${customerName} is a reseller customer. Wholesale pricing will be applied to all products in this sale.`,
      variant: "default",
      duration: 6000
    });
  };

  // Credit limit warnings - Warning level
  const showCreditLimitWarning = (customerName: string, currentBalance: number, creditLimit: number) => {
    if (!showCreditLimitWarnings) return;
    
    const creditUsagePercentage = (currentBalance / creditLimit) * 100;
    const availableCredit = creditLimit - currentBalance;
    
    if (creditUsagePercentage >= 80) {
      const severity = creditUsagePercentage >= 95 ? 'destructive' : 'default';
      
      toast({
        title: creditUsagePercentage >= 95 ? "Critical Credit Usage" : "Credit Limit Warning",
        description: `${customerName} has used ${creditUsagePercentage.toFixed(1)}% of their credit limit (${formatCurrency(currentBalance)} / ${formatCurrency(creditLimit)}). Available: ${formatCurrency(availableCredit)}`,
        variant: severity,
        duration: 8000
      });
    }
  };

  // Credit limit alert for new sales - Warning level
  const showCreditLimitAlert = (customerName: string, currentBalance: number, creditLimit: number, newAmount: number) => {
    if (!showCreditLimitWarnings) return;
    
    const newTotal = currentBalance + newAmount;
    const newUsagePercentage = (newTotal / creditLimit) * 100;
    
    if (newUsagePercentage >= 90) {
      const severity = newUsagePercentage >= 100 ? 'destructive' : 'default';
      const message = newUsagePercentage >= 100 
        ? `This sale would exceed ${customerName}'s credit limit by ${formatCurrency(newTotal - creditLimit)}.`
        : `This sale would use ${newUsagePercentage.toFixed(1)}% of ${customerName}'s credit limit.`;
      
      toast({
        title: newUsagePercentage >= 100 ? "Credit Limit Exceeded" : "Credit Limit Alert",
        description: message,
        variant: severity,
        duration: 10000
      });
    }
  };

  // Overselling warnings - Warning level with business context
  const showOversellingWarning = (productName: string, requestedQuantity: number, availableStock: number, locationName?: string) => {
    if (!showOversellingWarnings) return;
    
    const locationText = locationName ? ` at ${locationName}` : '';
    const oversellAmount = requestedQuantity - availableStock;
    
    toast({
      title: "Overselling Alert",
      description: `Requesting ${requestedQuantity} units of ${productName} but only ${availableStock} available${locationText}. This will result in ${oversellAmount} units of negative stock.`,
      variant: "default",
      duration: 8000
    });
  };

  // Insufficient stock error - Error level
  const showInsufficientStockError = (productName: string, requestedQuantity: number, availableStock: number, locationName?: string) => {
    const locationText = locationName ? ` at ${locationName}` : '';
    toast({
      title: "Insufficient Stock",
      description: `Cannot sell ${requestedQuantity} of ${productName}. Only ${availableStock} available${locationText}.`,
      variant: "destructive",
      duration: 10000
    });
  };

  // Customer credit info - Info level
  const showCustomerCreditInfo = (customerName: string, currentBalance: number, creditLimit: number) => {
    if (!showCreditLimitWarnings) return;
    
    const creditUsagePercentage = (currentBalance / creditLimit) * 100;
    const availableCredit = creditLimit - currentBalance;
    
    toast({
      title: "Customer Credit Status",
      description: `${customerName} has ${formatCurrency(availableCredit)} available credit (${creditUsagePercentage.toFixed(1)}% used).`,
      variant: "default",
      duration: 5000
    });
  };

  // Enhanced overselling confirmation - Interactive warning
  const showOversellingConfirmation = (productName: string, requestedQuantity: number, availableStock: number, onConfirm: () => void, onCancel: () => void) => {
    const oversellAmount = requestedQuantity - availableStock;
    
    toast({
      title: "Confirm Overselling",
      description: `Add ${requestedQuantity} units of ${productName}? This will create ${oversellAmount} units of negative stock.`,
      variant: "default",
      duration: 0
    });
  };

  // Enhanced wholesale pricing info - Detailed information
  const showWholesalePricingInfo = (customerName: string, productName: string, retailPrice: number, wholesalePrice: number) => {
    const savings = retailPrice - wholesalePrice;
    const savingsPercentage = ((savings / retailPrice) * 100).toFixed(1);
    
    toast({
      title: "Wholesale Pricing Applied",
      description: `${productName}: ${formatCurrency(retailPrice)} → ${formatCurrency(wholesalePrice)} (${savingsPercentage}% savings for ${customerName})`,
      variant: "default",
      duration: 6000
    });
  };

  return {
    showLowStockWarning,
    showNegativeStockWarning,
    showOutOfStockWarning,
    showWholesalePricingWarning,
    showCreditLimitWarning,
    showCreditLimitAlert,
    showOversellingWarning,
    showInsufficientStockError,
    showCustomerCreditInfo,
    showOversellingConfirmation,
    showWholesalePricingInfo,
  };
};
