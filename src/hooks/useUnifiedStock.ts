import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setStockCacheClearFunction } from '@/lib/inventory-integration';

// Cache for stock calculations to avoid repeated queries
const stockCache = new Map<string, { value: number; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

export interface StockCalculationResult {
  stock: number;
  baseStock: number;
  adjustments: number;
  recentSales: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseUnifiedStockOptions {
  enableCache?: boolean;
  cacheDuration?: number;
  includeRecentSales?: boolean;
  includeAdjustments?: boolean;
}

/**
 * Unified hook for calculating stock levels across all components
 * Provides consistent stock calculations with caching and real-time updates
 */
export function useUnifiedStock(options: UseUnifiedStockOptions = {}) {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    enableCache = true,
    cacheDuration = CACHE_DURATION,
    includeRecentSales = true,
    includeAdjustments = true
  } = options;

  /**
   * Calculate stock for a product at a specific location
   * This is the single source of truth for stock calculations
   */
  const calculateStock = useCallback(async (
    productId: string, 
    locationId?: string, 
    variantId?: string
  ): Promise<StockCalculationResult> => {
    if (!tenantId) {
      return {
        stock: 0,
        baseStock: 0,
        adjustments: 0,
        recentSales: 0,
        isLoading: false,
        error: 'No tenant ID available'
      };
    }

    const cacheKey = `${productId}_${variantId || 'main'}_${locationId || 'default'}`;
    
    // Check cache if enabled
    if (enableCache && stockCache.has(cacheKey)) {
      const cached = stockCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < cacheDuration) {
        return {
          stock: cached.value,
          baseStock: cached.value,
          adjustments: 0,
          recentSales: 0,
          isLoading: false,
          error: null
        };
      }
    }

    setLoading(true);
    setError(null);

    try {
      let baseStock = 0;
      let adjustments = 0;
      let recentSales = 0;

      // Get base product stock
      if (locationId) {
        // Location-specific stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .eq('location_id', locationId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (productError) {
          console.warn('Error fetching product stock:', productError);
        }
        baseStock = product?.stock_quantity ?? 0;
      } else {
        // Global product stock
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', productId)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (productError) {
          console.warn('Error fetching product stock:', productError);
        }
        baseStock = product?.stock_quantity ?? 0;
      }

      // Calculate stock adjustments if enabled
      if (includeAdjustments && locationId) {
        const { data: adjustmentData, error: adjustmentError } = await supabase
          .from('stock_adjustment_items')
          .select(`
            adjustment_quantity,
            stock_adjustments!inner(tenant_id, status)
          `)
          .eq('product_id', productId)
          .eq('location_id', locationId)
          .eq('stock_adjustments.tenant_id', tenantId)
          .eq('stock_adjustments.status', 'approved');

        if (adjustmentError) {
          console.warn('Error fetching stock adjustments:', adjustmentError);
        } else if (adjustmentData) {
          adjustments = adjustmentData.reduce((total, adj) => total + adj.adjustment_quantity, 0);
        }
      }

      // Calculate recent sales if enabled (only for debugging/audit purposes)
      if (includeRecentSales && locationId) {
        const { data: salesData, error: salesError } = await supabase
          .from('sale_items')
          .select(`
            quantity,
            sales!inner(tenant_id, location_id, created_at)
          `)
          .eq('product_id', productId)
          .eq('sales.tenant_id', tenantId)
          .eq('sales.location_id', locationId)
          .gte('sales.created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        if (salesError) {
          console.warn('Error fetching recent sales:', salesError);
        } else if (salesData) {
          recentSales = salesData.reduce((total, sale) => total + sale.quantity, 0);
        }
      }

      // Calculate final stock
      // NOTE: We need to subtract recent sales to get the actual current stock
      // The baseStock from products table might not reflect recent sales
      let finalStock = baseStock + adjustments - recentSales;
      
      // Debug logging for stock calculation
      console.log(`Stock calculation for product ${productId} at location ${locationId || 'default'}:`, {
        baseStock,
        adjustments,
        recentSales,
        finalStockBeforeThreshold: finalStock,
        locationId: locationId || 'default'
      });
      
      // Check business settings for negative stock control
      const { data: businessSettings } = await supabase
        .from('business_settings')
        .select('enable_negative_stock, enable_overselling')
        .eq('tenant_id', tenantId)
        .single();

      const allowNegativeStock = businessSettings?.enable_negative_stock ?? false;
      const allowOverselling = businessSettings?.enable_overselling ?? false;
      
      // Apply minimum stock threshold only if negative stock is not allowed
      if (!allowNegativeStock && !allowOverselling) {
        finalStock = Math.max(0, finalStock);
      }

      // Cache the result if enabled
      if (enableCache) {
        stockCache.set(cacheKey, { value: finalStock, timestamp: Date.now() });
        
        // Clear cache after duration
        setTimeout(() => {
          stockCache.delete(cacheKey);
        }, cacheDuration);
      }

      const result: StockCalculationResult = {
        stock: finalStock,
        baseStock,
        adjustments,
        recentSales, // Used in final calculation: finalStock = baseStock + adjustments - recentSales
        isLoading: false,
        error: null
      };

      setLoading(false);
      return result;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error calculating stock';
      console.error('Error calculating stock:', err);
      setError(errorMessage);
      setLoading(false);
      
      return {
        stock: 0,
        baseStock: 0,
        adjustments: 0,
        recentSales: 0,
        isLoading: false,
        error: errorMessage
      };
    }
  }, [tenantId, enableCache, cacheDuration, includeRecentSales, includeAdjustments]);

  /**
   * Calculate stock for multiple products at once
   */
  const calculateBulkStock = useCallback(async (
    products: Array<{ productId: string; locationId?: string; variantId?: string }>
  ): Promise<Record<string, StockCalculationResult>> => {
    const results: Record<string, StockCalculationResult> = {};
    
    // Process in parallel for better performance
    const promises = products.map(async (product) => {
      const key = `${product.productId}_${product.variantId || 'main'}_${product.locationId || 'default'}`;
      const result = await calculateStock(product.productId, product.locationId, product.variantId);
      results[key] = result;
    });

    await Promise.all(promises);
    return results;
  }, [calculateStock]);

  /**
   * Clear cache for specific product or all products
   */
  const clearCache = useCallback((productId?: string, locationId?: string) => {
    if (productId) {
      const key = `${productId}_${locationId || 'default'}`;
      stockCache.delete(key);
    } else {
      stockCache.clear();
    }
  }, []);

  // Register the cache clearing function with the inventory integration
  useEffect(() => {
    setStockCacheClearFunction(() => {
      stockCache.clear();
    });
  }, []);

  /**
   * Get cached stock value if available
   */
  const getCachedStock = useCallback((productId: string, locationId?: string, variantId?: string): number | null => {
    if (!enableCache) return null;
    
    const cacheKey = `${productId}_${variantId || 'main'}_${locationId || 'default'}`;
    const cached = stockCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.value;
    }
    
    return null;
  }, [enableCache, cacheDuration]);

  return {
    calculateStock,
    calculateBulkStock,
    clearCache,
    getCachedStock,
    loading,
    error
  };
}

/**
 * Hook for getting stock with automatic refresh
 */
export function useStockWithRefresh(
  productId: string, 
  locationId?: string, 
  variantId?: string,
  options: UseUnifiedStockOptions = {}
) {
  const [stockData, setStockData] = useState<StockCalculationResult | null>(null);
  const { calculateStock, clearCache } = useUnifiedStock(options);

  const refreshStock = useCallback(async () => {
    clearCache(productId, locationId);
    const result = await calculateStock(productId, locationId, variantId);
    setStockData(result);
    return result;
  }, [calculateStock, clearCache, productId, locationId, variantId]);

  const loadStock = useCallback(async () => {
    const result = await calculateStock(productId, locationId, variantId);
    setStockData(result);
    return result;
  }, [calculateStock, productId, locationId, variantId]);

  return {
    stockData,
    refreshStock,
    loadStock,
    clearCache: () => clearCache(productId, locationId)
  };
}
