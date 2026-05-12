const geoip = require('geoip-lite');
const AttackLog = require('../models/AttackLog.model');

const PATTERNS = [
    { name: 'SQL Injection', regex: /(UNION\s+SELECT|DROP\s+TABLE|1=1|--\s*$|OR\s+'1'='1')/i, sev: 85 },
    { name: 'XSS', regex: /(<script>|javascript:|onerror=|onload=)/i, sev: 75 },
    { name: 'Path Traversal', regex: /(\.\.\/|\.\.\\|etc\/passwd|windows\\system32)/i, sev: 90 },
    { name: 'Command Injection', regex: /(;|\||&&)\s*(ls|cat|whoami|pwd|wget|curl)/i, sev: 95 }
];

function geoLookup(ip) {
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) {
        return { country: 'Local', city: 'Localhost', ll: [37.77, -122.41] };
    }
    const geo = geoip.lookup(ip);
    if (geo) {
        return { country: geo.country, city: geo.city || '', ll: geo.ll || [0, 0] };
    }
    return { country: 'Unknown', city: '', ll: [0, 0] };
}

global.honeypotSSEClients = global.honeypotSSEClients || new Set();

function registerSSEClient(res) {
    global.honeypotSSEClients.add(res);
}

function unregisterSSEClient(res) {
    global.honeypotSSEClients.delete(res);
}

function broadcastAttack(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (let client of global.honeypotSSEClients) {
        client.write(data);
    }
}

async function honeypotMiddleware(req, res, next) {
    const payload = JSON.stringify(req.body) + JSON.stringify(req.query) + req.originalUrl;
    let matched = [];
    let severity = 0;

    PATTERNS.forEach(p => {
        if (p.regex.test(payload)) {
            matched.push(p);
            severity = Math.max(severity, p.sev);
        }
    });

    if (matched.length > 0) {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'] || 'Unknown';
        
        const geo = geoLookup(ip);
        const event = {
            timestamp:   new Date().toISOString(),
            source_ip:   ip.replace('::ffff:', ''),
            source_port: req.socket?.remotePort || 0,
            method:      req.method,
            path:        req.originalUrl,
            protocol:    'HTTP',
            attack_type: matched[0].name,
            payload,
            severity,
            user_agent:  userAgent,
            referer:     req.headers['referer'] || '',
            signatures:  matched.map(s => s.name),
            geo_country: geo.country,
            geo_city:    geo.city,
            geo_lat:     geo.ll ? geo.ll[0] : 0,
            geo_lon:     geo.ll ? geo.ll[1] : 0,
            blocked:     severity >= 90,
        };

        try {
            await AttackLog.create(event);
            broadcastAttack(event);
        } catch (err) {
            console.error('Error logging attack:', err);
        }

        if (severity >= 90) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }
    next();
}

module.exports = {
    honeypotMiddleware,
    registerSSEClient,
    unregisterSSEClient
};
