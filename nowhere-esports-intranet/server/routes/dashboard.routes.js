const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const Match = require('../models/Match.model');
const Announcement = require('../models/Announcement.model');

router.get('/', authenticateJWT, async (req, res) => {
    try {
        const upcomingMatches = await Match.find({ status: 'upcoming' }).sort({ startTime: 1 }).limit(5);
        const announcements = await Announcement.find({ pinned: true }).sort({ createdAt: -1 }).limit(3);
        const liveMatches = await Match.find({ status: 'live' });
        res.json({ upcomingMatches, announcements, liveMatches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
