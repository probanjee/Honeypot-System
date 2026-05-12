/**
 * jwt.js – JWT sign, verify, decode utilities
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateJWT = (payload, expiresIn = '24h') => {
    return jwt.sign(payload, config.jwtSecret, { expiresIn });
};

const verifyJWT = (token) => {
    return jwt.verify(token, config.jwtSecret);
};

const decodeJWT = (token) => {
    return jwt.decode(token);
};

module.exports = { generateJWT, verifyJWT, decodeJWT };
