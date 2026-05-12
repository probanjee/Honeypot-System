const express = require('express');
const router = express.Router();
const AttackLog = require('../models/AttackLog.model');
const { registerSSEClient, unregisterSSEClient } = require('../middleware/honeypot.middleware');

/**
 * GET /honeypot/events
 * SSE stream – VIGILANCE dashboard connects here to receive real-time attack events.
 * CORS is open so the React frontend on :5173 can connect.
 */
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    // Send a welcome message immediately
    res.write('data: {"type":"connected","message":"VIGILANCE honeypot stream connected to Nowhere Esports"}\n\n');

    // Keep-alive ping every 25s
    const heartbeat = setInterval(() => {
        res.write(`: heartbeat ${Date.now()}\n\n`);
    }, 25000);

    registerSSEClient(res);

    req.on('close', () => {
        clearInterval(heartbeat);
        unregisterSSEClient(res);
        console.log('[Honeypot SSE] VIGILANCE client disconnected');
    });

    console.log(`[Honeypot SSE] VIGILANCE dashboard connected (${sseClients_count()} clients)`);
});

// helper to avoid circular import for count
function sseClients_count() { return global.honeypotSSEClients ? global.honeypotSSEClients.size : 0; }

/**
 * GET /honeypot/logs?limit=50&severity=70
 * REST endpoint – returns recent attack logs from MongoDB.
 */
router.get('/logs', async (req, res) => {
    try {
        const limit    = parseInt(req.query.limit)    || 50;
        const minSev   = parseInt(req.query.severity) || 0;
        const protocol = req.query.protocol;
        const type     = req.query.type;

        const filter = { severity: { $gte: minSev } };
        if (protocol) filter.protocol = protocol.toUpperCase();
        if (type)     filter.attack_type = new RegExp(type, 'i');

        const logs = await AttackLog
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(limit)
            .lean();

        return res.json({ count: logs.length, logs });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * GET /honeypot/stats
 * Returns summary statistics for the dashboard stat cards.
 */
router.get('/stats', async (req, res) => {
    try {
        const [
            total,
            critical,
            highSev,
            mediumSev,
            lowSev,
            byType,
            byProtocol,
            recentRate,
        ] = await Promise.all([
            AttackLog.countDocuments(),
            AttackLog.countDocuments({ severity: { $gte: 90 } }),
            AttackLog.countDocuments({ severity: { $gte: 70, $lt: 90 } }),
            AttackLog.countDocuments({ severity: { $gte: 40, $lt: 70 } }),
            AttackLog.countDocuments({ severity: { $lt: 40 } }),
            AttackLog.aggregate([
                { $group: { _id: '$attack_type', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 8 },
            ]),
            AttackLog.aggregate([
                { $group: { _id: '$protocol', count: { $sum: 1 } } },
            ]),
            AttackLog.countDocuments({
                timestamp: { $gte: new Date(Date.now() - 60000) },
            }),
        ]);

        return res.json({
            total_attacks:  total,
            critical_count: critical,
            high_count:     highSev,
            medium_count:   mediumSev,
            low_count:      lowSev,
            attacks_per_min: recentRate,
            top_types:      byType,
            by_protocol:    byProtocol.map(d => ({ name: d._id, count: d.count })),
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /honeypot/logs  (admin only)
 * Clear all attack logs.
 */
router.delete('/logs', async (req, res) => {
    try {
        await AttackLog.deleteMany({});
        return res.json({ message: 'All attack logs cleared' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
