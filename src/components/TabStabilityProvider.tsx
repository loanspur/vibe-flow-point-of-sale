import React from 'react';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

/**
 * DISABLED: Tab stability provider to prevent refresh triggers
 * This provider is completely disabled to prevent unwanted refreshes
 */
export const TabStabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Completely disabled to prevent refresh triggers
  console.log('Tab stability provider disabled to prevent refresh triggers');
  
  return <>{children}</>;
};