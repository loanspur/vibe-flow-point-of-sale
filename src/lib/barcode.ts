import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a unique barcode for products
 * Format: BAR-{timestamp}-{random}
 */
export async function generateUniqueBarcode(tenantId: string): Promise<string> {
  if (!tenantId) return '';
  
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
  const random = Math.floor(100 + Math.random() * 900); // 3-digit random number
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const potentialBarcode = `BAR-${timestamp}${random}`;
    
    // Check if barcode exists in database
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('barcode', potentialBarcode)
      .maybeSingle();
    
    if (!existingProduct) {
      return potentialBarcode;
    }
    
    attempts++;
    // Add small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  // Fallback: use UUID-like suffix if all attempts failed
  const fallbackSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BAR-${fallbackSuffix}`;
}

/**
 * Generate a barcode from product name and SKU
 * Format: {namePrefix}-{skuSuffix}-{random}
 */
export async function generateBarcodeFromProduct(
  productName: string, 
  sku: string, 
  tenantId: string
): Promise<string> {
  if (!productName || !sku || !tenantId) return '';
  
  // Take first 3 letters of product name
  const namePrefix = productName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
    .substring(0, 3)
    .toUpperCase();
  
  // Take last 4 characters of SKU
  const skuSuffix = sku.slice(-4).toUpperCase();
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    const random = Math.floor(100 + Math.random() * 900); // 3-digit random number
    const potentialBarcode = `${namePrefix}-${skuSuffix}-${random}`;
    
    // Check if barcode exists in database
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('barcode', potentialBarcode)
      .maybeSingle();
    
    if (!existingProduct) {
      return potentialBarcode;
    }
    
    attempts++;
  }
  
  // Fallback: use timestamp-based barcode
  return generateUniqueBarcode(tenantId);
}

/**
 * Validate barcode format
 */
export function isValidBarcode(barcode: string): boolean {
  if (!barcode || barcode.trim().length === 0) return true; // Empty is valid (optional field)
  
  // Basic validation: alphanumeric, hyphens, and underscores only
  const barcodeRegex = /^[A-Za-z0-9\-_]+$/;
  return barcodeRegex.test(barcode.trim()) && barcode.trim().length >= 3;
}

/**
 * Format barcode for display
 */
export function formatBarcode(barcode: string): string {
  if (!barcode) return '';
  
  // Add spaces every 4 characters for readability
  return barcode.replace(/(.{4})/g, '$1 ').trim();
}
