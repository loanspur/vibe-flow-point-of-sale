import React from 'react';
import { log } from '@/lib/logger';

/**
 * COMPLETELY DISABLED: App optimizer to prevent performance overhead
 * This component is disabled to prevent any performance monitoring overhead
 */
export const AppOptimizer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // COMPLETELY DISABLED - No performance monitoring
  log.trace("optimizer", 'App optimizer disabled to prevent refresh triggers');
  
  return <>{children}</>;
};