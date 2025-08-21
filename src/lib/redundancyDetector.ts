/**
 * Utility to detect and prevent redundant operations that cause performance issues
 */

export class RedundancyDetector {
  private static executionCache = new Map<string, number>();
  private static operationLocks = new Set<string>();

  /**
   * Check if operation was executed recently to prevent duplicates
   */
  static shouldExecute(operationKey: string, minInterval: number = 1000): boolean {
    const lastExecution = this.executionCache.get(operationKey) || 0;
    const timeSinceLastExecution = Date.now() - lastExecution;
    
    return timeSinceLastExecution >= minInterval;
  }

  /**
   * Mark operation as executed
   */
  static markExecuted(operationKey: string): void {
    this.executionCache.set(operationKey, Date.now());
  }

  /**
   * Lock operation to prevent concurrent execution
   */
  static lockOperation(operationKey: string): boolean {
    if (this.operationLocks.has(operationKey)) {
      return false; // Already locked
    }
    
    this.operationLocks.add(operationKey);
    return true; // Successfully locked
  }

  /**
   * Unlock operation
   */
  static unlockOperation(operationKey: string): void {
    this.operationLocks.delete(operationKey);
  }

  /**
   * Execute operation with redundancy protection
   */
  static async executeOnce<T>(
    operationKey: string,
    operation: () => Promise<T>,
    minInterval: number = 1000
  ): Promise<T | null> {
    // Check if operation should execute
    if (!this.shouldExecute(operationKey, minInterval)) {
      return null;
    }

    // Check if operation is already running
    if (!this.lockOperation(operationKey)) {
      return null;
    }

    try {
      const result = await operation();
      this.markExecuted(operationKey);
      return result;
    } finally {
      this.unlockOperation(operationKey);
    }
  }

  /**
   * Clear old execution records
   */
  static cleanup(maxAge: number = 300000): void {
    const now = Date.now();
    for (const [key, timestamp] of this.executionCache.entries()) {
      if (now - timestamp > maxAge) {
        this.executionCache.delete(key);
      }
    }
  }
}