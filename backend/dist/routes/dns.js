import express from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { isUserAdmin } from '../firebase/admin.js';
import { getDomainProviderConfig } from '../services/domainProviderConfig.js';
import { getDomainProvider } from '../providers/providerFactory.js';
const dnsRouter = express.Router();
dnsRouter.get('/zones', requireFirebaseAuth, async (req, res) => {
    try {
        const isAdmin = await isUserAdmin(req.user?.uid);
        if (!isAdmin)
            return res.status(403).json({ error: 'Admin access required' });
        const config = await getDomainProviderConfig();
        const provider = getDomainProvider(config);
        if (typeof provider.fetchApi === 'function') {
            const response = await provider.fetchApi('/dns/zones');
            const zones = response.data?.results || response.data?.zones || [];
            return res.json({ success: true, data: Array.isArray(zones) ? zones : [] });
        }
        return res.json({ success: true, data: [] });
    }
    catch (error) {
        console.error('DNS zones error:', error);
        return res.status(502).json({ success: false, error: error.message || 'Openprovider DNS request failed' });
    }
});
export default dnsRouter;
