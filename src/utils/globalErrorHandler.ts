export const setupGlobalErrorHandler = () => {
  // Only set up in browser environment
  if (typeof window === 'undefined') return;

  // Check if handlers are already set up to prevent duplicates
  if ((window as any).__globalErrorHandlerSet) return;
  (window as any).__globalErrorHandlerSet = true;

  const errorHandler = (event: ErrorEvent) => {
    if (event.error?.message?.includes('useBusinessSettingsManager')) {
      console.error('[GlobalErrorHandler] useBusinessSettingsManager error detected:', {
        message: event.error.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error.stack,
        timestamp: new Date().toISOString()
      });
    }
  };

  const rejectionHandler = (event: PromiseRejectionEvent) => {
    if (event.reason?.message?.includes('useBusinessSettingsManager')) {
      console.error('[GlobalErrorHandler] useBusinessSettingsManager unhandled rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    }
  };

  window.addEventListener('error', errorHandler);
  window.addEventListener('unhandledrejection', rejectionHandler);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', errorHandler);
    window.removeEventListener('unhandledrejection', rejectionHandler);
    delete (window as any).__globalErrorHandlerSet;
  };
};



