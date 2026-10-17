export function requestId(req, res, next) {
    const id = req.headers['x-request-id']?.toString() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    req.requestId = id;
    res.set('X-Request-Id', id);
    next();
}
