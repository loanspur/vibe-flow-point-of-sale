/**
 * Location-related constants for consistent usage across the application
 * This helps avoid hardcoded values and ensures maintainability
 */

export const LOCATION_CONSTANTS = {
  // LocalStorage key for persisting selected location
  STORAGE_KEY: 'selected_location',
  
  // Database table and column names
  DATABASE: {
    TABLE_NAME: 'store_locations',
    COLUMNS: {
      ID: 'id',
      NAME: 'name',
      TENANT_ID: 'tenant_id',
      IS_ACTIVE: 'is_active',
      CREATED_AT: 'created_at',
      UPDATED_AT: 'updated_at'
    }
  },
  
  // Default values
  DEFAULTS: {
    PLACEHOLDER: 'Select location',
    NO_LOCATIONS_TEXT: 'No locations available',
    NO_LOCATIONS_WARNING: '⚠️ No locations found. Please create a location first.'
  },
  
  // UI labels
  LABELS: {
    LOCATION: 'Location',
    LOCATION_REQUIRED: 'Location *',
    PURCHASE_LOCATION: 'Purchase Location:',
    SELECTED: 'Selected:'
  }
} as const;

// Type definitions for better type safety
export type LocationData = {
  id: string;
  name: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_province: string;
  postal_code?: string;
  country: string;
  phone?: string;
  email?: string;
  manager_name?: string;
  is_primary: boolean;
  is_active: boolean;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
};

export type LocationState = {
  locations: LocationData[];
  selectedLocation: string;
  selectedLocationName: string;
  loading: boolean;
  error: string | null;
};
