import dns from 'node:dns';
import { Agent, setGlobalDispatcher } from 'undici';

// Optional custom DNS lookup with immediate fallback to OS default dns.lookup
export const resilientAgent = new Agent({
  connect: {
    lookup: (hostname: string, options: any, callback: any) => {
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      dns.lookup(hostname, options, callback);
    },
    timeout: 20000,
  },
  headersTimeout: 20000,
  bodyTimeout: 20000,
});

if (process.env.ENABLE_CUSTOM_DNS === 'true') {
  setGlobalDispatcher(resilientAgent);
  console.log('[NetworkDNS] Custom DNS dispatcher enabled');
} else {
  console.log('[NetworkDNS] Standard OS DNS lookup active');
}
