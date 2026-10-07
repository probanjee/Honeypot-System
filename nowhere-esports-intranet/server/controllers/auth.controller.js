const authService = require('../services/auth.service');
const otpService = require('../services/otp.service');
const User = require('../models/User.model');

const login = async (req, res) => {
    const { email, password } = req.body;
    const userOrSession = await authService.login(email, password);
    
    if (!userOrSession) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (process.env.USE_SUPABASE === 'true') {
        // userOrSession is { user, session }
        const jwtToken = authService.generateToken(userOrSession);
        return res.json({ 
            token: jwtToken, 
            user: { 
                id: userOrSession.user.id, 
                name: userOrSession.user.user_metadata?.display_name || email, 
                role: 'user' // Note: Actual role should be fetched from profiles, but 'user' suffices for now or we fetch it later
            } 
        });
    }

    // Legacy Flow: Generate OTP for 2FA
    await otpService.generateOTP(email);
    
    res.json({ message: 'OTP sent to your email', email });
};

const verifyOTP = async (req, res) => {
    const { email, token } = req.body;
    const isValid = await otpService.verifyOTP(email, token);
    
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    const jwtToken = authService.generateToken(user);
    
    res.json({ token: jwtToken, user: { id: user._id, name: user.name, role: user.role } });
};

const googleCallback = async (req, res) => {
    // Passport attaches the user to req.user
    const token = authService.generateToken(req.user);
    
    // In a production app, you might want to redirect with the token in a secure cookie 
    // or as a URL param to the frontend dashboard.
    res.redirect(`/src/pages/dashboard/index.html?token=${token}&userId=${req.user._id}&userName=${encodeURIComponent(req.user.name)}`);
};

module.exports = { login, verifyOTP, googleCallback };

