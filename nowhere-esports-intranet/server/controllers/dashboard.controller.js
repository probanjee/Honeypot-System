const Match = require('../models/Match.model');
const Announcement = require('../models/Announcement.model');
const User = require('../models/User.model');

const getDashboardStats = async (req, res) => {
    try {
        const now = new Date();

        const [
            upcomingMatches,
            liveMatches,
            announcements,
            totalPlayers,
        ] = await Promise.all([
            Match.find({ status: 'upcoming', startTime: { $gte: now } })
                .sort({ startTime: 1 })
                .limit(5)
                .lean(),
            Match.find({ status: 'live' }).lean(),
            Announcement.find({
                $or: [
                    { expiresAt: { $gt: now } },
                    { expiresAt: null },
                ],
            })
                .sort({ pinned: -1, createdAt: -1 })
                .limit(5)
                .lean(),
            User.countDocuments({ isVerified: true }),
        ]);

        return res.json({
            stats: {
                upcomingMatchCount: upcomingMatches.length,
                liveMatchCount: liveMatches.length,
                announcementCount: announcements.length,
                totalPlayers,
            },
            upcomingMatches,
            liveMatches,
            announcements,
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to load dashboard stats', details: err.message });
    }
};

module.exports = { getDashboardStats };
