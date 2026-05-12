const mongoose = require('mongoose');

const attackLogSchema = new mongoose.Schema({
    timestamp:   { type: Date, default: Date.now },
    source_ip:   String,
    source_port: Number,
    method:      String,
    path:        String,
    protocol:    String,
    attack_type: String,
    payload:     String,
    severity:    Number,
    user_agent:  String,
    referer:     String,
    signatures:  [String],
    geo_country: String,
    geo_city:    String,
    geo_lat:     Number,
    geo_lon:     Number,
    blocked:     Boolean
});

module.exports = mongoose.model('AttackLog', attackLogSchema);
