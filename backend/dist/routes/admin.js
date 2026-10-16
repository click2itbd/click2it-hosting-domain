import { Router } from 'express';
import { getAdminDocument, setAdminDocument, isUserAdmin } from '../firebase/admin.js';
import { CpanelHostingProvider } from '../providers/hosting/CpanelHostingProvider.js';
import { OpenproviderDomainProvider } from '../providers/domain/OpenproviderDomainProvider.js';
import { getCloudLinuxProvider } from '../providers/cloudlinux/CloudLinuxProvider.js';
import { verifySmtpConnection } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
const adminRouter = Router();
adminRouter.use(requireFirebaseAuth);
const FORBIDDEN_SECRET_FIELDS = new Set([
    'bkashAppKey',
    'bkashAppSecret',
    'bkashUsername',
    'bkashPassword',
    'sandbox_bkashAppKey',
    'sandbox_bkashAppSecret',
    'sandbox_bkashUsername',
    'sandbox_bkashPassword',
    'production_bkashAppKey',
    'production_bkashAppSecret',
    'production_bkashUsername',
    'production_bkashPassword',
    'smtpPassword',
    'smsApiKey',
    'whatsappAccessToken',
    'hostingApiKey',
    'hostingApiUrl',
    'hostingApiUsername',
    'whmUrl',
    'whmApiUrl',
    'whmApiToken',
    'whmApiKey',
    'whmUsername',
    'clnSecretKey',
]);
adminRouter.get('/api-config', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await getAdminDocument('settings', 'api_keys');
        const data = result.data || {};
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (FORBIDDEN_SECRET_FIELDS.has(key)) {
                sanitized[key] = typeof value === 'string' && value.length > 0;
            }
            else {
                sanitized[key] = value;
            }
        }
        return res.json({ success: true, data: sanitized });
    }
    catch (error) {
        console.error('Failed to load sanitized API config:', error);
        return res.status(500).json({ error: 'Failed to load API configuration' });
    }
});
adminRouter.get('/hosting-config', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await getAdminDocument('settings', 'hostingApiConfig');
        const data = result.data || {};
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            if (FORBIDDEN_SECRET_FIELDS.has(key)) {
                continue;
            }
            sanitized[key] = value;
        }
        return res.json({ success: true, data: sanitized });
    }
    catch (error) {
        console.error('Failed to load hosting config:', error);
        return res.status(500).json({ error: 'Failed to load hosting configuration' });
    }
});
adminRouter.post('/hosting-config', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await getAdminDocument('settings', 'hostingApiConfig');
        const existing = result.data || {};
        const payload = { ...existing };
        for (const [key, value] of Object.entries(req.body)) {
            if (FORBIDDEN_SECRET_FIELDS.has(key)) {
                continue;
            }
            if (typeof value !== 'undefined') {
                payload[key] = value;
            }
        }
        await setAdminDocument('settings', 'hostingApiConfig', payload);
        return res.json({ success: true, message: 'Hosting configuration saved successfully' });
    }
    catch (error) {
        console.error('Failed to save hosting config:', error);
        return res.status(500).json({ error: 'Failed to save hosting configuration' });
    }
});
adminRouter.post('/api-config', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await getAdminDocument('settings', 'api_keys');
        const existing = result.data || {};
        const payload = { ...existing };
        for (const [key, value] of Object.entries(req.body)) {
            if (FORBIDDEN_SECRET_FIELDS.has(key)) {
                continue;
            }
            if (typeof value !== 'undefined') {
                payload[key] = value;
            }
        }
        await setAdminDocument('settings', 'api_keys', payload);
        return res.json({ success: true, message: 'API configuration saved successfully' });
    }
    catch (error) {
        console.error('Failed to save API config:', error);
        return res.status(500).json({ error: 'Failed to save API configuration' });
    }
});
adminRouter.post('/hosting/test-connection', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const dbConfig = await getAdminDocument('settings', 'hostingApiConfig');
        const hostingUrl = dbConfig.data?.hostingApiUrl || process.env.WHM_URL || process.env.WHM_API_URL;
        const provider = new CpanelHostingProvider((process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || '').trim(), hostingUrl, (process.env.WHM_USERNAME || 'root').trim(), parseInt(process.env.WHM_TIMEOUT_MS || '15000', 10));
        const result = await provider.testConnection();
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'WHM connection test failed' });
    }
});
adminRouter.post('/domain/test-connection', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const { provider: providerName, config } = req.body;
        if (providerName === 'openprovider') {
            const username = config?.username || process.env.OPENPROVIDER_USERNAME;
            const password = config?.password || process.env.OPENPROVIDER_PASSWORD;
            const isSandbox = config?.isSandbox !== undefined
                ? (config.isSandbox === true)
                : process.env.OPENPROVIDER_SANDBOX_MODE === 'true';
            const defaultHandle = config?.defaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';
            const serverIp = process.env.SERVER_IP || '160.191.14.26';
            if (!username || !password) {
                return res.json({ success: false, code: 'NOT_CONFIGURED', message: 'Openprovider credentials are missing. Please enter your Username and Password.', serverIp });
            }
            const provider = new OpenproviderDomainProvider(username, password, isSandbox, defaultHandle);
            try {
                const testRes = await provider.testConnection();
                return res.json({ ...testRes, serverIp: testRes.serverIp || serverIp });
            }
            catch (e) {
                return res.json({ success: false, code: 'AUTH_FAILED', message: e.message || 'Authentication failed', serverIp });
            }
        }
        return res.json({ success: false, code: 'UNKNOWN_PROVIDER', message: 'Unknown provider specified' });
    }
    catch (error) {
        return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'Connection test failed' });
    }
});
adminRouter.post('/hosting/cloudlinux/test-connection', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const provider = getCloudLinuxProvider();
        const result = await provider.testConnection();
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'CloudLinux connection test failed' });
    }
});
adminRouter.post('/email/test-connection', async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user.uid);
        if (!isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await verifySmtpConnection();
        return res.json(result);
    }
    catch (error) {
        return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'SMTP connection test failed' });
    }
});
export default adminRouter;
