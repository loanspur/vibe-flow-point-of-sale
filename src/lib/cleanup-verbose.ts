// System cleanup utility to remove verbose logging
// This file handles standardized error handling without verbose console output

export const handleError = (error: any, context?: string) => {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development' && context) {
    console.error(`[${context}]`, error);
  }
};

export const handleSuccess = (message: string, data?: any) => {
  // Silent success handling - no console logs
  // Only show user-facing feedback through toast notifications
};

export const logInfo = (message: string, data?: any) => {
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.info(message, data);
  }
};

// Clean error response for production
export const cleanError = (error: any): string => {
  if (process.env.NODE_ENV === 'development') {
    return error?.message || 'An error occurred';
  }
  return 'An error occurred';
};