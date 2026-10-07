const speakeasy = require('speakeasy');
const OTPToken = require('../models/OTPToken.model');
const emailService = require('./email.service');

const generateOTP = async (email) => {
    const token = speakeasy.totp({
        secret: 'N0WH3R3_S3CR3T_' + email,
        encoding: 'base32',
        digits: 6,
        step: 300 // 5 minutes
    });

    const expiresAt = new Date(Date.now() + 300 * 1000);
    await OTPToken.create({ email, token, expiresAt });
    
    await emailService.sendOTPEmail(email, token);
    return token;
};

const verifyOTP = async (email, token) => {
    const otpDoc = await OTPToken.findOne({ 
        email, 
        token, 
        used: false,
        expiresAt: { $gt: new Date() }
    });
    if (!otpDoc) return false;
    
    otpDoc.used = true;
    await otpDoc.save();
    return true;
};

module.exports = { generateOTP, verifyOTP };
