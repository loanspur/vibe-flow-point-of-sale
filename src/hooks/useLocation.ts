import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { LOCATION_CONSTANTS, type LocationData, type LocationState } from '@/constants/location';

/**
 * Centralized location management hook
 * Provides consistent location state management across all components
 * Handles fetching, selection, and persistence of locations
 */
export const useLocation = () => {
  const { tenantId } = useAuth();
  
  const [state, setState] = useState<LocationState>({
    locations: [],
    selectedLocation: localStorage.getItem(LOCATION_CONSTANTS.STORAGE_KEY) || '',
    selectedLocationName: '',
    loading: false,
    error: null
  });

  /**
   * Fetch locations from the database
   */
  const fetchLocations = useCallback(async () => {
    if (!tenantId) {
      console.log('🔍 useLocation: No tenantId available');
      setState(prev => ({ ...prev, locations: [], loading: false }));
      return;
    }
    
    console.log('🔍 useLocation: Fetching locations for tenant:', tenantId);
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const { data, error } = await supabase
        .from(LOCATION_CONSTANTS.DATABASE.TABLE_NAME)
        .select(`
          id,
          name,
          address_line_1,
          address_line_2,
          city,
          state_province,
          postal_code,
          country,
          phone,
          email,
          manager_name,
          is_primary,
          is_active,
          tenant_id,
          created_at,
          updated_at
        `)
        .eq(LOCATION_CONSTANTS.DATABASE.COLUMNS.TENANT_ID, tenantId)
        .eq(LOCATION_CONSTANTS.DATABASE.COLUMNS.IS_ACTIVE, true)
        .order('is_primary', { ascending: false })
        .order(LOCATION_CONSTANTS.DATABASE.COLUMNS.NAME);
      
      console.log('🔍 useLocation: Raw query result:', { data, error });
      
      if (error) {
        console.error('Error fetching locations:', error);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error.message,
          locations: [] 
        }));
        return;
      }
      
      if (data && Array.isArray(data)) {
        console.log('🔍 useLocation: Found locations:', data);
        setState(prev => ({ 
          ...prev, 
          locations: data, 
          loading: false,
          error: null 
        }));
        
        // Set first location as default if no location is selected
        if (data.length > 0 && !prev.selectedLocation) {
          const firstLocation = data[0];
          console.log('🔍 useLocation: Setting default location:', firstLocation);
          setSelectedLocation(firstLocation.id);
        }
        
        // Update location name if location is already selected
        if (prev.selectedLocation) {
          const location = data.find(loc => loc.id === prev.selectedLocation);
          if (location) {
            console.log('🔍 useLocation: Updating location name:', location.name);
            setState(prev => ({ 
              ...prev, 
              selectedLocationName: location.name 
            }));
          }
        }
      } else {
        console.log('🔍 useLocation: No locations found or invalid data:', data);
        
        // If no locations exist, try to create a default one
        if (data && Array.isArray(data) && data.length === 0) {
          console.log('🔍 useLocation: No locations found, attempting to create default location');
          try {
            const { data: newLocation, error: createError } = await supabase
              .from(LOCATION_CONSTANTS.DATABASE.TABLE_NAME)
              .insert({
                tenant_id: tenantId,
                name: 'Main Location',
                address_line_1: 'Main Business Address',
                city: 'City',
                state_province: 'State/Province',
                country: 'United States',
                is_primary: true,
                is_active: true
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating default location:', createError);
            } else {
              console.log('🔍 useLocation: Created default location:', newLocation);
              setState(prev => ({ 
                ...prev, 
                locations: [newLocation], 
                loading: false,
                error: null 
              }));
              return;
            }
          } catch (createError) {
            console.error('Error creating default location:', createError);
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          locations: [], 
          loading: false,
          error: null 
        }));
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to fetch locations',
        locations: [] 
      }));
    }
  }, [tenantId]);

  /**
   * Set selected location and persist to localStorage
   */
  const setSelectedLocation = useCallback((locationId: string) => {
    setState(prev => {
      const location = prev.locations.find(loc => loc.id === locationId);
      const locationName = location?.name || '';
      
      // Persist to localStorage
      localStorage.setItem(LOCATION_CONSTANTS.STORAGE_KEY, locationId);
      
      return {
        ...prev,
        selectedLocation: locationId,
        selectedLocationName: locationName
      };
    });
  }, []);

  /**
   * Clear selected location
   */
  const clearSelectedLocation = useCallback(() => {
    localStorage.removeItem(LOCATION_CONSTANTS.STORAGE_KEY);
    setState(prev => ({
      ...prev,
      selectedLocation: '',
      selectedLocationName: ''
    }));
  }, []);

  /**
   * Get location by ID
   */
  const getLocationById = useCallback((locationId: string): LocationData | undefined => {
    return state.locations.find(loc => loc.id === locationId);
  }, [state.locations]);

  /**
   * Check if location is selected
   */
  const isLocationSelected = useCallback((): boolean => {
    return !!state.selectedLocation;
  }, [state.selectedLocation]);

  /**
   * Get active locations count
   */
  const getActiveLocationsCount = useCallback((): number => {
    return state.locations.length;
  }, [state.locations]);

  // Fetch locations when tenantId changes
  useEffect(() => {
    if (tenantId) {
      fetchLocations();
    }
  }, [tenantId, fetchLocations]);

  return {
    // State
    locations: state.locations,
    selectedLocation: state.selectedLocation,
    selectedLocationName: state.selectedLocationName,
    loading: state.loading,
    error: state.error,
    
    // Actions
    setSelectedLocation,
    clearSelectedLocation,
    fetchLocations,
    
    // Utilities
    getLocationById,
    isLocationSelected,
    getActiveLocationsCount,
    
    // Constants for UI
    constants: LOCATION_CONSTANTS
  };
};
