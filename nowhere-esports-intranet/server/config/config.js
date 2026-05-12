module.exports = {
    port:        process.env.PORT                 || 3001,
    mongodbUri:  process.env.MONGODB_URI          || 'mongodb://localhost:27017/nowhere-esports',
    jwtSecret:   process.env.JWT_SECRET           || 'nowhere-esports-super-secret-jwt-key',
    googleClientId:     process.env.GOOGLE_CLIENT_ID     || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    emailHost:   process.env.EMAIL_HOST           || 'smtp.ethereal.email',
    emailUser:   process.env.EMAIL_USER           || '',
    emailPass:   process.env.EMAIL_PASS           || '',
    otpExpirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300'),
    sessionSecret: process.env.SESSION_SECRET     || 'nowhere-esports-session-secret',
    nodeEnv:     process.env.NODE_ENV             || 'development',
};
