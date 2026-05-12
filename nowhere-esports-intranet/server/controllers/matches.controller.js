const Match = require('../models/Match.model');

const getAllMatches = async (req, res) => {
    try {
        const { status, game, limit = 20 } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (game)   filter.gameTitle = new RegExp(game, 'i');

        const matches = await Match.find(filter)
            .sort({ startTime: -1 })
            .limit(parseInt(limit))
            .lean();
        return res.json({ matches, count: matches.length });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const getMatchById = async (req, res) => {
    try {
        const match = await Match.findById(req.params.id).lean();
        if (!match) return res.status(404).json({ error: 'Match not found' });
        return res.json({ match });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const createMatch = async (req, res) => {
    try {
        const { gameTitle, team1, team2, startTime, streamUrl } = req.body;
        if (!gameTitle || !team1 || !team2 || !startTime) {
            return res.status(400).json({ error: 'gameTitle, team1, team2, startTime are required' });
        }
        const match = await Match.create({ gameTitle, team1, team2, startTime, streamUrl, status: 'upcoming' });
        return res.status(201).json({ match });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const updateScore = async (req, res) => {
    try {
        const { score, status } = req.body;
        const match = await Match.findByIdAndUpdate(
            req.params.id,
            { score, ...(status ? { status } : {}) },
            { new: true }
        );
        if (!match) return res.status(404).json({ error: 'Match not found' });
        return res.json({ match });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// ── SSE: live match ticker ─────────────────────────────────────────────────────
const liveClients = new Set();

const liveMatchSSE = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    liveClients.add(res);
    res.write('data: {"type":"connected","message":"Live match stream connected"}\n\n');

    // Send heartbeat every 30s
    const heartbeat = setInterval(() => {
        res.write(`data: {"type":"heartbeat","ts":${Date.now()}}\n\n`);
    }, 30000);

    req.on('close', () => {
        clearInterval(heartbeat);
        liveClients.delete(res);
    });
};

// Call this when a match score updates
function broadcastMatchUpdate(match) {
    const payload = JSON.stringify({ type: 'score_update', match });
    for (const client of liveClients) {
        client.write(`data: ${payload}\n\n`);
    }
}

module.exports = { getAllMatches, getMatchById, createMatch, updateScore, liveMatchSSE, broadcastMatchUpdate };
