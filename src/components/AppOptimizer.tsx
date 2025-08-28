import React from 'react';
import { tabStabilityManager } from '@/lib/tab-stability-manager';

/**
 * DISABLED: App optimizer to prevent refresh triggers
 * This optimizer is completely disabled to prevent unwanted refreshes
 */
export const AppOptimizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Completely disabled to prevent refresh triggers
  console.log('App optimizer disabled to prevent refresh triggers');
  
  return <>{children}</>;
};