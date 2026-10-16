import dns from 'node:dns';
import { Agent, setGlobalDispatcher } from 'undici';
// Configure public DNS resolvers to bypass faulty/timing-out local router DNS
const resolver = new dns.promises.Resolver();
try {
    resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
}
catch (e) {
    console.warn('[NetworkDNS] Failed to set custom DNS servers:', e);
}
// Global Undici Agent with resilient DNS resolution
export const resilientAgent = new Agent({
    connect: {
        lookup: (hostname, options, callback) => {
            if (typeof options === 'function') {
                callback = options;
                options = {};
            }
            resolver.resolve4(hostname).then((addresses) => {
                if (addresses && addresses.length > 0) {
                    if (options && options.all) {
                        callback(null, addresses.map(a => ({ address: a, family: 4 })));
                    }
                    else {
                        callback(null, addresses[0], 4);
                    }
                }
                else {
                    dns.lookup(hostname, options, callback);
                }
            }, () => {
                // Fall back to OS lookup
                dns.lookup(hostname, options, callback);
            });
        },
        timeout: 20000,
    },
    headersTimeout: 20000,
    bodyTimeout: 20000,
});
setGlobalDispatcher(resilientAgent);
console.log('[NetworkDNS] Resilient DNS resolver initialized with 8.8.8.8 and 1.1.1.1');
