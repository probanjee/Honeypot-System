const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User.model');
const config = require('./config');

module.exports = function(passport) {
    // Google Strategy
    passport.use(new GoogleStrategy({
        clientID: config.googleClientId || 'DEMO_CLIENT_ID',
        clientSecret: config.googleClientSecret || 'DEMO_CLIENT_SECRET',
        callbackURL: '/auth/google/callback',
        proxy: true
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
                return done(null, user);
            }

            // If not, create new user
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                name: profile.displayName,
                isVerified: true, // Google emails are pre-verified
                role: 'player'
            });
            done(null, user);
        } catch (err) {
            console.error(err);
            done(err, null);
        }
    }));

    // JWT Strategy for API protection
    const opts = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwtSecret
    };

    passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
        try {
            const user = await User.findById(jwt_payload.id);
            if (user) return done(null, user);
            return done(null, false);
        } catch (err) {
            return done(err, false);
        }
    }));

    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        const user = await User.findById(id);
        done(null, user);
    });
};
