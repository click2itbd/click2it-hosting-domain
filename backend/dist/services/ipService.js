import { resilientAgent } from './networkDns.js';
let cachedPublicIp = null;
let lastIpCheck = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
/**
 * Dynamically detects the server's public outbound IP address.
 * Uses process.env.SERVER_IP if explicitly configured, otherwise queries
 * resilient public IP lookup providers with caching and fallback.
 */
export async function getPublicServerIp() {
    // 1. Check explicit environment override
    const envIp = process.env.SERVER_IP?.trim();
    if (envIp && IPV4_REGEX.test(envIp)) {
        return envIp;
    }
    // 2. Return cached value if fresh
    if (cachedPublicIp && Date.now() - lastIpCheck < CACHE_TTL_MS) {
        return cachedPublicIp;
    }
    // 3. Query resilient public lookup endpoints
    const endpoints = [
        async () => {
            const res = await fetch('https://api.ipify.org?format=json', {
                signal: AbortSignal.timeout(3000),
                // @ts-ignore
                dispatcher: resilientAgent,
            });
            if (!res.ok)
                throw new Error('ipify failed');
            const data = await res.json();
            return String(data?.ip || '').trim();
        },
        async () => {
            const res = await fetch('https://icanhazip.com', {
                signal: AbortSignal.timeout(3000),
                // @ts-ignore
                dispatcher: resilientAgent,
            });
            if (!res.ok)
                throw new Error('icanhazip failed');
            const text = await res.text();
            return text.trim();
        },
        async () => {
            const res = await fetch('https://ifconfig.me/ip', {
                signal: AbortSignal.timeout(3000),
                // @ts-ignore
                dispatcher: resilientAgent,
            });
            if (!res.ok)
                throw new Error('ifconfig.me failed');
            const text = await res.text();
            return text.trim();
        },
    ];
    for (const fn of endpoints) {
        try {
            const ip = await fn();
            if (ip && IPV4_REGEX.test(ip)) {
                cachedPublicIp = ip;
                lastIpCheck = Date.now();
                return ip;
            }
        }
        catch {
            // Try next endpoint
        }
    }
    // Fallback to previous cached or generic placeholder
    return cachedPublicIp || 'Server IP';
}
/**
 * Synchronous getter for current cached IP or env variable.
 */
export function getCachedServerIp() {
    const envIp = process.env.SERVER_IP?.trim();
    if (envIp && IPV4_REGEX.test(envIp)) {
        return envIp;
    }
    return cachedPublicIp || 'Server IP';
}
