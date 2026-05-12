const User = require('../models/User.model');

const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-passwordHash -totpSecret');
        if (!user) return res.status(404).json({ error: 'User not found' });
        return res.json({ user });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const allowed = ['name', 'team'];
        const updates = {};
        allowed.forEach(field => {
            if (req.body[field] !== undefined) updates[field] = req.body[field];
        });
        const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-passwordHash -totpSecret');
        return res.json({ user });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

const getTeamMembers = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const members = await User.find({ team: user.team }).select('name email role team lastLogin');
        return res.json({ team: user.team, members });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

module.exports = { getProfile, updateProfile, getTeamMembers };
