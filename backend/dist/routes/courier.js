import { Router } from 'express';
const courierRouter = Router();
// Handle fraud check: GET /api/courier/fraud_check/:phone or via query
courierRouter.get('/fraud_check/:phone?', async (req, res) => {
    const phone = req.params.phone || req.query.phone;
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key'] || req.query.apiKey);
    const secretKey = (req.headers['secret-key'] || req.headers['Secret-Key'] || req.query.secretKey);
    if (!phone) {
        return res.status(400).json({ status: 400, message: 'ফোন নম্বর আবশ্যক' });
    }
    if (!apiKey || !secretKey) {
        return res.status(401).json({ status: 401, message: 'Steadfast Api-Key এবং Secret-Key প্রয়োজন' });
    }
    // Clean phone number (standard 11-digit Bangladesh format)
    let cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length > 11 && cleanPhone.startsWith('88')) {
        cleanPhone = cleanPhone.slice(2);
    }
    if (cleanPhone.length === 10 && cleanPhone.startsWith('1')) {
        cleanPhone = '0' + cleanPhone;
    }
    try {
        const steadfastRes = await fetch(`https://portal.steadfast.com.bd/api/v1/fraud_check/${encodeURIComponent(cleanPhone)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': apiKey,
                'Secret-Key': secretKey
            }
        });
        const data = await steadfastRes.json().catch(() => null);
        if (!steadfastRes.ok) {
            return res.status(steadfastRes.status).json(data || { status: steadfastRes.status, message: `Steadfast API Error: ${steadfastRes.statusText}` });
        }
        return res.json(data);
    }
    catch (error) {
        console.error('Steadfast fraud_check error:', error);
        return res.status(502).json({ status: 502, message: `Steadfast API সংযোগ ত্রুটি: ${error.message || 'Network Error'}` });
    }
});
// Handle tracking status: GET /api/courier/status/:tracking_code or via query
courierRouter.get('/status/:tracking_code?', async (req, res) => {
    const trackingCode = req.params.tracking_code || req.query.tracking_code;
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key'] || req.query.apiKey);
    const secretKey = (req.headers['secret-key'] || req.headers['Secret-Key'] || req.query.secretKey);
    if (!trackingCode) {
        return res.status(400).json({ status: 400, message: 'Tracking code is required' });
    }
    if (!apiKey || !secretKey) {
        return res.status(401).json({ status: 401, message: 'Missing Steadfast Api-Key or Secret-Key' });
    }
    try {
        const steadfastRes = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Api-Key': apiKey,
                'Secret-Key': secretKey
            }
        });
        const data = await steadfastRes.json().catch(() => null);
        if (!steadfastRes.ok) {
            return res.status(steadfastRes.status).json(data || { status: steadfastRes.status, message: steadfastRes.statusText });
        }
        return res.json(data);
    }
    catch (error) {
        console.error('Steadfast tracking status error:', error);
        return res.status(502).json({ status: 502, message: `Steadfast API connection failed: ${error.message}` });
    }
});
// Legacy / Steadfast.php proxy handler for backward compatibility
courierRouter.all('/steadfast.php', async (req, res) => {
    const action = req.query.action || 'create_order';
    const phone = req.query.phone || '';
    const trackingCode = req.query.tracking_code || '';
    const apiKey = (req.headers['api-key'] || req.headers['Api-Key'] || req.query.apiKey);
    const secretKey = (req.headers['secret-key'] || req.headers['Secret-Key'] || req.query.secretKey);
    if (!apiKey || !secretKey) {
        return res.status(401).json({ status: 401, message: 'Missing Steadfast Api-Key or Secret-Key' });
    }
    if (action === 'fraud_check') {
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length > 11 && cleanPhone.startsWith('88')) {
            cleanPhone = cleanPhone.slice(2);
        }
        if (cleanPhone.length === 10 && cleanPhone.startsWith('1')) {
            cleanPhone = '0' + cleanPhone;
        }
        try {
            const response = await fetch(`https://portal.steadfast.com.bd/api/v1/fraud_check/${encodeURIComponent(cleanPhone)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                    'Secret-Key': secretKey
                }
            });
            const data = await response.json().catch(() => null);
            return res.status(response.status).json(data || { status: response.status, message: response.statusText });
        }
        catch (err) {
            return res.status(502).json({ status: 502, message: err.message });
        }
    }
    if (action === 'status') {
        try {
            const response = await fetch(`https://portal.steadfast.com.bd/api/v1/status_by_trackingcode/${encodeURIComponent(trackingCode)}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': apiKey,
                    'Secret-Key': secretKey
                }
            });
            const data = await response.json().catch(() => null);
            return res.status(response.status).json(data || { status: response.status, message: response.statusText });
        }
        catch (err) {
            return res.status(502).json({ status: 502, message: err.message });
        }
    }
    return res.status(400).json({ status: 400, message: 'Invalid action' });
});
export default courierRouter;
