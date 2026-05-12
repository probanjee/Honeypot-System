const jwt = require('jsonwebtoken');
const config = require('../config/config');

/** Decode and verify JWT from Bearer header, attach req.user */
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role };
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
};

/** Optional auth — attach user if token present, don't block if absent */
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const payload = jwt.verify(token, config.jwtSecret);
            req.user = { id: payload.sub || payload.id, email: payload.email, role: payload.role };
        } catch {
            // ignore invalid token in optional mode
        }
    }
    next();
};

module.exports = { authenticateJWT, optionalAuth };
