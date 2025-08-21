import React, { useEffect } from 'react';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

interface TabStabilityProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that initializes the tab stability manager
 * and ensures it's active throughout the app lifecycle
 */
export function TabStabilityProvider({ children }: TabStabilityProviderProps) {
  useEffect(() => {
    // Initialize tab stability manager as early as possible
    tabStabilityManager.initialize();
    
    console.log('Tab stability system activated');
    
    // Optional: Add debugging in development
    if (process.env.NODE_ENV === 'development') {
      const logState = () => {
        const state = tabStabilityManager.getState();
        console.log('Tab stability state:', state);
      };
      
      const cleanup = tabStabilityManager.onStateChange(logState);
      return cleanup;
    }
  }, []);

  return <>{children}</>;
}