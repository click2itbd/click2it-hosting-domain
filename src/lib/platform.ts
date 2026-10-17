export const getPlatform = () => {
  if (typeof window === 'undefined') return 'hosting';
  const host = window.location.hostname.toLowerCase();
  
  if (host.includes('click2it.bd') || host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'hosting';
  }
  return 'hosting';
};
