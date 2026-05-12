const nodemailer = require('nodemailer');
const config = require('../config/config');

const transporter = nodemailer.createTransport({
    host: config.emailHost || 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: config.emailUser || '',
        pass: config.emailPass || ''
    }
});

const sendOTPEmail = async (email, token) => {
    const mailOptions = {
        from: '"Nowhere Esports" <noreply@nowhere.gg>',
        to: email,
        subject: 'Your Verification Code',
        text: `Your OTP is: ${token}. It expires in 5 minutes.`,
        html: `<b>Your OTP is: ${token}</b><p>It expires in 5 minutes.</p>`
    };
    return await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
