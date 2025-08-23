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
      
      // Prevent rapid visibility changes (less than 500ms apart)
      if (now - this.state.lastVisibilityChange < 500) {
        return;
      }
      
      if (document.visibilityState === 'hidden') {
        // Mark tab as switching
        this.state.isTabSwitching = true;
        this.state.lastVisibilityChange = now;
        
        // Don't prevent any operations - let the app work normally
        this.state.preventQueryRefresh = false;
        this.state.preventAuthRefresh = false;
      } else if (document.visibilityState === 'visible') {
        // When tab becomes visible again, restore normal operation
        this.state.isTabSwitching = false;
        this.state.preventAuthRefresh = false;
        this.state.preventQueryRefresh = false;
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

  // Public API - Never prevent any operations for stability
  shouldPreventAuthRefresh(): boolean {
    return false; // Always allow auth operations
  }

  shouldPreventQueryRefresh(): boolean {
    return false; // Always allow query operations
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