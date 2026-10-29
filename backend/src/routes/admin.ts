import { Router, Response } from 'express';
import { getAdminDocument, setAdminDocument, isUserAdmin } from '../firebase/admin.js';
import { CpanelHostingProvider } from '../providers/hosting/CpanelHostingProvider.js';
import { OpenproviderDomainProvider } from '../providers/domain/OpenproviderDomainProvider.js';
import { getCloudLinuxProviderWithSettings } from '../services/cloudlinuxConfig.js';
import { verifySmtpConnection } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { getDomainProviderConfig } from '../services/domainProviderConfig.js';

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

adminRouter.get('/api-config', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await getAdminDocument('settings', 'api_keys');
    const data = result.data || {};

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (FORBIDDEN_SECRET_FIELDS.has(key)) {
        sanitized[key] = typeof value === 'string' && value.length > 0;
      } else {
        sanitized[key] = value;
      }
    }

    return res.json({ success: true, data: sanitized });
  } catch (error: any) {
    console.error('Failed to load sanitized API config:', error);
    return res.status(500).json({ error: 'Failed to load API configuration' });
  }
});

adminRouter.get('/hosting-config', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await getAdminDocument('settings', 'hostingApiConfig');
    const data = result.data || {};

    const sanitized: Record<string, any> = {
      primaryDomain: data.primaryDomain || data.hostingDomain || 'click2it.bd',
      hostingDomain: data.hostingDomain || data.primaryDomain || 'click2it.bd',
      nameserver1: data.nameserver1 || 'ns1.click2itbd.com',
      nameserver2: data.nameserver2 || 'ns2.click2itbd.com',
      cpanelUrl: data.cpanelUrl || 'https://cpanel.click2it.bd',
      webmailUrl: data.webmailUrl || 'https://webmail.click2it.bd',
      clientAreaUrl: data.clientAreaUrl || 'https://click2it.bd/client-area',
      contactEmail: data.contactEmail || 'info@click2it.bd',
      whmUsername: data.whmUsername || data.hostingApiUsername || process.env.WHM_USERNAME || 'root',
      hasWhmToken: Boolean(data.whmApiToken || data.hostingApiKey || process.env.WHM_API_TOKEN),
    };
    for (const [key, value] of Object.entries(data)) {
      if (FORBIDDEN_SECRET_FIELDS.has(key)) {
        continue;
      }
      sanitized[key] = value;
    }

    return res.json({ success: true, data: sanitized });
  } catch (error: any) {
    console.error('Failed to load hosting config:', error);
    return res.status(500).json({ error: 'Failed to load hosting configuration' });
  }
});

adminRouter.post('/hosting-config', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await getAdminDocument('settings', 'hostingApiConfig');
    const existing = result.data || {};

    const payload: Record<string, any> = { ...existing };
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'whmApiToken') {
        if (typeof value === 'string' && value.trim()) {
          payload.whmApiToken = value.trim();
          payload.hostingApiKey = value.trim();
        }
        continue;
      }
      if (key === 'whmUsername') {
        if (typeof value === 'string' && value.trim()) {
          payload.whmUsername = value.trim();
          payload.hostingApiUsername = value.trim();
        }
        continue;
      }
      if (FORBIDDEN_SECRET_FIELDS.has(key)) {
        continue;
      }
      if (typeof value !== 'undefined') {
        payload[key] = value;
      }
    }

    await setAdminDocument('settings', 'hostingApiConfig', payload);
    return res.json({ success: true, message: 'Hosting configuration saved successfully' });
  } catch (error: any) {
    console.error('Failed to save hosting config:', error);
    return res.status(500).json({ error: 'Failed to save hosting configuration' });
  }
});

adminRouter.post('/api-config', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await getAdminDocument('settings', 'api_keys');
    const existing = result.data || {};

    const payload: Record<string, any> = { ...existing };
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
  } catch (error: any) {
    console.error('Failed to save API config:', error);
    return res.status(500).json({ error: 'Failed to save API configuration' });
  }
});

adminRouter.post('/hosting/test-connection', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const dbConfig = await getAdminDocument('settings', 'hostingApiConfig');
    const hostingUrl = req.body?.hostingApiUrl || dbConfig.data?.hostingApiUrl || process.env.WHM_URL || process.env.WHM_API_URL;
    const whmToken = (req.body?.whmApiToken || dbConfig.data?.whmApiToken || dbConfig.data?.hostingApiKey || process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || '').trim();
    const whmUsername = (req.body?.whmUsername || dbConfig.data?.whmUsername || dbConfig.data?.hostingApiUsername || process.env.WHM_USERNAME || 'root').trim();

    const provider = new CpanelHostingProvider(
      whmToken,
      hostingUrl,
      whmUsername,
      parseInt(process.env.WHM_TIMEOUT_MS || '15000', 10)
    );

    const result = await provider.testConnection();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'WHM connection test failed' });
  }
});

adminRouter.post('/domain/test-connection', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { provider: providerName, config } = req.body;
    const serverIp = process.env.SERVER_IP || '160.191.14.26';
    
    if (providerName === 'openprovider') {
      const username = config?.username || process.env.OPENPROVIDER_USERNAME;
      const password = config?.password || process.env.OPENPROVIDER_PASSWORD;
      const isSandbox = config?.isSandbox !== undefined
        ? (config.isSandbox === true)
        : process.env.OPENPROVIDER_SANDBOX_MODE === 'true';
      const defaultHandle = config?.defaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';

      if (!username || !password) {
        return res.json({ success: false, code: 'NOT_CONFIGURED', message: 'Openprovider credentials are missing. Please enter your Username and Password.', serverIp });
      }

      const provider = new OpenproviderDomainProvider(username, password, isSandbox, defaultHandle);
      
      try {
        const testRes = await provider.testConnection();
        return res.json({ ...testRes, serverIp: testRes.serverIp || serverIp });
      } catch (e: any) {
        return res.json({ success: false, code: 'AUTH_FAILED', message: e.message || 'Authentication failed', serverIp });
      }
    }

    // Custom or additional domain registrar APIs (ResellerClub, Namecheap, ConnectReseller, Generic REST)
    const { CustomDomainProvider } = await import('../providers/domain/CustomDomainProvider.js');
    const customProvider = new CustomDomainProvider({
      name: config?.name || providerName?.toUpperCase() || 'Custom Registrar API',
      driver: (config?.driver || providerName || 'generic_rest') as any,
      username: config?.username || config?.apiKey || '',
      apiKey: config?.apiKey || config?.password || '',
      baseUrl: config?.baseUrl || '',
      isSandbox: config?.isSandbox === true
    });

    const testRes = await customProvider.testConnection();
    return res.json({ ...testRes, serverIp });
  } catch (error: any) {
    return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'Connection test failed: ' + error.message });
  }
});

adminRouter.post('/hosting/cloudlinux/test-connection', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const provider = await getCloudLinuxProviderWithSettings(req.body || {});
    const result = await provider.testConnection();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'CloudLinux connection test failed' });
  }
});

adminRouter.post('/email/test-connection', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await verifySmtpConnection();
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, code: 'UNKNOWN_ERROR', message: 'SMTP connection test failed' });
  }
});

adminRouter.get('/connections-status', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetService = req.query.service as string | undefined;

    // 1. Backend Status Check
    const checkBackend = async () => {
      const start = Date.now();
      return {
        id: 'backend',
        name: 'Backend API',
        connected: true,
        status: 'online' as const,
        latencyMs: Date.now() - start,
        code: 'OPERATIONAL',
        message: 'Node/Express API runtime operational',
        serverTime: new Date().toISOString(),
        details: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development',
        },
        lastChecked: new Date().toISOString(),
      };
    };

    // 2. Openprovider Status Check
    const checkOpenprovider = async () => {
      const start = Date.now();
      try {
        const providerConfig = await getDomainProviderConfig();
        const username = providerConfig.domainApiKey || process.env.OPENPROVIDER_USERNAME;
        const password = providerConfig.openproviderPassword || process.env.OPENPROVIDER_PASSWORD;
        const isSandbox = providerConfig.openproviderSandbox;
        const defaultHandle = providerConfig.openproviderDefaultHandle || process.env.OPENPROVIDER_DEFAULT_HANDLE || '';
        const serverIp = process.env.SERVER_IP || '160.191.14.26';

        if (!username || !password) {
          return {
            id: 'openprovider',
            name: 'Openprovider',
            connected: false,
            status: 'error' as const,
            latencyMs: Date.now() - start,
            code: 'NOT_CONFIGURED',
            message: 'Openprovider credentials not configured in settings or environment',
            details: {
              isSandbox,
              serverIp,
              configured: false,
            },
            lastChecked: new Date().toISOString(),
          };
        }

        const provider = new OpenproviderDomainProvider(username, password, isSandbox, defaultHandle);
        const testRes = await provider.testConnection();
        const isSuccess = !!testRes.success;

        return {
          id: 'openprovider',
          name: 'Openprovider',
          connected: isSuccess,
          status: isSuccess ? ('online' as const) : ('error' as const),
          latencyMs: Date.now() - start,
          code: testRes.code || (isSuccess ? 'CONNECTED' : 'FAILED'),
          message: testRes.message || (isSuccess ? 'Openprovider API connected and verified' : 'Connection failed'),
          details: {
            isSandbox,
            serverIp: testRes.serverIp || serverIp,
            configured: true,
            balance: (testRes as any).balance !== undefined ? (testRes as any).balance : undefined,
          },
          lastChecked: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          id: 'openprovider',
          name: 'Openprovider',
          connected: false,
          status: 'error' as const,
          latencyMs: Date.now() - start,
          code: 'CONNECTION_ERROR',
          message: err?.message || 'Failed to reach Openprovider API',
          details: { configured: true },
          lastChecked: new Date().toISOString(),
        };
      }
    };

    // 3. WHM / cPanel Status Check
    const checkWhm = async () => {
      const start = Date.now();
      try {
        const dbConfig = await getAdminDocument('settings', 'hostingApiConfig');
        const hostingUrl = dbConfig.data?.hostingApiUrl || process.env.WHM_URL || process.env.WHM_API_URL || '';
        const whmToken = (process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || '').trim();
        const whmUser = (process.env.WHM_USERNAME || 'root').trim();

        if (!hostingUrl || !whmToken) {
          return {
            id: 'whm',
            name: 'WHM / cPanel',
            connected: false,
            status: 'error' as const,
            latencyMs: Date.now() - start,
            code: 'NOT_CONFIGURED',
            message: 'WHM API URL or API Token is not configured',
            details: {
              serverUrl: hostingUrl || 'Not configured',
              configured: false,
            },
            lastChecked: new Date().toISOString(),
          };
        }

        const provider = new CpanelHostingProvider(
          whmToken,
          hostingUrl,
          whmUser,
          parseInt(process.env.WHM_TIMEOUT_MS || '10000', 10)
        );
        const testRes = await provider.testConnection();
        const isSuccess = !!testRes.success;

        return {
          id: 'whm',
          name: 'WHM / cPanel',
          connected: isSuccess,
          status: isSuccess ? ('online' as const) : ('error' as const),
          latencyMs: Date.now() - start,
          code: testRes.code || (isSuccess ? 'CONNECTED' : 'FAILED'),
          message: testRes.message || (isSuccess ? 'WHM server authenticated and reachable' : 'Connection failed'),
          details: {
            serverUrl: hostingUrl,
            username: whmUser,
            configured: true,
          },
          lastChecked: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          id: 'whm',
          name: 'WHM / cPanel',
          connected: false,
          status: 'error' as const,
          latencyMs: Date.now() - start,
          code: 'CONNECTION_ERROR',
          message: err?.message || 'Failed to communicate with WHM server',
          details: { configured: true },
          lastChecked: new Date().toISOString(),
        };
      }
    };

    // 4. CloudLinux Status Check
    const checkCloudLinux = async () => {
      const start = Date.now();
      try {
        const provider = await getCloudLinuxProviderWithSettings();
        const testRes = await provider.testConnection();
        const isSuccess = !!testRes.success;

        return {
          id: 'cloudlinux',
          name: 'CloudLinux',
          connected: isSuccess,
          status: isSuccess ? ('online' as const) : ('error' as const),
          latencyMs: Date.now() - start,
          code: testRes.code || (isSuccess ? 'CONNECTED' : 'FAILED'),
          message: testRes.message || (isSuccess ? 'CloudLinux API authenticated' : 'Connection failed'),
          details: {
            code: testRes.code,
            configured: testRes.code !== 'NOT_CONFIGURED',
          },
          lastChecked: new Date().toISOString(),
        };
      } catch (err: any) {
        return {
          id: 'cloudlinux',
          name: 'CloudLinux',
          connected: false,
          status: 'error' as const,
          latencyMs: Date.now() - start,
          code: 'CONNECTION_ERROR',
          message: err?.message || 'Failed to communicate with CloudLinux API',
          lastChecked: new Date().toISOString(),
        };
      }
    };

    if (targetService === 'backend') {
      const backendRes = await checkBackend();
      return res.json({ success: true, service: backendRes });
    }
    if (targetService === 'openprovider') {
      const opRes = await checkOpenprovider();
      return res.json({ success: true, service: opRes });
    }
    if (targetService === 'whm') {
      const whmRes = await checkWhm();
      return res.json({ success: true, service: whmRes });
    }
    if (targetService === 'cloudlinux') {
      const clnRes = await checkCloudLinux();
      return res.json({ success: true, service: clnRes });
    }

    // Run all concurrently
    const [backendRes, opRes, whmRes, clnRes] = await Promise.all([
      checkBackend(),
      checkOpenprovider(),
      checkWhm(),
      checkCloudLinux(),
    ]);

    const services = {
      backend: backendRes,
      openprovider: opRes,
      whm: whmRes,
      cloudlinux: clnRes,
    };

    const allConnected = Object.values(services).every((s) => s.connected);
    const connectedCount = Object.values(services).filter((s) => s.connected).length;
    const totalCount = Object.values(services).length;

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      allConnected,
      connectedCount,
      totalCount,
      services,
    });
  } catch (error: any) {
    console.error('Failed to get connection status:', error);
    return res.status(500).json({ success: false, error: 'Failed to retrieve connection statuses' });
  }
});

adminRouter.get('/site-settings', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await getAdminDocument('settings', 'site');
    return res.json({ success: true, data: result.data || {} });
  } catch (error: any) {
    console.error('Failed to get site settings:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to retrieve site settings' });
  }
});

adminRouter.post('/site-settings', async (req: any, res: Response) => {
  try {
    const isAdmin = await isUserAdmin(req.user?.uid, req.user?.email, req.user);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const body = req.body || {};
    const allowedFields = [
      'brandName',
      'brandShortName',
      'website',
      'primaryDomain',
      'hostingDomain',
      'contactPhone',
      'whatsappNumber',
      'contactEmail',
      'billingEmail',
      'address',
      'facebookUrl',
      'instagramUrl',
      'youtubeUrl',
      'linkedinUrl',
      'twitterUrl',
      'footerText',
      'primaryColor',
      'secondaryColor',
      'accentColor'
    ];

    const payload: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        payload[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
      }
    }

    await setAdminDocument('settings', 'site', payload);
    return res.json({ success: true, message: 'Website & Contact settings updated successfully', data: payload });
  } catch (error: any) {
    console.error('Failed to save site settings:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to update site settings' });
  }
});

export default adminRouter;
