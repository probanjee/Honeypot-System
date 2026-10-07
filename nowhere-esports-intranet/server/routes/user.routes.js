const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const supabase = require('../config/supabase');

router.get('/profile', authenticateJWT, async (req, res) => {
    try {
        if (process.env.USE_SUPABASE === 'true') {
            const { data, error } = await supabase.from('profiles').select('*, teams(name)').eq('id', req.user.id).single();
            if (error || !data) return res.status(404).json({ error: 'User not found in Supabase' });
            return res.json({ user: { id: data.id, name: data.display_name, email: data.email, role: data.role, team: data.teams?.name } });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, team: user.team } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/profile', authenticateJWT, async (req, res) => {
    try {
        const { name, team } = req.body;
        
        if (process.env.USE_SUPABASE === 'true') {
            let updates = {};
            if (name !== undefined) updates.display_name = name;
            // Note: team is a string name in MongoDB but team_id in Supabase.
            // For now, we only update display_name to avoid complex lookups in this basic profile route.
            const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.user.id).select('*, teams(name)').single();
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ message: 'Profile updated', user: { id: data.id, name: data.display_name, email: data.email, role: data.role, team: data.teams?.name } });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        if (name !== undefined) user.name = name;
        if (team !== undefined) user.team = team;
        
        await user.save();
        res.json({ message: 'Profile updated', user: { id: user._id, name: user.name, email: user.email, role: user.role, team: user.team } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/team', authenticateJWT, async (req, res) => {
    try {
        if (process.env.USE_SUPABASE === 'true') {
            const { data: userProfile, error: profileErr } = await supabase.from('profiles').select('team_id').eq('id', req.user.id).single();
            if (profileErr) return res.status(500).json({ error: profileErr.message });
            if (!userProfile || !userProfile.team_id) return res.json([]);
            
            const { data: members, error: membersErr } = await supabase.from('profiles').select('id, display_name, email, role').eq('team_id', userProfile.team_id);
            if (membersErr) return res.status(500).json({ error: membersErr.message });
            
            // Map to match legacy format
            return res.json(members.map(m => ({ _id: m.id, name: m.display_name, email: m.email, role: m.role })));
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const members = await User.find({ team: user.team }).select('-passwordHash -totpSecret');
        res.json(members);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
