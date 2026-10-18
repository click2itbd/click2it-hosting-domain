import dns from 'node:dns';

export let resilientAgent: any = undefined;

// Optional custom DNS lookup with immediate fallback to OS default dns.lookup
if (process.env.ENABLE_CUSTOM_DNS === 'true') {
  import('undici')
    .then(({ Agent, setGlobalDispatcher }) => {
      resilientAgent = new Agent({
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
      setGlobalDispatcher(resilientAgent);
      console.log('[NetworkDNS] Custom DNS dispatcher enabled');
    })
    .catch(() => {
      console.log('[NetworkDNS] Standard OS DNS lookup active (undici not installed)');
    });
} else {
  console.log('[NetworkDNS] Standard OS DNS lookup active');
}

