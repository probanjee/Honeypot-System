const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    priority: { 
        type: String, 
        enum: ['info', 'warning', 'urgent'], 
        default: 'info' 
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
