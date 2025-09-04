// Environment guard functions to consolidate duplicated host logic
export const isLocalTenantSubdomain = (domain?: string) => {
  const h = domain || window.location.hostname;
  return h.includes('localhost') && h.split('.').length >= 2;
};

export const isDevelopmentDomain = (domain?: string) => {
  const h = domain || window.location.hostname;
  return h === 'localhost' || h.includes('localhost');
};

export const isVibenetSubdomain = (domain?: string) => {
  const h = domain || window.location.hostname;
  return h.includes('vibenet') && !h.includes('localhost');
};

export const isMainDomain = (domain?: string) => {
  const h = domain || window.location.hostname;
  return h === 'vibenet.com' || h === 'www.vibenet.com';
};
