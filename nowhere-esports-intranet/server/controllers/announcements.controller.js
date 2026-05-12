const Announcement = require('../models/Announcement.model');

const getAnnouncements = async (req, res) => {
    try {
        const now = new Date();
        const filter = {
            $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
        };
        const announcements = await Announcement.find(filter)
            .sort({ pinned: -1, createdAt: -1 })
            .limit(20)
            .lean();
        return res.json({ announcements });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const createAnnouncement = async (req, res) => {
    try {
        const { title, content, priority, pinned, expiresAt } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'title and content are required' });
        }
        const announcement = await Announcement.create({
            title,
            content,
            priority: priority || 'info',
            pinned: !!pinned,
            createdBy: req.user.id,
            expiresAt: expiresAt || null,
        });
        return res.status(201).json({ announcement });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const deleteAnnouncement = async (req, res) => {
    try {
        const result = await Announcement.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ error: 'Announcement not found' });
        return res.json({ message: 'Deleted successfully' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement };
