const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
    gameTitle: { type: String, required: true },
    team1: { type: String, required: true },
    team2: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    score: {
        team1: { type: Number, default: 0 },
        team2: { type: Number, default: 0 }
    },
    status: { 
        type: String, 
        enum: ['upcoming', 'live', 'completed'], 
        default: 'upcoming' 
    },
    streamUrl: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
