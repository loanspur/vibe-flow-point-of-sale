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
  private stabilityTimeout: NodeJS.Timeout | null = null;
  private initialized = false;

  initialize() {
    if (this.initialized) return;
    
    this.setupVisibilityListener();
    this.setupNavigationListener();
    this.initialized = true;
  }

  private setupVisibilityListener() {
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      // Only prevent refreshes for actual tab switches, not navigation-related visibility changes
      if (document.visibilityState === 'hidden') {
        // Only set state, don't immediately prevent everything
        this.state.isTabSwitching = true;
        this.state.lastVisibilityChange = now;
      } else if (document.visibilityState === 'visible') {
        // Immediately restore on visibility return - no delays that cause loops
        this.state.isTabSwitching = false;
        this.state.preventAuthRefresh = false;
        this.state.preventQueryRefresh = false;
        this.state.lastVisibilityChange = now;
        
        // Clear any existing timeout to prevent conflicts
        if (this.stabilityTimeout) {
          clearTimeout(this.stabilityTimeout);
          this.stabilityTimeout = null;
        }
      }

      // Notify listeners
      this.notifyListeners();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  private setupNavigationListener() {
    // Simplified - just handle user interactions to restore normal operation
    const handleUserInteraction = () => {
      // User is actively using the app - ensure normal operation
      this.state.isTabSwitching = false;
      this.state.preventAuthRefresh = false;
      this.state.preventQueryRefresh = false;
      
      if (this.stabilityTimeout) {
        clearTimeout(this.stabilityTimeout);
        this.stabilityTimeout = null;
      }
    };
    
    // Listen for clicks and key presses as signs of active use
    document.addEventListener('click', handleUserInteraction, { passive: true });
    document.addEventListener('keydown', handleUserInteraction, { passive: true });
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

  // Public API
  shouldPreventAuthRefresh(): boolean {
    return this.state.preventAuthRefresh;
  }

  shouldPreventQueryRefresh(): boolean {
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
    
    if (this.stabilityTimeout) {
      clearTimeout(this.stabilityTimeout);
      this.stabilityTimeout = null;
    }
    
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