const DEBUG_MODE = process.env.NODE_ENV === 'development';

export const debugLog = (message: string, data?: any) => {
  if (DEBUG_MODE) {
    console.log(message, data);
  }
};

export const debugError = (message: string, error?: any) => {
  if (DEBUG_MODE) {
    console.error(message, error);
  }
};
