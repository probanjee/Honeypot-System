const Match = require('../models/Match.model');
const supabase = require('../config/supabase');

const getAllMatches = async (req, res) => {
    try {
        const { status, game, limit = 20 } = req.query;
        
        if (process.env.USE_SUPABASE === 'true') {
            let query = supabase.from('matches').select('*').order('scheduled_at', { ascending: false }).limit(parseInt(limit));
            if (status) query = query.eq('status', status);
            
            const { data, error } = await query;
            if (error) return res.status(500).json({ error: error.message });
            
            const matches = data.map(m => ({
                _id: m.id, team1: m.team_a, team2: m.team_b, score: m.score, status: m.status, startTime: m.scheduled_at,
                gameTitle: m.score?.gameTitle || 'Unknown Game', streamUrl: m.score?.streamUrl || ''
            }));
            return res.json({ matches, count: matches.length });
        }

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
        if (process.env.USE_SUPABASE === 'true') {
            const { data, error } = await supabase.from('matches').select('*').eq('id', req.params.id).single();
            if (error || !data) return res.status(404).json({ error: 'Match not found' });
            return res.json({ match: {
                _id: data.id, team1: data.team_a, team2: data.team_b, score: data.score, status: data.status, startTime: data.scheduled_at,
                gameTitle: data.score?.gameTitle || 'Unknown Game', streamUrl: data.score?.streamUrl || ''
            } });
        }

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
        
        if (process.env.USE_SUPABASE === 'true') {
            const { data, error } = await supabase.from('matches').insert([{
                team_a: team1, team_b: team2, scheduled_at: startTime, status: 'scheduled', score: { gameTitle, streamUrl }
            }]).select().single();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(201).json({ match: data });
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
        
        if (process.env.USE_SUPABASE === 'true') {
            let updates = {};
            if (score) updates.score = score;
            if (status) updates.status = status;
            
            const { data, error } = await supabase.from('matches').update(updates).eq('id', req.params.id).select().single();
            if (error || !data) return res.status(404).json({ error: 'Match not found' });
            
            const mappedMatch = {
                _id: data.id, team1: data.team_a, team2: data.team_b, score: data.score, status: data.status, startTime: data.scheduled_at,
                gameTitle: data.score?.gameTitle || 'Unknown Game', streamUrl: data.score?.streamUrl || ''
            };
            broadcastMatchUpdate(mappedMatch);
            return res.json({ match: mappedMatch });
        }

        const match = await Match.findByIdAndUpdate(
            req.params.id,
            { score, ...(status ? { status } : {}) },
            { new: true }
        );
        if (!match) return res.status(404).json({ error: 'Match not found' });
        broadcastMatchUpdate(match);
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
