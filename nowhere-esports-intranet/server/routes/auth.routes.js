const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const passport = require('passport');

router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOTP);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
    passport.authenticate('google', { failureRedirect: '/src/pages/login/index.html', session: false }),
    authController.googleCallback
);

module.exports = router;

