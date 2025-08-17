import { supabase } from "@/integrations/supabase/client";

export interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at?: string;
}

export interface CustomerWithEmailMap {
  [customerId: string]: CustomerData;
}

/**
 * Fetches customers from contacts table (recommended approach)
 */
export const fetchCustomersFromContacts = async (tenantId: string): Promise<CustomerData[]> => {
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, address, created_at")
    .eq("tenant_id", tenantId)
    .eq("type", "customer")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error('Error fetching customers from contacts:', error);
    return [];
  }

  return data || [];
};

/**
 * Fetches customers from legacy customers table (for backward compatibility)
 */
export const fetchCustomersFromLegacyTable = async (tenantId: string): Promise<CustomerData[]> => {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, address, created_at")
    .eq("tenant_id", tenantId);

  if (error) {
    console.error('Error fetching customers from legacy table:', error);
    return [];
  }

  return data || [];
};

/**
 * Fetches customer data by IDs (used for enriching invoice data)
 */
export const fetchCustomersByIds = async (customerIds: string[]): Promise<CustomerWithEmailMap> => {
  if (customerIds.length === 0) return {};

  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, email, phone, address')
    .in('id', customerIds);

  if (error) {
    console.error('Error fetching customers by IDs:', error);
    return {};
  }

  const customerMap: CustomerWithEmailMap = {};
  data?.forEach(customer => {
    customerMap[customer.id] = customer;
  });

  return customerMap;
};

/**
 * Unified customer fetching that tries contacts first, then falls back to legacy table
 */
export const fetchAllCustomers = async (tenantId: string): Promise<CustomerData[]> => {
  // Try contacts table first (recommended approach)
  const contactsCustomers = await fetchCustomersFromContacts(tenantId);
  
  // If we get customers from contacts, use those
  if (contactsCustomers.length > 0) {
    return contactsCustomers;
  }

  // Otherwise, fall back to legacy customers table
  return await fetchCustomersFromLegacyTable(tenantId);
};

/**
 * Creates a customer data object with fallback values
 */
export const createCustomerFallback = (customerName: string): CustomerData => ({
  id: 'fallback',
  name: customerName,
  email: undefined,
  phone: undefined,
  address: undefined
});

/**
 * Enriches sales/invoice data with customer information
 */
export const enrichWithCustomerData = async (
  salesData: any[],
  getCustomerId: (sale: any) => string | null,
  getCustomerName: (sale: any) => string | null
) => {
  // Find sales that need customer data enrichment
  const salesNeedingCustomerData = salesData.filter(sale => {
    const customerId = getCustomerId(sale);
    return customerId && !sale.contacts;
  });

  let customerEmailMap: CustomerWithEmailMap = {};

  if (salesNeedingCustomerData.length > 0) {
    const customerIds = salesNeedingCustomerData
      .map(getCustomerId)
      .filter(Boolean) as string[];
    
    customerEmailMap = await fetchCustomersByIds(customerIds);
  }

  return salesData.map(sale => {
    const customerId = getCustomerId(sale);
    const customerName = getCustomerName(sale);

    // Prioritize: existing contacts join -> fetch by customer_id -> fallback to customer_name
    const customerData = sale.contacts || 
      (customerId && customerEmailMap[customerId]) ||
      (customerName ? createCustomerFallback(customerName) : null);

    return {
      ...sale,
      contacts: customerData
    };
  });
};
