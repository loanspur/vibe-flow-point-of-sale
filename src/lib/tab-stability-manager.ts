/**
 * Global tab stability manager to prevent refresh loops and maintain state
 * when switching between browser tabs or windows
 */

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
      const timeSinceLastChange = now - this.state.lastVisibilityChange;
      
      // Clear any existing timeout
      if (this.stabilityTimeout) {
        clearTimeout(this.stabilityTimeout);
      }

      if (document.visibilityState === 'hidden') {
        // Tab is being hidden - mark as switching
        this.state.isTabSwitching = true;
        this.state.preventAuthRefresh = true;
        this.state.preventQueryRefresh = true;
        this.state.lastVisibilityChange = now;
        
        console.log('Tab switching detected - preventing refreshes');
      } else if (document.visibilityState === 'visible') {
        // Tab is becoming visible
        if (this.state.isTabSwitching && timeSinceLastChange < 5000) {
          // If we were tab switching and it's been less than 5 seconds, maintain prevention
          console.log('Tab returned within 5 seconds - maintaining stability');
          
          // Gradually restore normal operation after a delay
          this.stabilityTimeout = setTimeout(() => {
            this.restoreNormalOperation();
          }, 3000); // 3 second grace period
        } else {
          // Been away longer or first load - restore normal operation
          this.restoreNormalOperation();
        }
        
        this.state.lastVisibilityChange = now;
      }

      // Notify listeners
      this.notifyListeners();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle window focus/blur as backup
    window.addEventListener('blur', () => {
      this.state.isTabSwitching = true;
      this.state.preventAuthRefresh = true;
    });
  }

  private setupNavigationListener() {
    // Prevent back/forward button from causing refreshes
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      // Let React Router handle navigation
      return false;
    };

    window.addEventListener('popstate', handlePopState);
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

import { useState, useEffect } from 'react';