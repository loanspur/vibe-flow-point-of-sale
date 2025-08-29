import { useEffect } from 'react';

export const GlobalErrorHandler = () => {
  useEffect(() => {
    // Error event handler
    const handleError = (event: ErrorEvent) => {
      const message = event.message?.toLowerCase() || '';
      const filename = event.filename?.toLowerCase() || '';
      
      if (message.includes('firebase') || 
          message.includes('firestore') || 
          message.includes('googleapis') ||
          message.includes('unrecognized feature') ||
          message.includes('iframe') ||
          message.includes('sandbox') ||
          message.includes('message channel closed') ||
          message.includes('listener indicated an asynchronous response') ||
          filename.includes('firebase') ||
          filename.includes('firestore') ||
          message.includes('webchannelconnection') ||
          message.includes('quic_protocol_error')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Unhandled rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message?.toLowerCase() || 
                    event.reason?.toString?.()?.toLowerCase() || '';
      
      if (reason.includes('firebase') || 
          reason.includes('firestore') || 
          reason.includes('googleapis') ||
          reason.includes('webchannelconnection') ||
          reason.includes('message channel closed') ||
          reason.includes('listener indicated an asynchronous response') ||
          reason.includes('quic_protocol_error')) {
        event.preventDefault();
        return false;
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Suppress Firebase and other noisy logs in production
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      const originalError = console.error;
      const originalWarn = console.warn;
      
      const filteredError = function(...args: any[]) {
        const message = args.join(' ').toLowerCase();
        if (message.includes('firebase') || 
            message.includes('firestore') || 
            message.includes('googleapis') ||
            message.includes('webchannelconnection') ||
            message.includes('unrecognized feature') ||
            message.includes('iframe') ||
            message.includes('message channel closed') ||
            message.includes('sandbox')) {
          return;
        }
        originalError.apply(console, args);
      };

      const filteredWarn = function(...args: any[]) {
        const message = args.join(' ').toLowerCase();
        if (message.includes('firebase') || 
            message.includes('firestore') || 
            message.includes('googleapis') ||
            message.includes('multiple gotrueclient') ||
            message.includes('sandbox')) {
          return;
        }
        originalWarn.apply(console, args);
      };

      console.error = filteredError;
      console.warn = filteredWarn;

      // Cleanup function
      return () => {
        console.error = originalError;
        console.warn = originalWarn;
      };
    }
  }, []);

  return null;
};
