/**
 * DISABLED: Global tab stability manager to prevent refresh loops
 * This manager is completely disabled to prevent unwanted refreshes
 */

import { useState, useEffect } from 'react';

interface TabState {
  isTabSwitching: boolean;
  lastVisibilityChange: number;
  preventAuthRefresh: boolean;
  preventQueryRefresh: boolean;
}

class TabStabilityManager {
  private state: TabState = {
    isTabSwitching: false,
    lastVisibilityChange: 0,
    preventAuthRefresh: false,
    preventQueryRefresh: false,
  };

  private listeners: (() => void)[] = [];
  private initialized = false;

  initialize() {
    // Completely disabled to prevent refresh triggers
    console.log('Tab stability manager disabled to prevent refresh triggers');
  }

  private setupVisibilityListener() {
    // Disabled: No visibility listeners
  }

  private restoreNormalOperation() {
    // Disabled: No operation restoration
  }

  private notifyListeners() {
    // Disabled: No listener notifications
  }

  // Public API - Never prevent any operations
  shouldPreventAuthRefresh(): boolean {
    return false; // Always allow auth operations
  }

  shouldPreventQueryRefresh(): boolean {
    return false; // Always allow query operations
  }

  isCurrentlyTabSwitching(): boolean {
    return false; // Never consider tab switching
  }

  onStateChange(listener: () => void): () => void {
    // Disabled: No state change listeners
    return () => {}; // No-op cleanup
  }

  // Force reset - use only in emergencies
  forceReset() {
    console.log('Tab stability manager reset (disabled)');
  }

  // Get current state for debugging
  getState(): Readonly<TabState> {
    return { ...this.state };
  }
}

// Global singleton instance
export const tabStabilityManager = new TabStabilityManager();

// Hook for React components
export function useTabStability() {
  return {
    shouldPreventAuthRefresh: false,
    shouldPreventQueryRefresh: false,
    isTabSwitching: false,
    forceReset: () => {},
    getState: () => ({
      isTabSwitching: false,
      lastVisibilityChange: 0,
      preventAuthRefresh: false,
      preventQueryRefresh: false,
    }),
  };
}