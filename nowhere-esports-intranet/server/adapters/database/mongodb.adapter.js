const mongoose = require('mongoose');

class MongoDBAdapter {
    async connect() {
        return mongoose.connection.readyState === 1;
    }
    
    async status() {
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };
        const state = mongoose.connection.readyState;
        return {
            connected: state === 1,
            status: states[state] || 'unknown'
        };
    }
}

module.exports = MongoDBAdapter;
