export const setupGlobalErrorHandler = () => {
  // Only set up in browser environment
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
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
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('useBusinessSettingsManager')) {
      console.error('[GlobalErrorHandler] useBusinessSettingsManager unhandled rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    }
  });
};



