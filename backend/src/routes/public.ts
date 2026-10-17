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

export default publicRouter;
