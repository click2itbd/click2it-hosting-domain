export function requireApiKey(req, res, next) {
    const apiKey = (req.headers['x-api-key'] || req.headers['authorization'])?.toString().replace('Bearer ', '');
    const expectedKey = process.env.EXPRESS_API_KEY;
    if (!expectedKey) {
        return res.status(500).json({ error: 'API key not configured on server' });
    }
    if (apiKey && apiKey === expectedKey) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}
