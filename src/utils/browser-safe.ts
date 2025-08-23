export const isBrowser = typeof window !== 'undefined';

export const getWindowWidth = (): number => {
  return isBrowser ? window.innerWidth : 1024; // Default desktop width
};

export const getWindowHeight = (): number => {
  return isBrowser ? window.innerHeight : 768; // Default desktop height
};

export const getWindowLocation = () => {
  return isBrowser ? window.location : null;
};

export const addWindowEventListener = (type: string, listener: EventListener) => {
  if (isBrowser) {
    window.addEventListener(type, listener);
  }
};

export const removeWindowEventListener = (type: string, listener: EventListener) => {
  if (isBrowser) {
    window.removeEventListener(type, listener);
  }
};
