import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomersFromContacts } from '@/lib/customerUtils';

export interface CommonDataState {
  products: any[];
  customers: any[];
  locations: any[];
  loading: boolean;
  error: string | null;
}

export const useCommonData = () => {
  const { tenantId } = useAuth();
  const [state, setState] = useState<CommonDataState>({
    products: [],
    customers: [],
    locations: [],
    loading: false,
    error: null,
  });

  const fetchProducts = async () => {
    if (!tenantId) return [];
    
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          barcode,
          price,
          wholesale_price,
          retail_price,
          cost_price,
          stock_quantity,
          min_stock_level,
          image_url,
          is_active,
          unit_id,
          brand_id,
          brands (
            id,
            name
          ),
          product_units (
            id,
            name,
            abbreviation
          ),
          product_variants (
            id,
            name,
            value,
            sku,
            sale_price,
            wholesale_price,
            retail_price,
            stock_quantity
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return products || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  };

  const fetchCustomers = async () => {
    if (!tenantId) return [];
    
    try {
      return await fetchCustomersFromContacts(tenantId);
    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  };

  const fetchLocations = async () => {
    if (!tenantId) return [];
    
    try {
      const { data, error } = await supabase
        .from("store_locations")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
  };

  const loadAllData = async () => {
    if (!tenantId) return;
    
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const [products, customers, locations] = await Promise.all([
        fetchProducts(),
        fetchCustomers(),
        fetchLocations(),
      ]);
      
      setState({
        products,
        customers,
        locations,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error loading common data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data',
      }));
    }
  };

  const refreshData = async () => {
    await loadAllData();
  };

  useEffect(() => {
    if (tenantId) {
      loadAllData();
    } else {
      setState({
        products: [],
        customers: [],
        locations: [],
        loading: false,
        error: null,
      });
    }
  }, [tenantId]);

  return {
    ...state,
    refreshData,
    fetchProducts,
    fetchCustomers,
    fetchLocations,
  };
};
