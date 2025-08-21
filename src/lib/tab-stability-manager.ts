/**
 * Global tab stability manager to prevent refresh loops and maintain state
 * when switching between browser tabs or windows
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
    if (this.initialized) return;
    
    this.setupVisibilityListener();
    this.initialized = true;
  }

  private setupVisibilityListener() {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.visibilityState === 'hidden') {
        // Mark tab as switching but don't prevent operations immediately
        this.state.isTabSwitching = true;
        this.state.lastVisibilityChange = now;
        
        // Only prevent query refreshes briefly to avoid excessive requests
        this.state.preventQueryRefresh = true;
        
        // Don't interfere with auth - authentication should always work
        this.state.preventAuthRefresh = false;
      } else if (document.visibilityState === 'visible') {
        // When tab becomes visible again, restore normal operation quickly
        this.state.isTabSwitching = false;
        this.state.preventAuthRefresh = false;
        
        // Allow queries after a short delay to prevent immediate flood
        setTimeout(() => {
          this.state.preventQueryRefresh = false;
          this.notifyListeners();
        }, 100);
        
        this.state.lastVisibilityChange = now;
      }

      this.notifyListeners();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private restoreNormalOperation() {
    console.log('Restoring normal operation - refreshes allowed');
    this.state.isTabSwitching = false;
    this.state.preventAuthRefresh = false;
    this.state.preventQueryRefresh = false;
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.warn('Error in tab stability listener:', error);
      }
    });
  }

  // Public API - Never prevent auth operations for stability
  shouldPreventAuthRefresh(): boolean {
    return false; // Always allow auth operations
  }

  shouldPreventQueryRefresh(): boolean {
    // Only prevent queries briefly during tab switching to reduce load
    return this.state.preventQueryRefresh;
  }

  isCurrentlyTabSwitching(): boolean {
    return this.state.isTabSwitching;
  }

  onStateChange(listener: () => void): () => void {
    this.listeners.push(listener);
    
    // Return cleanup function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Force reset - use only in emergencies
  forceReset() {
    console.warn('Force resetting tab stability manager');
    this.state = {
      isTabSwitching: false,
      lastVisibilityChange: 0,
      preventAuthRefresh: false,
      preventQueryRefresh: false,
    };
    
    this.notifyListeners();
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
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Initialize on first use
    tabStabilityManager.initialize();
    
    // Listen for state changes
    const cleanup = tabStabilityManager.onStateChange(() => {
      forceUpdate({});
    });
    
    return cleanup;
  }, []);

  return {
    shouldPreventAuthRefresh: tabStabilityManager.shouldPreventAuthRefresh(),
    shouldPreventQueryRefresh: tabStabilityManager.shouldPreventQueryRefresh(),
    isTabSwitching: tabStabilityManager.isCurrentlyTabSwitching(),
    forceReset: tabStabilityManager.forceReset,
    getState: tabStabilityManager.getState,
  };
}