const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String },
    googleId: { type: String },
    name: { type: String, required: true },
    role: { 
        type: String, 
        enum: ['player', 'coach', 'admin', 'staff'], 
        default: 'player' 
    },
    team: { type: String },
    isVerified: { type: Boolean, default: false },
    totpSecret: { type: String },
    lastLogin: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
