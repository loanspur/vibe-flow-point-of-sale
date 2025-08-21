import { supabase } from '@/integrations/supabase/client';

export interface BusinessInfo {
  company_name?: string;
  company_logo_url?: string;
  business_registration_number?: string;
  tax_identification_number?: string;
  email?: string;
  phone?: string;
  website?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country?: string;
  currency_code?: string;
  currency_symbol?: string;
  timezone?: string;
  receipt_header?: string;
  receipt_footer?: string;
}

export interface LocationInfo {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_primary?: boolean;
}

export interface TemplateVariables {
  // Business variables
  company_name?: string;
  company_phone?: string;
  company_email?: string;
  company_address?: string;
  company_website?: string;
  currency_symbol?: string;
  
  // Location variables
  location_name?: string;
  location_address?: string;
  location_phone?: string;
  location_email?: string;
  
  // Transaction variables
  customer_name?: string;
  receipt_number?: string;
  invoice_number?: string;
  quote_number?: string;
  date?: string;
  due_date?: string;
  valid_until?: string;
  total_amount?: string;
  item_list?: string;
  payment_method?: string;
  payment_instructions?: string;
  terms_conditions?: string;
}

/**
 * Fetch business settings for a tenant
 */
export const getBusinessInfo = async (tenantId: string): Promise<BusinessInfo> => {
  try {
    const { data, error } = await supabase
      .from('business_settings')
      .select(`
        company_name,
        company_logo_url,
        business_registration_number,
        tax_identification_number,
        email,
        phone,
        website,
        address_line_1,
        address_line_2,
        city,
        state_province,
        postal_code,
        country,
        currency_code,
        currency_symbol,
        timezone,
        receipt_header,
        receipt_footer
      `)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching business info:', error);
      return {};
    }

    return data || {};
  } catch (error) {
    console.error('Error fetching business info:', error);
    return {};
  }
};

/**
 * Fetch location information for a tenant
 */
export const getLocationInfo = async (tenantId: string, locationId?: string): Promise<LocationInfo | null> => {
  try {
    // Try to query store_locations table
    let query = supabase
      .from('store_locations')
      .select('id, name, phone, email, is_primary')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (locationId) {
      query = query.eq('id', locationId);
    } else {
      // Get primary location or first active location
      query = query.order('is_primary', { ascending: false }).order('created_at', { ascending: true });
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Store locations table may not exist or error fetching location info:', error);
      // Fallback to business settings as location
      const businessInfo = await getBusinessInfo(tenantId);
      return {
        id: 'default',
        name: businessInfo.company_name || 'Main Location',
        address: businessInfo.address_line_1 || undefined,
        phone: businessInfo.phone || undefined,
        email: businessInfo.email || undefined,
        is_primary: true
      };
    }

    return data;
  } catch (error) {
    console.error('Error fetching location info:', error);
    // Fallback to business settings as location
    const businessInfo = await getBusinessInfo(tenantId);
    return {
      id: 'default',
      name: businessInfo.company_name || 'Main Location',
      address: businessInfo.address_line_1 || undefined,
      phone: businessInfo.phone || undefined,
      email: businessInfo.email || undefined,
      is_primary: true
    };
  }
};

/**
 * Get all available locations for a tenant
 */
export const getAllLocations = async (tenantId: string): Promise<LocationInfo[]> => {
  try {
    const { data, error } = await supabase
      .from('store_locations')
      .select('id, name, phone, email, is_primary')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locations (table may not exist):', error);
      // Return default location from business settings
      const businessInfo = await getBusinessInfo(tenantId);
      return [{
        id: 'default',
        name: businessInfo.company_name || 'Main Location',
        address: businessInfo.address_line_1 || undefined,
        phone: businessInfo.phone || undefined,
        email: businessInfo.email || undefined,
        is_primary: true
      }];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching locations:', error);
    // Return default location from business settings
    const businessInfo = await getBusinessInfo(tenantId);
    return [{
      id: 'default',
      name: businessInfo.company_name || 'Main Location',
      address: businessInfo.address_line_1 || undefined,
      phone: businessInfo.phone || undefined,
      email: businessInfo.email || undefined,
      is_primary: true
    }];
  }
};

/**
 * Build template variables from business and location info
 */
export const buildBusinessVariables = (
  businessInfo: BusinessInfo,
  locationInfo: LocationInfo | null = null
): Partial<TemplateVariables> => {
  const variables: Partial<TemplateVariables> = {};

  // Business variables
  if (businessInfo.company_name) variables.company_name = businessInfo.company_name;
  if (businessInfo.phone) variables.company_phone = businessInfo.phone;
  if (businessInfo.email) variables.company_email = businessInfo.email;
  if (businessInfo.website) variables.company_website = businessInfo.website;
  if (businessInfo.currency_symbol) variables.currency_symbol = businessInfo.currency_symbol;

  // Build company address
  const addressParts = [
    businessInfo.address_line_1,
    businessInfo.address_line_2,
    businessInfo.city,
    businessInfo.state_province,
    businessInfo.postal_code,
    businessInfo.country
  ].filter(Boolean);
  
  if (addressParts.length > 0) {
    variables.company_address = addressParts.join(', ');
  }

  // Location variables
  if (locationInfo) {
    variables.location_name = locationInfo.name;
    if (locationInfo.address) variables.location_address = locationInfo.address;
    if (locationInfo.phone) variables.location_phone = locationInfo.phone;
    if (locationInfo.email) variables.location_email = locationInfo.email;
  }

  return variables;
};

/**
 * Replace template variables in a message body
 */
export const populateTemplate = (
  templateBody: string,
  variables: TemplateVariables
): string => {
  let populatedTemplate = templateBody;

  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      populatedTemplate = populatedTemplate.replace(regex, String(value));
    }
  });

  return populatedTemplate;
};

/**
 * Get enhanced template with business and location data populated
 */
export const getEnhancedTemplate = async (
  templateBody: string,
  tenantId: string,
  locationId?: string,
  additionalVariables: Partial<TemplateVariables> = {}
): Promise<string> => {
  try {
    // Fetch business and location info
    const [businessInfo, locationInfo] = await Promise.all([
      getBusinessInfo(tenantId),
      getLocationInfo(tenantId, locationId)
    ]);

    // Build business variables
    const businessVariables = buildBusinessVariables(businessInfo, locationInfo);

    // Combine all variables
    const allVariables: TemplateVariables = {
      ...businessVariables,
      ...additionalVariables
    };

    // Populate template
    return populateTemplate(templateBody, allVariables);
  } catch (error) {
    console.error('Error enhancing template:', error);
    return templateBody;
  }
};

/**
 * Get available template variables for business info
 */
export const getAvailableBusinessVariables = (): Array<{ key: string; label: string; category: string }> => {
  return [
    // Business Information
    { key: 'company_name', label: 'Company Name', category: 'Business' },
    { key: 'company_phone', label: 'Company Phone', category: 'Business' },
    { key: 'company_email', label: 'Company Email', category: 'Business' },
    { key: 'company_address', label: 'Company Address', category: 'Business' },
    { key: 'company_website', label: 'Company Website', category: 'Business' },
    { key: 'currency_symbol', label: 'Currency Symbol', category: 'Business' },
    
    // Location Information
    { key: 'location_name', label: 'Location Name', category: 'Location' },
    { key: 'location_address', label: 'Location Address', category: 'Location' },
    { key: 'location_phone', label: 'Location Phone', category: 'Location' },
    { key: 'location_email', label: 'Location Email', category: 'Location' },
    
    // Transaction Information
    { key: 'customer_name', label: 'Customer Name', category: 'Transaction' },
    { key: 'receipt_number', label: 'Receipt Number', category: 'Transaction' },
    { key: 'invoice_number', label: 'Invoice Number', category: 'Transaction' },
    { key: 'quote_number', label: 'Quote Number', category: 'Transaction' },
    { key: 'date', label: 'Date', category: 'Transaction' },
    { key: 'due_date', label: 'Due Date', category: 'Transaction' },
    { key: 'valid_until', label: 'Valid Until', category: 'Transaction' },
    { key: 'total_amount', label: 'Total Amount', category: 'Transaction' },
    { key: 'item_list', label: 'Item List', category: 'Transaction' },
    { key: 'payment_method', label: 'Payment Method', category: 'Transaction' },
    { key: 'payment_instructions', label: 'Payment Instructions', category: 'Transaction' },
    { key: 'terms_conditions', label: 'Terms & Conditions', category: 'Transaction' }
  ];
};

/**
 * Preview template with sample business data
 */
export const previewTemplateWithBusinessData = async (
  templateBody: string,
  tenantId: string,
  locationId?: string
): Promise<string> => {
  const sampleData: Partial<TemplateVariables> = {
    customer_name: 'John Doe',
    receipt_number: 'R-001234',
    invoice_number: 'INV-001234',
    quote_number: 'Q-001234',
    date: new Date().toLocaleDateString(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    total_amount: '1,500.00',
    item_list: '• Product A - Qty: 2 - $750.00\n• Product B - Qty: 1 - $750.00',
    payment_method: 'Cash',
    payment_instructions: 'Please pay within 30 days',
    terms_conditions: 'Standard terms and conditions apply'
  };

  return getEnhancedTemplate(templateBody, tenantId, locationId, sampleData);
};