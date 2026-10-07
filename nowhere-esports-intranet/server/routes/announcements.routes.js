const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const Announcement = require('../models/Announcement.model');
const supabase = require('../config/supabase');

router.get('/', authenticateJWT, async (req, res) => {
    try {
        if (process.env.USE_SUPABASE === 'true') {
            const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
            if (error) return res.status(500).json({ error: error.message });
            
            const announcements = data.map(a => ({
                _id: a.id,
                title: a.title,
                content: a.body,
                createdAt: a.created_at,
                createdBy: a.created_by,
                pinned: false,
                priority: 'normal'
            }));
            return res.json(announcements);
        }

        const announcements = await Announcement.find().sort({ pinned: -1, createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        const { title, content, priority, pinned } = req.body;
        
        if (process.env.USE_SUPABASE === 'true') {
            const { data, error } = await supabase.from('announcements').insert([{
                title, body: content, status: 'published', created_by: req.user.id
            }]).select().single();
            if (error) return res.status(500).json({ error: error.message });
            return res.status(201).json({
                _id: data.id, title: data.title, content: data.body, createdAt: data.created_at, createdBy: data.created_by, pinned: false, priority: 'normal'
            });
        }

        const announcement = await Announcement.create({ title, content, priority, pinned, createdBy: req.user.id });
        res.status(201).json(announcement);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
        
        if (process.env.USE_SUPABASE === 'true') {
            const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ message: 'Deleted' });
        }

        await Announcement.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
