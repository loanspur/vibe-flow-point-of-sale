import React from 'react';

/**
 * COMPLETELY DISABLED: App optimizer to prevent performance overhead
 * This component is disabled to prevent any performance monitoring overhead
 */
export const AppOptimizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // COMPLETELY DISABLED - No performance monitoring
  console.log('App optimizer disabled to prevent refresh triggers');
  
  return <>{children}</>;
};