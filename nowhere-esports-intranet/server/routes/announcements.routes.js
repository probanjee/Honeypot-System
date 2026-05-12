const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const Announcement = require('../models/Announcement.model');

router.get('/', authenticateJWT, async (req, res) => {
    const announcements = await Announcement.find().sort({ pinned: -1, createdAt: -1 });
    res.json(announcements);
});

router.post('/', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const { title, content, priority, pinned } = req.body;
    const announcement = await Announcement.create({ title, content, priority, pinned, createdBy: req.user._id });
    res.status(201).json(announcement);
});

router.delete('/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
});

module.exports = router;
