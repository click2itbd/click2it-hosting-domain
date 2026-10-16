export const getPlatform = () => {
  if (typeof window === 'undefined') return 'ecommerce';
  const host = window.location.hostname;
  
  if (host.includes('click2itbd.com') || host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'ecommerce';
  }
  if (host.includes('click2it.bd')) {
    return 'hosting';
  }
  return 'ecommerce';
};
