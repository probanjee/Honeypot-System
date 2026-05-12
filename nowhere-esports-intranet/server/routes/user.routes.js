const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth.middleware');

router.get('/profile', authenticateJWT, async (req, res) => {
    res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, role: req.user.role, team: req.user.team } });
});

router.put('/profile', authenticateJWT, async (req, res) => {
    const { name, team } = req.body;
    req.user.name = name || req.user.name;
    req.user.team = team || req.user.team;
    await req.user.save();
    res.json({ message: 'Profile updated', user: req.user });
});

router.get('/team', authenticateJWT, async (req, res) => {
    const User = require('../models/User.model');
    const members = await User.find({ team: req.user.team }).select('-passwordHash -totpSecret');
    res.json(members);
});

module.exports = router;
