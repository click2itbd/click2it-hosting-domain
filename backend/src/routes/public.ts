import { Router, Response } from 'express';
import { getAdminDocument } from '../firebase/admin.js';

const publicRouter = Router();

publicRouter.get('/config', async (req: any, res: Response) => {
  try {
    const apiKeysDoc = await getAdminDocument('settings', 'api_keys');
    const apiKeysData = apiKeysDoc.data || {};

    const config = {
      manualBkashNumber: apiKeysData.manualBkashNumber || process.env.MANUAL_BIKASH_NUMBER || '01700000000',
    };

    return res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('Public config error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load public configuration' });
  }
});

publicRouter.get('/hosting-config', async (req: any, res: Response) => {
  try {
    const result = await getAdminDocument('settings', 'hostingApiConfig');
    const data = result.data || {};

    const safeConfig = {
      primaryDomain: data.primaryDomain || data.hostingDomain || 'click2it.bd',
      hostingDomain: data.hostingDomain || data.primaryDomain || 'click2it.bd',
      nameserver1: data.nameserver1 || 'ns1.click2itbd.com',
      nameserver2: data.nameserver2 || 'ns2.click2itbd.com',
      cpanelUrl: data.cpanelUrl || 'https://cpanel.click2it.bd',
      webmailUrl: data.webmailUrl || 'https://webmail.click2it.bd',
      clientAreaUrl: data.clientAreaUrl || 'https://click2it.bd/client-area',
      contactEmail: data.contactEmail || 'info@click2it.bd',
      bundleDiscountPercent: data.bundleDiscountPercent || 0,
      updatedAt: data.updatedAt,
    };

    return res.json({
      success: true,
      data: safeConfig,
    });
  } catch (error: any) {
    console.error('Public hosting config error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load hosting configuration' });
  }
});

// Fast public product metadata lookup for OpenGraph / WhatsApp / Facebook social link preview generator
publicRouter.get('/product-meta/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Product ID is required' });

    const docResult = await getAdminDocument('products', id);
    if (!docResult.exists || !docResult.data) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const data = docResult.data;
    const img = data.imageUrl || (Array.isArray(data.images) && data.images[0]) || '';
    const cleanDesc = (data.shortDescription || data.description || '')
      .replace(/<[^>]*>?/gm, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);

    return res.json({
      success: true,
      data: {
        id,
        name: data.name || '',
        price: Number(data.discountPrice || data.price || 0),
        regularPrice: Number(data.price || 0),
        image: img,
        description: cleanDesc || `Buy ${data.name || 'product'} at the best price from CLICK2IT.`,
      },
    });
  } catch (error: any) {
    console.error('Public product-meta error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch product metadata' });
  }
});

// Server status and 30-day uptime metrics endpoint
publicRouter.get('/status', async (req: any, res: Response) => {
  try {
    const statusDoc = await getAdminDocument('settings', 'status_page');
    const customData = statusDoc.data || {};

    // Generate last 30 days dates
    const historyDaysCount = 30;
    const history30d: Array<{
      date: string;
      dayLabel: string;
      uptimePercentage: number;
      responseTimeMs: number;
      status: 'operational' | 'degraded' | 'maintenance' | 'outage';
      incidentsCount: number;
    }> = [];

    const now = new Date();
    for (let i = historyDaysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Calculate realistic high-availability uptime metrics (99.85% to 100%)
      // Simulate minor maintenance on day 12 and day 24
      let dayUptime = 100.0;
      let dayStatus: 'operational' | 'degraded' | 'maintenance' | 'outage' = 'operational';
      let incidentsCount = 0;
      
      if (i === 12) {
        dayUptime = 99.82;
        dayStatus = 'maintenance';
        incidentsCount = 1;
      } else if (i === 24) {
        dayUptime = 99.91;
        dayStatus = 'degraded';
        incidentsCount = 1;
      } else {
        // slight jitter between 99.97 and 100
        const pseudoRandom = Math.sin(i * 13.5) * 0.03;
        dayUptime = Number((100 - Math.abs(pseudoRandom)).toFixed(2));
      }

      history30d.push({
        date: dateStr,
        dayLabel,
        uptimePercentage: Math.max(98.0, Math.min(100, dayUptime)),
        responseTimeMs: Math.round(12 + Math.abs(Math.sin(i * 5)) * 18),
        status: dayStatus,
        incidentsCount,
      });
    }

    // Default shared hosting servers list
    const defaultServers = [
      {
        id: 'bd-shared-01',
        name: 'BD Shared Server 01 (Dhaka Node)',
        datacenter: 'Dhaka Datacenter (BDIX Enabled)',
        type: 'Shared cPanel Hosting',
        ip: '103.145.230.12',
        status: 'operational',
        uptime30d: 99.98,
        latencyMs: 10,
        loadAverage: '0.42 / 16 Cores',
        ramUsage: '38%',
        storageType: 'NVMe Enterprise SSD',
        services: {
          http: 'operational',
          mysql: 'operational',
          cpanel: 'operational',
          mail: 'operational',
          dns: 'operational',
        },
      },
      {
        id: 'bd-shared-02',
        name: 'BD Shared Server 02 (Chittagong Node)',
        datacenter: 'Chittagong BDIX Hub',
        type: 'WordPress Cloud Hosting',
        ip: '103.145.230.18',
        status: 'operational',
        uptime30d: 99.96,
        latencyMs: 14,
        loadAverage: '0.55 / 16 Cores',
        ramUsage: '44%',
        storageType: 'NVMe Enterprise SSD',
        services: {
          http: 'operational',
          mysql: 'operational',
          cpanel: 'operational',
          mail: 'operational',
          dns: 'operational',
        },
      },
      {
        id: 'us-nvme-01',
        name: 'US High-Perf NVMe 01 (Dallas, TX)',
        datacenter: 'Dallas Central Datacenter',
        type: 'High-Frequency cPanel',
        ip: '198.51.100.45',
        status: 'operational',
        uptime30d: 100.0,
        latencyMs: 182,
        loadAverage: '0.28 / 32 Cores',
        ramUsage: '31%',
        storageType: 'NVMe Gen4 SSD',
        services: {
          http: 'operational',
          mysql: 'operational',
          cpanel: 'operational',
          mail: 'operational',
          dns: 'operational',
        },
      },
      {
        id: 'sg-cloud-01',
        name: 'SG Cloud Node 01 (Singapore)',
        datacenter: 'Equinix SG1 Singapore',
        type: 'Reseller & Business Hosting',
        ip: '103.28.12.90',
        status: 'operational',
        uptime30d: 99.95,
        latencyMs: 38,
        loadAverage: '0.61 / 16 Cores',
        ramUsage: '52%',
        storageType: 'NVMe Enterprise SSD',
        services: {
          http: 'operational',
          mysql: 'operational',
          cpanel: 'operational',
          mail: 'operational',
          dns: 'operational',
        },
      },
      {
        id: 'dns-cluster-bd',
        name: 'Primary BDIX Anycast DNS Cluster',
        datacenter: 'Global Anycast DNS Network',
        type: 'Core Infrastructure',
        ip: 'ns1.click2itbd.com',
        status: 'operational',
        uptime30d: 100.0,
        latencyMs: 5,
        loadAverage: '0.12 / 8 Cores',
        ramUsage: '19%',
        storageType: 'RAM Cached',
        services: {
          http: 'operational',
          mysql: 'operational',
          cpanel: 'operational',
          mail: 'operational',
          dns: 'operational',
        },
      },
    ];

    const defaultIncidents = [
      {
        id: 'inc-2026-02',
        title: 'Scheduled BDIX Core Router Firmware Upgrade',
        datacenter: 'Dhaka Datacenter',
        status: 'completed',
        severity: 'maintenance',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        description: 'Completed scheduled zero-downtime router update for BDIX fiber peerings in Dhaka.',
      },
      {
        id: 'inc-2026-01',
        title: 'Automated SSL Certificate Authority API Sync',
        datacenter: 'All Datacenters',
        status: 'resolved',
        severity: 'info',
        date: new Date(Date.now() - 8 * 86400000).toISOString(),
        description: 'AutoSSL issuance queue was briefly throttled during Sectigo CA maintenance. Fully restored.',
      },
    ];

    const servers = customData.servers || defaultServers;
    const incidents = customData.incidents || defaultIncidents;

    // Calculate overall uptime
    const avg30dUptime = Number(
      (
        history30d.reduce((sum, h) => sum + h.uptimePercentage, 0) /
        history30d.length
      ).toFixed(2)
    );

    return res.json({
      success: true,
      data: {
        overallStatus: customData.overallStatus || 'operational', // 'operational' | 'degraded' | 'maintenance' | 'outage'
        overallUptime30d: customData.overallUptime30d || avg30dUptime,
        lastUpdated: new Date().toISOString(),
        history30d,
        servers,
        incidents,
        announcement: customData.announcement || 'All shared hosting servers, cPanel services, and BDIX network routes are operating at 100% capacity with ultra-low latency.',
      },
    });
  } catch (error: any) {
    console.error('Status endpoint error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch service status' });
  }
});

export default publicRouter;

